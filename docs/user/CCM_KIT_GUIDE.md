<!--
Eclipse Tractus-X - Industry Core Hub

Copyright (c) 2026 LKS Next
Copyright (c) 2026 Contributors to the Eclipse Foundation

See the NOTICE file(s) distributed with this work for additional
information regarding copyright ownership.

This work is made available under the terms of the
Creative Commons Attribution 4.0 International (CC-BY-4.0) license,
which is available at
https://creativecommons.org/licenses/by/4.0/legalcode.

SPDX-License-Identifier: CC-BY-4.0
-->

# CCM KIT User Guide

Status: Draft
Type: Documentation

## Overview
- **Purpose:** Teach a first-time user how to use the **Company Certificate Management (CCM) KIT** inside the Industry Core Hub — screen by screen, click by click, in plain text with no screenshots. Everything you need to recognise on screen (button labels, dialog titles, field names, statuses, where each control sits) is written out.
- **Audience:** Frontend users/operators who want to create, share, request and consume compliance certificates across the Catena-X dataspace. No prior experience with the interface is assumed.
- **Outcome:** You can create a certificate, provide it to a partner in all four ways (responding vs sending, available vs push), and — as a consumer — request, download and give feedback on a certificate.

## What is the CCM KIT?
The CCM KIT lets companies exchange **compliance certificates** (for example ISO 9001, ISO 14001, IATF 16949) with full request, response and feedback tracking.

There are **four ways** to share a certificate, decided by two questions: **who starts** the exchange, and **how** the certificate is delivered.

|  | **AVAILABLE (pull)** | **PUSH (direct)** |
|--|----------------------|-------------------|
| **RESPONDING** (answer a request) | Scenario 1 | Scenario 2 |
| **SENDING** (no prior request) | Scenario 3 | Scenario 4 |

- **Delivery — AVAILABLE (pull)** vs **PUSH (direct):** with *available*, the consumer must pull/download the document before opening it; with *push*, the provider sends the document directly and the consumer can open it straight away.
- **Trigger — RESPONDING** vs **SENDING:** with *responding*, the provider answers a consumer request; with *sending*, the provider sends proactively with no prior request.

This guide walks through all four scenarios. Prefix every certificate you create with your own participant ID (e.g. `001-alice`, `001-alice.2`, …) so you can find your own among everyone else's.

---

## How the interface is laid out

Before the scenarios, learn how to move around. Two things are important because they are not obvious the first time:

### The left sidebar is icon-only
The narrow bar on the far left (about 72&nbsp;px wide) shows **one icon per enabled feature** — there are **no text labels next to the icons and no "CCM" group heading**. To read a feature's name, **hover the mouse over its icon** and a tooltip appears. Clicking an icon opens that screen.

At the **bottom** of the sidebar there are two fixed buttons: a **"+" button** (tooltip **Add Features**) that opens the **Available Features** panel, and a **KIT Features** button that opens the full **KIT Features** page (URL `/kit-features`).

### Enabling the CCM screens
Out of the box, **Certificate Management** and **CCM Provision Management** are enabled by default, but **CCM Consumption is switched off**. To enable it (or to re-enable any CCM screen):
1. Click the **"+" (Add Features)** button at the bottom of the sidebar.
2. In the **Available Features** panel, click **CCM KIT** to expand it.
3. Turn **on** the toggle next to **CCM Consumption** (and any other CCM feature you need).

### The three screens this guide uses
Hover the sidebar icons to find these (the name in **bold** is the exact tooltip / feature name; the arrow is the page it opens):

| # | Sidebar feature name (tooltip) | URL | Who uses it | What it does |
|---|-------------------------------|-----|-------------|--------------|
| 1 | **Certificate Management** | `/certificates` | Everyone | Create and manage your own certificates. |
| 2 | **CCM Provision Management** | `/ccm-provision` | Provider | Respond to incoming requests and send certificates. |
| 3 | **CCM Consumption** | `/ccm-consumption` | Consumer | Request, download and review certificates. |

> A note on status labels: in the tables the status chips display the **raw** value (e.g. `NotFound`, `RECEIVED`), while the filter dropdowns for the same concept show a polished label (e.g. `Not Found`, `Received`). Both forms are given below so you recognise either.

---

# Part 1 — Certificate Management (create a certificate)

