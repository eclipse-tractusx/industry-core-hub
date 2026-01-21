# Submodel Creator Guide

Status: Draft
Type: Documentation

## Overview
- **Purpose:** Explain how to create a Submodel (e.g., DPP – Digital Product Passport) for a Catalog Part using the Submodel Creator.
- **Audience:** Frontend users/operators configuring submodels based on a schema.
- **Outcome:** A validated JSON is created and published as a submodel for the selected Catalog Part.

## Prerequisites
- **Registered Part:** The Catalog Part must already have at least one registered submodel for the “+ New Submodel” button to appear.
- **Selected Schema:** Know which schema you want to use (e.g., DPP). The creator interprets the schema to build a dynamic form.

## Start a New Submodel
1. Navigate to the Catalog Part details page.
2. Click `+ New Submodel` to launch the creator workflow.

<p align="center"><img src="media/01-new-submodel-button.png" alt="Launch Submodel Creator – button location" width="50%" /></p>

## Choose Target Schema
- Select the card for the desired Submodel Schema (e.g., DPP). The card shows a short description and the namespace.

<p align="center"><img src="media/02-schema-selection-dpp-card.png" alt="Select Schema – DPP card" width="50%" /></p>

## Submodel Creator Layout
When the creator opens, you'll see:

<p align="center"><img src="media/03-creator-layout-overview.png" alt="Creator Layout – header, status bar, and two main panels" width="50%" /></p>

- **Header & Context:** Shows target product and contextual metadata. Some items are interactive.
- **Floating Status Bar:** Displays JSON status, a `Validate` action, and reveals `Create Submodel` once JSON is valid.
- **Left Panel – Submodel Configuration:** Dynamic form generated from the selected schema. You can filter required fields, import existing JSON, and clear the form.
- **Right Panel – JSON & Rules:** Live JSON preview, validation errors list, and Schema Rules explorer.

### Left Panel: Submodel Configuration
- **Only Required filter:** Toggle to show just required fields to speed up data entry.

<div style="display:flex; gap:12px; justify-content:center;">
	<img src="media/04-filter-required-off.png" alt="Only Required – off" width="48%" />
	<img src="media/05-filter-required-on.png" alt="Only Required – on" width="48%" />
</div>

- **Import JSON:** Paste raw JSON or load from a file to prefill the form.

<div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
	<img src="media/06-import-json-entry.png" alt="Import JSON – entry point" width="48%" />
	<img src="media/07-import-json-paste.png" alt="Import JSON – paste JSON" width="48%" />
	<img src="media/08-import-json-file-picker.png" alt="Import JSON – file picker" width="48%" />
</div>

- **Clear Form:** Reset all form inputs.

<div style="display:flex; gap:12px; justify-content:center;">
	<img src="media/09-clear-form-action.png" alt="Clear Form – action" width="48%" />
	<img src="media/10-clear-form-confirmation.png" alt="Clear Form – confirmation" width="48%" />
</div>

### Right Panel: JSON Preview, Errors, and Rules
- **Tooltips & Field Info:** Hover the info icon to see field description and URN. Clicking it navigates to the related Schema Rules.

<div style="display:flex; gap:12px; justify-content:center;">
	<img src="media/11-field-info-tooltip.png" alt="Field Info Tooltip – description and URN" width="48%" />
	<img src="media/12-schema-rules-details.png" alt="Schema Rules – detailed field rules" width="48%" />
</div>

- **Interactive JSON Preview:** Click entries in the JSON preview to jump to the corresponding form field.

<div style="display:flex; gap:12px; justify-content:center;">
	<img src="media/13-json-preview-navigate.png" alt="JSON Preview – navigate to field" width="48%" />
	<img src="media/14-json-preview-focused.png" alt="JSON Preview – focused field" width="48%" />
</div>

## Fill the JSON
You can define the submodel content using the dynamic form. The form is built from the schema (e.g., DPP) and organizes sections and fields.

Tip: Enable **Only Required** to speed up initial completion.

### Option 1: Fill Manually
Supported field types and helpers:

- **Standard values:**

<p align="center"><img src="media/15-field-standard-text.png" alt="Text and general fields" width="50%" /></p>

- **Date values:**

