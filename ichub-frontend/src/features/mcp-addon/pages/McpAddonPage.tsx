/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Capgemini Deutschland GmbH
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
********************************************************************************/

import React, { useState } from 'react';
import {
  Box, Typography, Chip, Divider, Tab, Tabs,
  Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Tooltip,
} from '@mui/material';
import { LockOutlined, ContentCopy, Check } from '@mui/icons-material';

// ─── Data model ──────────────────────────────────────────────────────────────

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface ToolDef {
  name: string;
  description: string;
  whenToUse: string;
  parameters: Parameter[];
  returns: string;
  examplePrompt: string;
  readOnly: boolean;
  dspOperation: string;
}

interface ToolGroup {
  id: string;
  title: string;
  description: string;
  tools: ToolDef[];
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'discovery-tools',
    title: 'Discovery Tools',
    description: 'Find partners and browse digital twins. All tools in this group are read-only and do not transfer submodel data.',
    tools: [
      {
        name: 'list_known_partners',
        description: 'List all business partners registered in this IC-Hub instance.',
        whenToUse: 'Start here when you need partner BPNLs for follow-up tool calls. Returns only partners this IC-Hub already knows; does not query the broader dataspace.',
        parameters: [],
        returns: '{ bpnl: string, name: string }[]',
        examplePrompt: 'Who are my dataspace partners?',
        readOnly: true,
        dspOperation: 'Local database read (no dataspace call)',
      },
      {
        name: 'list_partner_twins',
        description: "Discover digital twin shells registered in a partner's DTR via EDC negotiation.",
        whenToUse: "Use when you have a partner's BPNL and want to browse their registered twins. Triggers an EDC contract negotiation and a DTR catalog request. Pass query_spec to filter by asset type.",
        parameters: [
          {
            name: 'bpnl', type: 'string', required: true,
            description: "Business Partner Number Legal of the data provider (e.g. 'BPNL000000000001'). Use list_known_partners to discover valid BPNLs.",
          },
          {
            name: 'query_spec', type: '{ name: string, value: string }[]', required: false,
            description: "Asset-property filters. Defaults to [{ name: 'digitalTwinType', value: 'PartType' }] when omitted.",
          },
        ],
        returns: '{ twin_id, global_asset_id, id_short, submodel_count, submodels[] }[]',
        examplePrompt: 'Show me all digital twins registered by BPNL000000000001.',
        readOnly: true,
        dspOperation: 'EDC contract negotiation + DTR catalog request',
      },
      {
        name: 'get_twin_details',
        description: 'Fetch the complete AAS shell descriptor for a specific digital twin.',
        whenToUse: 'Use when you already have a twin_id and need its guaranteed-complete submodel list. More targeted than list_partner_twins when you know the exact twin.',
        parameters: [
          { name: 'bpnl', type: 'string', required: true, description: 'Business Partner Number Legal of the data provider.' },
          { name: 'twin_id', type: 'string', required: true, description: 'AAS shell ID of the twin (returned by list_partner_twins).' },
        ],
        returns: '{ twin_id, global_asset_id, id_short, submodel_count, submodels[] }',
        examplePrompt: 'Get the full details for twin urn:uuid:… from BPNL000000000001.',
        readOnly: true,
        dspOperation: 'EDC contract negotiation + DTR shell lookup',
      },
      {
        name: 'list_twin_submodels',
        description: 'List all submodels attached to a digital twin (metadata only, no data fetched).',
        whenToUse: "Use to see what submodel types are available before deciding which to fetch. No data is downloaded. Call fetch_submodel afterward to retrieve a specific payload.",
        parameters: [
          { name: 'bpnl', type: 'string', required: true, description: 'Business Partner Number Legal of the data provider.' },
          { name: 'twin_id', type: 'string', required: true, description: 'AAS shell ID of the twin.' },
        ],
        returns: '{ submodel_id, semantic_id, status, connector_url }[]',
        examplePrompt: 'What submodel types does twin urn:uuid:… have?',
        readOnly: true,
        dspOperation: 'EDC contract negotiation + DTR submodel descriptor lookup',
      },
      {
        name: 'get_session_summary',
        description: 'Return a summary of dataspace entities seen in the current MCP session.',
        whenToUse: 'Use to recall which partners, twins, and catalog parts have been referenced in this conversation without re-running discovery tools.',
        parameters: [],
        returns: '{ session_id, known_partner_bpnls[], known_twin_ids[], known_catalog_part_ids[] }',
        examplePrompt: 'What have we looked at so far in this session?',
        readOnly: true,
        dspOperation: 'In-memory session state (no dataspace call)',
      },
    ],
  },
  {
    id: 'data-tools',
    title: 'Data Access Tools',
    description: 'Fetch submodel payloads and Digital Product Passports. These tools trigger EDC negotiations and transfer data over the dataspace.',
    tools: [
      {
        name: 'fetch_submodel',
        description: 'Negotiate EDC access and fetch the data payload of a specific submodel from a partner twin.',
        whenToUse: "Use when you have a submodel_id from list_twin_submodels and need the actual data. Provide semantic_id when available so IC-Hub can auto-select the correct access policy for that aspect type.",
        parameters: [
          { name: 'bpnl', type: 'string', required: true, description: 'Business Partner Number Legal of the data provider.' },
          { name: 'twin_id', type: 'string', required: true, description: 'AAS shell ID of the twin.' },
          { name: 'submodel_id', type: 'string', required: true, description: 'Submodel ID to fetch (from list_twin_submodels).' },
          {
            name: 'semantic_id', type: 'string', required: false,
            description: 'SAMM semantic ID of the submodel (from list_twin_submodels). When provided, IC-Hub auto-selects the access policy for that aspect type.',
          },
          {
            name: 'governance', type: 'OdrlPolicy[]', required: false,
            description: 'ODRL policy overrides. Overrides any policy derived from semantic_id.',
          },
        ],
        returns: '{ submodel_id, semantic_id, status, data } — status is "success" when data contains the aspect payload.',
        examplePrompt: 'Fetch the part type information submodel for twin urn:uuid:… from BPNL000000000001.',
        readOnly: true,
        dspOperation: 'EDC contract negotiation + submodel HTTP transfer',
      },
      {
        name: 'fetch_partner_dpp',
        description: "Discover and fetch a Digital Product Passport from a partner's digital twin.",
        whenToUse: "Use when you want a partner's DPP without manually browsing their submodel list. Automatically locates the DPP submodel and negotiates EDC access.",
        parameters: [
          { name: 'bpnl', type: 'string', required: true, description: 'Business Partner Number Legal of the data provider.' },
          { name: 'twin_id', type: 'string', required: true, description: 'AAS shell ID of the twin (from list_partner_twins).' },
        ],
        returns: '{ submodel_id, semantic_id, status, data } — status is "not_found" if no DPP submodel exists on this twin.',
        examplePrompt: 'Get the digital product passport for twin urn:uuid:… from BPNL000000000001.',
        readOnly: true,
        dspOperation: 'EDC contract negotiation + DPP submodel transfer',
      },
      {
        name: 'fetch_dpp',
        description: 'Fetch Digital Product Passports from this IC-Hub instance (local read, no EDC negotiation).',
        whenToUse: 'Use to browse DPPs that this IC-Hub owns or has provisioned. No partner interaction is needed. Pass dpp_id to retrieve a specific passport by ID.',
        parameters: [
          {
            name: 'dpp_id', type: 'string', required: false,
            description: 'Optional DPP identifier (id or passport_id). Omit to return all DPPs in this IC-Hub instance.',
          },
        ],
        returns: '{ id, passport_id, name, manufacturer_part_id, part_type, version, semantic_id, status, submodel_id, twin }[]',
        examplePrompt: 'Show me all digital product passports in this IC-Hub.',
        readOnly: true,
        dspOperation: 'Local database + submodel server read (no dataspace call)',
      },
    ],
  },
  {
    id: 'catalog-tools',
    title: 'Catalog Tools',
    description: 'Read catalog parts registered in this IC-Hub instance. No EDC negotiation required.',
    tools: [
      {
        name: 'list_my_catalog_parts',
        description: 'List catalog parts registered in this IC-Hub instance (local read, no EDC negotiation).',
        whenToUse: 'Use to see what parts this IC-Hub is providing or sharing with partners. Check the status field to distinguish draft, registered, and shared parts.',
        parameters: [
          {
            name: 'manufacturer_id', type: 'string', required: false,
            description: 'Optional BPNL to filter parts by manufacturer. Omit to return parts across all manufacturers.',
          },
        ],
        returns: '{ catalog_part_id, manufacturer_id, manufacturer_part_id, name, category, bpns, status }[] — status: draft | pending | registered | shared.',
        examplePrompt: 'What catalog parts are registered in this IC-Hub? Which are already shared?',
        readOnly: true,
        dspOperation: 'Local database read (no dataspace call)',
      },
    ],
  },
  {
    id: 'provisioning-tools',
    title: 'Provisioning Tools',
    description: 'Create and share parts, twins, and business partners. These are write operations — the first call returns a preview, and a second identical call executes the action.',
    tools: [
      {
        name: 'create_catalog_part',
        description: 'Register a new catalog part in this IC-Hub instance.',
        whenToUse: "Use when you need to add a new part to the IC-Hub catalog. The part is created with status 'draft' and can later be shared with partners via share_catalog_part.",
        parameters: [
          { name: 'manufacturer_id', type: 'string', required: true, description: "The BPNL of the manufacturer (e.g. 'BPNL000000000001')." },
          { name: 'manufacturer_part_id', type: 'string', required: true, description: "The manufacturer-assigned part number (e.g. 'MPI-123')." },
          { name: 'name', type: 'string', required: true, description: 'Human-readable name for the part.' },
          { name: 'category', type: 'string', required: false, description: "Optional category (e.g. 'sensor', 'battery')." },
          { name: 'description', type: 'string', required: false, description: 'Optional longer description.' },
          { name: 'bpns', type: 'string', required: false, description: 'Optional BPNS site identifier where the part is produced.' },
        ],
        returns: '{ catalog_part_id, manufacturer_id, manufacturer_part_id, name, category, bpns, status }',
        examplePrompt: 'Register a new catalog part called "Temperature Sensor" with part number TS-100.',
        readOnly: false,
        dspOperation: 'Local database write (no dataspace call)',
      },
      {
        name: 'update_catalog_part',
        description: 'Update an existing catalog part in this IC-Hub instance.',
        whenToUse: 'Use to change metadata of an already-registered catalog part. Only the provided fields are updated; omitted fields remain unchanged.',
        parameters: [
          { name: 'manufacturer_id', type: 'string', required: true, description: 'The BPNL of the manufacturer.' },
          { name: 'manufacturer_part_id', type: 'string', required: true, description: 'The manufacturer-assigned part number.' },
          { name: 'name', type: 'string', required: false, description: 'New human-readable name (omit to keep current).' },
          { name: 'category', type: 'string', required: false, description: 'New category (omit to keep current).' },
          { name: 'description', type: 'string', required: false, description: 'New description (omit to keep current).' },
          { name: 'bpns', type: 'string', required: false, description: 'New BPNS site identifier (omit to keep current).' },
        ],
        returns: '{ catalog_part_id, manufacturer_id, manufacturer_part_id, name, category, bpns, status }',
        examplePrompt: 'Rename the Temperature Sensor part to "High-Precision Temperature Sensor".',
        readOnly: false,
        dspOperation: 'Local database write (no dataspace call)',
      },
      {
        name: 'create_serialized_part',
        description: 'Register a single serialized part instance in this IC-Hub instance.',
        whenToUse: 'Use when you need to create an individual part instance (serial number level). If the referenced catalog part or partner mapping does not exist yet, they are auto-created.',
        parameters: [
          { name: 'manufacturer_id', type: 'string', required: true, description: "The BPNL of the manufacturer (e.g. 'BPNL000000000001')." },
          { name: 'manufacturer_part_id', type: 'string', required: true, description: "The manufacturer-assigned part number (e.g. 'MPI-123')." },
          { name: 'part_instance_id', type: 'string', required: true, description: 'Unique identifier for this specific part instance.' },
          { name: 'business_partner_number', type: 'string', required: true, description: 'BPNL of the business partner this instance is associated with.' },
          { name: 'customer_part_id', type: 'string', required: false, description: 'Optional customer-specific part ID.' },
          { name: 'van', type: 'string', required: false, description: 'Optional Vehicle Access Number.' },
          { name: 'name', type: 'string', required: false, description: 'Optional human-readable name.' },
          { name: 'category', type: 'string', required: false, description: 'Optional part category.' },
          { name: 'bpns', type: 'string', required: false, description: 'Optional BPNS site identifier.' },
        ],
        returns: '{ manufacturer_id, manufacturer_part_id, part_instance_id, customer_part_id, van, name }',
        examplePrompt: 'Create a serialized part instance SN-001 for Temperature Sensor TS-100 assigned to BPNL000000000002.',
        readOnly: false,
        dspOperation: 'Local database write (no dataspace call)',
      },
      {
        name: 'share_catalog_part',
        description: 'Share a catalog part with a business partner via 8-step dataspace orchestration.',
        whenToUse: 'This is the primary provisioning tool. Use after creating a catalog part to make it visible to a specific partner in the dataspace. Handles everything: partner registration, data exchange agreement, twin creation, DTR registration, and PartTypeInformation aspect creation.',
        parameters: [
          { name: 'manufacturer_id', type: 'string', required: true, description: 'The BPNL of the manufacturer.' },
          { name: 'manufacturer_part_id', type: 'string', required: true, description: 'The manufacturer-assigned part number.' },
          { name: 'business_partner_number', type: 'string', required: true, description: 'BPNL of the partner to share with.' },
          { name: 'customer_part_id', type: 'string', required: false, description: 'Optional customer-specific part ID mapping.' },
        ],
        returns: '{ business_partner_number, customer_part_ids, shared_at, twin }',
        examplePrompt: 'Share the Temperature Sensor TS-100 with BMW (BPNL000000000002).',
        readOnly: false,
        dspOperation: 'DTR shell registration + EDC asset + policy + contract creation',
      },
      {
        name: 'register_business_partner',
        description: 'Register a new business partner in this IC-Hub instance.',
        whenToUse: 'Use to add a new partner before sharing parts with them. The share_catalog_part tool auto-creates partners, so this is only needed when you want to pre-register a partner with a specific name.',
        parameters: [
          { name: 'bpnl', type: 'string', required: true, description: "Business Partner Number Legal (e.g. 'BPNL000000000001')." },
          { name: 'name', type: 'string', required: true, description: 'Human-readable name of the partner organisation.' },
        ],
        returns: '{ bpnl, name }',
        examplePrompt: 'Register BMW as a business partner with BPNL BPNL000000000002.',
        readOnly: false,
        dspOperation: 'Local database write (no dataspace call)',
      },
      {
        name: 'create_catalog_part_twin',
        description: 'Create a digital twin for a catalog part in the Digital Twin Registry.',
        whenToUse: 'Use when you want to manually register a PartType digital twin without the full sharing orchestration. The catalog part must already exist (use create_catalog_part first). The share_catalog_part tool auto-creates twins, so this is only needed for fine-grained control.',
        parameters: [
          { name: 'manufacturer_id', type: 'string', required: true, description: 'The BPNL of the manufacturer.' },
          { name: 'manufacturer_part_id', type: 'string', required: true, description: 'The manufacturer-assigned part number.' },
        ],
        returns: '{ global_id, dtr_aas_id, created_date }',
        examplePrompt: 'Create a digital twin for catalog part BPNL000000000001::TS-100.',
        readOnly: false,
        dspOperation: 'DTR shell descriptor registration',
      },
      {
        name: 'create_serialized_part_twin',
        description: 'Create a digital twin for a serialized part instance in the Digital Twin Registry.',
        whenToUse: 'Use after creating a serialized part to register its PartInstance digital twin. Automatically generates the SerialPart V3 submodel aspect.',
        parameters: [
          { name: 'manufacturer_id', type: 'string', required: true, description: 'The BPNL of the manufacturer.' },
          { name: 'manufacturer_part_id', type: 'string', required: true, description: 'The manufacturer-assigned part number.' },
          { name: 'part_instance_id', type: 'string', required: true, description: 'The unique instance identifier of the serialized part.' },
        ],
        returns: '{ global_id, dtr_aas_id, created_date }',
        examplePrompt: 'Create a digital twin for serialized part SN-001 of TS-100.',
        readOnly: false,
        dspOperation: 'DTR shell descriptor registration + SerialPart V3 aspect creation',
      },
      {
        name: 'attach_twin_aspect',
        description: 'Add a submodel aspect to an existing digital twin.',
        whenToUse: 'Use to attach additional submodel data (e.g. PartTypeInformation, BatteryPass) to a twin that already exists. Requires the twin global_id from create_catalog_part_twin or create_serialized_part_twin.',
        parameters: [
          { name: 'global_id', type: 'string', required: true, description: 'The Catena-X ID (UUID) of the digital twin.' },
          { name: 'semantic_id', type: 'string', required: true, description: "The SAMM semantic ID of the aspect (e.g. 'urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation')." },
          { name: 'payload', type: 'object', required: true, description: 'The aspect data as a JSON object conforming to the semantic ID schema.' },
        ],
        returns: '{ submodel_id, semantic_id, global_id }',
        examplePrompt: 'Attach a PartTypeInformation aspect to twin urn:uuid:…',
        readOnly: false,
        dspOperation: 'Submodel upload + DTR submodel descriptor registration',
      },
      {
        name: 'share_dpp',
        description: 'Share a Digital Product Passport with a business partner.',
        whenToUse: 'Use to share an existing DPP with a partner. Automatically determines whether the DPP belongs to a catalog or serialized part twin and shares accordingly.',
        parameters: [
          { name: 'dpp_id', type: 'string', required: true, description: 'The DPP identifier (id or passport_id from fetch_dpp).' },
          { name: 'business_partner_number', type: 'string', required: true, description: 'BPNL of the partner to share the DPP with.' },
        ],
        returns: '{ dpp_id, business_partner_number, success }',
        examplePrompt: 'Share the digital product passport DPP-001 with BMW (BPNL000000000002).',
        readOnly: false,
        dspOperation: 'DTR twin sharing + EDC asset creation',
      },
    ],
  },
];