Before you can share anything, you create the certificate here. Open **Certificate Management** (sidebar icon **Certificate Management**, or `/certificates`). The page title reads **Certificate Management** with the subtitle *"Manage, share and consume compliance certificates across the Catena-X dataspace"*.

What you see on this screen:
- A **Refresh** button and an **Upload Certificate** button at the top.
- Four clickable summary cards — **TOTAL**, **VALID**, **EXPIRING**, **EXPIRED** — that double as quick filters by validity status (computed automatically from the dates).
- A **search** box (placeholder *"Search by name, BPN or issuer…"*), a **Certificate Type** dropdown (default *"All Types"*), a **Clear** button (appears when a filter is active), and **List view** / **Card view** toggle icons.
- The certificate list itself. In **list view** the columns are **Certificate**, **Type**, **Issuer**, **Valid Until**, **Status** and **Actions**; the **Status** chip reads **Valid** / **Expiring** / **Expired**. Each row has **Publish**, **Update** and **Delete** actions (Publish is disabled for expired or already-published certificates). When there are none, the list shows *"No certificates found. Upload a certificate to get started."*

## Create a certificate step by step
Click **Upload Certificate**. The **Upload Certificate** dialog opens with a three-step stepper: **Certificate Details**, **Validity & Scope**, **Certificate File**.

**Step 1 — Certificate Details** (section *"Certificate Core Details"*):
- **Certificate Type** (required) — a searchable field; type or pick a type (helper *"Search or type a certificate type"*). Options include *ISO 9001 - Quality Management*, *ISO 14001 - Environmental Management*, *IATF 16949 - Automotive Quality*, *ISO 27001 - Information Security*, and *Other*.
- **Certificate Name** — use your ID (e.g. `001-alice`); placeholder *"e.g. Quality Management System Certificate"*. This is how you recognise it later.
- **Issuer / Certification Body** (required) — who issued it; placeholder *"e.g. DEKRA, TÜV SÜD"*.
- **Description** — optional notes; placeholder *"Optional description or notes about the scope"*.
- Click **Next**.

**Step 2 — Validity & Scope** (section *"Validity, Trust & Application Context"*):
- **Organization BPNL (Holder)** — pre-filled with your own BPN (disabled), helper *"This certificate will be registered under your organization ID"*.
- **Valid From** (required) and **Valid Until** (date pickers). *Valid Until* must be after *Valid From*.
- **Trust Level** — a select with options **None**, **Low**, **High**, **Trusted** (default *None*).
- **Registration Number** — placeholder *"e.g. REG-123456-XYZ"*.
- **Area of Application** — placeholder *"e.g. Powertrain Plant, Procurement Dept"*, helper *"Target department, context or facility"*.
- **Validator Name** — placeholder *"e.g. Lead Auditor John Doe"*.
- **Associated Sites (BPNS)** — type a BPNS and press Enter to add it as a chip (format: `BPNS` + 12 alphanumeric characters).
- Click **Next**.

**Step 3 — Certificate File:**
- **Drop zone** — drag & drop or click to browse (*"Drag & drop or click to browse"*). The constraint text reads *"Supported format: PDF only (max 10MB)"* — the file must be a **PDF** under **10 MB**.
- Click **Upload** (or **Save Changes** in edit mode). A *"Certificate uploaded successfully!"* toast confirms it.

Your certificate now appears in the list, ready to be shared. To publish it to the dataspace immediately you can use its **Publish** action, but publishing also happens automatically when you first make it available or push it.

---

# Part 2 — Provider: providing certificates

All provider actions happen in **CCM Provision Management** (sidebar icon **CCM Provision Management**, or `/ccm-provision`). The page title reads **CCM Provision Management** with the subtitle *"Handle incoming certificate requests and provide certificates to your Catena-X partners."*

The screen has:
- Two top buttons — **Send Available** and **Push Certificate** — plus **Refresh**.
- Two tabs (each with a count): **Inbound Requests** and **Shares**.

There are two starting points on the provider side:
- **Responding** — a consumer sent you a request; you answer it from the **Inbound Requests** tab (Scenarios 1 & 2).
- **Sending** — you send proactively (no request) using the **Send Available** or **Push Certificate** top buttons (Scenarios 3 & 4).

And two delivery methods: **AVAILABLE (pull)** or **PUSH (direct)**.

