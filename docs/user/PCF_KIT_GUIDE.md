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

# PCF KIT User Guide

Status: Draft
Type: Documentation

## Overview
- **Purpose:** Teach a first-time user how to use the **Product Carbon Footprint (PCF) KIT** inside the Industry Core Hub — screen by screen, click by click, in plain text with no screenshots. Everything you need to recognise on screen (button labels, dialog titles, field names, statuses, where each control sits) is written out.
- **Audience:** Frontend users/operators who want to provide, request, receive and consume PCF data across the Catena-X dataspace. No prior experience with the interface is assumed.
- **Outcome:** You can share a part's PCF directly (SYNC), and you can request, accept and receive a subpart's PCF (ASYNC), understanding what each action does and why.

## What is the PCF KIT?
The PCF KIT lets a company exchange the **carbon-footprint data** of its parts and their subparts.

A simple example runs through this whole guide: you manufacture a **wheel**. A wheel is made of subparts — a **rim** and a **tyre**. To know the wheel's total footprint you need the PCF of each subpart from your suppliers. The PCF KIT lets you request that data, receive it, and aggregate it.

There are **two ways** to exchange PCF data. You will learn both:

- **SYNC** — the provider attaches PCF data directly to a shared catalog part; the consumer discovers the part and reads the PCF immediately.
- **ASYNC** — the consumer requests a subpart's PCF; the provider accepts the request; the consumer receives the data back.

Throughout the guide, prefix every part and ID you create with your own participant ID (e.g. `001-alice-…`) so that you can always find your own data among everyone else's in a shared test dataspace.

---

## How the interface is laid out

Before the flows, learn how to move around. Two things are important because they are not obvious the first time:

### The left sidebar is icon-only
The narrow bar on the far left (about 72&nbsp;px wide) shows **one icon per enabled feature** — there are **no text labels next to the icons and no "PCF" / "CCM" group headings**. To read a feature's name, **hover the mouse over its icon** and a tooltip appears. Clicking an icon opens that screen.

At the **bottom** of the sidebar there are two fixed buttons:
- a **"+" button** whose tooltip is **Add Features** — it opens the **Available Features** panel;
- a **KIT Features** button — it opens the full **KIT Features** page (URL `/kit-features`).

### PCF screens must be enabled first
Out of the box only a few features are switched on. **Catalog Parts** and **Dataspace Discovery** are enabled by default, but the **three PCF screens are switched off** and will not appear in the sidebar until you enable them.

To enable them:
1. Click the **"+" (Add Features)** button at the bottom of the sidebar. The **Available Features** panel opens next to the sidebar (its footer reads *"Expand KITs to enable/disable features"*).
2. Find and click **PCF KIT** to expand it (KITs behave like an accordion — opening one collapses the others).
3. Turn **on** the toggle switch next to each PCF feature you need:
   - **PCF Precalculation**
   - **PCF Management**
   - **PCF Requests**
4. Their icons now appear in the sidebar. (Alternatively, open the **KIT Features** page from the bottom button and use the same toggles there.)

### The five screens this guide uses
Once enabled, hover the sidebar icons to find these (the name in **bold** is the exact tooltip / feature name; the arrow is the page it opens):

| # | Sidebar feature name (tooltip) | Page title on screen | URL | Who uses it | What it does |
|---|-------------------------------|----------------------|-----|-------------|--------------|
| 1 | **Provide Catalog/Type Parts** | Catalog Parts | `/catalog` | Provider | Create, register and share catalog parts. |
| 2 | **Consume Data via Dataspace Discovery** | Parts Discovery | `/dataspace-discovery` | Consumer | Discover shared twins and read their submodels. |
| 3 | **PCF Precalculation** | PCF Precalculation | `/pcf/precalculation` | Consumer | Request the PCF of subparts and aggregate the result. |
| 4 | **PCF Management** | PCF Management | `/pcf/management` | Provider | Upload and manage the PCF data of your own parts. |
| 5 | **PCF Requests** | PCF Requests | `/pcf/requests` | Provider | Review and accept incoming PCF requests. |

> Tip: to open a screen directly you can also type its URL after the app's base address.

