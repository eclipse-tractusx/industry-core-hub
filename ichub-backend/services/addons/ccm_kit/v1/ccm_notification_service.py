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

from datetime import date, datetime, timezone
from typing import Any, Dict, Optional, Tuple
import base64
import binascii
import json
import uuid

from tractusx_sdk.industry.models.notifications import Notification

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
from utils.log_utils import sanitize_log_value as _s
from models.metadata_database.addons.ccm_kit.v1.models import InboundRequestStatus, OutboundRequestStatus, ShareStatus
from models.services.addons.ccm_kit.v1.notifications import (
    CcmAvailableContent,
    CcmPushContent,
    CcmRequestContent,
    CcmSendStatusPayload,
    CcmStatusContent,
    CcmPullRequest,
    CertificateStatusValue,
    RejectionReasonPayload,
)
from services.addons.ccm_kit.v1.ccm_consumer_service import (
    ccm_consumer_service,
)
from services.addons.ccm_kit.v1.ccm_base_service import CcmBaseService
from managers.addons_service.ccm_kit.v1.notifications import (
    ccm_notification_manager,
    CCM_NT_REQUEST_RECEIVED,
    CCM_NT_REQUEST_NOT_FOUND,
    CCM_NT_PUSH_RECEIVED,
    CCM_NT_AVAILABLE_RECEIVED,
    CCM_NT_STATUS_RECEIVED,
)
from tools.constants import (
    CCM_CONTEXT_AVAILABLE,
    CCM_CONTEXT_PUSH,
    CCM_CONTEXT_REQUEST,
    CCM_CONTEXT_STATUS,
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

# Valid share-status transitions (current → set of allowed new statuses).
_VALID_TRANSITIONS: Dict[ShareStatus, set] = {
    ShareStatus.Pending: {ShareStatus.Pending, ShareStatus.Active, ShareStatus.Revoked},
    # RECEIVED (→ Pending) is valid after Active: the consumer acknowledged
    # receipt of a direct push but has not yet accepted it.  Covers the
    # direct-push flow where _update_share_status sets Active before the
    # consumer sends back a RECEIVED status.
    ShareStatus.Active: {ShareStatus.Pending, ShareStatus.Revoked},
    ShareStatus.Revoked: set(),  # terminal state — no further transitions
}


class CcmNotificationService:
    """
    Handles the business logic for incoming CCM notification API calls.
    """

    def _build_response_header(self, notification: Notification) -> Dict[str, Any]:
        """Return a CX-0135-compliant response header dict."""
        return {
            "messageId": str(uuid.uuid4()),
            "context": notification.header.context,
            "sentDateTime": datetime.now(timezone.utc).isoformat(),
            "senderBpn": notification.header.receiver_bpn,
            "receiverBpn": notification.header.sender_bpn,
            "relatedMessageId": str(notification.header.message_id),
        }

    @staticmethod
    def _validate_context(
        notification: Notification,
        expected_context: str,
    ) -> Optional[Tuple[int, Dict[str, Any]]]:
        """Validate that the notification context matches the expected value.

        Returns ``None`` when the context is correct, or a ``(400, body)``
        tuple to return immediately when the context is wrong.
        """
        actual = notification.header.context
        if actual != expected_context:
            logger.warning(
                f"Context mismatch: expected '{expected_context}', "
                f"got '{_s(actual)}' (messageId={notification.header.message_id})"
            )
            return 400, {
                "message": (
                    f"Invalid notification context. Expected "
                    f"'{expected_context}', received '{actual}'."
                ),
            }
        return None

    def process_certificate_request(
        self, notification: Notification
    ) -> Tuple[int, Dict[str, Any]]:
        """
        Process a ``POST /companycertificate/request`` notification.

        CX-0135 response matrix:
        * ``200 COMPLETED``  — certificate is already published; ``documentId`` is returned.
        * ``200 REJECTED``   — certificate not found; ``requestErrors`` explains why.
        * ``202 IN_PROGRESS`` — certificate found but not yet published;
          consumer should poll again or wait for a PUSH notification.

        Args:
            notification: SDK Notification with header + content.

        Returns:
            Tuple of ``(http_status_code, response_body_dict)``.
        """
        # --- 0. Validate context ---
        ctx_error = self._validate_context(notification, CCM_CONTEXT_REQUEST)
        if ctx_error is not None:
            return ctx_error

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
            ccm = repo.ccm_repository.find_by_bpnl_type_and_sites(
                bpnl=content.certified_bpn,
                certificate_type=content.certificate_type,
                location_bpns=(
                    content.location_bpns if hasattr(content, "location_bpns") else None
                ),
            )

            # --- 3. Not found → 200 REJECTED (CX-0135 §3.4) ---
            if ccm is None:
                logger.warning(
                    f"No certificate found for bpnl={_s(content.certified_bpn)} "
                    f"type={_s(content.certificate_type)} (requested by {_s(sender_bpn)})"
                )
                # Persist the consumer's demand so the provider can act on it later.
                repo.ccm_inbound_request_repository.create_new(
                    consumer_bpn=sender_bpn,
                    certified_bpn=content.certified_bpn,
                    certificate_type=content.certificate_type,
                    status=InboundRequestStatus.NotFound,
                    location_bpns=CcmBaseService._canonicalize_location_bpns(
                        content.location_bpns if hasattr(content, "location_bpns") else None
                    ),
                    notification_id=str(notification.header.message_id),
                )
                repo.commit()
                ccm_notification_manager.create_ccm_notification(
                    sender_bpn=sender_bpn,
                    receiver_bpn=notification.header.receiver_bpn,
                    notification_type=CCM_NT_REQUEST_NOT_FOUND,
                    certificate_type=content.certificate_type,
                    certified_bpn=content.certified_bpn,
                )
                return 200, {
                    "header": self._build_response_header(notification),
                    "content": {
                        "requestStatus": "REJECTED",
                        "requestErrors": [
                            {
                                "message": (
                                    f"No certificate found for BPNL "
                                    f"{content.certified_bpn} with type "
                                    f"{content.certificate_type}."
                                )
                            }
                        ],
                    },
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

            # Record the inbound request so the provider has full visibility.
            repo.ccm_inbound_request_repository.create_new(
                consumer_bpn=sender_bpn,
                certified_bpn=content.certified_bpn,
                certificate_type=content.certificate_type,
                status=InboundRequestStatus.Registered,
                certificate_id=ccm.id,
                location_bpns=CcmBaseService._canonicalize_location_bpns(
                    content.location_bpns if hasattr(content, "location_bpns") else None
                ),
                notification_id=str(notification.header.message_id),
            )

            repo.commit()

            ccm_id = ccm.id
            ccm_edc_asset_id = ccm.edc_asset_id

        # --- 5. Certificate already published → 200 COMPLETED (CX-0135 §3.4) ---
        if ccm_edc_asset_id:
            logger.info(
                f"Certificate {ccm_id} is published (asset {_s(ccm_edc_asset_id)}). "
                f"Responding COMPLETED with documentId."
            )
            ccm_notification_manager.create_ccm_notification(
                sender_bpn=sender_bpn,
                receiver_bpn=notification.header.receiver_bpn,
                notification_type=CCM_NT_REQUEST_RECEIVED,
                certificate_type=content.certificate_type,
                certified_bpn=content.certified_bpn,
                document_id=ccm_edc_asset_id,
            )
            return 200, {
                "header": self._build_response_header(notification),
                "content": {
                    "requestStatus": "COMPLETED",
                    "documentId": ccm_edc_asset_id,
                },
            }

        # Auto-push if configured
        auto_push = ConfigManager.get_config(
            "provider.ccm.auto_push_on_request", default=False
        )
        if auto_push:
            logger.info(
                f"Auto-push enabled — pushing certificate {ccm_id} "
                f"to {_s(sender_bpn)}"
            )
            provider_bpn = notification.header.receiver_bpn
            self._auto_push_certificate(ccm_id, sender_bpn, provider_bpn)
        else:
            logger.info(
                f"Certificate {ccm_id} registered for consumer {_s(sender_bpn)} "
                f"(auto-push disabled, manual push required)."
            )

        # --- 6. Certificate found but not yet published → 202 IN_PROGRESS (CX-0135 §3.4) ---
        ccm_notification_manager.create_ccm_notification(
            sender_bpn=sender_bpn,
            receiver_bpn=notification.header.receiver_bpn,
            notification_type=CCM_NT_REQUEST_RECEIVED,
            certificate_type=content.certificate_type,
            certified_bpn=content.certified_bpn,
        )
        return 202, {
            "header": self._build_response_header(notification),
            "content": {
                "requestStatus": "IN_PROGRESS",
            },
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
        # --- 0. Validate context ---
        ctx_error = self._validate_context(notification, CCM_CONTEXT_STATUS)
        if ctx_error is not None:
            return ctx_error

        # --- 1. Parse content ---
        content = self._parse_status_content(notification)
        sender_bpn = notification.header.sender_bpn

        logger.info(
            f"CCM status from {_s(sender_bpn)}: "
            f"documentId={_s(content.document_id)} "
            f"status={_s(content.certificate_status.value)} "
            f"relatedMessageId={_s(getattr(notification.header, 'related_message_id', None))}"
        )

        # --- 2. Resolve certificate ID ---
        # documentId may be an integer PK (old format) or an EDC asset ID string.
        certificate_id = self._resolve_document_id(content.document_id)

        with RepositoryManagerFactory.create() as repo:
            # Verify the certificate still exists.
            if certificate_id is not None:
                ccm = repo.ccm_repository.find_by_id_with_relations(certificate_id)
            else:
                # Fall back to EDC asset ID lookup.
                ccm = repo.ccm_repository.find_by_edc_asset_id(content.document_id)

            if ccm is None:
                # Second fallback: resolve via the sender's share records.
                # Handles the case where edc_asset_id was cleared (e.g. after
                # unpublish) after the consumer already received the certificate
                # and stored the old documentId.
                shares_for_sender = (
                    repo.certificate_share_repository
                    .find_by_consumer_bpnl(sender_bpn)
                )
                active_shares = [
                    s for s in shares_for_sender
                    if s.status in (ShareStatus.Active, ShareStatus.Pending)
                ]
                if len(active_shares) == 1:
                    ccm = repo.ccm_repository.find_by_id_with_relations(
                        active_shares[0].certificate_id
                    )
                    if ccm is not None:
                        logger.info(
                            f"Resolved certificate {ccm.id} for consumer "
                            f"{_s(sender_bpn)} via share fallback "
                            f"(edc_asset_id lookup missed for documentId "
                            f"{_s(content.document_id)})."
                        )

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
                .find_by_certificate_and_consumer(ccm.id, sender_bpn)
            )
            if share is None:
                return 404, {
                    "message": (
                        f"No sharing record found for certificate "
                        f"'{content.document_id}' and consumer {sender_bpn}."
                    ),
                }

            # --- 4. Update status ---
            new_status = _STATUS_MAP.get(content.certificate_status)
            if new_status is None:
                return 400, {
                    "message": (
                        f"Unknown certificate status "
                        f"'{content.certificate_status.value}'."
                    ),
                }

            # Enforce valid state transitions.
            current_status = share.status
            if new_status == current_status:
                logger.info(
                    f"Idempotent status re-send for share {share.id}: "
                    f"{current_status.value} → {new_status.value} (share no-op)"
                )
                inbound_notification_id: Optional[str] = None
                raw_related = getattr(notification.header, "related_message_id", None)
                if raw_related is not None:
                    inbound_notification_id = str(raw_related)
                repo.ccm_inbound_request_repository.update_consumer_status(
                    consumer_bpn=sender_bpn,
                    certified_bpn=ccm.bpnl,
                    certificate_type=ccm.certificate_type,
                    consumer_status=content.certificate_status.value,
                    notification_id=inbound_notification_id,
                )
                repo.commit()
                return 200, {
                    "message": (
                        f"Status '{content.certificate_status.value}' already "
                        f"recorded for certificate '{content.document_id}'."
                    ),
                }
            allowed = _VALID_TRANSITIONS.get(current_status, set())
            if new_status not in allowed:
                logger.warning(
                    f"Invalid status transition {current_status.value} → "
                    f"{new_status.value} for share {share.id}"
                )
                return 409, {
                    "message": (
                        f"Cannot transition from '{current_status.value}' "
                        f"to '{new_status.value}'."
                    ),
                }

            share_id = share.id
            certified_bpn = ccm.bpnl
            certificate_type = ccm.certificate_type

            # Build rejection_reason JSON when consumer rejects.
            rejection_reason: Optional[str] = None
            if content.certificate_status == CertificateStatusValue.REJECTED:
                if content.certificate_errors or content.location_errors:
                    rejection_payload = RejectionReasonPayload(
                        certificate_errors=content.certificate_errors or None,
                        location_errors=content.location_errors or None,
                    )
                    rejection_reason = rejection_payload.model_dump_json(
                        by_alias=True, exclude_none=True
                    )

            repo.certificate_share_repository.update_status(
                share_id=share_id,
                new_status=new_status,
                rejection_reason=rejection_reason,
            )

            # Stamp consumer feedback on the latest matching inbound request
            # so the provider's inbound-request view reflects it.
            # When relatedMessageId is present in the notification header, use it
            # to target the specific request that triggered this status response.
            inbound_notification_id: Optional[str] = None
            raw_related = getattr(notification.header, "related_message_id", None)
            if raw_related is not None:
                inbound_notification_id = str(raw_related)

            repo.ccm_inbound_request_repository.update_consumer_status(
                consumer_bpn=sender_bpn,
                certified_bpn=certified_bpn,
                certificate_type=certificate_type,
                consumer_status=content.certificate_status.value,
                notification_id=inbound_notification_id,
            )

            repo.commit()

        # Log rejection details so providers can diagnose why a certificate
        # was rejected by the consumer.
        if content.certificate_status == CertificateStatusValue.REJECTED:
            if content.certificate_errors:
                logger.info(
                    f"Certificate errors for {_s(content.document_id)} from "
                    f"{_s(sender_bpn)}: {[e.message for e in content.certificate_errors]}"
                )
            if content.location_errors:
                logger.info(
                    f"Location errors for {_s(content.document_id)} from "
                    f"{_s(sender_bpn)}: "
                    f"{[{_s(le.bpn): [e.message for e in le.location_errors]} for le in content.location_errors]}"
                )

        logger.info(
            f"CertificateShare {share_id} updated to {new_status.value} "
            f"(consumer {_s(sender_bpn)}, document {_s(content.document_id)})"
        )

        ccm_notification_manager.create_ccm_notification(
            sender_bpn=sender_bpn,
            receiver_bpn=notification.header.receiver_bpn,
            notification_type=CCM_NT_STATUS_RECEIVED,
            certificate_type=certificate_type,
            certified_bpn=certified_bpn,
            document_id=content.document_id,
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
        Try to interpret ``documentId`` as an integer certificate PK.

        Per CX-0135, ``documentId`` is normally a UUID (the EDC asset ID).
        Legacy providers may still send the integer primary key.  This
        method returns the integer only when the value is clearly numeric;
        otherwise the caller should fall back to
        ``find_by_edc_asset_id()``.

        Returns:
            The integer PK, or ``None`` if the string is a UUID or any
            other non-integer value.
        """
        try:
            return int(document_id)
        except (ValueError, TypeError):
            logger.debug(f"documentId '{_s(document_id)}' is not an integer PK — will try EDC asset ID lookup.")
            return None

    @staticmethod
    def _parse_date(value: str) -> Optional[date]:
        """Parse an ISO 8601 date string (``YYYY-MM-DD``) into a ``date``.

        Returns ``None`` if the string cannot be parsed, so the caller can
        fall back gracefully without aborting the entire push.
        """
        try:
            return date.fromisoformat(value[:10])
        except (ValueError, TypeError):
            logger.warning(f"Cannot parse date value '{_s(value)}'.")
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
        # --- 0. Validate context ---
        ctx_error = self._validate_context(notification, CCM_CONTEXT_PUSH)
        if ctx_error is not None:
            return ctx_error

        content = self._parse_push_content(notification)
        sender_bpn = notification.header.sender_bpn

        logger.info(
            f"CCM push from {_s(sender_bpn)} for "
            f"bpn={_s(content.business_partner_number)} "
            f"type={_s(content.type.certificate_type)} "
            f"documentID={_s(content.document.document_id)}"
        )

        # Decode binary document (guard against oversized payloads).
        max_b64_size = int(
            ConfigManager.get_config(
                "ccm.push.max_b64_size_bytes", default=14 * 1024 * 1024
            )
        )  # default ~10 MB decoded ≈ 14 MB Base64
        doc_bytes: Optional[bytes] = None
        if content.document.content_base64:
            if len(content.document.content_base64) > max_b64_size:
                logger.warning(
                    f"Base64 document for {_s(content.document.document_id)} "
                    f"exceeds size limit ({len(content.document.content_base64)} bytes)"
                )
                return 413, {
                    "message": "Document exceeds the allowed size limit.",
                }
            try:
                doc_bytes = base64.b64decode(content.document.content_base64)
            except binascii.Error:
                logger.warning(f"Failed to decode Base64 document for {_s(content.document.document_id)}")
                return 400, {
                    "message": "Document content could not be decoded from Base64."
                }
            # Validate PDF magic bytes to reject non-PDF content.
            if doc_bytes and not doc_bytes.startswith(b"%PDF-"):
                logger.warning(
                    f"Decoded content for {_s(content.document.document_id)} "
                    f"is not a valid PDF (missing %%PDF- header)"
                )
                return 400, {
                    "message": "Document is not a valid PDF.",
                }

        with RepositoryManagerFactory.create() as repo:
            # Check for duplicate (scoped to this provider).
            existing = repo.ccm_received_repository.find_by_document_id(
                content.document.document_id,
                provider_bpn=sender_bpn,
            )
            if existing is not None:
                logger.info(
                    f"Duplicate push for documentId={_s(content.document.document_id)} — updating."
                )
                existing.doc = doc_bytes
                existing.received_at = datetime.now(timezone.utc)
                existing.notification_message_id = str(notification.header.message_id)
                _related_push = getattr(notification.header, "related_message_id", None)
                _push_sites = (
                    [s.enclosed_site_bpn for s in content.enclosed_sites]
                    if content.enclosed_sites else None
                )
                _advanced = self._correlate_outbound_requests(
                    repo=repo,
                    provider_bpn=sender_bpn,
                    certified_bpn=content.business_partner_number,
                    certificate_type=content.type.certificate_type,
                    document_id=content.document.document_id,
                    related_message_id=str(_related_push) if _related_push else None,
                    location_bpns=CcmBaseService._canonicalize_location_bpns(_push_sites),
                )
                if not _advanced:
                    # Direct push — no prior outbound REQUEST for this provider.
                    repo.ccm_outbound_request_repository.create_new(
                        sender_bpn=notification.header.receiver_bpn,
                        provider_bpn=sender_bpn,
                        certified_bpn=content.business_partner_number,
                        certificate_type=content.type.certificate_type,
                        status=OutboundRequestStatus.Found,
                        notification_id=str(notification.header.message_id),
                        document_id=content.document.document_id,
                    )
                    logger.info(
                        "[CCM Consumer] Created direct-push tracking record "
                        "(duplicate push, documentId=%s)",
                        _s(content.document.document_id),
                    )
                repo.commit()
                ccm_notification_manager.create_ccm_notification(
                    sender_bpn=sender_bpn,
                    receiver_bpn=notification.header.receiver_bpn,
                    notification_type=CCM_NT_PUSH_RECEIVED,
                    certificate_type=content.type.certificate_type,
                    certified_bpn=content.business_partner_number,
                    document_id=content.document.document_id,
                )
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
                kwargs["valid_from"] = self._parse_date(content.valid_from)
            if content.valid_until:
                kwargs["valid_until"] = self._parse_date(content.valid_until)
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
                notification_message_id=str(notification.header.message_id),
                **kwargs,
            )
            _related_push = getattr(notification.header, "related_message_id", None)
            _push_sites = (
                [s.enclosed_site_bpn for s in content.enclosed_sites]
                if content.enclosed_sites else None
            )
            _advanced = self._correlate_outbound_requests(
                repo=repo,
                provider_bpn=sender_bpn,
                certified_bpn=content.business_partner_number,
                certificate_type=content.type.certificate_type,
                document_id=content.document.document_id,
                related_message_id=str(_related_push) if _related_push else None,
                location_bpns=CcmBaseService._canonicalize_location_bpns(_push_sites),
            )
            if not _advanced:
                # Direct push — no prior outbound REQUEST for this provider.
                repo.ccm_outbound_request_repository.create_new(
                    sender_bpn=notification.header.receiver_bpn,
                    provider_bpn=sender_bpn,
                    certified_bpn=content.business_partner_number,
                    certificate_type=content.type.certificate_type,
                    status=OutboundRequestStatus.Found,
                    notification_id=str(notification.header.message_id),
                    document_id=content.document.document_id,
                )
                logger.info(
                    "[CCM Consumer] Created direct-push tracking record "
                    "(documentId=%s)",
                    _s(content.document.document_id),
                )
            repo.commit()

        ccm_notification_manager.create_ccm_notification(
            sender_bpn=sender_bpn,
            receiver_bpn=notification.header.receiver_bpn,
            notification_type=CCM_NT_PUSH_RECEIVED,
            certificate_type=content.type.certificate_type,
            certified_bpn=content.business_partner_number,
            document_id=content.document.document_id,
        )

        # --- Auto-RECEIVED: acknowledge receipt to the push sender ---
        _auto_rcv = ConfigManager.get_config("ccm.auto_received.enabled", default=False)
        if _auto_rcv:
            _governance_cfg = ConfigManager.get_config("ccm.auto_received.governance", default=None)
            try:
                _own_bpn = notification.header.receiver_bpn
                _auto_payload = CcmSendStatusPayload(
                    senderBpn=_own_bpn,
                    providerBpn=sender_bpn,
                    documentId=content.document.document_id,
                    certificateStatus=CertificateStatusValue.RECEIVED,
                    # CX-0135: relatedMessageId links this STATUS back to the
                    # specific push notification that triggered it.  Passing it
                    # explicitly avoids a second DB round-trip in
                    # send_certificate_status and prevents heuristic mismatch
                    # when the consumer has received multiple pushes.
                    relatedMessageId=str(notification.header.message_id),
                    governance=_governance_cfg,
                )
                ccm_consumer_service.send_certificate_status(_auto_payload, _own_bpn)
                logger.info(
                    "[CCM] Auto-RECEIVED status sent for documentId=%s",
                    _s(content.document.document_id),
                )
            except Exception as _auto_err:
                logger.warning("[CCM] Auto-RECEIVED send failed (non-fatal): %s", _auto_err)

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
        retrieval.  We advance any Pending or NotFound outbound requests for
        this provider + certificate type to ``Found`` (storing the documentId),
        then attempt to pull the certificate automatically.

        Args:
            notification: SDK Notification with header + available content.

        Returns:
            Tuple of ``(http_status_code, response_body_dict)``.
        """
        # --- 0. Validate context ---
        ctx_error = self._validate_context(notification, CCM_CONTEXT_AVAILABLE)
        if ctx_error is not None:
            return ctx_error

        content = self._parse_available_content(notification)
        sender_bpn = notification.header.sender_bpn

        logger.info(
            f"CCM available from {_s(sender_bpn)}: "
            f"documentId={_s(content.document_id)} "
            f"certificateType={_s(content.certificate_type)}"
        )

        # Advance matching outbound requests to Found with the documentId.
        # Pass relatedMessageId to restrict to the specific request when present.
        _related_msg_id = getattr(notification.header, "related_message_id", None)
        _avail_sites = (
            content.location_bpns if hasattr(content, "location_bpns") else None
        )
        self._correlate_outbound_requests_available(
            provider_bpn=sender_bpn,
            certificate_type=content.certificate_type,
            document_id=content.document_id,
            related_message_id=str(_related_msg_id) if _related_msg_id else None,
            location_bpns=CcmBaseService._canonicalize_location_bpns(_avail_sites),
        )

        # If a documentId is provided, attempt auto-pull
        if content.document_id:
            self._auto_pull_certificate(
                provider_bpn=sender_bpn,
                document_id=content.document_id,
                notification_message_id=str(notification.header.message_id),
                related_message_id=str(_related_msg_id) if _related_msg_id else None,
            )

        ccm_notification_manager.create_ccm_notification(
            sender_bpn=sender_bpn,
            receiver_bpn=notification.header.receiver_bpn,
            notification_type=CCM_NT_AVAILABLE_RECEIVED,
            certificate_type=content.certificate_type,
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
    def _correlate_outbound_requests(
        repo,
        provider_bpn: str,
        certified_bpn: str,
        certificate_type: str,
        document_id: str,
        related_message_id: Optional[str] = None,
        location_bpns: Optional[str] = None,
    ) -> list:
        """
        Advance all active outbound requests that match this incoming PUSH
        to ``Found``, storing the ``document_id`` for later reference.

        "Active" includes ``Pending``, ``NotFound``, and ``Found``-without-
        ``document_id`` — mirroring the Available-notification correlator so
        that a late PUSH also resolves requests that were previously marked
        ``NotFound`` by the provider.

        When ``related_message_id`` is provided it is matched against each
        outbound request's ``notification_id`` (the messageId of the original
        REQUEST sent by the consumer) so that only the targeted request is
        advanced.  Falls back to the full active list if no exact match is
        found.

        When ``location_bpns`` is provided (canonical JSON), the initial lookup
        is restricted to requests with the same site set.  Falls back to the
        unfiltered active list when the site-filtered result is empty.

        Called inside the active repository session (before ``repo.commit()``) so
        the CcmOutboundRequest rows are updated atomically with the new
        CcmReceived row.
        """
        active = repo.ccm_outbound_request_repository.find_active_by_provider_and_type(
            provider_bpn=provider_bpn,
            certificate_type=certificate_type,
            certified_bpn=certified_bpn,
            location_bpns=location_bpns,
        )
        if not active and location_bpns is not None:
            # Fallback: no request was for these exact sites — correlate all
            active = repo.ccm_outbound_request_repository.find_active_by_provider_and_type(
                provider_bpn=provider_bpn,
                certificate_type=certificate_type,
                certified_bpn=certified_bpn,
            )
        if related_message_id is not None:
            targeted = [r for r in active if r.notification_id == related_message_id]
            if targeted:
                active = targeted
        for req in active:
            repo.ccm_outbound_request_repository.update_status(
                request_id=req.id,
                new_status=OutboundRequestStatus.Found,
                document_id=document_id,
            )
            logger.info(
                f"[CCM] Outbound request {req.id} → Found "
                f"(documentId={_s(document_id)})"
            )
        return active

    @staticmethod
    def _correlate_outbound_requests_available(
        provider_bpn: str,
        certificate_type: str,
        document_id: str,
        related_message_id: Optional[str] = None,
        location_bpns: Optional[str] = None,
    ) -> None:
        """
        Advance all Pending and NotFound outbound requests from this provider
        + certificate type to ``Found``, storing the ``document_id``.

        Called when a Certificate Available (PULL) notification is received.
        Unlike the PUSH correlator, this also covers ``NotFound`` requests
        because the provider may have responded "not found" initially and only
        later published the certificate and sent an Available notification.

        When ``related_message_id`` is provided it is matched against each
        outbound request's ``notification_id`` (the messageId of the original
        REQUEST sent by the consumer) so that only the targeted request is
        advanced.  Falls back to the full active list if no exact match is
        found.

        When ``location_bpns`` is provided (canonical JSON), the initial lookup
        is restricted to requests with the same site set.  Falls back to the
        unfiltered active list when the site-filtered result is empty.

        Args:
            provider_bpn: BPNL of the provider sending the notification.
            certificate_type: Certificate type from the notification content.
            document_id: EDC asset ID of the published certificate.
            related_message_id: Optional messageId of the original consumer
                REQUEST this notification is responding to.
            location_bpns: Optional canonical JSON string of the site BPNs
                covered by the certificate being made available.
        """
        try:
            with RepositoryManagerFactory.create() as repo:
                active = repo.ccm_outbound_request_repository.find_active_by_provider_and_type(
                    provider_bpn=provider_bpn,
                    certificate_type=certificate_type,
                    location_bpns=location_bpns,
                )
                if not active and location_bpns is not None:
                    # Fallback: correlate all active requests for this provider
                    active = repo.ccm_outbound_request_repository.find_active_by_provider_and_type(
                        provider_bpn=provider_bpn,
                        certificate_type=certificate_type,
                    )
                if related_message_id is not None:
                    targeted = [r for r in active if r.notification_id == related_message_id]
                    if targeted:
                        active = targeted
                for req in active:
                    repo.ccm_outbound_request_repository.update_status(
                        request_id=req.id,
                        new_status=OutboundRequestStatus.Found,
                        document_id=document_id,
                    )
                    logger.info(
                        f"[CCM] Outbound request {req.id} ({req.status.value}) "
                        f"→ Found via Available notification "
                        f"(documentId={_s(document_id)})"
                    )
                if active:
                    repo.commit()
        except Exception:
            logger.exception(
                f"[CCM] Failed to correlate outbound requests for Available "
                f"notification from {_s(provider_bpn)} / {_s(certificate_type)}"
            )

    @staticmethod
    def _auto_pull_certificate(
        provider_bpn: str,
        document_id: str,
        notification_message_id: Optional[str] = None,
        related_message_id: Optional[str] = None,
    ) -> None:
        """
        Trigger a PULL of the certificate from the provider.

        Imports the consumer service lazily to avoid circular dependencies.
        Failures are logged but do **not** propagate — the available
        endpoint has already acknowledged the notification.

        Args:
            provider_bpn: BPNL of the provider that published the certificate.
            document_id: EDC asset ID of the certificate to pull.
            notification_message_id: messageId from the available notification
                header, stored on the received certificate for relatedMessageId
                linking per CX-0135.
            related_message_id: relatedMessageId from the available notification
                header — the original REQUEST messageId — forwarded to the
                outbound-request correlator so only the targeted request is
                advanced to Found.
        """
        try:
            pull_request = CcmPullRequest(
                provider_bpn=provider_bpn,
                document_id=document_id,
            )
            result = ccm_consumer_service.pull_certificate(
                pull_request,
                notification_message_id=notification_message_id,
                related_message_id=related_message_id,
            )
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
