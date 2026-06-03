# API Reference: Industry Core Hub CCM-Kit

**Base path:** `/v1/addons/ccm-kit`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Layers](#2-architecture-layers)
3. [Key Concepts](#3-key-concepts)
4. [Data Model](#4-data-model)
5. [PUSH Flow — Provider sends certificate to consumer](#5-push-flow--provider-sends-certificate-to-consumer)
6. [PULL Flow — Consumer fetches certificate from provider](#6-pull-flow--consumer-fetches-certificate-from-provider)
7. [REQUEST Flow — Consumer requests a certificate from provider](#7-request-flow--consumer-requests-a-certificate-from-provider)
8. [STATUS Flow — Consumer reports processing result](#8-status-flow--consumer-reports-processing-result)
9. [Certificate Lifecycle (CRUD)](#9-certificate-lifecycle-crud)
10. [API Reference](#10-api-reference)
11. [Notification Envelopes (CX-0135)](#11-notification-envelopes-cx-0135)
12. [Configuration Reference](#12-configuration-reference)
13. [Enabling / Disabling CCM](#13-enabling--disabling-ccm)
14. [Error Handling Patterns](#14-error-handling-patterns)

---

## 1. Overview

The CCM add-on implements the **CX-0135 Company Certificate Management** standard for the Catena-X dataspace. It allows Catena-X participants to:

- **Upload and manage** their own company certificates (ISO9001, IATF16949, etc.) as a provider.
- **Push** full certificate payloads to trading partners (consumers) via EDC-secured notifications.
- **Notify** consumers that a certificate is available in the EDC catalog (PULL trigger).
- **Pull** certificates from a provider's EDC catalog after discovery and contract negotiation.
- **Request** specific certificates from a provider through the notification API.
- **Report** the processing result (RECEIVED / ACCEPTED / REJECTED) back to the provider.

All dataspace communication passes through the **Eclipse Dataspace Connector (EDC)** — no direct party-to-party HTTP calls are made outside of the EDC control/data planes.

```
┌─────────────────────────────────────────────────────────────────┐
│                   Catena-X Dataspace (EDC)                      │
│                                                                 │
│   PROVIDER SIDE                         CONSUMER SIDE          │
│   ┌─────────────┐  notification  ┌─────────────────────────┐   │
│   │  ICH Backend│ ──────────────▶│  Consumer ICH Backend   │   │
│   │  (provider) │◀────────────── │  (or any CX participant) │   │
│   └─────────────┘  notification  └─────────────────────────┘   │
│          │                                    │                 │
│     EDC Catalog                         EDR Negotiation        │
│     (PULL assets)──────────────────────────▶ │                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Layers

```
controllers/fastapi/routers/addons/ccm_kit/v1/
    certificates.py   ─── CRUD management of provider's certificate store
    provider.py       ─── Outbound operations (push, available, publish)
    consumer.py       ─── Outbound operations initiated by consumer role
    notifications.py  ─── Inbound notification reception (EDC data plane calls this)

services/addons/ccm_kit/v1/
    ccm_base_service.py         ─── Shared EDC discovery + policy helpers
    ccm_provider_service.py     ─── Business logic for provider outbound flows
    ccm_consumer_service.py     ─── Business logic for consumer flows (request/pull)
    ccm_notification_service.py ─── Routes inbound notifications to correct handler

managers/addons_service/ccm_kit/v1/
    certificates.py   ─── DB-level CRUD for the certificate store

models/services/addons/ccm_kit/v1/
    notifications.py  ─── Pydantic request/response models for all CCM endpoints
    certificates.py   ─── Pydantic read/write models for the certificate store

models/metadata_database/addons/ccm_kit/v1/
    models.py         ─── SQLModel ORM: Ccm, CcmSite, CertificateShare, CcmReceived
```

The **startup hook** in `controllers/fastapi/app.py` (`_sync_ccm_asset_on_startup`) registers the CCM notification EDC asset on every pod start, mirroring the pattern used by the Digital Twin Event API.

The **Kubernetes sync Job** in `jobs/asset_sync_job.py` (`_sync_ccm_asset`) re-registers the asset on demand and respects the `provider.ccm.enabled` flag.

---

## 3. Key Concepts

| Concept | Description |
|---|---|
| **BPNL** | Business Partner Number Legal — 16-char identifier (`BPNL` + 12 alphanumeric) |
| **BPNS / BPNA** | Site/Address BPN — used to narrow certificate scope to specific locations |
| **Document ID** | The EDC asset ID of a published certificate; used as correlation ID in CX-0135 flows |
| **CCM Notification Asset** | A single EDC HttpData asset exposing the backend's `/companycertificate` endpoints, registered once at startup |
| **Certificate Asset** | Per-certificate EDC asset, created by `POST /provider/publish`, with DataAddress pointing to `/provider/certificates/{id}/payload` |
| **EDR** | Endpoint Data Reference — the temporary token the EDC issues after contract negotiation to access a data-plane endpoint |
| **Trust Level** | `none` / `low` / `high` / `trusted` — as defined in SAMM BusinessPartnerCertificate v3.1.0 |

---

## 4. Data Model

### 4.1 Provider-side tables

#### `ccm` — Core certificate store

| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PK` | Auto-incremented internal ID |
| `bpnl` | `TEXT` | BPNL of the certificate holder *(mandatory)* |
| `certificate_type` | `TEXT` | Type identifier, e.g. `ISO9001`, `IATF16949` *(mandatory)* |
| `issuer` | `TEXT` | Certification body name *(mandatory)* |
| `valid_from` | `DATE` | Start of validity *(mandatory)* |
| `trust_level` | `ENUM` | `none` / `low` / `high` / `trusted` *(mandatory)* |
| `certificate_name` | `TEXT?` | Human-readable display name |
| `registration_number` | `TEXT?` | Official registration number |
| `area_of_application` | `TEXT?` | Scope description |
| `valid_until` | `DATE?` | Expiry date |
| `validator` | `TEXT?` | Third-party validator BPN or URL |
| `uploader_bpnl` | `TEXT?` | BPNL of the uploader |
| `description` | `TEXT?` | Free-text notes |
| `doc` | `BYTEA?` | Raw PDF bytes (Base64 only at API layer) |
| `edc_asset_id` | `TEXT?` | Set when the certificate is published to EDC |
| `created_at` | `TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | Last update timestamp |

**Index:** composite `(bpnl, certificate_type)` for fast type-based lookups per partner.

#### `ccm_site` — Site associations (one-to-many with `ccm`)

| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PK` | — |
| `ccm_id` | `INTEGER FK→ccm.id` | Parent certificate |
| `site_bpn` | `TEXT` | BPNS or BPNA covered by this certificate |

#### `certificate_share` — Sharing history

| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PK` | — |
| `certificate_id` | `INTEGER FK→ccm.id` | Certificate that was shared |
| `consumer_bpnl` | `TEXT` | Consumer who received it |
| `status` | `ENUM` | `Active` / `Pending` / `Revoked` |
| `last_shared_date` | `TIMESTAMP` | Most recent share timestamp |
| `created_at` | `TIMESTAMP` | Record creation |

**Index:** composite `(certificate_id, consumer_bpnl)`.

### 4.2 Consumer-side table

#### `ccm_received` — Received certificates

Stores certificates received via the PUSH notification flow. Fields mirror the CX-0135 push payload:

`id`, `document_id`, `provider_bpn`, `certified_bpn`, `certificate_type`, `certificate_version`, `issuer_name`, `issuer_bpn`, `validator_name`, `valid_from`, `valid_until`, `trust_level`, `registration_number`, `area_of_application`, `uploader_bpn`, `doc` (BYTEA), `received_at`

---

## 5. PUSH Flow — Provider sends certificate to consumer

The provider initiates a push: it sends the full certificate (including PDF as Base64) through the EDC directly to the consumer's notification endpoint.

```
Frontend / Operator
        │
        │  POST /v1/addons/ccm-kit/provider/push
        │  { senderBpn, certificateId, consumerBpn }
        ▼
CcmProviderService.push_certificate()
        │
        ├── Lookup certificate in DB by certificateId
        ├── Build CX-0135 push content (BusinessPartnerCertificate JSON)
        │     - Base64-encode the PDF document
        │     - Populate type, issuer, sites, validator, dates, trustLevel
        ├── Discover consumer's CCM notification asset via EDC catalog
        │     (filter: dct:type = CompanyCertificateManagementNotificationApi)
        ├── Negotiate contract + wait for EDR
        ├── POST to consumer EDC data plane:
        │     endpoint: /companycertificate/push
        │     context:  CompanyCertificateManagement-CCMAPI-Push:1.0.0
        └── Record sharing in certificate_share table (status=Active)
                │
                ▼
        Consumer's /companycertificate/push  (inbound)
                │
        CcmNotificationService.process_certificate_push()
                │
                ├── Validate context = CCMAPI-Push:1.0.0
                ├── Base64-decode the document
                └── Persist to ccm_received table
```

**Request:**
```json
POST /v1/addons/ccm-kit/provider/push
{
  "senderBpn": "BPNL00000003AYRE",
  "certificateId": 42,
  "consumerBpn": "BPNL000000000001"
}
```

**Response:**
```json
{ "success": true, "messageId": "uuid-of-sent-notification" }
```

---

## 6. PULL Flow — Consumer fetches certificate from provider

The consumer knows a certificate is available (from an Available notification or out-of-band knowledge) and pulls it through the EDC.

```
Frontend / Consumer Operator
        │
        │  POST /v1/addons/ccm-kit/consumer/pull
        │  { providerBpn, documentId }
        ▼
CcmConsumerService.pull_certificate()
        │
        ├── Resolve provider's EDC connector URL via BPN Discovery
        ├── Search provider catalog for asset matching documentId
        │     (dct:type = CompanyCertificate)
        ├── Initiate contract negotiation for that asset
        ├── Poll for EDR  (up to edr_max_retries × 1 s, default 30 s)
        │     EDR contains { endpoint, authorization }
        ├── GET data-plane endpoint with Authorization header
        │     timeout = data_plane_timeout_sec (default 60 s)
        ├── Parse JSON response → BusinessPartnerCertificate payload
        └── Store result in ccm_received table
                │
                ▼
        { certificateData: { ... }, stored: true }
```

**The provider side:** The certificate must first be published via `POST /provider/publish`.  
The EDC DataAddress for the asset points to `GET /v1/addons/ccm-kit/provider/certificates/{id}/payload`, which the EDC data plane proxies to the consumer.

**Request:**
```json
POST /v1/addons/ccm-kit/consumer/pull
{
  "providerBpn": "BPNL00000003AYRE",
  "documentId": "urn:uuid:00000000-0000-0000-0000-000000000001"
}
```

**Response:**
```json
{
  "certificateData": {
    "businessPartnerNumber": "BPNL00000003AYRE",
    "type": { "certificateType": "ISO9001", "certificateVersion": "2015" },
    "issuer": { "name": "TÜV Rheinland", "bpn": "BPNL000000000002" },
    "trustLevel": "high",
    "document": { "documentId": "...", "documentHash": "...", "documentContent": "<base64>" },
    "validFrom": "2023-01-01",
    "validUntil": "2026-01-01"
  },
  "stored": true
}
```

---

## 7. REQUEST Flow — Consumer requests a certificate from provider

The consumer does not yet have a certificate and asks the provider for one.

```
Frontend / Consumer Operator
        │
        │  POST /v1/addons/ccm-kit/consumer/request
        │  { senderBpn, providerBpn, certifiedBpn, certificateType, locationBpns? }
        ▼
CcmConsumerService.send_certificate_request()
        │
        ├── Resolve provider's EDC connector + CCM notification asset
        ├── Build CX-0135 Request notification
        │     context: CompanyCertificateManagement-CCMAPI-Request:1.0.0
        │     content: { certifiedBpn, certificateType, locationBpns }
        └── Send via EDC → provider's /companycertificate/request
                │
                ▼
        Provider: CcmNotificationService.process_certificate_request()
                │
                ├── Look up certificate by (certifiedBpn, certificateType)
                ├── Register consumer in certificate_share (status=Pending)
                └── If auto_push_on_request=true → trigger PUSH immediately
                        (or leave for manual trigger via POST /provider/push)
```

**Request:**
```json
POST /v1/addons/ccm-kit/consumer/request
{
  "senderBpn": "BPNL000000000001",
  "providerBpn": "BPNL00000003AYRE",
  "certifiedBpn": "BPNL00000003AYRE",
  "certificateType": "ISO9001",
  "locationBpns": ["BPNS000000000003"]
}
```

**Response:**
```json
{ "success": true, "messageId": "uuid-of-sent-notification" }
```

> **Config tip:** Set `provider.ccm.auto_push_on_request: true` to have the provider automatically push the certificate as soon as a request notification arrives. Defaults to `false` (manual push).

---

## 8. STATUS Flow — Consumer reports processing result

After receiving a certificate (via PUSH), the consumer acknowledges it.

```
Frontend / Consumer Operator
        │
        │  POST /v1/addons/ccm-kit/consumer/status
        │  { senderBpn, providerBpn, documentId, certificateStatus,
        │    relatedMessageId?, locationBpns?, certificateErrors?, locationErrors? }
        ▼
CcmConsumerService.send_certificate_status()
        │
        ├── Validate certificateStatus ∈ {RECEIVED, ACCEPTED, REJECTED}
        ├── Build CX-0135 Status notification
        │     context: CompanyCertificateManagement-CCMAPI-Status:1.0.0
        └── Send via EDC → provider's /companycertificate/status
                │
                ▼
        Provider: CcmNotificationService.update_certificate_status()
                │
                └── Update certificate_share.status for consumer_bpnl
```

**Request (ACCEPTED):**
```json
POST /v1/addons/ccm-kit/consumer/status
{
  "senderBpn": "BPNL000000000001",
  "providerBpn": "BPNL00000003AYRE",
  "documentId": "urn:uuid:00000000-0000-0000-0000-000000000001",
  "certificateStatus": "ACCEPTED",
  "relatedMessageId": "uuid-of-original-push"
}
```

**Request (REJECTED with errors):**
```json
{
  "senderBpn": "BPNL000000000001",
  "providerBpn": "BPNL00000003AYRE",
  "documentId": "urn:uuid:00000000-0000-0000-0000-000000000001",
  "certificateStatus": "REJECTED",
  "certificateErrors": [
    { "message": "Certificate has expired" }
  ],
  "locationErrors": [
    {
      "bpn": "BPNS000000000003",
      "locationErrors": [{ "message": "Site not covered" }]
    }
  ]
}
```

---

## 9. Certificate Lifecycle (CRUD)

These endpoints manage the local certificate store on the **provider side**. They are not part of the CX-0135 dataspace exchange — they are internal management APIs.

```
┌──────────────────────────────────────────────────────┐
│          Provider Certificate Lifecycle              │
│                                                      │
│  Upload ──▶ List / Get ──▶ Update / Delete           │
│     │                                                │
│     └──▶ Publish (EDC) ──▶ Available notify         │
│              │                 (PULL trigger)        │
│              └──▶ Push notify  (PUSH trigger)        │
└──────────────────────────────────────────────────────┘
```

### 9.1 Upload

`POST /v1/addons/ccm-kit/certificates/` — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | `File` | PDF file (max 10 MB by default; configurable via `ccm.upload.max_pdf_size_bytes`) |
| `bpnl` | `Form string` | BPNL of the certificate holder |
| `certificateType` | `Form string` | Type identifier |
| `issuer` | `Form string` | Certification body |
| `validFrom` | `Form date` | Start of validity (ISO 8601) |
| `trustLevel` | `Form enum` | `none` / `low` / `high` / `trusted` |
| `sites` | `Form string?` | Comma-separated BPNS/BPNA list |
| `certificateName` | `Form string?` | Display name |
| `registrationNumber` | `Form string?` | Official registration number |
| `areaOfApplication` | `Form string?` | Scope |
| `validUntil` | `Form date?` | Expiry date |
| `validator` | `Form string?` | Validator BPN or URL |
| `description` | `Form string?` | Notes |

Returns `201 Created` with the full `CertificateDetail` including Base64-encoded document content.

> **Size guard:** The server reads up to `max_pdf_size_bytes + 1` bytes and returns `413` before persisting if the limit is exceeded.

### 9.2 List

`GET /v1/addons/ccm-kit/certificates/?bpnl=...&certificateType=...&offset=0&limit=100`

Returns `CertificateListItem[]` — no document binary content included.

### 9.3 Get detail

`GET /v1/addons/ccm-kit/certificates/{certificate_id}`

Returns `CertificateDetail` — includes Base64 document and full sharing history.

### 9.4 Update metadata

`PUT /v1/addons/ccm-kit/certificates/{certificate_id}` — `multipart/form-data`

Only non-null fields are written. `bpnl` and `doc` are immutable. Supplying `sites` replaces the full site list.

### 9.5 Delete

`DELETE /v1/addons/ccm-kit/certificates/{certificate_id}` → `204 No Content`

Permanently deletes the certificate, all site entries, and all sharing history records.

---

## 10. API Reference

All routes are prefixed with `/v1/addons/ccm-kit` and require authentication.

### Certificates (CRUD)

| Method | Path | Summary | Auth |
|---|---|---|---|
| `GET` | `/certificates/` | List certificates | Required |
| `GET` | `/certificates/{id}` | Get certificate detail | Required |
| `POST` | `/certificates/` | Upload new certificate (multipart) | Required |
| `PUT` | `/certificates/{id}` | Update certificate metadata | Required |
| `DELETE` | `/certificates/{id}` | Delete certificate | Required |

### Provider (outbound)

| Method | Path | Summary | Auth |
|---|---|---|---|
| `POST` | `/provider/push` | Push certificate to consumer via EDC | Required |
| `POST` | `/provider/available` | Notify consumer certificate is available | Required |
| `POST` | `/provider/publish` | Publish certificate as EDC asset | Required |
| `PUT` | `/provider/publish/{id}` | Republish certificate (refresh EDC policy) | Required |
| `DELETE` | `/provider/publish/{id}` | Unpublish certificate from EDC catalog | Required |
| `GET` | `/provider/certificates/{id}/payload` | Serve payload for EDC data plane | Required |

> The `GET /provider/certificates/{id}/payload` endpoint is intended to be called by the EDC data plane, not directly by a frontend.

### Consumer (outbound)

| Method | Path | Summary | Auth |
|---|---|---|---|
| `POST` | `/consumer/catalog-search` | Search provider catalog for CCM asset | Required |
| `POST` | `/consumer/request` | Send certificate request to provider | Required |
| `POST` | `/consumer/status` | Send processing status to provider | Required |
| `POST` | `/consumer/pull` | Pull certificate from provider's EDC catalog | Required |

### Notifications (inbound — called by EDC data plane)

| Method | Path | Summary |
|---|---|---|
| `POST` | `/companycertificate/request` | Receive certificate request from consumer |
| `POST` | `/companycertificate/status` | Receive processing status from consumer |
| `POST` | `/companycertificate/push` | Receive pushed certificate from provider |
| `POST` | `/companycertificate/available` | Receive availability notification from provider |

> The `/companycertificate/*` routes are reachable through the EDC data plane only. The CCM notification EDC asset is registered at startup with a DataAddress pointing to these routes.

---

## 11. Notification Envelopes (CX-0135)

All notifications use the generic `Notification` wrapper from the Tractus-X SDK. The `context` field identifies the notification type and routes it to the correct handler.

```json
{
  "header": {
    "messageId": "uuid",
    "context": "CompanyCertificateManagement-CCMAPI-Request:1.0.0",
    "version": "1.0.0",
    "sentDateTime": "2026-01-01T00:00:00Z",
    "senderBpn": "BPNL00000003AYRE",
    "receiverBpn": "BPNL000000000001"
  },
  "content": {
    "certifiedBpn": "BPNL00000003AYRE",
    "certificateType": "ISO9001",
    "locationBpns": ["BPNS000000000001"]
  }
}
```

| `context` value | Direction | Handled by |
|---|---|---|
| `CompanyCertificateManagement-CCMAPI-Request:1.0.0` | Consumer → Provider | `POST /companycertificate/request` |
| `CompanyCertificateManagement-CCMAPI-Status:1.0.0` | Consumer → Provider | `POST /companycertificate/status` |
| `CompanyCertificateManagement-CCMAPI-Push:1.0.0` | Provider → Consumer | `POST /companycertificate/push` |
| `CompanyCertificateManagement-CCMAPI-Available:1.0.0` | Provider → Consumer | `POST /companycertificate/available` |

---

## 12. Configuration Reference

### `provider.ccm` (in `configuration.yml`)

| Key | Default | Description |
|---|---|---|
| `provider.ccm.enabled` | `true` | Enable/disable the entire CCM add-on |
| `provider.ccm.hostname` | `http://<ichub-backend-hostname>` | Backend hostname (used to build the CCM asset DataAddress) |
| `provider.ccm.apiPath` | `/v1/addons/ccm-kit` | API path appended to hostname for the EDC DataAddress |
| `provider.ccm.auto_push_on_request` | `false` | Automatically push certificate when a Request notification arrives |
| `provider.ccm.asset_config.dct_type` | `https://w3id.org/catenax/taxonomy#CompanyCertificateManagementNotificationApi` | DCT type used to register the notification asset in EDC |
| `provider.ccm.asset_config.existing_asset_id` | *(unset)* | Pin to an existing EDC asset ID instead of creating a new one |
| `provider.ccm.policy.usage` | *(ODRL object)* | Usage policy applied to the CCM notification asset |
| `provider.ccm.policy.access` | *(ODRL object)* | Access policy applied to the CCM notification asset |
| `provider.ccm.certificate_asset.dct_type` | `https://w3id.org/catenax/taxonomy#CompanyCertificate` | DCT type for individual certificate assets (PULL) |
| `provider.ccm.certificate_asset.semantic_id` | `urn:samm:io.catenax.business_partner_certificate:3.1.0#BusinessPartnerCertificate` | Semantic ID for PULL assets |
| `provider.ccm.certificate_asset.policy` | *(ODRL object)* | Policy for individual certificate assets |

### `consumer.ccm`

| Key | Default | Description |
|---|---|---|
| `consumer.ccm.edr_max_retries` | `30` | Maximum polling iterations when waiting for an EDR during PULL |
| `consumer.ccm.data_plane_timeout_sec` | `60` | HTTP timeout (seconds) for the data-plane request during PULL |

### `ccm` (cross-cutting)

| Key | Default | Description |
|---|---|---|
| `ccm.notification.verbose` | `true` | Enable detailed notification logging |
| `ccm.push.max_b64_size_bytes` | `14745728` (~14 MB) | Maximum allowed Base64 payload size in a PUSH notification |
| `ccm.upload.max_pdf_size_bytes` | `10485760` (10 MB) | Maximum PDF file size accepted by `POST /certificates/` |

---

## 13. Enabling / Disabling CCM

Set `provider.ccm.enabled: false` to fully disable the add-on:

```yaml
# configuration.yml
provider:
  ccm:
    enabled: false   # ← disable CCM
```

```yaml
# charts/industry-core-hub/values.yaml
backend:
  configuration:
    provider:
      ccm:
        enabled: false
```

When disabled, three integration points are gated:

| Gate | Where | Effect |
|---|---|---|
| Startup asset sync | `app.py:_sync_ccm_asset_on_startup()` | CCM EDC notification asset is not registered on pod start |
| Kubernetes Job sync | `asset_sync_job.py:_ccm_kit_enablement_check()` | `_sync_ccm_asset()` is skipped |
| API routes | `addons.py` router setup | All `/v1/addons/ccm-kit/*` routes return `404` |

> **Default:** `true`. Existing deployments without the key explicitly set continue to work.

---

## 14. Error Handling Patterns

### HTTP status codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Certificate uploaded |
| `204` | Certificate deleted / unpublished |
| `400` | Validation error (missing file, invalid BPNL format) |
| `404` | Certificate not found |
| `413` | PDF file too large |
| `422` | Pydantic validation error (invalid request body) |
| `500` | Internal server error (EDC connectivity, database error) |

### Consumer PULL — common failure paths

| Scenario | Behaviour |
|---|---|
| EDC catalog search returns no matching asset | Returns `{ found: false }` or raises 500 with descriptive message |
| EDR not received within `edr_max_retries` | Returns error: `"EDR not available after N retries"` |
| Invalid JSON from data plane | Returns error with raw response preview |
| Base64 decode failure on received document | Raises descriptive error, certificate not stored |
| EDR entry missing `endpoint` or `authorization` | Raises `ValueError` before any data-plane call |

### Notification inbound — response codes

The `/companycertificate/*` endpoints return `200` for successful processing, `400` for malformed notifications, and `500` for unexpected internal errors. Failures are **never propagated to the EDC** in a way that would fail the contract negotiation — errors are logged and a graceful response is returned.

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 LKS Next
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