// DSP concept mapping — shown in the Concepts section
const DSP_MAPPING = [
  { tool: 'list_known_partners', operation: 'Local database read', notes: 'No dataspace call — reads the IC-Hub partner registry.' },
  { tool: 'list_partner_twins', operation: 'DTR catalog request', notes: 'EDC negotiation followed by a partner DTR query for twin shells.' },
  { tool: 'get_twin_details', operation: 'DTR shell lookup', notes: 'EDC negotiation followed by a specific AAS shell descriptor fetch.' },
  { tool: 'list_twin_submodels', operation: 'DTR submodel descriptors', notes: 'EDC negotiation followed by listing submodel descriptors (no payload).' },
  { tool: 'fetch_submodel', operation: 'Submodel HTTP transfer', notes: 'EDC contract negotiation then data transfer over HTTP.' },
  { tool: 'fetch_partner_dpp', operation: 'DPP submodel transfer', notes: 'Auto-discovers the DPP submodel descriptor, then EDC + HTTP transfer.' },
  { tool: 'fetch_dpp', operation: 'Local submodel server read', notes: 'No EDC — reads DPPs hosted by this IC-Hub.' },
  { tool: 'list_my_catalog_parts', operation: 'Local database read', notes: 'No dataspace call — reads the IC-Hub catalog registry.' },
  { tool: 'get_session_summary', operation: 'In-memory session state', notes: 'No calls — returns entities accumulated in this session.' },
  { tool: 'create_catalog_part', operation: 'Local database write', notes: 'Creates a catalog part entry with status draft. No dataspace call.' },
  { tool: 'update_catalog_part', operation: 'Local database write', notes: 'Updates catalog part metadata. No dataspace call.' },
  { tool: 'create_serialized_part', operation: 'Local database write', notes: 'Creates a serialized part instance. Auto-creates missing catalog parts and partner mappings.' },
  { tool: 'share_catalog_part', operation: 'DTR + EDC orchestration', notes: '8-step flow: partner → agreement → twin → DTR registration → EDC asset → policy → contract → PartTypeInformation aspect.' },
  { tool: 'register_business_partner', operation: 'Local database write', notes: 'Registers a partner entry. No dataspace call.' },
  { tool: 'create_catalog_part_twin', operation: 'DTR shell registration', notes: 'Registers a PartType AAS shell descriptor in the DTR.' },
  { tool: 'create_serialized_part_twin', operation: 'DTR shell + aspect creation', notes: 'Registers a PartInstance shell and auto-creates SerialPart V3 aspect.' },
  { tool: 'attach_twin_aspect', operation: 'Submodel upload + DTR registration', notes: 'Uploads submodel payload and registers the descriptor in the DTR shell.' },
  { tool: 'share_dpp', operation: 'DTR twin sharing', notes: 'Shares a DPP twin with a business partner via twin exchange.' },
];

