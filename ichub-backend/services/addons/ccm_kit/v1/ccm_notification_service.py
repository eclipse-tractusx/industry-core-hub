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
from utils.log_utils import sanitize_log_value as _s
from models.metadata_database.addons.ccm_kit.v1.models import ShareStatus
from models.services.addons.ccm_kit.v1.notifications import (
    CcmAvailableContent,
    CcmPushContent,
    CcmRequestContent,
    CcmStatusContent,
    CcmPullRequest,
    CertificateStatusValue,
)
from services.addons.ccm_kit.v1.ccm_consumer_service import (
    ccm_consumer_service,
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
            f"CCM request from {_s(sender_bpn)} for "
            f"certifiedBpn={_s(content.certified_bpn)} "
            f"certificateType={_s(content.certificate_type)}"
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
                    f"No certificate found for bpnl={_s(content.certified_bpn)} "
                    f"type={_s(content.certificate_type)} (requested by {_s(sender_bpn)})"
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
                    f"Created new CertificateShare for certificate {ccm.id} "
                    f"→ consumer {_s(sender_bpn)}"
                )
            else:
                # Consumer already has a share record — refresh the timestamp.
                existing_share.last_shared_date = datetime.now(timezone.utc)
                logger.info(
                    f"Updated existing CertificateShare {existing_share.id} "
                    f"for consumer {_s(sender_bpn)}"
                )

            repo.commit()

        # --- 5. If certificate is already published as EDC asset, respond COMPLETED ---
        if ccm.edc_asset_id:
            logger.info(
                f"Certificate {ccm.id} is published (asset {_s(ccm.edc_asset_id)}). "
                f"Responding COMPLETED with documentId."
            )
            return 200, {
                "requestStatus": "COMPLETED",
                "documentId": ccm.edc_asset_id,
                "message": (
                    f"Certificate available for PULL. "
                    f"documentId={ccm.edc_asset_id}"
                ),
            }

        # Auto-push if configured
        auto_push = ConfigManager.get_config(
            "provider.ccm.auto_push_on_request", default=False
        )
        if auto_push:
            logger.info(
                f"Auto-push enabled — pushing certificate {ccm.id} "
                f"to {_s(sender_bpn)}"
            )
            provider_bpn = notification.header.receiver_bpn
            self._auto_push_certificate(ccm.id, sender_bpn, provider_bpn)
        else:
            logger.info(
                f"Certificate {ccm.id} registered for consumer {_s(sender_bpn)} "
                f"(auto-push disabled, manual push required)."
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
            f"CCM status from {_s(sender_bpn)}: "
            f"documentId={_s(content.document_id)} "
            f"status={_s(content.certificate_status.value)}"
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
            f"CertificateShare {share.id} updated to {new_status.value} "
            f"(consumer {_s(sender_bpn)}, document {_s(content.document_id)})"
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
            logger.warning(f"Cannot parse documentId '{_s(document_id)}' as integer.")
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
            f"CCM push from {_s(sender_bpn)} for "
            f"bpn={_s(content.business_partner_number)} "
            f"type={_s(content.type.certificate_type)} "
            f"documentID={_s(content.document.document_id)}"
        )

        # Decode binary document
        doc_bytes: Optional[bytes] = None
        if content.document.content_base64:
            try:
                doc_bytes = base64.b64decode(content.document.content_base64)
            except Exception:
                logger.warning(
                    f"Failed to decode Base64 document for {_s(content.document.document_id)}"
                )

        with RepositoryManagerFactory.create() as repo:
            # Check for duplicate
            existing = repo.ccm_received_repository.find_by_document_id(
                content.document.document_id
            )
            if existing is not None:
                logger.info(
                    f"Duplicate push for documentId={_s(content.document.document_id)} — updating."
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
                kwargs["validator_name"] = content.validator.validator_name
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
            f"Certificate '{_s(content.document.document_id)}' stored in ccm_received."
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
        retrieval.  If a ``documentId`` is present, we attempt to pull the
        certificate automatically via the consumer PULL flow.

        Args:
            notification: SDK Notification with header + available content.

        Returns:
            Tuple of ``(http_status_code, response_body_dict)``.
        """
        content = self._parse_available_content(notification)
        sender_bpn = notification.header.sender_bpn

        logger.info(
            f"CCM available from {_s(sender_bpn)}: "
            f"documentId={_s(content.document_id)} "
            f"certificateType={_s(content.certificate_type)}"
        )

        # If a documentId is provided, attempt auto-pull
        if content.document_id:
            self._auto_pull_certificate(
                provider_bpn=sender_bpn,
                document_id=content.document_id,
            )

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
    def _auto_push_certificate(
        certificate_id: int, consumer_bpn: str, provider_bpn: str
    ) -> None:
        """
        Trigger a PUSH of the certificate to the consumer.

        Imports the provider service lazily to avoid circular dependencies.
        Failures are logged but do **not** propagate — the request endpoint
        has already returned ``200`` and the consumer was registered.

        Args:
            certificate_id: PK of the certificate to push.
            consumer_bpn: BPNL of the consumer to push the certificate to.
            provider_bpn: BPNL of this node (the provider / sender).
        """
        try:
            from models.services.addons.ccm_kit.v1.notifications import (
                CcmPushRequest,
            )
            from services.addons.ccm_kit.v1.ccm_provider_service import (
                ccm_provider_service,
            )

            push_request = CcmPushRequest(
                sender_bpn=provider_bpn,
                certificate_id=certificate_id,
                consumer_bpn=consumer_bpn,
            )
            result = ccm_provider_service.push_certificate(
                push_request, provider_bpn
            )
            if not result.success:
                logger.warning(
                    f"Auto-push for certificate {certificate_id} "
                    f"to {_s(consumer_bpn)} failed: {_s(result.error)}"
                )
        except Exception:
            logger.exception(
                f"Auto-push raised for certificate {certificate_id} "
                f"to {_s(consumer_bpn)}"
            )

    @staticmethod
    def _auto_pull_certificate(provider_bpn: str, document_id: str) -> None:
        """
        Trigger a PULL of the certificate from the provider.

        Imports the consumer service lazily to avoid circular dependencies.
        Failures are logged but do **not** propagate — the available
        endpoint has already acknowledged the notification.

        Args:
            provider_bpn: BPNL of the provider that published the certificate.
            document_id: EDC asset ID of the certificate to pull.
        """
        try:
            pull_request = CcmPullRequest(
                provider_bpn=provider_bpn,
                document_id=document_id,
            )
            result = ccm_consumer_service.pull_certificate(pull_request)
            if not result.stored:
                logger.warning(
                    f"Auto-pull for certificate {_s(document_id)} "
                    f"from {_s(provider_bpn)} did not store: "
                    f"data={bool(result.certificate_data)}"
                )
        except Exception:
            logger.exception(
                f"Auto-pull raised for certificate {_s(document_id)} "
                f"from {_s(provider_bpn)}"
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
