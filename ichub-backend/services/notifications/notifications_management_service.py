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

from uuid import UUID
from typing import List, Optional, Dict

from tractusx_sdk.extensions.notification_api.models import Notification
from tractusx_sdk.extensions.notification_api import NotificationConsumerService, NotificationError
from tractusx_sdk.dataspace.services.connector.base_connector_consumer import BaseConnectorConsumerService
from sqlalchemy import text

from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from models.metadata_database.notification.models import NotificationStatus, NotificationDirection, NotificationEntity
from models.services.notification.responses import NotificationResponse
from tools.exceptions import NotificationCreationError, NotificationUpdateStatusError, NotificationRetrievalError, NotificationDeleteError, NotificationSendingError
from tools.constants import SEM_ID_NOTIFICATION

from connector import connector_manager

logger = LoggingManager.get_logger(__name__)

class NotificationsManagementService():
    """
    Service class for managing notifications.
    """

    def __init__(self):
        self.connector_consumer_service: BaseConnectorConsumerService = connector_manager.consumer.connector_service
        self.submodel_service_manager = SubmodelServiceManager()

    @staticmethod
    def _build_location(message_id: UUID) -> str:
        """
        Build a stable location reference for the stored notification payload.
        """
        return f"{SEM_ID_NOTIFICATION}:{message_id}"

    def _remove_existing_edr_for_digital_twin_event_api(self, repos, provider_bpn: str):
        """
        Before sending a notification, we must remove any edr_connection that we have store in the database related with the DigitalTwinEventAPI
        to ensure that we are not using an old edr_connection.
        """
        session = repos._session
        session.execute(
            text("DELETE FROM edr_connections WHERE counter_party_id = :cpid AND edr_data->>'assetId' LIKE :asset_id"),
            params={"cpid": provider_bpn, "asset_id": "ichub:asset:digitaltwin-event:%"}
        )
        session.commit()

    def create_notification(self, notification: Notification, direction: NotificationDirection, use_case: str = None) -> NotificationEntity:
        """
        Create a new notification in the system.
        """
        try:
            status: NotificationStatus = None
            if direction == NotificationDirection.INCOMING:
                logger.info(f"Creating incoming notification with ID: {notification.header.message_id}")
                status = NotificationStatus.RECEIVED
            elif direction == NotificationDirection.OUTGOING:
                logger.info(f"Creating outgoing notification with ID: {notification.header.message_id}")
                status = NotificationStatus.PENDING

            payload = notification.model_dump(mode="json")
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

    def send_notification(self, message_id: UUID, endpoint_url: str, provider_bpn: str, provider_dsp_url: str, list_policies: List[Dict]) -> None:
        """
        Send a notification to the specified endpoint using the connector consumer service.
        Retrieves the notification from the database using the message_id.
        """
        try:
            with RepositoryManagerFactory().create() as repos:
                self._remove_existing_edr_for_digital_twin_event_api(repos, provider_bpn)
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

            notification_service = NotificationConsumerService(
                self.connector_consumer_service,
                verbose=True
            )

            result = notification_service.send_notification(
                provider_bpn=provider_bpn,
                provider_dsp_url=provider_dsp_url,
                notification=notification,
                endpoint_path=endpoint_url,
                policies=list_policies
            )
            self.update_notification_status(
                message_id=message_id,
                new_status=NotificationStatus.SENT
            )
            logger.info(f"Notification sent with result: {result}")
            return result

        except NotificationError as ne:
            logger.error(f"NotificationError sending notification: {ne}")
            raise NotificationSendingError(f"NotificationError: {ne}")
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            raise NotificationSendingError(f"Failed to send notification: {e}")