---

# Flow A — SYNC (share PCF directly on a part)

Use this when you already own the PCF data and simply want to publish it on a part so a partner can read it after discovery.

## Step 1 — Provider: create, register and share the catalog part

**1. Open Catalog Parts.** In the sidebar, click the **Provide Catalog/Type Parts** icon (or go to `/catalog`). The page title reads **Catalog Parts** with the subtitle *"Provide, Share and Manage Parts in Catalog / Type Level"*. Existing parts are shown as **cards**; a chip on each card shows its status (**Draft**, **Pending**, **Registered** or **Shared**).

**2. Click Create Catalog Part** (button at the top of the page). The **Create New Catalog Part** dialog opens. A chip at the top confirms *"Your Manufacturer ID: …"*.

**3. Fill in the part and click Create.** Only the first two fields are needed to start:
- **Manufacturer Part ID** — the unique ID of the part (e.g. `001-alice-wheel`), placeholder *"Enter unique part identifier"*. This is how the part is identified across the dataspace.
- **Part Name** — a human-readable name (e.g. `001-alice Wheel`), placeholder *"Enter part name"*.
- Optionally expand the **Basic Information** (Description, Category, BPNS), **Measurements** (width/height/length/weight and their units) and **Materials** (Add Material, shares that add up to 100 %) sections.
- Click **Create** (the button shows *"Creating…"* while it saves). A *"Catalog part created successfully."* toast confirms it. The part now exists as a **Draft**.

**4. Register the part.** On the part's **card** in the list, the header shows an action icon whose tooltip is **Register part** (a cloud-upload icon; available while the part is Draft/Pending). Click it. You can also open the card's **three-dots (⋮)** menu — tooltip **More options** — and choose **Register part**. A *"Part twin registered successfully!"* toast confirms it, and the status chip changes to **Registered**. Registering creates the part's Digital Twin so it can be shared and discovered.

**5. Share the part with your partner.** On the same card, click the **Share part** icon (a share icon in the card header) — or open the **⋮** menu and choose **Share part**. The **Share with partner (…)** dialog opens:
- **Partner** — select the consumer's BPNL from the dropdown (placeholder *"Select a partner to share the part with"*). Partners come from your Contact List; if none are available the dialog shows *"No Partners Available"* and an **Add a Partner** button.
- Optionally tick **Add custom customer part Id** to reveal a **Customer Part Id** field.
- Click **Share** (shows *"Sharing…"* while it works). A *"Part shared successfully with …"* toast confirms it. The part is now visible to that partner in the dataspace.

## Step 2 — Provider: add the PCF submodel
**1. Open the part's detail page.** Click the **View** button on the part's card (or click the card body). The detail page opens.

**2. Go to the Submodels section.** Scroll down to the **Submodels** (a.k.a. *Digital Twin Submodels*) section. Any submodels already attached appear as cards (for example **SingleLevelBomAsPlanned**, **SingleLevelUsageAsPlanned**) — these are *not* PCF; you are adding a new one.

**3. Click New Submodel** (button in the top-right of the Submodels section header). The **Select Schema for New Submodel** picker opens.

**4. Choose the PCF schema and fill it in.** Pick the **PCF** schema (v9.0.0). The creator screen opens with the header *"Create New Submodel - …"*. Fill in the carbon-footprint values and click **Create Submodel**. A *"Submodel created successfully with … schema!"* toast confirms it. *(A submodel is the structured data attached to the twin — here, the carbon-footprint values.)*

> The submodel form itself (schema selector, dynamic fields, validation) is documented step by step in the [Submodel Creator Guide](SUBMODEL_CREATOR_GUIDE.md), which lives next to this guide in `docs/user`.

## Step 3 — Consumer: discover and read the PCF
**1. Open Dataspace Discovery.** Click the **Consume Data via Dataspace Discovery** icon in the sidebar (or go to `/dataspace-discovery`). The page title reads **Parts Discovery**. Make sure the search mode is **Dataspace Discovery** (not *Single Twin*).

