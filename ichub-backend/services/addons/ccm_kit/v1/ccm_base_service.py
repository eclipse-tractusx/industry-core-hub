#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 LKS Next
# Copyright (c) 2026 Contributors to the Eclipse Foundation
#
# See the NOTICE file(s) distributed with this work for additional
# information regarding copyright ownership.
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################
"""
Base service for CX-0135 Company Certificate Management (CCM).

Contains shared infrastructure used by both ``CcmConsumerService`` and
``CcmProviderService``: connector discovery, policy resolution, notification
building, and EDC-based notification sending.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from tractusx_sdk.industry.models.notifications import (
    Notification,
    NotificationContent,
    NotificationHeader,
)
from tractusx_sdk.industry.services.notifications import NotificationConsumerService
from tractusx_sdk.industry.services.notifications.exceptions import NotificationError

from connector import connector_manager, consumer_connector_service
from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from utils.log_utils import sanitize_log_value as _s
from models.services.addons.ccm_kit.v1.notifications import CcmSendResult
from tools.constants import CCM_DCT_TYPE

logger = LoggingManager.get_logger(__name__)


class CcmBaseService:
    """
    Shared base for CCM consumer and provider services.

    Provides connector discovery, policy lookup, notification construction,
    and EDC notification sending — all parameterised by a ``_log_prefix``
    that subclasses set to distinguish log output.
    """

    _log_prefix: str = "[CCM]"

    def _resolve_dsp_url(self, target_bpn: str) -> str:
        """Resolve a partner's DSP URL from connector discovery."""
        connectors = connector_manager.consumer.get_connectors(target_bpn)
        if not connectors:
            raise RuntimeError(
                f"No connector DSP URL found for BPN [{target_bpn}]"
            )
        return connectors[0]

    def _evict_edr_cache(self, bpnl: str) -> None:
        """
        Clear any stale EDR cache entries for the given counterparty before
        starting a fresh DSP negotiation.

        In Saturn the cache is keyed by the counterparty DID.  We resolve the
        DID first for a precise eviction; if discovery fails we fall back to
        the BPN, which ``clear_connections_by_party`` also handles via
        substring matching.

        This is a no-op when the connector implementation does not expose a
        ``connection_manager`` (e.g. Jupiter).
        """
        if not hasattr(consumer_connector_service, "connection_manager"):
            return
        party_key = bpnl
        if hasattr(consumer_connector_service, "get_discovery_info"):
            try:
                _, party_key, _ = consumer_connector_service.get_discovery_info(
                    bpnl=bpnl
                )
                logger.debug(
                    f"{self._log_prefix} Resolved counterparty DID for BPN "
                    f"[{_s(bpnl)}]: {_s(party_key)}"
                )
            except Exception as discovery_err:
                logger.warning(
                    f"{self._log_prefix} Could not resolve DID for BPN "
                    f"[{_s(bpnl)}], falling back to BPN substring clear: "
                    f"{_s(discovery_err)}"
                )
        removed = consumer_connector_service.connection_manager.clear_connections_by_party(
            party_key
        )
        logger.debug(
            f"{self._log_prefix} Cleared EDR cache for [{_s(party_key)}] "
            f"(removed {removed} entries)"
        )

    def _resolve_policies(self) -> Optional[List[Dict]]:
        """Get CCM usage policies from configuration."""
        policy = ConfigManager.get_config("provider.ccm.policy.usage")
        if policy:
            return [policy]
        return None

    def _build_notification(
        self,
        context: str,
        sender_bpn: str,
        receiver_bpn: str,
        content_fields: Dict,
        related_message_id: Optional[uuid.UUID] = None,
    ) -> Notification:
        """Build a SDK Notification with the given content fields.

        Args:
            context: CX-0135 notification context string.
            sender_bpn: BPNL of the sending party.
            receiver_bpn: BPNL of the receiving party.
            content_fields: CCM-specific content payload fields.
            related_message_id: Optional UUID of the original notification
                this message is responding to (e.g. status → push).
        """
        header_kwargs: Dict = {
            "messageId": uuid.uuid4(),
            "context": context,
            "sentDateTime": datetime.now(timezone.utc),
            "senderBpn": sender_bpn,
            "receiverBpn": receiver_bpn,
        }
        if related_message_id is not None:
            header_kwargs["relatedMessageId"] = related_message_id

        header = NotificationHeader(**header_kwargs)
        content = NotificationContent(**content_fields)
        return Notification(header=header, content=content)

    def _send_notification(
        self,
        target_bpn: str,
        notification: Notification,
        endpoint_path: str,
        policies: Optional[List[Dict]] = None,
    ) -> CcmSendResult:
        """
        Negotiate EDR and send a notification to the target's CCM endpoint.

        Uses the SDK's ``NotificationConsumerService`` with the CCM-specific
        ``dct_type`` to locate and negotiate with the target's notification
        asset.
        """
        try:
            dsp_url = self._resolve_dsp_url(target_bpn)
        except Exception as e:
            logger.error(
                f"{self._log_prefix} Discovery failed for [{_s(target_bpn)}]: {_s(e)}"
            )
            return CcmSendResult(success=False, error=f"Discovery failed: {e}")

        policies = policies if policies is not None else self._resolve_policies()

        # Evict any stale EDR for this counterparty before negotiating.
        self._evict_edr_cache(target_bpn)

        notification_service = NotificationConsumerService(
            consumer_connector_service,
            verbose=bool(
                ConfigManager.get_config(
                    "ccm.notification.verbose", default=True
                )
            ),
        )

        try:
            endpoint, token = notification_service.get_notification_endpoint_with_bpnl(
                bpnl=target_bpn,
                counter_party_address=dsp_url,
                policies=policies,
                dct_type=CCM_DCT_TYPE,
            )

            notification_service.send_notification_to_endpoint(
                endpoint_url=endpoint,
                access_token=token,
                notification=notification,
                endpoint_path=endpoint_path,
            )

            message_id = str(notification.header.message_id)
            logger.info(
                f"{self._log_prefix} Notification sent: message_id={_s(message_id)}, "
                f"endpoint={_s(endpoint_path)}"
            )
            return CcmSendResult(success=True, message_id=message_id)

        except NotificationError as ne:
            logger.error(f"{self._log_prefix} NotificationError: {_s(ne)}")
            return CcmSendResult(success=False, error=str(ne))
        except Exception as e:
            logger.error(
                f"{self._log_prefix} Unexpected error sending notification: {_s(e)}"
            )
            return CcmSendResult(
                success=False, error=f"Unexpected error: {e}"
            )