// ToC entries for the sticky right-side navigation
const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'concepts', label: 'Concepts' },
  { id: 'discovery-tools', label: 'Discovery Tools' },
  { id: 'data-tools', label: 'Data Access Tools' },
  { id: 'catalog-tools', label: 'Catalog Tools' },
  { id: 'provisioning-tools', label: 'Provisioning Tools' },
  { id: 'faq', label: 'FAQ' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeading: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <Typography
    id={id}
    variant="h6"
    fontWeight={700}
    sx={{ mb: 2, mt: 5, scrollMarginTop: 16, color: 'text.primary' }}
  >
    {children}
  </Typography>
);

const SubHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="subtitle1"
    fontWeight={600}
    sx={{ mb: 1.5, mt: 3.5, color: 'text.primary' }}
  >
    {children}
  </Typography>
);

const CodeBlock: React.FC<{ code: string; language?: string; filePath?: string }> = ({
  code, language = '', filePath,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Box sx={{ my: 1.5, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 0.75,
        bgcolor: '#1e1e2e',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {language && (
            <Typography variant="caption" sx={{ color: '#888', fontFamily: 'monospace', fontSize: '0.72rem' }}>
              {language}
            </Typography>
          )}
          {filePath && (
            <Typography variant="caption" sx={{ color: '#666', fontFamily: 'monospace', fontSize: '0.72rem' }}>
              {filePath}
            </Typography>
          )}
        </Box>
        <Tooltip title={copied ? 'Copied' : 'Copy'} placement="left">
          <IconButton size="small" onClick={handleCopy} sx={{ color: '#888', p: 0.5, '&:hover': { color: '#ccc', bgcolor: 'transparent' } }}>
            {copied ? <Check sx={{ fontSize: '1rem' }} /> : <ContentCopy sx={{ fontSize: '1rem' }} />}
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0, px: 2, py: 1.5,
          bgcolor: '#1a1a2e',
          color: '#e6e6e6',
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
          fontSize: '0.82rem',
          lineHeight: 1.65,
          overflowX: 'auto',
          whiteSpace: 'pre',
        }}
      >
        {code}
      </Box>
    </Box>
  );
};