**2. Set up and start the search:**
- In the left panel set **Digital Twin Type** to **Part Type (Catalog)** (the default) for a catalog part.
- Optionally, to find only your piece among many, type its ID into the **Manufacturer Part ID (Optional)** filter (`001-alice-wheel`).
- In the **Partner BPNL** field select (or type) the provider who shared the part with you.
- Click **Start Discovery**. The search negotiates access with the provider's connector, so it can take a few seconds; you will see progress steps such as *"Discovering Partner endpoints…"* ending in *"Search Complete!"*.

**3. Pick your part in the results.** Results appear under **Discovery Results** as **cards**, split into **Catalog Parts** / **Serialized Parts** tabs. Find the card named with your ID (`001-alice-wheel`) and click its **View** button to open the twin and list its submodels.

**4. Open the PCF submodel.** Among the twin's submodels (PartType, SingleLevel aspects, …) you will see the **PCF** submodel(s). Click **View Submodel** (or **View Details**) on the PCF one.

**5. Read and confirm the data.** The **Submodel Viewer** opens. Use the **Structured** / **JSON** tabs to switch views. **Check:** you should see exactly the PCF data the provider created.

---

# Flow B — ASYNC (request, accept, receive)

Use this when you are the consumer and you need PCF data that a supplier has not published yet. You will use all three PCF screens plus Catalog Parts.

## Step 1 — Consumer: open your part in PCF Precalculation
1. In **Catalog Parts**, create and **register** the part you are calculating (e.g. `001-alice-wheel`) if it does not exist yet — see Flow A, Step 1.
2. Open **PCF Precalculation** (sidebar icon **PCF Precalculation**, or `/pcf/precalculation`). The search screen shows the title **PCF Precalculation** and a card headed **Search Catalog Part** with the hint *"Enter a Manufacturer Part ID to get started"*.
3. Type your part's **Manufacturer Part ID** into the search field (placeholder *"Enter Manufacturer Part ID…"*) and click **Calculate PCF**. *(The part must already exist and be registered; the dropdown also lets you create it if needed.)*

## Step 2 — Consumer: add a subpart relation
When the part opens, PCF Precalculation is empty — no subparts yet. The empty area is headed **No Subparts Added** with the hint *"Add subpart relations to request PCF data"*.

**1. Open the Add Subpart Relation dialog.** Click **Add Subpart** in the empty-state card, or **Add Subpart Relation** at the top-right of the page. Either one opens the same dialog.

**2. Fill in the dialog** — titled **Add Subpart Relation** (subtitle *"Parent Part: …"*):
- **Supplier BPN** (required) — the Business Partner Number of the supplier that owns the subpart (placeholder *"BPNL00000001SUPP"*, helper *"Business Partner Number (BPNL or BPNS)"*). If the contact is missing there is a *"Create it in Contact List"* link.
- **Manufacturer Part ID** (required) — the subpart's ID as assigned by that supplier (e.g. `001-alice-rim`), helper *"The part ID as assigned by the supplier"*.
- Click **Add Subpart Relation** (shows *"Adding…"* while it works). The subpart is added to the list with status **Pending**.

Repeat for each subpart (e.g. `001-alice-rim`, `001-alice-tyre`).

## Step 3 — Consumer: request the PCF and track progress
The part now shows its subparts and a progress panel.

- **Progress cards** — **Total Subparts**, **Delivered** and **Pending** show how far the collection is; a **PCF Collection Progress** bar shows the percentage.
- **Add more subparts** at any time with **Add Subpart Relation** (top-right) or the ghost "add" row at the bottom of the list.
- **Request the PCF.** On a **Pending** subpart row, click the **Request PCF** action — a **send / paper-plane icon** (its tooltip is *"Request PCF"*). The status moves through *sending* (*"Sending PCF request to supplier…"*) and *awaiting response* (*"Awaiting response from supplier…"*), then to **Delivered**. If a request errors, the icon turns red and its tooltip becomes **Retry Request** — click it to try again.
- **Expand a row.** Click a **Delivered / Received / Updated** row to reveal its **PCF Details** (Requested At, Delivered At, Carbon Footprint, Certificate Location).
- **Download JSON.** Once every subpart is collected, click **Download JSON** (top of the page; shows *"Downloading…"* while it works) to export the aggregated PCF. It stays disabled until all subparts are collected (its tooltip then explains *"Complete all PCF requests to download"*).

