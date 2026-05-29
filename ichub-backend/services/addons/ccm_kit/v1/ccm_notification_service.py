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
import base64

from tractusx_sdk.industry.models.notifications import Notification

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
from models.metadata_database.addons.ccm_kit.v1.models import ShareStatus
from models.services.addons.ccm_kit.v1.notifications import (
    CcmAvailableContent,
    CcmPushContent,
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

        # Auto-push if configured
        auto_push = ConfigManager.get_config(
            "provider.ccm.auto_push_on_request", default=False
        )
        if auto_push:
            logger.info(
                "Auto-push enabled — pushing certificate %d to %s",
                ccm.id,
                sender_bpn,
            )
            self._auto_push_certificate(ccm.id, sender_bpn)
        else:
            logger.info(
                "Certificate %d registered for consumer %s "
                "(auto-push disabled, manual push required).",
                ccm.id,
                sender_bpn,
            )

        return 200, {
            "message": (
                f"Certificate found for BPNL {content.certified_bpn} "
                f"with type {content.certificate_type}. "
                f"{'Push delivery initiated.' if auto_push else 'Consumer registered for sharing.'}"
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

    # ------------------------------------------------------------------
    # Inbound PUSH processing (provider → this node as consumer)
    # ------------------------------------------------------------------

    def process_certificate_push(
        self, notification: Notification
    ) -> Tuple[int, Dict[str, Any]]:
        """
        Process a ``POST /companycertificate/push`` notification.

        The remote provider sends a full certificate payload (including
        the Base64-encoded document).  We persist it in the ``ccm_received``
        table for later consumption.

        Args:
            notification: SDK Notification with header + push content.

        Returns:
            Tuple of ``(http_status_code, response_body_dict)``.
        """
        content = self._parse_push_content(notification)
        sender_bpn = notification.header.sender_bpn

        logger.info(
            "CCM push from %s for bpn=%s type=%s documentID=%s",
            sender_bpn,
            content.business_partner_number,
            content.type.certificate_type,
            content.document.document_id,
        )

        # Decode binary document
        doc_bytes: Optional[bytes] = None
        if content.document.content_base64:
            try:
                doc_bytes = base64.b64decode(content.document.content_base64)
            except Exception:
                logger.warning(
                    "Failed to decode Base64 document for %s",
                    content.document.document_id,
                )

        with RepositoryManagerFactory.create() as repo:
            # Check for duplicate
            existing = repo.ccm_received_repository.find_by_document_id(
                content.document.document_id
            )
            if existing is not None:
                logger.info(
                    "Duplicate push for documentId=%s — updating.",
                    content.document.document_id,
                )
                existing.doc = doc_bytes
                existing.received_at = datetime.now(timezone.utc)
                repo.commit()
                return 200, {
                    "message": (
                        f"Certificate '{content.document.document_id}' "
                        f"updated (duplicate push)."
                    ),
                }

            # Build optional kwargs
            kwargs: Dict[str, Any] = {}
            if content.issuer:
                kwargs["issuer_name"] = content.issuer.issuer_name
                kwargs["issuer_bpn"] = content.issuer.issuer_bpn
            if content.validator:
                kwargs["validator_name"] = content.validator.validator_name if hasattr(content.validator, "validator_name") else None
            if content.valid_from:
                kwargs["valid_from"] = content.valid_from
            if content.valid_until:
                kwargs["valid_until"] = content.valid_until
            if content.trust_level:
                kwargs["trust_level"] = content.trust_level
            if content.registration_number:
                kwargs["registration_number"] = content.registration_number
            if content.area_of_application:
                kwargs["area_of_application"] = content.area_of_application
            if content.uploader:
                kwargs["uploader_bpn"] = content.uploader
            if content.type.certificate_version:
                kwargs["certificate_version"] = content.type.certificate_version

            repo.ccm_received_repository.create_new(
                document_id=content.document.document_id,
                provider_bpn=sender_bpn,
                certified_bpn=content.business_partner_number,
                certificate_type=content.type.certificate_type,
                doc=doc_bytes,
                **kwargs,
            )
            repo.commit()

        logger.info(
            "Certificate '%s' stored in ccm_received.",
            content.document.document_id,
        )

        return 200, {
            "message": (
                f"Certificate '{content.document.document_id}' received "
                f"and stored successfully."
            ),
        }

    # ------------------------------------------------------------------
    # Inbound AVAILABLE processing (provider → this node as consumer)
    # ------------------------------------------------------------------

    def process_certificate_available(
        self, notification: Notification
    ) -> Tuple[int, Dict[str, Any]]:
        """
        Process a ``POST /companycertificate/available`` notification.

        The provider informs us that a certificate is available for PULL
        retrieval.  We log the availability; the actual retrieval is
        deferred to the consumer PULL flow (Phase C).

        Args:
            notification: SDK Notification with header + available content.

        Returns:
            Tuple of ``(http_status_code, response_body_dict)``.
        """
        content = self._parse_available_content(notification)
        sender_bpn = notification.header.sender_bpn

        logger.info(
            "CCM available from %s: documentId=%s certificateType=%s",
            sender_bpn,
            content.document_id,
            content.certificate_type,
        )

        # For now, just acknowledge.  Phase C will add PULL retrieval.
        return 200, {
            "message": (
                f"Certificate availability acknowledged for "
                f"documentId='{content.document_id}'."
            ),
        }

    # ------------------------------------------------------------------
    # Auto-push helper
    # ------------------------------------------------------------------

    @staticmethod
    def _auto_push_certificate(certificate_id: int, consumer_bpn: str) -> None:
        """
        Trigger a PUSH of the certificate to the consumer.

        Imports the provider service lazily to avoid circular dependencies.
        Failures are logged but do **not** propagate — the request endpoint
        has already returned ``200`` and the consumer was registered.
        """
        try:
            from models.services.addons.ccm_kit.v1.notifications import (
                CcmPushRequest,
            )
            from services.addons.ccm_kit.v1.ccm_provider_service import (
                ccm_provider_service,
            )

            push_request = CcmPushRequest(
                certificate_id=certificate_id,
                consumer_bpn=consumer_bpn,
            )
            result = ccm_provider_service.push_certificate(
                push_request, consumer_bpn
            )
            if not result.success:
                logger.warning(
                    "Auto-push for certificate %d to %s failed: %s",
                    certificate_id,
                    consumer_bpn,
                    result.error,
                )
        except Exception:
            logger.exception(
                "Auto-push raised for certificate %d to %s",
                certificate_id,
                consumer_bpn,
            )

    # ------------------------------------------------------------------
    # Additional parsers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_push_content(notification: Notification) -> CcmPushContent:
        """Extract CX-0135 push content from the notification."""
        raw = notification.content.model_dump(by_alias=True)
        if notification.content.model_extra:
            raw.update(notification.content.model_extra)
        return CcmPushContent.model_validate(raw)

    @staticmethod
    def _parse_available_content(
        notification: Notification,
    ) -> CcmAvailableContent:
        """Extract CX-0135 available content from the notification."""
        raw = notification.content.model_dump(by_alias=True)
        if notification.content.model_extra:
            raw.update(notification.content.model_extra)
        return CcmAvailableContent.model_validate(raw)


# Singleton instance consumed by the controller.
ccm_notification_service = CcmNotificationService()
