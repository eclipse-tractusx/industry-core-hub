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
Provider-side service for CX-0135 Company Certificate Management (CCM).

Provides two outbound operations:
1. **Push** — send a full certificate (including Base64 document) to a consumer
   via the ``POST /companycertificate/push`` notification endpoint.
2. **Available** — send a lightweight notification informing a consumer that a
   certificate is available for retrieval via the PULL mechanism.

Both operations resolve the consumer's DSP URL, negotiate an EDR with the
consumer's CCM notification asset, and transmit the payload through the
data-plane proxy — exactly mirroring the consumer-side send pattern.
"""

import base64
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
from managers.metadata_database.manager import RepositoryManagerFactory
from models.services.addons.ccm_kit.v1.notifications import (
    CcmAvailableRequest,
    CcmPushRequest,
    CcmSendResult,
)
from tools.constants import CCM_CONTEXT_AVAILABLE, CCM_CONTEXT_PUSH

logger = LoggingManager.get_logger(__name__)

# DCT type that CCM notification assets are registered under
CCM_DCT_TYPE = (
    "https://w3id.org/catenax/taxonomy"
    "#CompanyCertificateManagementNotificationApi"
)

# Endpoint paths on the consumer side
CCM_ENDPOINT_PUSH = "/companycertificate/push"
CCM_ENDPOINT_AVAILABLE = "/companycertificate/available"


class CcmProviderService:
    """
    Provider-side operations for CX-0135 Company Certificate Management.

    Uses the EDC connector infrastructure (discovery, catalog, DSP negotiation)
    to send PUSH and Available notifications to a remote consumer's CCM
    notification API.
    """

    # ------------------------------------------------------------------
    # Push certificate (provider → consumer)
    # ------------------------------------------------------------------

    def push_certificate(
        self,
        request: CcmPushRequest,
        sender_bpn: str,
    ) -> CcmSendResult:
        """
        Push a full certificate to a consumer via CX-0135 PUSH notification.

        Loads the certificate from the local database, serialises it into the
        CX-0135 push payload (including the Base64-encoded document), and
        transmits it to the consumer's ``/companycertificate/push`` endpoint
        through the EDC data-plane.

        Args:
            request: Contains ``certificate_id`` and ``consumer_bpn``.
            sender_bpn: BPNL of this node (the provider).

        Returns:
            CcmSendResult indicating success or failure.
        """
        consumer_bpn = request.consumer_bpn
        logger.info(
            "[CCM Provider] Pushing certificate %d to consumer [%s]",
            request.certificate_id,
            consumer_bpn,
        )

        # --- 1. Load certificate from DB ---
        with RepositoryManagerFactory.create() as repo:
            ccm = repo.ccm_repository.find_by_id_with_relations(
                request.certificate_id
            )
            if ccm is None:
                msg = (
                    f"Certificate with ID {request.certificate_id} not found."
                )
                logger.warning("[CCM Provider] %s", msg)
                return CcmSendResult(success=False, error=msg)

            # --- 2. Build push payload ---
            content_fields = self._build_push_content(ccm)

        # --- 3. Build and send notification ---
        notification = self._build_notification(
            context=CCM_CONTEXT_PUSH,
            sender_bpn=sender_bpn,
            receiver_bpn=consumer_bpn,
            content_fields=content_fields,
        )

        result = self._send_notification(
            target_bpn=consumer_bpn,
            notification=notification,
            endpoint_path=CCM_ENDPOINT_PUSH,
        )

        # --- 4. Update share record on success ---
        if result.success:
            self._update_share_status(
                certificate_id=request.certificate_id,
                consumer_bpn=consumer_bpn,
            )

        return result

    # ------------------------------------------------------------------
    # Send certificate-available notification (provider → consumer)
    # ------------------------------------------------------------------

    def send_certificate_available(
        self,
        request: CcmAvailableRequest,
        sender_bpn: str,
    ) -> CcmSendResult:
        """
        Notify a consumer that a certificate is available for PULL retrieval.

        Sends a lightweight CX-0135 Available notification containing the
        ``documentId``, ``certificateType`` and optional ``locationBpns``.

        Args:
            request: Contains ``certificate_id`` and ``consumer_bpn``.
            sender_bpn: BPNL of this node (the provider).

        Returns:
            CcmSendResult indicating success or failure.
        """
        consumer_bpn = request.consumer_bpn
        logger.info(
            "[CCM Provider] Sending certificate-available for cert %d to [%s]",
            request.certificate_id,
            consumer_bpn,
        )

        # --- 1. Load certificate metadata ---
        with RepositoryManagerFactory.create() as repo:
            ccm = repo.ccm_repository.find_by_id_with_relations(
                request.certificate_id
            )
            if ccm is None:
                msg = (
                    f"Certificate with ID {request.certificate_id} not found."
                )
                logger.warning("[CCM Provider] %s", msg)
                return CcmSendResult(success=False, error=msg)

            # --- 2. Build available content ---
            location_bpns = [site.site_bpn for site in ccm.sites] if ccm.sites else None
            content_fields: Dict = {
                "documentId": str(ccm.id),
                "certificateType": ccm.certificate_type,
            }
            if location_bpns:
                content_fields["locationBpns"] = location_bpns

        # --- 3. Build and send notification ---
        notification = self._build_notification(
            context=CCM_CONTEXT_AVAILABLE,
            sender_bpn=sender_bpn,
            receiver_bpn=consumer_bpn,
            content_fields=content_fields,
        )

        return self._send_notification(
            target_bpn=consumer_bpn,
            notification=notification,
            endpoint_path=CCM_ENDPOINT_AVAILABLE,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_push_content(ccm) -> Dict:
        """
        Serialise a ``Ccm`` database entity into the CX-0135 push content
        dictionary.

        The structure mirrors the CX-0135 §2.1.1 push payload exactly:
        ``businessPartnerNumber``, ``type``, ``enclosedSites``, ``document``,
        ``issuer``, ``validator``, etc.
        """
        # Base64-encode the binary document
        doc_b64 = ""
        if ccm.doc:
            doc_b64 = base64.b64encode(ccm.doc).decode("ascii")

        content: Dict = {
            "businessPartnerNumber": ccm.bpnl,
            "type": {
                "certificateType": ccm.certificate_type,
            },
            "document": {
                "documentID": str(ccm.id),
                "creationDate": ccm.created_at.isoformat(),
                "contentType": "application/pdf",
                "contentBase64": doc_b64,
            },
            "issuer": {
                "issuerName": ccm.issuer,
            },
            "trustLevel": ccm.trust_level.value if ccm.trust_level else "none",
        }

        # Optional fields
        if ccm.valid_from:
            content["validFrom"] = ccm.valid_from.isoformat()
        if ccm.valid_until:
            content["validUntil"] = ccm.valid_until.isoformat()
        if ccm.registration_number:
            content["registrationNumber"] = ccm.registration_number
        if ccm.area_of_application:
            content["areaOfApplication"] = ccm.area_of_application
        if ccm.uploader_bpnl:
            content["uploader"] = ccm.uploader_bpnl
        if ccm.validator:
            content["validator"] = {"validatorName": ccm.validator}

        # Enclosed sites
        if ccm.sites:
            content["enclosedSites"] = [
                {"enclosedSiteBpn": site.site_bpn}
                for site in ccm.sites
            ]

        return content

    def _resolve_dsp_url(self, target_bpn: str) -> str:
        """Resolve a partner's DSP URL from connector discovery."""
        connectors = connector_manager.consumer.get_connectors(target_bpn)
        if not connectors:
            raise RuntimeError(
                f"No connector DSP URL found for BPN [{target_bpn}]"
            )
        return connectors[0]

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
    ) -> Notification:
        """Build a SDK Notification with the given content fields."""
        header = NotificationHeader(
            messageId=uuid.uuid4(),
            context=context,
            sentDateTime=datetime.now(timezone.utc),
            senderBpn=sender_bpn,
            receiverBpn=receiver_bpn,
            version="1.0.0",
        )
        content = NotificationContent(**content_fields)
        return Notification(header=header, content=content)

    def _send_notification(
        self,
        target_bpn: str,
        notification: Notification,
        endpoint_path: str,
    ) -> CcmSendResult:
        """
        Negotiate EDR and send a notification to the target's CCM endpoint.

        Uses the SDK's NotificationConsumerService with the CCM-specific
        dct_type to locate and negotiate with the target's notification asset.
        """
        try:
            dsp_url = self._resolve_dsp_url(target_bpn)
        except Exception as e:
            logger.error(
                "[CCM Provider] Discovery failed for [%s]: %s", target_bpn, e
            )
            return CcmSendResult(success=False, error=f"Discovery failed: {e}")

        policies = self._resolve_policies()

        notification_service = NotificationConsumerService(
            consumer_connector_service,
            verbose=True,
        )

        try:
            endpoint, token = notification_service.get_notification_endpoint(
                provider_bpn=target_bpn,
                provider_dsp_url=dsp_url,
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
                "[CCM Provider] Notification sent: message_id=%s, "
                "endpoint=%s",
                message_id,
                endpoint_path,
            )
            return CcmSendResult(success=True, message_id=message_id)

        except NotificationError as ne:
            logger.error("[CCM Provider] NotificationError: %s", ne)
            return CcmSendResult(success=False, error=str(ne))
        except Exception as e:
            logger.error(
                "[CCM Provider] Unexpected error sending notification: %s", e
            )
            return CcmSendResult(
                success=False, error=f"Unexpected error: {e}"
            )

    @staticmethod
    def _update_share_status(
        certificate_id: int, consumer_bpn: str
    ) -> None:
        """
        After a successful PUSH, ensure the CertificateShare record
        for this consumer is marked ``Active`` and the ``last_shared_date``
        is refreshed.
        """
        from models.metadata_database.addons.ccm_kit.v1.models import (
            ShareStatus,
        )

        with RepositoryManagerFactory.create() as repo:
            share = (
                repo.certificate_share_repository
                .find_by_certificate_and_consumer(certificate_id, consumer_bpn)
            )
            if share is not None:
                repo.certificate_share_repository.update_status(
                    share_id=share.id,
                    new_status=ShareStatus.Active,
                )
            else:
                repo.certificate_share_repository.create_new(
                    certificate_id=certificate_id,
                    consumer_bpnl=consumer_bpn,
                    status=ShareStatus.Active,
                )
            repo.commit()


# Singleton instance consumed by the controller.
ccm_provider_service = CcmProviderService()
