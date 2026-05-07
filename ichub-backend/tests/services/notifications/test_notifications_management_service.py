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

import pytest
from uuid import uuid4
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone

from services.notifications.notifications_management_service import NotificationsManagementService
from models.metadata_database.notification.models import (
    NotificationStatus,
    NotificationDirection,
    NotificationEntity
)
from models.services.notification.responses import NotificationResponse
from tools.exceptions import (
    NotificationCreationError,
    NotificationUpdateStatusError,
    NotificationRetrievalError,
    NotificationDeleteError,
    NotificationSendingError
)
from tools.constants import SEM_ID_NOTIFICATION
from tractusx_sdk.industry.models.notifications import Notification


class TestNotificationsManagementService:
    """Test suite for NotificationsManagementService class."""

    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.service = NotificationsManagementService()
        self.service.submodel_service_manager = Mock()

    @pytest.fixture
    def mock_repo_manager(self):
        """Create mock repository manager with context manager support."""
        repo = MagicMock()
        repo.notification_repository = Mock()
        # Make it work as a context manager
        repo.__enter__ = Mock(return_value=repo)
        repo.__exit__ = Mock(return_value=None)
        return repo

    @pytest.fixture
    def sample_notification_sdk(self):
        """Create sample SDK notification object."""
        notification = Mock(spec=Notification)
        notification.header = Mock()
        notification.header.message_id = uuid4()
        notification.header.sender_bpn = "BPNL00000000024R"
        notification.header.receiver_bpn = "BPNL000000000342"
        notification.model_dump = Mock(return_value={
            "header": {
                "message_id": str(notification.header.message_id),
                "sender_bpn": "BPNL00000000024R",
                "receiver_bpn": "BPNL000000000342"
            },
            "content": {"test": "data"}
        })
        return notification

    @pytest.fixture
    def sample_notification_entity(self, sample_notification_sdk):
        """Create sample database notification entity."""
        entity = Mock(spec=NotificationEntity)
        entity.id = 1
        entity.message_id = sample_notification_sdk.header.message_id
        entity.sender_bpn = "BPNL00000000024R"
        entity.receiver_bpn = "BPNL000000000342"
        entity.direction = NotificationDirection.INCOMING
        entity.status = NotificationStatus.RECEIVED
        entity.created_at = datetime.now(timezone.utc)
        entity.use_case = "Industry Core Hub"
        entity.location = f"urn:samm:io.tractusx.industry-core-hub.notifications:1.0.0#Notification:{entity.message_id}"
        return entity

    def test_init(self):
        """Test service initialization."""
        # Act
        service = NotificationsManagementService()
        
        # Assert
        assert service.connector_consumer_service is not None

    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_create_notification_incoming_success(self, mock_repo_factory, sample_notification_sdk, sample_notification_entity):
        """Test successful incoming notification creation."""
        # Arrange
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.create_new.return_value = sample_notification_entity
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager
        self.service.submodel_service_manager.upload_twin_aspect_document.return_value = None
        
        # Act
        result = self.service.create_notification(
            notification=sample_notification_sdk,
            direction=NotificationDirection.INCOMING
        )
        
        # Assert
        assert result == sample_notification_entity
        mock_repo_manager.notification_repository.create_new.assert_called_once()
        call_kwargs = mock_repo_manager.notification_repository.create_new.call_args[1]
        assert call_kwargs['notification'] == sample_notification_sdk
        assert call_kwargs['direction'] == NotificationDirection.INCOMING
        assert call_kwargs['status'] == NotificationStatus.RECEIVED
        assert call_kwargs['location'] == f"urn:samm:io.tractusx.industry-core-hub.notifications:1.0.0#Notification:{sample_notification_sdk.header.message_id}"
        self.service.submodel_service_manager.upload_twin_aspect_document.assert_called_once()

    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_create_notification_outgoing_success(self, mock_repo_factory, sample_notification_sdk, sample_notification_entity):
        """Test successful outgoing notification creation."""
        # Arrange
        sample_notification_entity.direction = NotificationDirection.OUTGOING
        sample_notification_entity.status = NotificationStatus.PENDING
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.create_new.return_value = sample_notification_entity
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager
        self.service.submodel_service_manager.upload_twin_aspect_document.return_value = None
        
        # Act
        result = self.service.create_notification(
            notification=sample_notification_sdk,
            direction=NotificationDirection.OUTGOING,
            use_case="Test Use Case"
        )
        
        # Assert
        assert result == sample_notification_entity
        call_kwargs = mock_repo_manager.notification_repository.create_new.call_args[1]
        assert call_kwargs['direction'] == NotificationDirection.OUTGOING
        assert call_kwargs['status'] == NotificationStatus.PENDING
        assert call_kwargs['use_case'] == "Test Use Case"
        assert call_kwargs['location'] == f"urn:samm:io.tractusx.industry-core-hub.notifications:1.0.0#Notification:{sample_notification_sdk.header.message_id}"
        self.service.submodel_service_manager.upload_twin_aspect_document.assert_called_once()

    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_create_notification_repository_error(self, mock_repo_factory, sample_notification_sdk):
        """Test notification creation with repository error."""
        # Arrange
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.create_new.side_effect = Exception("Database error")
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager
        self.service.submodel_service_manager.upload_twin_aspect_document.return_value = None
        
        # Act & Assert
        with pytest.raises(NotificationCreationError) as exc_info:
            self.service.create_notification(
                notification=sample_notification_sdk,
                direction=NotificationDirection.INCOMING
            )
        assert "Failed to create notification" in str(exc_info.value)

    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_update_notification_status_success(self, mock_repo_factory, sample_notification_entity):
        """Test successful notification status update."""
        # Arrange
        message_id = uuid4()
        updated_entity = sample_notification_entity
        updated_entity.status = NotificationStatus.READ
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.update_status.return_value = updated_entity
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager
        
        # Act
        result = self.service.update_notification_status(
            message_id=message_id,
            new_status=NotificationStatus.READ
        )
        
        # Assert
        assert result == updated_entity
        mock_repo_manager.notification_repository.update_status.assert_called_once_with(
            message_id=message_id,
            new_status=NotificationStatus.READ
        )

    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_update_notification_status_not_found(self, mock_repo_factory):
        """Test update notification status when notification not found."""
        # Arrange
        message_id = uuid4()
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.update_status.return_value = None
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager
        
        # Act
        result = self.service.update_notification_status(
            message_id=message_id,
            new_status=NotificationStatus.READ
        )
        
        # Assert
        assert result is None

    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_update_notification_status_error(self, mock_repo_factory):
        """Test update notification status with error."""
        # Arrange
        message_id = uuid4()
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.update_status.side_effect = Exception("Update error")
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager
        
        # Act & Assert
        with pytest.raises(NotificationUpdateStatusError) as exc_info:
            self.service.update_notification_status(
                message_id=message_id,
                new_status=NotificationStatus.READ
            )
        assert "Failed to update notification status" in str(exc_info.value)

    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_get_all_notifications_success(self, mock_repo_factory, sample_notification_entity):
        """Test successful retrieval of all notifications."""
        # Arrange
        bpn = "BPNL00000000024R"
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_bpn.return_value = [sample_notification_entity]
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager
        self.service.submodel_service_manager.get_twin_aspect_document.return_value = {
            "header": {"message_id": str(sample_notification_entity.message_id)},
            "content": {"test": "data"}
        }
        
        # Act
        result = self.service.get_all_notifications(
            bpn=bpn,
            status=NotificationStatus.RECEIVED,
            offset=0,
            limit=10
        )
        
        # Assert
        assert len(result) == 1
        assert isinstance(result[0], NotificationResponse)
        mock_repo_manager.notification_repository.find_by_bpn.assert_called_once_with(
            bpn=bpn,
            status=NotificationStatus.RECEIVED,
            use_case=None,
            offset=0,
            limit=10
        )

    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_get_all_notifications_empty(self, mock_repo_factory):
        """Test retrieval of notifications when none exist."""
        # Arrange
        bpn = "BPNL00000000024R"
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_bpn.return_value = []
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager
        self.service.submodel_service_manager.get_twin_aspect_document.return_value = {}
        
        # Act
        result = self.service.get_all_notifications(bpn=bpn)
        
        # Assert
        assert result == []

    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_get_all_notifications_with_filters(self, mock_repo_factory, sample_notification_entity):
        """Test retrieval of notifications with multiple filters."""
        # Arrange
        bpn = "BPNL00000000024R"
        use_case = "Test Use Case"
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_bpn.return_value = [sample_notification_entity]
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager
        self.service.submodel_service_manager.get_twin_aspect_document.return_value = {
            "header": {"message_id": str(sample_notification_entity.message_id)},
            "content": {"test": "data"}
        }
        
        # Act
        result = self.service.get_all_notifications(
            bpn=bpn,
            status=NotificationStatus.PENDING,
            use_case=use_case,
            offset=5,
            limit=20
        )
        
        # Assert
        assert len(result) == 1
        mock_repo_manager.notification_repository.find_by_bpn.assert_called_once_with(
            bpn=bpn,
            status=NotificationStatus.PENDING,
            use_case=use_case,
            offset=5,
            limit=20
        )

    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_get_all_notifications_retrieval_error(self, mock_repo_factory):
        """Test get_all_notifications with retrieval error."""
        # Arrange
        bpn = "BPNL00000000024R"
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_bpn.side_effect = Exception("DB error")
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager
        
        # Act & Assert
        with pytest.raises(NotificationRetrievalError) as exc_info:
            self.service.get_all_notifications(bpn=bpn)
        assert "Failed to retrieve notifications" in str(exc_info.value)

    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_delete_notification_success(self, mock_repo_factory):
        """Test successful notification deletion."""
        # Arrange
        message_id = uuid4()
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_message_id.return_value = Mock()
        mock_repo_manager.notification_repository.delete_by_message_id.return_value = True
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager
        
        # Act
        result = self.service.delete_notification(message_id=message_id)
        
        # Assert
        assert result is True
        mock_repo_manager.notification_repository.find_by_message_id.assert_called_once_with(
            message_id=message_id
        )
        self.service.submodel_service_manager.delete_twin_aspect_document.assert_called_once_with(
            submodel_id=message_id,
            semantic_id=SEM_ID_NOTIFICATION
        )
        mock_repo_manager.notification_repository.delete_by_message_id.assert_called_once_with(
            message_id=message_id
        )

    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_delete_notification_not_found(self, mock_repo_factory):
        """Test delete notification when not found."""
        # Arrange
        message_id = uuid4()
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_message_id.return_value = None
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager
        
        # Act
        result = self.service.delete_notification(message_id=message_id)
        
        # Assert
        assert result is False
        mock_repo_manager.notification_repository.delete_by_message_id.assert_not_called()
        self.service.submodel_service_manager.delete_twin_aspect_document.assert_not_called()

    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_delete_notification_error(self, mock_repo_factory):
        """Test delete notification with error."""
        # Arrange
        message_id = uuid4()
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_message_id.return_value = Mock()
        self.service.submodel_service_manager.delete_twin_aspect_document.side_effect = Exception("Delete error")
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager
        
        # Act & Assert
        with pytest.raises(NotificationDeleteError) as exc_info:
            self.service.delete_notification(message_id=message_id)
        assert "Failed to delete notification" in str(exc_info.value)

    @patch('services.notifications.notifications_management_service.NotificationConsumerService')
    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_send_notification_success(self, mock_repo_factory, mock_notification_consumer_service):
        """Test successful notification sending."""
        # Arrange
        message_id = uuid4()
        endpoint_url = "/test/endpoint"
        provider_bpn = "BPNL00000000024R"
        provider_dsp_url = "https://example.com/dsp"
        list_policies = [{"policy": "test"}]

        mock_notification = Mock(spec=Notification)
        mock_notification.header = Mock()
        mock_notification.header.context = "IndustryCore-DigitalTwinEventAPI-ConnectToParent:3.0.0"
        mock_notification.model_dump.return_value = {"some": "payload"}
        mock_db_notification = Mock()
        mock_db_notification.to_sdk.return_value = mock_notification

        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_message_id.return_value = mock_db_notification
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager

        self.service.submodel_service_manager = Mock()
        self.service.submodel_service_manager.get_twin_aspect_document.return_value = {"some": "payload"}
        self.service.submodel_service_manager.upload_twin_aspect_document.return_value = None

        mock_service_instance = Mock()
        mock_service_instance.send_notification.return_value = {"status": "sent"}
        mock_notification_consumer_service.return_value = mock_service_instance
        
        self.service.connector_consumer_service = Mock()
        
        # Act
        result = self.service.send_notification(
            message_id=message_id,
            endpoint_url=endpoint_url,
            provider_bpn=provider_bpn,
            provider_dsp_url=provider_dsp_url,
            list_policies=list_policies
        )
        
        # Assert
        assert result == {"status": "sent"}
        mock_notification_consumer_service.assert_called_once_with(
            self.service.connector_consumer_service,
            verbose=True
        )
        mock_service_instance.send_notification.assert_called_once_with(
            provider_bpn=provider_bpn,
            provider_dsp_url=provider_dsp_url,
            notification=mock_notification,
            endpoint_path=endpoint_url,
            policies=list_policies
        )
        mock_repo_manager.notification_repository.update_status.assert_called_once_with(
            message_id=message_id,
            new_status=NotificationStatus.SENT
        )

    @patch('services.notifications.notifications_management_service.NotificationConsumerService')
    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_send_notification_notification_error(self, mock_repo_factory, mock_notification_consumer_service):
        """Test send_notification with NotificationError."""
        # Arrange
        from tractusx_sdk.industry.services.notifications.exceptions import NotificationError

        message_id = uuid4()
        endpoint_url = "/test/endpoint"
        provider_bpn = "BPNL00000000024R"
        provider_dsp_url = "https://example.com/dsp"
        list_policies = [{"policy": "test"}]

        mock_notification_obj = Mock(spec=Notification)
        mock_notification_obj.header = Mock()
        mock_notification_obj.header.context = "IndustryCore-DigitalTwinEventAPI-ConnectToParent:3.0.0"
        mock_notification_obj.model_dump.return_value = {"some": "payload"}
        mock_db_notification = Mock()
        mock_db_notification.to_sdk.return_value = mock_notification_obj

        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_message_id.return_value = mock_db_notification
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager

        self.service.submodel_service_manager = Mock()
        self.service.submodel_service_manager.get_twin_aspect_document.return_value = {"some": "payload"}
        self.service.submodel_service_manager.upload_twin_aspect_document.return_value = None

        mock_service_instance = Mock()
        mock_service_instance.send_notification.side_effect = NotificationError("Send failed")
        mock_notification_consumer_service.return_value = mock_service_instance

        self.service.connector_consumer_service = Mock()
        
        # Act & Assert
        with pytest.raises(NotificationSendingError) as exc_info:
            self.service.send_notification(
                message_id=message_id,
                endpoint_url=endpoint_url,
                provider_bpn=provider_bpn,
                provider_dsp_url=provider_dsp_url,
                list_policies=list_policies
            )
        assert "NotificationError" in str(exc_info.value)
        mock_repo_manager.notification_repository.update_status.assert_not_called()

    @patch('services.notifications.notifications_management_service.NotificationConsumerService')
    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_send_notification_generic_error(self, mock_repo_factory, mock_notification_consumer_service):
        """Test send_notification with generic error."""
        # Arrange
        message_id = uuid4()
        endpoint_url = "/test/endpoint"
        provider_bpn = "BPNL00000000024R"
        provider_dsp_url = "https://example.com/dsp"
        list_policies = [{"policy": "test"}]

        mock_db_notification = Mock()
        mock_db_notification.to_sdk.return_value = Mock(spec=Notification)

        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_message_id.return_value = mock_db_notification
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager

        self.service.submodel_service_manager = Mock()
        self.service.submodel_service_manager.get_twin_aspect_document.return_value = {"some": "payload"}
        
        mock_service_instance = Mock()
        mock_service_instance.send_notification.side_effect = Exception("Generic error")
        mock_notification_consumer_service.return_value = mock_service_instance

        self.service.connector_consumer_service = Mock()
        
        # Act & Assert
        with pytest.raises(NotificationSendingError) as exc_info:
            self.service.send_notification(
                message_id=message_id,
                endpoint_url=endpoint_url,
                provider_bpn=provider_bpn,
                provider_dsp_url=provider_dsp_url,
                list_policies=list_policies
            )
        assert "Failed to send notification" in str(exc_info.value)
        mock_repo_manager.notification_repository.update_status.assert_not_called()

    # ------------------------------------------------------------------
    # Optional parameter resolution — endpoint_path auto-derivation
    # ------------------------------------------------------------------

    @patch('services.notifications.notifications_management_service.dtr_manager')
    @patch('services.notifications.notifications_management_service.NotificationConsumerService')
    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_send_notification_endpoint_derived_from_context(
        self, mock_repo_factory, mock_notification_consumer_service, mock_dtr_manager
    ):
        """When endpoint_url is None, derive it from notification.header.context."""
        # Arrange
        message_id = uuid4()
        provider_bpn = "BPNL00000000024R"
        provider_dsp_url = "https://example.com/dsp"

        mock_notification = Mock(spec=Notification)
        mock_notification.header = Mock()
        mock_notification.header.context = "IndustryCore-DigitalTwinEventAPI-ConnectToParent:3.0.0"

        mock_db_notification = Mock()
        mock_db_notification.to_sdk.return_value = mock_notification

        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_message_id.return_value = mock_db_notification
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager

        self.service.submodel_service_manager = Mock()
        self.service.submodel_service_manager.get_twin_aspect_document.return_value = {"some": "payload"}

        mock_service_instance = Mock()
        mock_service_instance.send_notification.return_value = {"status": "sent"}
        mock_notification_consumer_service.return_value = mock_service_instance

        self.service.connector_consumer_service = Mock()

        # Act
        self.service.send_notification(
            message_id=message_id,
            endpoint_url=None,
            provider_bpn=provider_bpn,
            provider_dsp_url=provider_dsp_url,
            list_policies=[{"policy": "test"}],
        )

        # Assert — SDK must be called with the derived path, not None
        call_kwargs = mock_service_instance.send_notification.call_args[1]
        assert call_kwargs["endpoint_path"] == "/connect-to-parent"

    @patch('services.notifications.notifications_management_service.dtr_manager')
    @patch('services.notifications.notifications_management_service.NotificationConsumerService')
    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_send_notification_dsp_url_resolved_from_connector_discovery(
        self, mock_repo_factory, mock_notification_consumer_service, mock_dtr_manager,
        mock_connector_manager
    ):
        """When provider_dsp_url is None, resolve it through connector discovery."""
        # Arrange
        message_id = uuid4()
        provider_bpn = "BPNL00000000024R"
        discovered_dsp_url = "https://discovered.partner.example.com/api/v1/dsp"

        mock_connector_manager.consumer.get_connectors.return_value = [discovered_dsp_url]

        mock_notification = Mock(spec=Notification)
        mock_notification.header = Mock()
        mock_notification.header.context = "IndustryCore-DigitalTwinEventAPI-Feedback:1.0.0"

        mock_db_notification = Mock()
        mock_db_notification.to_sdk.return_value = mock_notification

        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_message_id.return_value = mock_db_notification
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager

        self.service.submodel_service_manager = Mock()
        self.service.submodel_service_manager.get_twin_aspect_document.return_value = {"some": "payload"}

        mock_service_instance = Mock()
        mock_service_instance.send_notification.return_value = {"status": "sent"}
        mock_notification_consumer_service.return_value = mock_service_instance

        self.service.connector_consumer_service = Mock()

        # Act
        self.service.send_notification(
            message_id=message_id,
            endpoint_url="/feedback",
            provider_bpn=provider_bpn,
            provider_dsp_url=None,
            list_policies=[{"policy": "test"}],
        )

        # Assert — SDK must receive the discovered DSP URL
        mock_connector_manager.consumer.get_connectors.assert_called_once_with(provider_bpn)
        call_kwargs = mock_service_instance.send_notification.call_args[1]
        assert call_kwargs["provider_dsp_url"] == discovered_dsp_url

    @patch('services.notifications.notifications_management_service.dtr_manager')
    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_send_notification_no_connectors_found_raises_error(
        self, mock_repo_factory, mock_dtr_manager, mock_connector_manager
    ):
        """When provider_dsp_url is None and discovery returns nothing, raise NotificationSendingError."""
        # Arrange
        mock_connector_manager.consumer.get_connectors.return_value = []

        mock_repo_manager = MagicMock()
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager

        # Act & Assert
        with pytest.raises(NotificationSendingError) as exc_info:
            self.service.send_notification(
                message_id=uuid4(),
                endpoint_url="/feedback",
                provider_bpn="BPNL00000000024R",
                provider_dsp_url=None,
                list_policies=[{"policy": "test"}],
            )
        assert "No connector DSP URL found" in str(exc_info.value)

    @patch('services.notifications.notifications_management_service.dtr_manager')
    @patch('services.notifications.notifications_management_service.ConfigManager')
    @patch('services.notifications.notifications_management_service.NotificationConsumerService')
    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_send_notification_policies_from_config_when_none(
        self, mock_repo_factory, mock_notification_consumer_service, mock_config_manager, mock_dtr_manager
    ):
        """When list_policies is None, fall back to provider.digitalTwinEventAPI.policy.usage from config."""
        # Arrange
        config_policy = {"permissions": [{"action": "use"}], "prohibitions": [], "obligations": []}
        mock_config_manager.get_config.return_value = config_policy

        mock_notification = Mock(spec=Notification)
        mock_notification.header = Mock()
        mock_notification.header.context = "IndustryCore-DigitalTwinEventAPI-ConnectToChild:3.0.0"

        mock_db_notification = Mock()
        mock_db_notification.to_sdk.return_value = mock_notification

        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_message_id.return_value = mock_db_notification
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager

        self.service.submodel_service_manager = Mock()
        self.service.submodel_service_manager.get_twin_aspect_document.return_value = {"some": "payload"}

        mock_service_instance = Mock()
        mock_service_instance.send_notification.return_value = {"status": "sent"}
        mock_notification_consumer_service.return_value = mock_service_instance
        self.service.connector_consumer_service = Mock()

        # Act
        self.service.send_notification(
            message_id=uuid4(),
            endpoint_url="/connect-to-child",
            provider_bpn="BPNL00000000024R",
            provider_dsp_url="https://example.com/dsp",
            list_policies=None,
        )

        # Assert — policy from config is wrapped in a list and forwarded
        mock_config_manager.get_config.assert_called_with(
            "provider.digitalTwinEventAPI.policy.usage"
        )
        call_kwargs = mock_service_instance.send_notification.call_args[1]
        assert call_kwargs["policies"] == [config_policy]

    @patch('services.notifications.notifications_management_service.dtr_manager')
    @patch('services.notifications.notifications_management_service.ConfigManager')
    @patch('services.notifications.notifications_management_service.NotificationConsumerService')
    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_send_notification_policies_from_config_when_empty_list(
        self, mock_repo_factory, mock_notification_consumer_service, mock_config_manager, mock_dtr_manager
    ):
        """An empty list_policies also triggers the config fallback."""
        # Arrange
        config_policy = {"permissions": [{"action": "use"}]}
        mock_config_manager.get_config.return_value = config_policy

        mock_notification = Mock(spec=Notification)
        mock_notification.header = Mock()
        mock_notification.header.context = "IndustryCore-DigitalTwinEventAPI-Feedback:1.0.0"

        mock_db_notification = Mock()
        mock_db_notification.to_sdk.return_value = mock_notification

        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_message_id.return_value = mock_db_notification
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager

        self.service.submodel_service_manager = Mock()
        self.service.submodel_service_manager.get_twin_aspect_document.return_value = {"some": "payload"}

        mock_service_instance = Mock()
        mock_service_instance.send_notification.return_value = {"status": "sent"}
        mock_notification_consumer_service.return_value = mock_service_instance
        self.service.connector_consumer_service = Mock()

        # Act
        self.service.send_notification(
            message_id=uuid4(),
            endpoint_url="/feedback",
            provider_bpn="BPNL00000000024R",
            provider_dsp_url="https://example.com/dsp",
            list_policies=[],
        )

        # Assert
        call_kwargs = mock_service_instance.send_notification.call_args[1]
        assert call_kwargs["policies"] == [config_policy]

    @patch('services.notifications.notifications_management_service.dtr_manager')
    @patch('services.notifications.notifications_management_service.ConfigManager')
    @patch('services.notifications.notifications_management_service.NotificationConsumerService')
    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_send_notification_all_params_auto_resolved(
        self, mock_repo_factory, mock_notification_consumer_service, mock_config_manager,
        mock_dtr_manager, mock_connector_manager
    ):
        """All three optional params are resolved automatically when omitted."""
        # Arrange — connector discovery returns a URL
        discovered_dsp = "https://auto-discovered.example.com/api/v1/dsp"
        mock_connector_manager.consumer.get_connectors.return_value = [discovered_dsp]

        # Config returns a policy
        config_policy = {"permissions": [{"action": "use"}]}
        mock_config_manager.get_config.return_value = config_policy

        # Notification context drives endpoint path
        mock_notification = Mock(spec=Notification)
        mock_notification.header = Mock()
        mock_notification.header.context = "IndustryCore-DigitalTwinEventAPI-SubmodelUpdate:1.0.0"

        mock_db_notification = Mock()
        mock_db_notification.to_sdk.return_value = mock_notification

        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_message_id.return_value = mock_db_notification
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager

        self.service.submodel_service_manager = Mock()
        self.service.submodel_service_manager.get_twin_aspect_document.return_value = {"some": "payload"}

        mock_service_instance = Mock()
        mock_service_instance.send_notification.return_value = {"status": "sent"}
        mock_notification_consumer_service.return_value = mock_service_instance
        self.service.connector_consumer_service = Mock()

        # Act
        self.service.send_notification(
            message_id=uuid4(),
            endpoint_url=None,
            provider_bpn="BPNL00000000024R",
            provider_dsp_url=None,
            list_policies=None,
        )

        # Assert all three were substituted correctly
        call_kwargs = mock_service_instance.send_notification.call_args[1]
        assert call_kwargs["endpoint_path"] == "/submodel-update"
        assert call_kwargs["provider_dsp_url"] == discovered_dsp
        assert call_kwargs["policies"] == [config_policy]

    @patch('services.notifications.notifications_management_service.dtr_manager')
    @patch('services.notifications.notifications_management_service.NotificationConsumerService')
    @patch('services.notifications.notifications_management_service.RepositoryManagerFactory')
    def test_send_notification_not_found_raises_error(
        self, mock_repo_factory, mock_notification_consumer_service, mock_dtr_manager
    ):
        """If the notification does not exist in the DB, raise NotificationSendingError."""
        # Arrange
        mock_repo_manager = MagicMock()
        mock_repo_manager.notification_repository.find_by_message_id.return_value = None
        mock_repo_manager.__enter__.return_value = mock_repo_manager
        mock_repo_manager.__exit__.return_value = None
        mock_repo_factory.return_value.create.return_value = mock_repo_manager

        self.service.connector_consumer_service = Mock()

        # Act & Assert
        with pytest.raises(NotificationSendingError) as exc_info:
            self.service.send_notification(
                message_id=uuid4(),
                endpoint_url="/feedback",
                provider_bpn="BPNL00000000024R",
                provider_dsp_url="https://example.com/dsp",
                list_policies=[{"policy": "test"}],
            )
        assert "Notification not found" in str(exc_info.value)
        mock_notification_consumer_service.return_value.send_notification.assert_not_called()