const Note: React.FC<{ children: React.ReactNode; variant?: 'info' | 'warning' | 'security' }> = ({
  children, variant = 'info',
}) => {
  const colors = {
    info: { bg: '#f0f7ff', border: '#90caf9', label: 'Note', labelColor: '#1565c0' },
    warning: { bg: '#fffde7', border: '#ffe082', label: 'Warning', labelColor: '#f57f17' },
    security: { bg: '#fce4ec', border: '#f48fb1', label: 'Security', labelColor: '#b71c1c' },
  };
  const c = colors[variant];
  return (
    <Box sx={{
      my: 1.5, px: 2, py: 1.25,
      bgcolor: c.bg,
      border: '1px solid',
      borderColor: c.border,
      borderRadius: 1,
    }}>
      <Typography component="span" sx={{ fontWeight: 700, color: c.labelColor, fontSize: '0.8rem', mr: 0.75 }}>
        {c.label}
      </Typography>
      <Typography component="span" variant="body2" sx={{ color: 'text.primary' }}>
        {children}
      </Typography>
    </Box>
  );
};

const ExamplePrompt: React.FC<{ prompt: string }> = ({ prompt }) => (
  <Box sx={{
    display: 'flex', alignItems: 'flex-start', gap: 1.25,
    my: 1.5, px: 2, py: 1.25,
    bgcolor: '#f8f9fa',
    borderLeft: '3px solid',
    borderColor: 'primary.main',
    borderRadius: '0 4px 4px 0',
  }}>
    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, mt: 0.1, flexShrink: 0, fontSize: '0.72rem' }}>
      EXAMPLE PROMPT
    </Typography>
    <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
      "{prompt}"
    </Typography>
  </Box>
);

