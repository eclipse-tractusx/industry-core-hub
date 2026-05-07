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

### 1.1 Search Own Serialized Parts

- **Endpoint:** `GET /v1/addons/pcf-kit/consumption/parts`
- **Description:** Allows searching and selecting local or own serialized parts using a search experience similar to Consumption EcoPass. The selected part acts as the main part ("YOUR PART").
- **Pagination:** Supports `?limit=20&offset=0`.

### 1.2 Add Subpart Relation to Main Part and Generate Request

- **Endpoint:** `POST /v1/addons/pcf-kit/consumption/parts/{manufacturerPartId}/subparts`
- **Description:** Adds a relationship between your main part and a participant's subpart. A PCF request is automatically created in the database with status `PENDING` and direction `outgoing` (linked to the main part), but it is not sent yet.

**Payload Example**

```json
{
  "subpartManufacturerPartId": "part-exterior-door-001",
  "participantBpn": "BPNL00000000024R"
}
```

**Response Example**

```json
{
  "requestId": "09cdbf8d-7ad3-486b-9910-af0b80ad5187",
  "status": "pending",
  "direction": "outgoing",
  "message": "Subpart relation added and pending PCF request generated."
}
```

### 1.3 Send PCF Request to a Participant

- **Endpoint:** `POST /v1/addons/pcf-kit/consumption/requests/{requestId}/send`
- **Description:** Sends a request currently in `PENDING` status (created in the previous step) to the participant. During this step, the request status changes from `PENDING` to `DELIVERED`.

**Payload Example (Optional)**

```json
{
  "message": "hello",
  "listPolicies": []
}
```

### 1.4 List Requests for a Specific Part (Consumer Inbox)

- **Endpoint:** `GET /v1/addons/pcf-kit/consumption/parts/{manufacturerPartId}/requests`
- **Description:** Acts as a tracking inbox for a specific main part ("YOUR PART"). Lists all subparts linked to this `manufacturerPartId` for which a PCF was requested, including outgoing request status and whether an incoming response exists for the same `requestId`.
- **Pagination:** Supports `?limit=10&offset=0` to avoid overloading the interface when a part has many components.

### 1.5 Consult PCF Response (Individual PCF Response)

- **Endpoint:** `GET /v1/addons/pcf-kit/consumption/requests/{requestId}/response`
- **Description:** Checks whether the Provider has responded. Returns the PCF Response object (direction `incoming`) with PCF data for that subpart.
- **Errors:** Returns `404 Not Found` if no response exists yet.

### 1.6 Retry PCF Request Sending (Retry)

- **Endpoint:** `POST /v1/addons/pcf-kit/consumption/requests/{requestId}/retry`
- **Description:** Retries sending a PCF Request (`outgoing`) that previously failed when notifying the Provider.

### 1.7 Consult Global Assembly Progress (Progress Bar)

- **Endpoint:** `GET /v1/addons/pcf-kit/consumption/parts/{manufacturerPartId}/pcf-status`
- **Description:** Feeds the progress bar in the UI. Calculates global status by checking how many subparts (added in section 1.2) already have a received and processed PCF response.

**Response Example**

```json
{
  "manufacturerPartId": "my-car-001",
  "totalSubparts": 5,
  "respondedSubparts": 5,
  "progressPercentage": 100,
  "status": "ready"
}
```

### 1.8 Download Consolidated PCF Data (JSON)

- **Endpoint:** `GET /v1/addons/pcf-kit/consumption/parts/{manufacturerPartId}/pcf-data/download`
- **Description:** When the progress bar (section 1.7) reaches `100%`, the UI can call this endpoint to download consolidated PCF JSON data for all subparts, which can then be fed into the total PCF calculation engine.

## 2. Provider Module

Endpoints intended for internal PCF management and for responding to requests received from consumers.

### 2.1 Parts Management and Search

- **Endpoint:** `GET /v1/addons/pcf-kit/provider/parts`
- **Description:** Reuses the search engine to find parts or serialized parts using `ManufacturerPartId`.
- **Pagination:** Supports `?limit=20&offset=0`.

### 2.2 Upload a New PCF

- **Endpoint:** `POST /v1/addons/pcf-kit/provider/pcfs`
- **Description:** Uploads a PCF if it does not already exist in the system ("UPLOAD PCF"). The JSON file can be dragged directly or created with the "Submodel Creator".

### 2.3 View Existing PCF

- **Endpoint:** `GET /v1/addons/pcf-kit/provider/pcfs/{pcfId}`
- **Description:** "VIEW PCF" endpoint. A "Submodel Viewer" (used in Catalog Part) or a format similar to EcoPassKIT can be used for representation.

### 2.4 Update PCF and Get Participants

- **Endpoint:** `PUT /v1/addons/pcf-kit/provider/pcfs/{pcfId}`
- **Description:** Updates the PCF ("UPDATE PCF") of a serialized part. Returns the list of participants (BPNs) with whom this PCF was previously shared, allowing the frontend to render selection checkboxes.

### 2.5 Confirm and Send Update to Participants

- **Endpoint:** `POST /v1/addons/pcf-kit/provider/pcfs/{pcfId}/notify-update`
- **Description:** Following section 2.4, this endpoint receives selected BPNs (confirmed via checkboxes) and sends the updated PCF version to those participants.

## 3. Notifications and Requests Management (Requests/Responses)

Endpoints for Provider-side handling of incoming items and tracking of sent or rejected items.

### 3.1 List Notifications (Provider Inbox)

- **Endpoint:** `GET /v1/addons/pcf-kit/provider/requests`
- **Description:** Lists incoming PCF requests. Supports pagination (`limit`, `offset`) and status-based filtering to separate UI tabs.

**Status Query Examples**

- `?status=pending&limit=10&offset=0` (arrived and not yet responded)
- `?status=shared` (accepted and shared)
- `?status=rejected` (rejected)
- `?status=updated` (subsequently updated)
- `?status=failed` (response attempt failed)

**Technical Response Detail**

For requests in `pending` status only, the returned JSON includes `pcfAvailable: true|false` so the frontend can directly show whether that part is currently uploaded. For other statuses, this information is assumed to be no longer relevant.

### 3.2 Accept Request (Generate PCF Response)

- **Endpoint:** `POST /v1/addons/pcf-kit/provider/requests/{requestId}/accept`
- **Description:** Accepts a consumer request. The system finds the PCF of the requested part, generates a PCF Response (`outgoing` from the provider perspective) with the same `requestId`, and sends it to the consumer.

**Important (Error Handling)**

If the PCF is not found in the system (the part has no uploaded PCF), this endpoint throws an error (for example, `404 Not Found` or `400 Bad Request`). The frontend should then guide the user to upload the PCF in "PCF MANAGEMENT" before accepting.

### 3.3 Reject Request

- **Endpoint:** `POST /v1/addons/pcf-kit/provider/requests/{requestId}/reject`
- **Description:** Rejects a consumer request. Changes internal notification status to `rejected` and notifies the consumer.

### 3.4 Consult Sent PCF Response

- **Endpoint:** `GET /v1/addons/pcf-kit/provider/requests/{requestId}/response`
- **Description:** Allows the Provider to review exactly what PCF data was sent when the request was accepted ("shared" tab). Returns the PCF Response object generated in section 3.2.

### 3.5 Retry Response Sending (Retry)

- **Endpoint:** `POST /v1/addons/pcf-kit/provider/requests/{requestId}/response/retry`
- **Description:** If the Provider sees `failed` status in the "Failed" tab, this endpoint explicitly retries sending the PCF Response after issues such as network errors.