class TestDeriveEndpointPath:
    """Unit tests for the _derive_endpoint_path static method.

    The method converts the notification context string into a URL path segment
    following the PascalCase → kebab-case convention used by the DigitalTwinEventAPI.
    """

    @pytest.mark.parametrize("context,expected_path", [
        (
            "IndustryCore-DigitalTwinEventAPI-ConnectToParent:3.0.0",
            "/connect-to-parent",
        ),
        (
            "IndustryCore-DigitalTwinEventAPI-ConnectToChild:3.0.0",
            "/connect-to-child",
        ),
        (
            "IndustryCore-DigitalTwinEventAPI-SubmodelUpdate:1.0.0",
            "/submodel-update",
        ),
        (
            "IndustryCore-DigitalTwinEventAPI-Feedback:1.0.0",
            "/feedback",
        ),
    ])
    def test_known_notification_contexts(self, context, expected_path):
        """All four standard DigitalTwinEventAPI contexts derive the correct path."""
        assert NotificationsManagementService._derive_endpoint_path(context) == expected_path

    def test_unknown_context_without_marker_returns_empty(self):
        """A context string that does not contain 'DigitalTwinEventAPI-' returns ''."""
        result = NotificationsManagementService._derive_endpoint_path(
            "SomeOther-Context:1.0.0"
        )
        assert result == ""

    def test_empty_context_returns_empty(self):
        """An empty context string returns ''."""
        assert NotificationsManagementService._derive_endpoint_path("") == ""

    def test_different_version_does_not_affect_path(self):
        """The version number after ':' is stripped; only the type name matters."""
        v1 = NotificationsManagementService._derive_endpoint_path(
            "IndustryCore-DigitalTwinEventAPI-ConnectToParent:1.0.0"
        )
        v3 = NotificationsManagementService._derive_endpoint_path(
            "IndustryCore-DigitalTwinEventAPI-ConnectToParent:3.0.0"
        )
        assert v1 == v3 == "/connect-to-parent"