const ParamTable: React.FC<{ parameters: Parameter[] }> = ({ parameters }) => {
  if (parameters.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', mb: 1 }}>
        No parameters.
      </Typography>
    );
  }
  return (
    <Box sx={{ overflowX: 'auto', mb: 1 }}>
      <Table size="small" sx={{ minWidth: 480, '& td, & th': { borderColor: 'divider', fontSize: '0.82rem', py: 0.75 } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: '#f8f9fa' }}>
            <TableCell sx={{ fontWeight: 700, width: '18%', color: 'text.primary' }}>Parameter</TableCell>
            <TableCell sx={{ fontWeight: 700, width: '20%', color: 'text.primary' }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 700, width: '10%', color: 'text.primary' }}>Required</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {parameters.map((p) => (
            <TableRow key={p.name} sx={{ '&:last-child td': { border: 0 } }}>
              <TableCell sx={{ fontFamily: 'monospace', color: '#1565c0', fontWeight: 600 }}>{p.name}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{p.type}</TableCell>
              <TableCell>
                {p.required
                  ? <Typography variant="caption" sx={{ color: '#c62828', fontWeight: 700 }}>required</Typography>
                  : <Typography variant="caption" sx={{ color: 'text.disabled' }}>optional</Typography>}
              </TableCell>
              <TableCell sx={{ color: 'text.secondary' }}>{p.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

const ToolCard: React.FC<{ tool: ToolDef }> = ({ tool }) => (
  <Box sx={{ mb: 4 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Chip
        label={tool.name}
        size="small"
        variant="outlined"
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          fontWeight: 600,
          borderColor: 'primary.main',
          color: 'primary.main',
          borderRadius: 1,
          height: 26,
        }}
      />
      {tool.readOnly && (
        <Chip
          icon={<LockOutlined sx={{ fontSize: '0.7rem !important' }} />}
          label="read-only"
          size="small"
          variant="outlined"
          sx={{
            fontSize: '0.7rem',
            height: 22,
            color: 'text.secondary',
            borderColor: 'divider',
            borderRadius: 1,
            '& .MuiChip-icon': { color: 'text.disabled', ml: 0.75 },
          }}
        />
      )}
    </Box>

    <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
      {tool.description}
    </Typography>

    <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'text.secondary', mb: 0.5, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.06em' }}>
      When to use
    </Typography>
    <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary', lineHeight: 1.6 }}>
      {tool.whenToUse}
    </Typography>

    <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'text.secondary', mb: 0.75, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.06em' }}>
      Parameters
    </Typography>
    <ParamTable parameters={tool.parameters} />

    <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'text.secondary', mb: 0.5, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.06em' }}>
      Returns
    </Typography>
    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#2e7d32', mb: 1.5 }}>
      {tool.returns}
    </Typography>

    <ExamplePrompt prompt={tool.examplePrompt} />

    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>
      DSP equivalent: {tool.dspOperation}
    </Typography>
  </Box>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const McpAddonPage: React.FC = () => {
  const [connectTab, setConnectTab] = useState(0);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', bgcolor: 'background.paper' }}>
      <Box sx={{
        display: 'flex',
        maxWidth: 1080,
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 5 },
        py: 4,
        alignItems: 'flex-start',
      }}>

        {/* ── Main content ── */}
        <Box sx={{ flex: 1, minWidth: 0, mr: { xs: 0, lg: 5 } }}>

          {/* ── Overview ── */}
          <Box id="overview" sx={{ scrollMarginTop: 16, mb: 5 }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: 'text.primary' }}>
              MCP Addon
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.7 }}>
              Connect your AI assistant directly to Catena-X dataspace data. IC-Hub exposes 18
              tools via the Model Context Protocol — nine read-only tools for discovery and data access,
              plus nine write tools for provisioning parts, creating digital twins, and sharing data with
              partners. Any MCP-capable client can interact with the dataspace without writing integration code.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
              {[
                'Discover dataspace partners and their registered digital twins.',
                'Fetch submodel payloads and Digital Product Passports via automated EDC negotiation.',
                'Register and share catalog parts and serialized parts with business partners.',
                'Create digital twins and attach submodel aspects — all without touching the underlying IDSA APIs.',
              ].map((point) => (
                <Box key={point} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'primary.main', mt: '6px', flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>{point}</Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{
              display: 'flex', flexWrap: 'wrap', gap: 1,
              p: 2, bgcolor: '#f8f9fa', borderRadius: 1,
            }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, width: '100%', mb: 0.5 }}>
                Compatible clients
              </Typography>
              {['Claude Desktop', 'Claude Code', 'Cursor', 'Windsurf', 'VS Code (Copilot)'].map((client) => (
                <Chip key={client} label={client} size="small" variant="outlined" sx={{ fontSize: '0.75rem', borderRadius: 1, height: 24 }} />
              ))}
            </Box>
          </Box>

          <Divider />

          {/* ── Getting Started ── */}
          <Box id="getting-started" sx={{ scrollMarginTop: 16 }}>
            <SectionHeading id="getting-started-heading">Getting Started</SectionHeading>

            <SubHeading>Prerequisites</SubHeading>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
              {[
                'A running IC-Hub instance (v0.0.1+) with the MCP Addon enabled.',
                'An API key or Keycloak credentials for IC-Hub authentication.',
                'An MCP-compatible AI client (Claude Desktop, Claude Code, or Cursor).',
              ].map((item, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}.
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{item}</Typography>
                </Box>
              ))}
            </Box>

            <SubHeading>Connect your client</SubHeading>
            <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
              Replace <Box component="code" sx={{ fontFamily: 'monospace', bgcolor: '#f0f0f0', px: 0.5, borderRadius: 0.5 }}>your-api-key</Box> with
              your IC-Hub API key.
            </Typography>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
              <Tabs
                value={connectTab}
                onChange={(_, v) => setConnectTab(v)}
                sx={{
                  pt: '0 !important',
                  minHeight: 40,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#f8f9fa',
                  '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
                  '& .MuiTab-root': {
                    minHeight: 40,
                    py: 0,
                    px: 2,
                    fontSize: '0.82rem',
                    textTransform: 'none',
                    alignItems: 'center',
                    color: 'text.secondary',
                    '&.Mui-selected': { color: 'primary.main', fontWeight: 600 },
                  },
                }}
              >
                <Tab label="Claude Desktop" />
                <Tab label="Claude Code" />
                <Tab label="VS Code" />
              </Tabs>

              <Box sx={{ p: 0 }}>
                {connectTab === 0 && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                      Add to <Box component="code" sx={{ fontFamily: 'monospace', bgcolor: '#f0f0f0', px: 0.5, borderRadius: 0.5 }}>claude_desktop_config.json</Box>:
                    </Typography>
                    <CodeBlock
                      language="json"
                      filePath="~/Library/Application Support/Claude/claude_desktop_config.json"
                      code={`{
  "mcpServers": {
    "ichub": {
      "url": "https://<IC-HUB-HOSTNAME>/addons/mcp-addon/mcp",
      "headers": {
        "Authorization": "Bearer your-api-key"
      }
    }
  }
}`}
                    />
                    <Note>Restart Claude Desktop after editing the config file.</Note>
                    <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
                      When Keycloak OAuth is enabled on your IC-Hub instance, omit the <code>headers</code> block — Claude Desktop will negotiate the OAuth flow automatically.
                    </Typography>
                  </Box>
                )}

                {connectTab === 1 && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                      Run this command in your terminal:
                    </Typography>
                    <CodeBlock
                      language="bash"
                      code={`claude mcp add ichub \\
  --header "Authorization: Bearer your-api-key" \\
  https://<IC-HUB-HOSTNAME>/addons/mcp-addon/mcp`}
                    />
                    <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
                      Verify the server is connected:
                    </Typography>
                    <CodeBlock language="bash" code="claude mcp list" />
                  </Box>
                )}

                {connectTab === 2 && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                      Requires VS Code 1.99+ with the <strong>GitHub Copilot</strong> extension. Create or edit <Box component="code" sx={{ fontFamily: 'monospace', bgcolor: '#f0f0f0', px: 0.5, borderRadius: 0.5 }}>.vscode/mcp.json</Box> in your workspace:
                    </Typography>
                    <CodeBlock
                      language="json"
                      filePath=".vscode/mcp.json"
                      code={`{
  "servers": {
    "ichub": {
      "type": "http",
      "url": "https://<IC-HUB-HOSTNAME>/addons/mcp-addon/mcp",
      "headers": {
        "Authorization": "Bearer your-api-key"
      }
    }
  }
}`}
                    />
                    <Note>
                      VS Code will prompt you to <strong>Start</strong> the server the first time it detects the config. Click the play button next to the server entry in the MCP panel, or open the Command Palette and run <Box component="code" sx={{ fontFamily: 'monospace', bgcolor: '#f0f0f0', px: 0.5, borderRadius: 0.5 }}>MCP: List Servers</Box> to confirm the server is running.
                    </Note>
                    <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
                      To apply the server for all workspaces instead of a single project, add the same <Box component="code" sx={{ fontFamily: 'monospace', bgcolor: '#f0f0f0', px: 0.5, borderRadius: 0.5 }}>servers</Box> block to your user <Box component="code" sx={{ fontFamily: 'monospace', bgcolor: '#f0f0f0', px: 0.5, borderRadius: 0.5 }}>settings.json</Box> under the key <Box component="code" sx={{ fontFamily: 'monospace', bgcolor: '#f0f0f0', px: 0.5, borderRadius: 0.5 }}>mcp</Box>:
                    </Typography>
                    <CodeBlock
                      language="json"
                      filePath="~/.config/Code/User/settings.json"
                      code={`{
  "mcp": {
    "servers": {
      "ichub": {
        "type": "http",
        "url": "https://<IC-HUB-HOSTNAME>/addons/mcp-addon/mcp",
        "headers": {
          "Authorization": "Bearer your-api-key"
        }
      }
    }
  }
}`}
                    />
                  </Box>
                )}
              </Box>
            </Box>

            <SubHeading>Verify it works</SubHeading>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Ask your AI client:
            </Typography>
            <ExamplePrompt prompt="Who are my dataspace partners in IC-Hub?" />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              You should receive a list of registered partner BPNLs and names. If the server returns no partners, confirm that partners have been added in the IC-Hub Business Partner KIT.
            </Typography>
          </Box>

          <Divider sx={{ mt: 5 }} />

          {/* ── Concepts ── */}
          <Box id="concepts" sx={{ scrollMarginTop: 16 }}>
            <SectionHeading id="concepts-heading">Concepts</SectionHeading>

            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              IC-Hub abstracts the underlying Dataspace Protocol (DSP) so you can work with plain tool calls instead of IDSA messages.
              The table below maps each MCP tool to the DSP operation it performs. Everywhere else in these docs, DSP terminology is hidden.
            </Typography>

            <SubHeading>Dataspace terms</SubHeading>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
              {[
                { term: 'BPNL', def: 'Business Partner Number Legal — a 16-character Catena-X identifier starting with BPNL that uniquely identifies a legal entity.' },
                { term: 'Digital Twin (AAS shell)', def: 'A structured asset descriptor registered in a partner\'s Digital Twin Registry (DTR). Contains metadata and references to submodels.' },
                { term: 'Submodel', def: 'A typed data payload attached to a digital twin, identified by a SAMM semantic ID (e.g. PartTypeInformation, BatteryPass).' },
                { term: 'EDC', def: 'Eclipse Dataspace Connector — the protocol layer that negotiates access policies between dataspace participants before data can be transferred.' },
                { term: 'DTR', def: 'Digital Twin Registry — the catalog where a participant registers their digital twins and makes them discoverable to authorized partners.' },
              ].map(({ term, def }) => (
                <Box key={term} sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main', flexShrink: 0, width: 180, mt: '1px' }}>
                    {term}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{def}</Typography>
                </Box>
              ))}
            </Box>

            <SubHeading>How tools map to DSP operations</SubHeading>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 520, '& td, & th': { borderColor: 'divider', fontSize: '0.82rem', py: 0.75 } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 700, color: 'text.primary', width: '30%' }}>MCP Tool</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.primary', width: '25%' }}>DSP Operation</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {DSP_MAPPING.map((row) => (
                    <TableRow key={row.tool} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ fontFamily: 'monospace', color: '#1565c0', fontSize: '0.78rem' }}>{row.tool}</TableCell>
                      <TableCell sx={{ color: 'text.primary' }}>{row.operation}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{row.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Note variant="info" >
              Read-only tools (discovery, data access, catalog) have the MCP spec <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.8em' }}>readOnlyHint</Box> annotation set.
              Write tools (provisioning) show a preview on the first call and execute only when called a second time with identical arguments.
            </Note>
          </Box>

          <Divider sx={{ mt: 5 }} />

          {/* ── Tool Reference ── */}
          {TOOL_GROUPS.map((group, gi) => (
            <Box key={group.id} id={group.id} sx={{ scrollMarginTop: 16 }}>
              <SectionHeading id={`${group.id}-heading`}>{group.title}</SectionHeading>
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>{group.description}</Typography>

              {group.tools.map((tool, ti) => (
                <React.Fragment key={tool.name}>
                  <ToolCard tool={tool} />
                  {ti < group.tools.length - 1 && <Divider sx={{ mb: 3, opacity: 0.5 }} />}
                </React.Fragment>
              ))}

              {gi < TOOL_GROUPS.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}

          <Divider />

          {/* ── FAQ ── */}
          <Box id="faq" sx={{ scrollMarginTop: 16, mb: 6 }}>
            <SectionHeading id="faq-heading">FAQ &amp; Troubleshooting</SectionHeading>

            {[
              {
                q: 'Tools aren\'t appearing in Claude',
                a: [
                  'Confirm the server URL is reachable from the machine running your AI client. Open the URL in a browser — you should see an HTTP response (not a connection error).',
                  'Check that the ichub server entry appears in your MCP client config and that the file was saved correctly.',
                  'Restart your AI client after editing the config file.',
                  'Look at the client\'s MCP logs. Claude Desktop writes logs to ~/Library/Logs/Claude/mcp-server-ichub.log (macOS) or %APPDATA%\\Claude\\logs\\ (Windows).',
                ],
              },
              {
                q: 'Authentication or token errors',
                a: [
                  'Verify your API key is correct and matches the value set in the IC-Hub configuration (authorization.api_key.value).',
                  'If your IC-Hub uses Keycloak OAuth, check that addons.mcp_addon.oauth_enabled is true in configuration.yml and that the Keycloak realm URL is accessible from the server.',
                  'Ensure the Authorization header value is exactly Bearer <your-api-key> — no quotes, correct spacing.',
                ],
              },
              {
                q: 'I can see partners but can\'t fetch submodel data',
                a: [
                  'Confirm the partner has shared their digital twin with your organisation\'s BPNL in their IC-Hub (check with the partner).',
                  'Verify the IC-Hub backend can reach the partner\'s EDC connector endpoint. The connector_url returned by list_twin_submodels is the address IC-Hub will contact.',
                  'Check whether the governance / ODRL policy configured in IC-Hub matches what the partner\'s connector accepts. If fetch_submodel returns status "contract_error", the policy negotiation failed.',
                ],
              },
              {
                q: 'The server is responding slowly',
                a: [
                  'Tools that trigger EDC negotiation (list_partner_twins, get_twin_details, list_twin_submodels, fetch_submodel, fetch_partner_dpp) involve two round-trips to the partner\'s infrastructure. Latency of 3–10 seconds is normal.',
                  'Local-read tools (list_known_partners, list_my_catalog_parts, fetch_dpp, get_session_summary) should respond in under one second. If they are slow, check IC-Hub backend health.',
                ],
              },
            ].map(({ q, a }) => (
              <Box key={q} sx={{ mb: 3.5 }}>
                <Typography variant="body1" fontWeight={600} sx={{ mb: 1, color: 'text.primary' }}>
                  {q}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {a.map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'text.disabled', mt: '6px', flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>{item}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Sticky on-this-page ToC ── */}
        <Box sx={{ display: { xs: 'none', lg: 'block' }, width: 188, flexShrink: 0 }}>
          <Box sx={{ position: 'sticky', top: 24 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.68rem', display: 'block', mb: 1.5 }}>
              On this page
            </Typography>
            {TOC.map((entry) => (
              <Box
                key={entry.id}
                onClick={() => scrollTo(entry.id)}
                sx={{
                  display: 'block', py: 0.5, px: 1,
                  cursor: 'pointer',
                  color: 'text.secondary',
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                  borderLeft: '2px solid transparent',
                  '&:hover': { color: 'primary.main', borderLeftColor: 'primary.main' },
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {entry.label}
              </Box>
            ))}
          </Box>
        </Box>

      </Box>
    </Box>
  );
};

export default McpAddonPage;
