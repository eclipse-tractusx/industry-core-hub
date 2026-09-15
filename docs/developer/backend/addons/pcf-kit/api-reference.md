# API Reference: Industry Core Hub PCF-Kit

## Base Path

`/v1/addons/pcf-kit/`

This API allows the management and exchange of Product Carbon Footprint (PCF) information between participants (Consumers and Providers) within the network.

## Pagination

All endpoints that return resource lists (for example, part searches or notification lists) support pagination query parameters:

- `?limit={int}&offset={int}`
- Default values: `limit=20`, `offset=0`

## 1. Consumer Module

Endpoints intended for searching own parts, composing parts through subparts, and requesting PCF calculations from corresponding participants.

### 1.1 Add Subpart Relation to Main Part and Generate Request

- **Endpoint:** `POST /v1/addons/pcf-kit/consumption/parts/{manufacturerPartId}/subparts`
- **Description:** Adds a relationship between your main part and a participant's subpart. A PCF request is automatically created in the database with status `PENDING` and direction `outgoing` (linked to the main part), but it is not sent yet.

**Payload Example**

```json
{
  "manufacturerPartId": "part-exterior-door-001",
  "bpn": "BPNL00000000024R"
}
```

**Response Example**

```json
{
  "mainManufacturerPartId": "my-car-001",
  "listSubManufacturerPartIds": [
    {
      "requestId": "09cdbf8d-7ad3-486b-9910-af0b80ad5187",
      "manufacturerPartId": "part-exterior-door-001",
      "customerPartId": null,
      "requestingBpn": "BPNL00000000024R",
      "targetBpn": "BPNL000000000123",
      "status": "pending",
      "type": "request",
      "message": null,
      "pcfLocation": null,
      "pcfData": null
    }
  ]
}
```

### 1.2 Send PCF Request to a Participant

- **Endpoint:** `POST /v1/addons/pcf-kit/consumption/requests/{requestId}/send`
- **Description:** Sends a request currently in `PENDING` status (created in the previous step) to the participant. During this step, the request status changes from `PENDING` to `DELIVERED`.

**Payload Example (Optional)**

```json
{
  "governance": []
}
```

### 1.3 Consult PCF Response (Individual PCF Response)

- **Endpoint:** `GET /v1/addons/pcf-kit/consumption/requests/{requestId}/response`
- **Description:** Checks whether the Provider has responded. Returns the PCF Response object (direction `incoming`) with PCF data for that subpart.
- **Errors:** Returns `404 Not Found` if no response exists yet.

### 1.4 Retry PCF Request Sending (Retry)

- **Endpoint:** `POST /v1/addons/pcf-kit/consumption/requests/{requestId}/retry`
- **Description:** Retries sending a PCF Request (`outgoing`) that previously failed when notifying the Provider.

### 1.5 Consult Global Assembly Progress (Progress Bar)

- **Endpoint:** `GET /v1/addons/pcf-kit/consumption/parts/{manufacturerPartId}/pcf-status`
- **Description:** Feeds the progress bar in the UI. Calculates global status by checking how many subparts (added in section 1.1) already have a received and processed PCF response.

**Response Example**

```json
{
  "manufacturerPartId": "my-car-001",
  "totalSubParts": 5,
  "respondedSubParts": 5,
  "progressPercentage": 100,
  "overallStatus": "IN_PROGRESS"
}
```

### 1.6 Download Consolidated PCF Data (JSON)

- **Endpoint:** `GET /v1/addons/pcf-kit/consumption/parts/{manufacturerPartId}/pcf-data/download`
- **Description:** When the progress bar (section 1.5) reaches `100%`, the UI can call this endpoint to download consolidated PCF JSON data for all subparts, which can then be fed into the total PCF calculation engine.

## 2. Provider Module

Endpoints intended for internal PCF management and for responding to requests received from consumers.

### 2.1 Upload a New PCF

- **Endpoint:** `POST /v1/addons/pcf-kit/provider/pcfs/{manufacturerPartId}`
- **Description:** Uploads a PCF if it does not already exist in the system ("UPLOAD PCF"). The JSON file can be dragged directly or created with the "Submodel Creator".

### 2.2 View Existing PCF

- **Endpoint:** `GET /v1/addons/pcf-kit/provider/pcfs/{manufacturerPartId}`
- **Description:** "VIEW PCF" endpoint. A "Submodel Viewer" (used in Catalog Part) or a format similar to EcoPassKIT can be used for representation.

### 2.3 Update PCF and Get Participants

- **Endpoint:** `PUT /v1/addons/pcf-kit/provider/pcfs/{manufacturerPartId}`
- **Description:** Updates the PCF ("UPDATE PCF") of a serialized part. Returns the list of participants (BPNs) with whom this PCF was previously shared, allowing the frontend to render selection checkboxes.

### 2.4 Confirm and Send Update to Participants

- **Endpoint:** `POST /v1/addons/pcf-kit/provider/pcfs/{manufacturerPartId}/notify-update`
- **Description:** Following section 2.3, this endpoint receives selected BPNs (confirmed via checkboxes) and sends the updated PCF version to those participants.

## 3. Notifications and Requests Management (Requests/Responses)

Endpoints for Provider-side handling of incoming items and tracking of sent or rejected items.

### 3.1 List Notifications (Provider Inbox)

- **Endpoint:** `GET /v1/addons/pcf-kit/provider/requests`
- **Description:** Lists incoming PCF requests. Supports pagination (`limit`, `offset`) and status-based filtering to separate UI tabs.

**Status Query Examples**

- `?status=pending&limit=10&offset=0` (arrived and not yet responded)
- `?status=delivered` (accepted and PCF delivered)
- `?status=rejected` (rejected)
- `?status=updated` (subsequently updated)
- `?status=failed` (response attempt failed)

### 3.2 Accept Request (Generate PCF Response)

- **Endpoint:** `POST /v1/addons/pcf-kit/provider/requests/{requestId}/accept`
- **Description:** Accepts a consumer request. The system finds the PCF of the requested part, generates a PCF Response (`outgoing` from the provider perspective) with the same `requestId`, and sends it to the consumer.

**Important (Error Handling)**

If the PCF is not found in the system (the part has no uploaded PCF), this endpoint throws an error (for example, `404 Not Found` or `400 Bad Request`). The frontend should then guide the user to upload the PCF in "PCF MANAGEMENT" before accepting.

### 3.3 Refresh PCF Data for Request

- **Endpoint:** `GET /v1/addons/pcf-kit/provider/requests/{requestId}/refresh-pcf`
- **Description:** Refreshes the PCF exchange record for a given request. Returns the latest `PcfExchangeModel` object associated with that `requestId`.

### 3.4 Retry Response Sending (Retry)

- **Endpoint:** `POST /v1/addons/pcf-kit/provider/requests/{requestId}/response/retry`
- **Description:** If the Provider sees `failed` status in the "Failed" tab, this endpoint explicitly retries sending the PCF Response after issues such as network errors.

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 LKS Next
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
