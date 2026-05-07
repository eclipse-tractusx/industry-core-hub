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

import re
from datetime import datetime, timezone
from uuid import UUID
from typing import List, Optional, Dict

from tractusx_sdk.industry.models.notifications import Notification
from tractusx_sdk.industry.services.notifications import NotificationConsumerService
from tractusx_sdk.industry.services.notifications.exceptions import NotificationError
from tractusx_sdk.dataspace.services.connector.base_connector_consumer import BaseConnectorConsumerService

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from models.metadata_database.notification.models import NotificationStatus, NotificationDirection, NotificationEntity
from models.services.notification.responses import NotificationResponse
from tools.exceptions import NotificationCreationError, NotificationUpdateStatusError, NotificationRetrievalError, NotificationDeleteError, NotificationSendingError
from tools.constants import SEM_ID_NOTIFICATION

from connector import connector_manager
from dtr import dtr_manager

logger = LoggingManager.get_logger(__name__)

class NotificationsManagementService():
    """
    Service class for managing notifications.
    """

    def __init__(self):
        self.connector_consumer_service: BaseConnectorConsumerService = connector_manager.consumer.connector_service
        self.submodel_service_manager = SubmodelServiceManager()

    @staticmethod
    def _derive_endpoint_path(context: str) -> str:
        """
        Derive the DigitalTwinEventAPI endpoint path from a notification context string.

        Example: ``IndustryCore-DigitalTwinEventAPI-ConnectToParent:3.0.0``
                 → ``/connect-to-parent``
        """
        try:
            marker = "DigitalTwinEventAPI-"
            idx = context.index(marker) + len(marker)
            type_name = context[idx:].split(":")[0]  # e.g. "ConnectToParent"
            kebab = re.sub(r"([A-Z])", r"-\1", type_name).lower().lstrip("-")
            return f"/{kebab}"
        except (ValueError, IndexError):
            logger.warning(
                f"[Notifications] Could not derive endpoint path from context '{context}', using empty path"
            )
            return ""

    @staticmethod
    def _build_location(message_id: UUID) -> str:
        """
        Build a stable location reference for the stored notification payload.
        """
        return f"{SEM_ID_NOTIFICATION}:{message_id}"

    def _remove_existing_edr_for_digital_twin_event_api(self, provider_bpn: str) -> None:
        """
        Before sending a notification, remove any cached EDR for the
        DigitalTwinEventAPI asset of this provider so we never reuse a stale token.
        Delegates to the DTR manager's reusable purge helper.
        """
        rows = dtr_manager.purge_edrs_matching(
            counter_party_id=provider_bpn,
            asset_id_pattern="ichub:asset:digitaltwin-event:%",
        )
        logger.debug(
            f"[Notifications] Purged {rows} stale DigitalTwinEventAPI EDR(s) "
            f"for provider [{provider_bpn}]"
        )

    def create_notification(self, notification: Notification, direction: NotificationDirection, use_case: str = None) -> NotificationEntity:
        """
        Create a new notification in the system.

        ``message_id`` and ``sent_date_time`` default to a server-generated UUID
        and the current UTC timestamp respectively when not supplied by the caller
        (the SDK ``NotificationHeader`` model handles this via ``default_factory``).
        Caller-supplied values are preserved as-is.
        """
        try:
            status: NotificationStatus = None
            if direction == NotificationDirection.INCOMING:
                logger.info(f"Creating incoming notification with ID: {notification.header.message_id}")
                status = NotificationStatus.RECEIVED
            elif direction == NotificationDirection.OUTGOING:
                logger.info(f"Creating outgoing notification with ID: {notification.header.message_id}")
                status = NotificationStatus.PENDING

            # Store payload using camelCase aliases so full_notification in the
            # API response is consistent with the Catena-X notification schema
            # and the camelCase keys used in request bodies (senderBpn, etc.).
            payload = notification.model_dump(mode="json", by_alias=True)
            self.submodel_service_manager.upload_twin_aspect_document(
                submodel_id=notification.header.message_id,
                semantic_id=SEM_ID_NOTIFICATION,
                payload=payload
            )
            location = self._build_location(notification.header.message_id)
            with RepositoryManagerFactory().create() as repos:
                notification_data = repos.notification_repository.create_new(
                    notification=notification,
                    direction=direction,
                    status=status,
                    use_case=use_case,
                    location=location
                )
                return notification_data
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            raise NotificationCreationError(f"Failed to create notification: {e}")

    def update_notification_status(self, message_id: UUID, new_status: NotificationStatus) -> Optional[NotificationEntity]:
        """
        Update the status of an existing notification identified by its message_id.
        """
        try:
            with RepositoryManagerFactory().create() as repos:
                db_obj = repos.notification_repository.update_status(message_id=message_id, new_status=new_status)
                return db_obj
        except Exception as e:
            logger.error(f"Error updating notification status: {e}")
            raise NotificationUpdateStatusError(f"Failed to update notification status: {e}")
        
    def get_all_notifications(self, bpn: str, status: Optional[NotificationStatus] = None, use_case: Optional[str] = None, offset: int = 0, limit: int = 100) -> List[NotificationResponse]:
        """
        Retrieve all notifications from the database, optionally filtered by BPN, status, and use_case, with pagination support.
        """
        try:
            with RepositoryManagerFactory().create() as repos:
                notifications = repos.notification_repository.find_by_bpn(bpn=bpn, status=status, use_case=use_case, offset=offset, limit=limit)
                responses: List[NotificationResponse] = []
                for notification in notifications:
                    payload = self.submodel_service_manager.get_twin_aspect_document(
                        submodel_id=notification.message_id,
                        semantic_id=SEM_ID_NOTIFICATION
                    )
                    responses.append(NotificationResponse(
                        id=notification.id,
                        created_at=notification.created_at,
                        message_id=notification.message_id,
                        sender_bpn=notification.sender_bpn,
                        receiver_bpn=notification.receiver_bpn,
                        direction=notification.direction,
                        status=notification.status,
                        use_case=notification.use_case,
                        full_notification=payload
                    ))
                return responses
        except Exception as e:
            logger.error(f"Error retrieving notifications: {e}")
            raise NotificationRetrievalError(f"Failed to retrieve notifications: {e}")
        
    def delete_notification(self, message_id: UUID) -> bool:
        """
        Delete a notification from the database by its message_id.
        """
        try:
            with RepositoryManagerFactory().create() as repos:
                db_notification = repos.notification_repository.find_by_message_id(
                    message_id=message_id
                )
                if not db_notification:
                    return False

                self.submodel_service_manager.delete_twin_aspect_document(
                    submodel_id=message_id,
                    semantic_id=SEM_ID_NOTIFICATION
                )
                success = repos.notification_repository.delete_by_message_id(
                    message_id=message_id
                )
                return success
        except Exception as e:
            logger.error(f"Error deleting notification: {e}")
            raise NotificationDeleteError(f"Failed to delete notification: {e}")

    def send_notification(self, message_id: UUID, endpoint_url: Optional[str], provider_bpn: str, provider_dsp_url: Optional[str], list_policies: Optional[List[Dict]]) -> None:
        """
        Send a notification to the specified endpoint using the connector consumer service.
        Retrieves the notification from the database using the message_id.

        If ``endpoint_url`` is None, the path is derived automatically from the
        notification's ``header.context`` (e.g. ``ConnectToParent`` → ``/connect-to-parent``).

        If ``provider_dsp_url`` is None, the DSP URL is resolved automatically
        from the connector discovery cache for the given ``provider_bpn``.

        If ``list_policies`` is None or empty, the policy defined at
        ``provider.digitalTwinEventAPI.policy.usage`` in ``configuration.yml`` is
        used as the fallback.
        """
        try:
            # Resolve DSP URL: use provided value or fall back to connector discovery
            resolved_dsp_url = provider_dsp_url
            if not resolved_dsp_url:
                connectors = connector_manager.consumer.get_connectors(provider_bpn)
                if not connectors:
                    raise NotificationSendingError(
                        f"No connector DSP URL found for provider BPN [{provider_bpn}]. "
                        "Please provide provider_dsp_url explicitly."
                    )
                resolved_dsp_url = connectors[0]
                logger.debug(
                    f"[Notifications] No provider_dsp_url provided; using discovered "
                    f"DSP URL [{resolved_dsp_url}] for BPN [{provider_bpn}]"
                )

            # Resolve policies: caller-supplied takes precedence over config fallback
            resolved_policies = list_policies
            if not resolved_policies:
                dte_policy = ConfigManager.get_config("provider.digitalTwinEventAPI.policy.usage")
                if dte_policy:
                    resolved_policies = [dte_policy]
                    logger.debug("[Notifications] No governance provided; using provider.digitalTwinEventAPI.policy.usage from configuration")

            with RepositoryManagerFactory().create() as repos:
                self._remove_existing_edr_for_digital_twin_event_api(provider_bpn)
                db_notification = repos.notification_repository.find_by_message_id(
                    message_id=message_id
                )
                if not db_notification:
                    raise NotificationSendingError("Notification not found")

            payload = self.submodel_service_manager.get_twin_aspect_document(
                submodel_id=message_id,
                semantic_id=SEM_ID_NOTIFICATION
            )
            notification = db_notification.to_sdk(payload)

            # Stamp the actual dispatch time so sentDateTime in the payload reflects
            # when the message left this system, not when it was pre-created.
            notification.header.sent_date_time = datetime.now(timezone.utc)
            # Store with camelCase aliases consistent with the rest of the payload
            updated_payload = notification.model_dump(mode="json", by_alias=True)
            self.submodel_service_manager.upload_twin_aspect_document(
                submodel_id=message_id,
                semantic_id=SEM_ID_NOTIFICATION,
                payload=updated_payload
            )

            # Resolve endpoint path: explicit override or derived from context
            resolved_endpoint = endpoint_url or self._derive_endpoint_path(notification.header.context)

            notification_service = NotificationConsumerService(
                self.connector_consumer_service,
                verbose=True
            )

            result = notification_service.send_notification(
                provider_bpn=provider_bpn,
                provider_dsp_url=resolved_dsp_url,
                notification=notification,
                endpoint_path=resolved_endpoint,
                policies=resolved_policies
            )
            self.update_notification_status(
                message_id=message_id,
                new_status=NotificationStatus.SENT
            )
            logger.info(f"Notification sent with result: {result}")
            return result

        except NotificationError as ne:
            logger.error(f"NotificationError sending notification: {ne}")
            raise NotificationSendingError(
                message=f"NotificationError: {ne}",
                details=[
                    f"Provider BPN: {provider_bpn}",
                    f"DSP URL attempted: {resolved_dsp_url}",
                    f"Notification ID: {message_id}",
                ]
            )
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            raise NotificationSendingError(f"Failed to send notification: {e}")
