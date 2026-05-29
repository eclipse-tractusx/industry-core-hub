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

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from tractusx_sdk.industry.models.notifications import Notification

from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
from models.metadata_database.addons.ccm_kit.v1.models import ShareStatus
from models.services.addons.ccm_kit.v1.notifications import (
    CcmRequestContent,
    CcmStatusContent,
    CertificateStatusValue,
)

logger = LoggingManager.get_logger(__name__)

# ---------------------------------------------------------------------------
# Status mapping: CX-0135 consumer status → internal ShareStatus
# ---------------------------------------------------------------------------
_STATUS_MAP: Dict[CertificateStatusValue, ShareStatus] = {
    # RECEIVED means "got it, validating" — keep as Pending until final verdict.
    CertificateStatusValue.RECEIVED: ShareStatus.Pending,
    CertificateStatusValue.ACCEPTED: ShareStatus.Active,
    CertificateStatusValue.REJECTED: ShareStatus.Revoked,
}


class CcmNotificationService:
    """
    Handles the business logic for incoming CCM notification API calls.
    """

    def process_certificate_request(
        self, notification: Notification
    ) -> Tuple[int, Dict[str, Any]]:
        """
        Process a ``POST /companycertificate/request`` notification.

        1. Parse the CCM-specific content (``certifiedBpn``, ``certificateType``).
        2. Look up the certificate in the local database.
        3. If not found → return ``(404, {...})``.
        4. If found → register the consumer BPNL in ``certificate_shares``
           with status ``Pending`` and return ``(200, {...})``.

        Args:
            notification: SDK Notification with header + content.

        Returns:
            Tuple of ``(http_status_code, response_body_dict)``.
        """
        # --- 1. Parse content ---
        content = self._parse_request_content(notification)
        sender_bpn = notification.header.sender_bpn

        logger.info(
            "CCM request from %s for certifiedBpn=%s certificateType=%s",
            sender_bpn,
            content.certified_bpn,
            content.certificate_type,
        )

        # --- 2. Look up certificate ---
        with RepositoryManagerFactory.create() as repo:
            ccm = repo.ccm_repository.find_by_bpnl_and_type(
                bpnl=content.certified_bpn,
                certificate_type=content.certificate_type,
            )

            # --- 3. Not found ---
            if ccm is None:
                logger.warning(
                    "No certificate found for bpnl=%s type=%s (requested by %s)",
                    content.certified_bpn,
                    content.certificate_type,
                    sender_bpn,
                )
                return 404, {
                    "message": (
                        f"No certificate found for BPNL "
                        f"{content.certified_bpn} with type "
                        f"{content.certificate_type}."
                    ),
                }

            # --- 4. Register consumer in certificate_shares ---
            existing_share = (
                repo.certificate_share_repository
                .find_by_certificate_and_consumer(ccm.id, sender_bpn)
            )

            if existing_share is None:
                repo.certificate_share_repository.create_new(
                    certificate_id=ccm.id,
                    consumer_bpnl=sender_bpn,
                    status=ShareStatus.Pending,
                )
                logger.info(
                    "Created new CertificateShare for certificate %d → consumer %s",
                    ccm.id,
                    sender_bpn,
                )
            else:
                # Consumer already has a share record — refresh the timestamp.
                existing_share.last_shared_date = datetime.now(timezone.utc)
                logger.info(
                    "Updated existing CertificateShare %d for consumer %s",
                    existing_share.id,
                    sender_bpn,
                )

            repo.commit()

        # TODO: Trigger async push of the certificate data to the consumer.
        #       This will be implemented in a subsequent issue (Push flow).
        logger.info(
            "Certificate %d queued for push delivery to %s",
            ccm.id,
            sender_bpn,
        )

        return 200, {
            "message": (
                f"Certificate found for BPNL {content.certified_bpn} "
                f"with type {content.certificate_type}. "
                f"Push delivery initiated."
            ),
        }

    def update_certificate_status(
        self, notification: Notification
    ) -> Tuple[int, Dict[str, Any]]:
        """
        Apply a consumer's status feedback via ``POST /companycertificate/status``.

        1. Parse content (``documentId``, ``certificateStatus``).
        2. Look up the certificate by ``documentId``.
        3. Find the ``CertificateShare`` for this consumer.
        4. Update the share status according to the mapping.

        Args:
            notification: SDK Notification with header + content.

        Returns:
            Tuple of ``(http_status_code, response_body_dict)``.
        """
        # --- 1. Parse content ---
        content = self._parse_status_content(notification)
        sender_bpn = notification.header.sender_bpn

        logger.info(
            "CCM status from %s: documentId=%s status=%s",
            sender_bpn,
            content.document_id,
            content.certificate_status.value,
        )

        # --- 2. Resolve certificate ID ---
        certificate_id = self._resolve_document_id(content.document_id)
        if certificate_id is None:
            return 404, {
                "message": (
                    f"Invalid documentId '{content.document_id}': "
                    f"could not be resolved to a certificate."
                ),
            }

        with RepositoryManagerFactory.create() as repo:
            # Verify the certificate still exists.
            ccm = repo.ccm_repository.find_by_id_with_relations(certificate_id)
            if ccm is None:
                return 404, {
                    "message": (
                        f"Certificate with documentId "
                        f"'{content.document_id}' not found."
                    ),
                }

            # --- 3. Find share record ---
            share = (
                repo.certificate_share_repository
                .find_by_certificate_and_consumer(certificate_id, sender_bpn)
            )
            if share is None:
                return 404, {
                    "message": (
                        f"No sharing record found for certificate "
                        f"'{content.document_id}' and consumer {sender_bpn}."
                    ),
                }

            # --- 4. Update status ---
            new_status = _STATUS_MAP[content.certificate_status]
            repo.certificate_share_repository.update_status(
                share_id=share.id,
                new_status=new_status,
            )
            repo.commit()

        logger.info(
            "CertificateShare %d updated to %s (consumer %s, document %s)",
            share.id,
            new_status.value,
            sender_bpn,
            content.document_id,
        )

        return 200, {
            "message": (
                f"Status '{content.certificate_status.value}' recorded "
                f"for certificate '{content.document_id}'."
            ),
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_request_content(notification: Notification) -> CcmRequestContent:
        """
        Extract CCM-specific fields from the notification content.

        The SDK ``NotificationContent`` accepts extra fields (``extra="allow"``).
        We merge the explicit model fields with the extras and validate them
        against ``CcmRequestContent``.
        """
        raw = notification.content.model_dump(by_alias=True)
        # Merge extra fields (model_extra) that Pydantic stored separately.
        if notification.content.model_extra:
            raw.update(notification.content.model_extra)
        return CcmRequestContent.model_validate(raw)

    @staticmethod
    def _parse_status_content(notification: Notification) -> CcmStatusContent:
        """Extract CCM status fields from the notification content."""
        raw = notification.content.model_dump(by_alias=True)
        if notification.content.model_extra:
            raw.update(notification.content.model_extra)
        return CcmStatusContent.model_validate(raw)

    @staticmethod
    def _resolve_document_id(document_id: str) -> Optional[int]:
        """
        Convert a ``documentId`` string to an integer certificate PK.

        The provider sets ``documentId = str(ccm.id)`` when pushing
        certificates.  This method reverses that mapping.

        Returns:
            The integer PK, or ``None`` if the string is not a valid integer.
        """
        try:
            return int(document_id)
        except (ValueError, TypeError):
            logger.warning("Cannot parse documentId '%s' as integer.", document_id)
            return None


# Singleton instance consumed by the controller.
ccm_notification_service = CcmNotificationService()