## Scenario 1 — Responding · Available
### Consumer requests first
The consumer opens **CCM Consumption**, clicks **New Request**, and requests your certificate. The full request flow is in [Part 3 — Consumer](#part-3--consumer-requesting-and-reviewing-certificates).

### Provider: answer from Inbound Requests
Stay on the **Inbound Requests** tab. It lists the requests consumers sent you, with columns **Consumer**, **Certified BPN**, **Type**, **Locations**, **Status**, **Consumer Status**, **Updated** and **Actions**. The **Status** chip reads **Registered**, **Available**, **Pushed** or **NotFound**; the **Consumer Status** chip reads **RECEIVED**, **ACCEPTED** or **REJECTED** (or "—").

On the request row, click **Provide**. The **Provide Certificate** dialog opens (subtitle *"Respond to a consumer request via availability notification or direct push"*):
- A toggle with two options: **Make available (PULL)** and **Push directly** — choose **Make available (PULL)**.
- **Certificate to provide** — select your certificate (`001-alice`). A *"Upload other certificate…"* option lets you upload a new one on the spot.
- If the certificate is not published yet, an info note explains it will be published automatically first.
- Click **Send Availability**. A *"Availability notification sent."* toast confirms it.

### Consumer: pull, open and give feedback
The consumer pulls the document, opens the PDF, and sends feedback — see [Part 3 — Consumer](#part-3--consumer-requesting-and-reviewing-certificates).

### Provider: check the result
Open the **Shares** tab to see the status and the consumer's feedback — see [Track your shares](#track-your-shares) below.

## Scenario 2 — Responding · Push
Same as Scenario 1 up to the **Provide Certificate** dialog, but here you choose **Push directly**. Name this certificate `001-alice.2`.
- Select **Push directly** on the toggle.
- **Certificate to provide** — select `001-alice.2`.
- Click **Push Certificate** (the primary button's label switches to this in push mode). The consumer receives the document ready to open — no pull needed.

The consumer then opens it and sends feedback — see [Part 3 — Consumer](#part-3--consumer-requesting-and-reviewing-certificates).

## Scenario 3 — Sending · Available
No request needed. Click **Send Available** (top of the screen). The **Send Availability Notification** dialog opens (subtitle *"Proactively notify a partner that a certificate is available, without a prior request"*):
- **Certificate to announce** — select the certificate (`001-alice.3`). If it is not published yet, a helper notes it will be published automatically before sending.
- **Recipient (Consumer BPN)** — select or type the recipient's BPNL (placeholder *"Select or type the recipient's BPNL"*).
- Click **Send Availability**. The consumer then pulls and opens it.

## Scenario 4 — Sending · Push
No request needed. Click **Push Certificate** (top of the screen). The **Push Certificate** dialog opens (subtitle *"Send a certificate directly to a partner without a prior request"*):
- **Certificate to push** — select the certificate (`001-alice.4`).
- **Recipient (Consumer BPN)** — select or type the recipient's BPNL.
- Click **Push Certificate**. It arrives ready to open — no pull needed.

## Track your shares
Whatever the scenario, switch to the **Shares** tab to follow every certificate you shared and the consumer's feedback. Its columns are **Type**, **Consumer**, **Status**, **Consumer Status** and **Last Shared**:
- **Status** chip — **Active**, **Pending** or **Revoked**.
- **Consumer Status** chip — **RECEIVED**, **ACCEPTED** or **REJECTED** (the consumer's feedback), or "—".
- If a share was rejected, an error icon appears next to the status with the tooltip *"Has rejection reason — click row to view"*. Click the row to open **Share Details** and read the consumer's reasons.
- When empty, the tab shows *"No certificates shared yet. Use \"Push Certificate\" or respond to an inbound request."*

---

# Part 3 — Consumer: requesting and reviewing certificates

Everything the consumer does happens in **CCM Consumption** (sidebar icon **CCM Consumption**, or `/ccm-consumption`). The page title reads **CCM Consumption** with the subtitle *"Request, track, download and review compliance certificates from your Catena-X partners."*

The screen has a **New Request** button (and **Refresh**) at the top, a search box (*"Search by provider, type or status…"*) with **Status** and **Type** dropdowns, and a requests table. Its columns are **Provider**, **Certified BPN**, **Type**, **Locations**, **Status**, **Response**, **Updated** and **Actions**:
- **Status** chip — **Pending**, **Found**, **NotFound** or **Failed**.
- **Response** chip — the provider's feedback: **Pending**, **Accepted** or **Rejected** (or "—").

## Step 1 — Request a certificate (Scenarios 1 & 2)
Click **New Request** (top right). The **New Certificate Request** dialog opens (subtitle *"Ask a provider to share a compliance certificate with you"*):
- **Provider BPN** — the partner that owns the certificate (placeholder *"Select or type the provider's BPNL"*). Optionally click **Verify CCM support**; on success a green **CCM supported** chip appears, on failure a warning explains the provider does not support CCM.
- **Certified BPN** (required) — the legal entity the certificate belongs to (helper *"BPNL of the certified legal entity"*).
- **Certificate Type** (required) — a searchable field; the type you can see on the provider side.
- **Sites / Locations (BPNS)** — optional; type a BPNS and press Enter to add it.
- Click **Send Request**. The request appears in the table with status **Pending** (a confirmation toast shows the message ID).

> For **Sending** scenarios (3 & 4) you do **not** send a request — the certificate simply arrives in this table.

## Step 2 — Pull / open the certificate
When the request status is **Found** (or when a sent certificate arrives), use the row action icons on the right of the row:
- **History icon** — tooltip *"View history"*.
- **Pull / View icon** — before you download it, this is a **download icon** with the tooltip *"Pull certificate"*; click it to pull an *available* certificate. After it is downloaded (and for a *push*, which is already there), it becomes an **eye icon** with the tooltip *"View certificate"* — click it to open the PDF full-screen and read it.
- **Feedback icon** — tooltip *"Send feedback"* (enabled once the certificate was found and not already accepted/rejected).

## Step 3 — Send feedback
Click the **Send feedback** icon on the request. The **Certificate Feedback** dialog opens (subtitle *"Notify the provider of your evaluation outcome"*) with a toggle of three outcomes — **Received**, **Accepted**, **Rejected** — and the dialog adapts to your choice:
- **Received** / **Accepted** — no extra details needed; just click **Send Feedback**.
- **Rejected** — two sections appear and you must fill in **at least one of each** before you can send:
  - **Certificate Errors** — general certificate-level issues; type each in a text field (placeholder *"e.g. Certificate expired"*) and click **Add**.
  - **Location Errors** — per-site issues; provide a **Site BPN** and an **Error message** for each, then **Add**.
  - An info alert reminds you: *"A rejection requires at least one certificate error and one location error."* The **Send Feedback** button turns red for a rejection.

Your feedback is shown to the provider in their **Shares** tab.

---

## Status Reference
- **Inbound requests (Provision → Inbound Requests):** chip shows `Registered`, `Available`, `Pushed`, `NotFound` (filter dropdown: *Not Found*).
- **Shares (Provision → Shares):** `Active`, `Pending`, `Revoked`.
- **Requests (Consumption):** chip shows `Pending`, `Found`, `NotFound`, `Failed` (filter dropdown: *Not Found*).
- **Consumer feedback / Response (both sides):** `RECEIVED`, `ACCEPTED`, `REJECTED` (shown as *Received / Accepted / Rejected* in dropdowns and the feedback toggle).
- **Certificate validity (Certificate Management):** `Valid`, `Expiring`, `Expired` (computed from the dates).

## Tips & Troubleshooting
- **The CCM Consumption icon is missing from the sidebar:** enable it — click the **"+" (Add Features)** button at the bottom of the sidebar, expand **CCM KIT** in the **Available Features** panel, and toggle on **CCM Consumption**.
- **A request stays Pending:** the provider has not answered yet. On the provider side, use **Provide** on the **Inbound Requests** tab.
- **Nothing to download for an "available" certificate:** click the **Pull certificate** (download) icon first; it then becomes the **View certificate** (eye) icon. For a *push*, skip the pull — it is already there.
- **Cannot submit a REJECTED feedback:** a rejection requires at least one certificate-level error and one location-level (Site BPN) error.
- **PDF upload fails:** the file must be a **PDF** and under **10 MB**.
- **Naming clash with other participants:** name each certificate with your own ID (`001-alice`, `001-alice.2`, …) so you can find your own among everyone else's.

---

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 LKS Next
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