<p align="center"><img src="media/16-field-date-picker.png" alt="Date pickers" width="50%" /></p>

- **Predefined values:**

<p align="center"><img src="media/17-field-predefined-select.png" alt="Selects with predefined options" width="50%" /></p>

- **Boolean values:**

<p align="center"><img src="media/18-field-boolean-toggle.png" alt="Toggles / checkboxes" width="50%" /></p>

- **Numeric values:**

<p align="center"><img src="media/19-field-numeric-input.png" alt="Numeric inputs" width="50%" /></p>

- **Arrays:**

<p align="center"><img src="media/20-field-array-items.png" alt="Add/remove array items" width="50%" /></p>

- **Nested structures:**

<p align="center"><img src="media/21-field-nested-structure.png" alt="Nested sections / objects" width="50%" /></p>

### Option 2: Import Existing JSON
Prefill the form by importing an existing JSON (paste or file). This is the fastest route if you have a valid payload.

<div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
	<img src="media/06-import-json-entry.png" alt="Import JSON – entry point" width="48%" />
	<img src="media/07-import-json-paste.png" alt="Import JSON – paste JSON" width="48%" />
	<img src="media/08-import-json-file-picker.png" alt="Import JSON – file picker" width="48%" />
</div>

## Validate the JSON
Click `Validate` in the floating status bar to check the payload against schema rules.

<p align="center"><img src="media/22-validate-button-action.png" alt="Validate – action" width="50%" /></p>

Two possible outcomes:

### Case A: JSON Has Errors
The right panel shows grouped validation errors.

<p align="center"><img src="media/23-validation-errors-grouped.png" alt="Validation Errors – grouped list" width="50%" /></p>

- **Return to JSON:** Click the `JSON` tab or change any form value.

<p align="center"><img src="media/24-return-json-view.png" alt="Return to JSON view" width="50%" /></p>

- **Expand an error group:** Click a group to see individual issues.

<p align="center"><img src="media/25-expand-error-group.png" alt="Expand errors – group details" width="50%" /></p>

- **Go to field:** Jumps to the related form control.

<div style="display:flex; gap:12px; justify-content:center;">
	<img src="media/26-goto-field-navigate.png" alt="Go to field – navigate" width="48%" />
	<img src="media/27-field-focused-correction.png" alt="Field focused – correction" width="48%" />
</div>

- **Search in Schema Rules:** Opens Schema Rules for the field and highlights applicable constraints.

<div style="display:flex; gap:12px; justify-content:center;">
	<img src="media/28-schema-rules-from-error.png" alt="Open Schema Rules – from error" width="48%" />
	<img src="media/29-schema-rules-constraints.png" alt="Schema Rules – matching constraints" width="48%" />
</div>

- **Go to field from Rules:** From a rule, jump back to the field to fix it.

<p align="center"><img src="media/30-goto-field-from-rules.png" alt="Go to field – button next to rule" width="50%" /></p>

Work through the listed errors until validation passes.

### Case B: JSON Validated
When the JSON is valid, you'll see a confirmation state.

<p align="center"><img src="media/31-validation-success.png" alt="Validation Success – ready to create" width="50%" /></p>

The `Create Submodel` button becomes enabled.

## Create the Submodel
1. Click `Create Submodel`.
2. Wait for the creation to complete. A success notice confirms the submodel was created.

<div style="display:flex; gap:12px; justify-content:center;">
	<img src="media/32-create-submodel-action.png" alt="Create Submodel – action" width="48%" />
	<img src="media/33-create-submodel-success.png" alt="Create Submodel – success notification" width="48%" />
</div>

## Verify in Catalog Part
Open the Catalog Part view and confirm the new DPP submodel appears.

<p align="center"><img src="media/34-catalog-part-verification.png" alt="Catalog Part – DPP submodel created" width="50%" /></p>

## Tips & Troubleshooting
- **Validation fails repeatedly:** Use `Only Required` filter, then incrementally add optional fields; check Schema Rules for each failing field.
- **Import issues:** Ensure JSON is valid per schema; try paste mode to see immediate parsing feedback.
- **Navigation aids:** Use JSON Preview and field tooltips to understand structure and constraints quickly.
- **Clearing form:** Use `Clear Form` to restart if the structure goes off-track.