> **What "Delivered" means here:** your request reached the supplier and is being handled on their side. It becomes **Received** once the supplier accepts and returns the data (Step 5).

## Step 4 — Provider: accept the request in PCF Requests
Switch to the provider side. Open **PCF Requests** (sidebar icon **PCF Requests**, or `/pcf/requests`) — this is the provider's inbox. The page title reads **PCF Requests**.

- **Requests** appear as cards (or rows — toggle **Card View** / **List View**). Each shows the requester (name + BPNL), the requested part, the PCF version chip (e.g. `v9.0.0`) and a status chip. Filter with the tabs at the top: **All**, **Pending**, **Accepted**, **Delivered**, **Updated**, **Rejected**, **Failed** (each with a count).
- **Accept** — the **Accept** button (shows *"Accepting…"* while it works) approves the request and sends the PCF back to the consumer. It is enabled only once PCF data exists for that part.
- **Re-check** — if the PCF location is not resolved yet, a **Refresh** icon appears with the tooltip *"Re-check if PCF location is now available"*.

**If the Accept button is disabled**, its tooltip reads *"PCF location not yet resolved — use Refresh to check"* — it means no PCF data exists for that part yet. Do this first:
1. In **Catalog Parts**, create a part named exactly like the requested subpart (`001-alice-rim`) and **register** it.
2. Go to **PCF Management** and create the PCF data for that part — see [Step 5](#step-5--provider-create-pcf-data-in-pcf-management) below.
3. Return to **PCF Requests**, use **Refresh** if needed, and click **Accept**.

## Step 5 — Provider: create PCF data in PCF Management
Open **PCF Management** (sidebar icon **PCF Management**, or `/pcf/management`), type the part's Manufacturer Part ID and click **Search Part**. Depending on the part you will see one of **three states** (a 3-step stepper at the top shows *Register Catalog Part → Upload PCF Data → PCF Data*):

1. **Not registered (Draft).** A **Draft Part** chip is shown, the panel is headed **Register Your Catalog Part**, and it asks you to register the part first with a **Go to Catalog Management** button. Register it in **Catalog Parts** and come back.
2. **Registered, no PCF data.** A **Registered Part** chip is shown, the panel is headed **Upload PCF Data**. *This is most likely your case if you followed this guide.* Click the **Upload PCF Data** button (shows *"Uploading…"* while it works) to open the **Dual PCF Creation** wizard.
3. **PCF data registered.** Two version blocks (**PCF v9.0.0** and **PCF v7.0.0**) are shown, each with an **UPLOADED** status chip and **View Details** / **Update** buttons. This is the goal state. (A version that is still missing shows *"PCF … has not been uploaded yet."* with a **Create version** button.)

### The Dual PCF Creation wizard (three steps)
The wizard title reads **Dual PCF Creation (v9.0.0 + v7.0.0)** with the subtitle *"Create and reconcile both PCF versions before saving"*. Its stepper has three steps: **Create PCF v9.0.0**, **Create PCF v7.0.0**, **Review & Save**.

**Wizard step 1 — Create PCF v9.0.0** (the canonical version):
- **Import a file** — drag your own PCF v9.0.0 JSON into the drop zone (*"Drag & drop PCF v9.0.0 JSON"* / *"or click to browse"*), **or**
- **Build from scratch** — click **Open v9.0.0 Form Editor** to fill it with the Submodel Creator (the button becomes **Edit v9.0.0 Data** once data exists). When you save from the editor, its button reads **Use as v9.0.0 Data**.
- Click **Validate**. On success a *"Data validated successfully"* banner appears and the **Continue** button becomes available; on failure the button reads **Fix Errors** and lists how many errors were found.

**Wizard step 2 — Create PCF v7.0.0** (pre-filled from v9.0.0):
- An info note explains *"Fields already defined in v9.0.0 will be automatically pre-filled when you open the v7.0.0 form editor."*
- Import a v7.0.0 JSON, or click **Open v7.0.0 Form Editor** (**Edit v7.0.0 Data** once data exists) and adjust only what differs.
- Use the **Refresh from v9.0.0** link to re-copy the v9.0.0 values if you want to reset them.
- Click **Validate**, then **Continue**. Use **Back to v9.0.0** to go back.

**Wizard step 3 — Review & Save** (reconcile the two versions):
- If the versions match, a banner reads *"Both versions are consistent. Ready to save."*
- If they differ, the banner reads *"N difference(s) found between v9.0.0 and v7.0.0"* with two columns headed **v9.0.0** and **v7.0.0**. For each differing field, **click the v9.0.0 or v7.0.0 value to select it**, or use **Enter custom value** to type your own (then **Apply**). Unresolved fields carry an **Unresolved** chip; this step is what keeps the two PCF versions in sync.
- Click **Save** (labelled **Update** when a version already exists; a *"Save Both PCFs"* action stores both versions). Per-version results confirm each version was *"uploaded successfully"* / *"updated successfully"* / *"no changes — skipped"*. The part now reaches state 3 (PCF registered).

> **Why two versions?** The PCF standard mandates two schema versions (v9.0.0 and v7.0.0). The wizard lets you create both and reconcile any differences before saving.

## Step 6 — Consumer: receive the data
Back in **PCF Precalculation**, the requested subpart must reach the **Received** status.
- Confirm the subpart shows **Received**, then **expand its row** to read the **PCF Details** (Carbon Footprint value, Delivered At date, Certificate Location).
- Click **Download JSON** at the top and confirm the downloaded PCF is exactly the data the provider shared.

## Extra — update and propagate a PCF
1. **Provider:** open **PCF Management**, search the part you provided (now in the **PCF registered** state), and click **Update** on the version block (v9.0.0 or v7.0.0) you want to change. This reopens the **Dual PCF Creation** wizard.
2. Adjust the values, continue through **Review & Save**, and click **Update** (**Save**).
3. On save, the **Notify Participants** dialog appears (subtitle *"Select participants to notify about this PCF update"*):
   - If nobody has requested this PCF, it says so and you can **Skip**.
   - Otherwise it lists the interested BPNs with checkboxes (**Select All** / **Deselect All**). Choose who to notify and click **Send PCF Update** (shows *"Sending…"* while it works). A *"PCF update sent to N participant(s) successfully."* toast confirms it.
4. **Consumer:** in **PCF Precalculation**, confirm the subpart now shows the **Updated** status with the new values.

---

## Status Reference
- **Subpart (PCF Precalculation):** `Pending` → `Delivered` / `Received` → `Updated` (also `Rejected`, `Error`).
- **Request (PCF Requests):** `Pending` → `Accepted` → `Delivered` (also `Updated`, `Rejected`, `Failed`).
- **Part (Catalog Parts / PCF Management):** `Draft` → `Pending` → `Registered` → `Shared`; PCF version blocks read `UPLOADED` / `NOT UPLOADED`.

## Tips & Troubleshooting
- **A PCF icon is missing from the sidebar:** enable the feature — click the **"+" (Add Features)** button at the bottom of the sidebar, expand **PCF KIT** in the **Available Features** panel, and toggle on **PCF Precalculation** / **PCF Management** / **PCF Requests**.
- **"Calculate PCF" finds nothing:** the part must exist in your **Catalog Parts** and be **registered** first.
- **A subpart stays Pending forever:** the supplier has not accepted the request yet, or has no PCF data for that part. On the provider side, upload the PCF in **PCF Management**, then **Accept** in **PCF Requests**.
- **"Accept" is disabled in PCF Requests:** its tooltip reads *"PCF location not yet resolved"* — create the requested part in **Catalog Parts**, upload its PCF in **PCF Management**, then use **Refresh** and **Accept**.
- **Download JSON is disabled:** it only enables once every subpart has been collected (all **Delivered/Received**).
- **Naming clash with other participants:** always prefix parts with your own ID (e.g. `001-alice-…`) so you can find your own data.

---

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 LKS Next
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
