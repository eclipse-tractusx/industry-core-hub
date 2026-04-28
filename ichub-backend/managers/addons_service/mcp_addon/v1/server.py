#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 Capgemini Deutschland GmbH
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

# FastMCP app factory, tool registration, and ASGI export.
#
# `mcp_http_app` is a Starlette ASGI sub-application that is mounted into the
# main FastAPI app at the path configured in addons.mcp_addon.mount_path.
# Its lifespan must be composed with the FastAPI lifespan — see app.py.

import asyncio

from fastmcp import FastMCP, Context
from mcp.types import ToolAnnotations
from fastmcp.server.dependencies import get_access_token

from managers.config.config_manager import ConfigManager

from .adapters.discovery import DiscoveryAdapter
from .adapters.ecopass import EcopassAdapter
from .adapters.industry_core import IndustryCoreAdapter
from .audit import audit_logger
from .auth import create_mcp_auth_provider
from .confirmation import confirm_or_execute
from .formatters import (
    format_shell, format_shells, format_submodel_descriptors, format_submodel_fetch,
    format_created_part, format_created_serialized_part, format_shared_part,
    format_created_partner, format_created_twin, format_created_aspect, format_shared_dpp,
)
from .policy_defaults import get_dtr_policies, get_governance_for_semantic_id
from .session import session_store

from models.services.addons.mcp_addon.v1.tool_io import OdrlPolicy, QuerySpec

# Derive the public MCP endpoint URL for OAuth 2.0 protected-resource metadata.
# Claude Desktop and other MCP clients use this for auto-discovery.
_hostname = str(ConfigManager.get_config("hostname", "http://localhost:9000")).rstrip("/")
# Full public MCP endpoint path, e.g. "/addons/mcp-addon/mcp".
_mount_path = str(ConfigManager.get_config("addons.mcp_addon.mount_path", "/addons/mcp-addon/mcp")).rstrip("/")

# Split the configured endpoint into the parent prefix the ASGI sub-app is
# mounted at and the leaf path the streamable-HTTP route is registered on.
# Mounting the sub-app one level up and serving the MCP route as a real leaf
# route — instead of mounting AT the leaf and serving "/" — lets clients connect
# with OR without a trailing slash. A Starlette mount root only matches WITH the
# slash and 307-redirects the bare path, which breaks the POST-based MCP
# handshake. The OAuth proxy routes (authorize/token/callback) also live in the
# sub-app, so they move up with it; base_url points at the parent accordingly.
mcp_mount_parent_path, _, _mcp_leaf = _mount_path.rpartition("/")
mcp_leaf_path = f"/{_mcp_leaf}"                      # e.g. "/mcp"
# Public base URL of the mounted sub-app. The protected-resource URL is derived
# from this + mcp_leaf_path inside FastMCP, reproducing the full endpoint URL.
_mcp_base_url = f"{_hostname}{mcp_mount_parent_path}"
_mcp_server_url = f"{_hostname}{_mount_path}"        # full endpoint URL, for logs/instructions

_dtr_policies = get_dtr_policies()
_READ_ONLY = ToolAnnotations(readOnlyHint=True)

_auth_provider = create_mcp_auth_provider(_mcp_base_url)

mcp = FastMCP(
    "IC-Hub MCP Addon",
    instructions=(
        "This server exposes Tractus-X / Catena-X dataspace capabilities as "
        "high-level tools. Use them to discover partners, browse digital twins, "
        "provision catalog parts and serialized parts, and exchange submodels.\n\n"
        "Read tools (list_known_partners, list_partner_twins, get_twin_details, "
        "list_twin_submodels, fetch_submodel, fetch_partner_dpp, "
        "list_my_catalog_parts, fetch_dpp, get_session_summary) execute "
        "immediately and return data.\n\n"
        "Write tools (create_catalog_part, update_catalog_part, "
        "create_serialized_part, share_catalog_part, register_business_partner, "
        "create_catalog_part_twin, create_serialized_part_twin, "
        "attach_twin_aspect, share_dpp) may require confirmation: the first "
        "call returns a preview; a second call with identical arguments "
        "executes the operation."
    ),
    auth=_auth_provider,
)

_adapter = IndustryCoreAdapter()
_discovery = DiscoveryAdapter()
_ecopass = EcopassAdapter()


def _user_sub() -> str:
    """Extract the authenticated user's subject claim, or 'anonymous'."""
    try:
        token = get_access_token()
        if token and token.claims:
            return token.claims.get("sub", token.client_id or "anonymous")
    except Exception:
        # No/invalid token or missing claims: fall back to 'anonymous'.
        # This is best-effort attribution for the audit log, so any
        # failure here must not break the tool call.
        pass
    return "anonymous"


@mcp.tool(annotations=_READ_ONLY)
async def list_known_partners(ctx: Context) -> list[dict]:
    """List all business partners registered in this IC-Hub instance.

    Returns a list of partner objects. Each object contains:
    - bpnl (str): Business Partner Number Legal — the 16-character
      Catena-X identifier starting with 'BPNL'.
    - name (str): Human-readable name of the partner organisation.

    This is a pure database read; no dataspace calls are made.
    The returned BPNLs are stored in the session for follow-up reference.
    """
    async with audit_logger.record_call(ctx.session_id, "list_known_partners", {}, _user_sub()) as meta:
        partners = _adapter.list_known_partners()
        meta["downstream_ids"] = [p["bpnl"] for p in partners]
        session_store.merge_bpnls(ctx.session_id, meta["downstream_ids"])
        return partners


@mcp.tool(annotations=_READ_ONLY)
async def get_session_summary(ctx: Context) -> dict:
    """Return what this MCP session currently knows from prior tool calls.

    Shows the IC-Hub entities that have been mentioned or returned so far,
    so you can refer back to them without re-running discovery tools.

    Returns an object with:
    - session_id (str): The current MCP session identifier.
    - known_partner_bpnls (list[str]): BPNLs seen via list_known_partners
      or partner-discovery tools.
    - known_twin_ids (list[str]): Twin IDs seen via consumption tools
      (populated from Step 4 onwards).
    - known_catalog_part_ids (list[str]): Catalog-part IDs seen via
      provision tools (populated from Step 6 onwards).
    """
    state = session_store.get_or_create(ctx.session_id)
    return {
        "session_id": state.session_id,
        "known_partner_bpnls": state.bpnls,
        "known_twin_ids": state.twin_ids,
        "known_catalog_part_ids": state.catalog_part_ids,
    }


@mcp.tool(annotations=_READ_ONLY)
async def list_partner_twins(
        ctx: Context,
        bpnl: str,
        query_spec: list[QuerySpec] | None = None,
) -> list[dict]:
    """Discover digital twin shells registered in a partner's DTR.

    Performs a full EDC negotiation + DTR lookup for the given partner.
    Returns a list of twin objects. Each object contains:
    - twin_id (str): The AAS shell ID (use this in follow-up tool calls).
    - global_asset_id (str): The global asset ID of the twin.
    - id_short (str): Short human-readable name.
    - submodel_count (int): Number of submodels attached to this twin.
    - submodels (list): Brief list of submodel IDs and their semantic IDs.

    Args:
        bpnl: Business Partner Number Legal of the data provider
              (e.g. 'BPNL000000000001'). Use list_known_partners to
              discover available BPNLs.
        query_spec: Optional list of asset-link filter dicts, each with
                    'name' and 'value' keys, e.g.:
                    [{"name": "manufacturerPartId", "value": "MPI-123"}].
                    Omit to return use the default:
                    [{"name": "digitalTwinType", "value": "PartType"}].

    The returned twin_ids are stored in the session for follow-up reference.
    """
    async with audit_logger.record_call(
            ctx.session_id, "list_partner_twins", {"bpnl": bpnl}, _user_sub()
    ) as meta:
        resolved_query = (
            [f.model_dump() for f in query_spec]
            if query_spec
            else [{"name": "digitalTwinType", "value": "PartType"}]
        )
        result = await _discovery.list_partner_twins(
            bpnl,
            resolved_query,
            dtr_policies=_dtr_policies,
        )
        twins = format_shells(result)
        new_ids = [t["twin_id"] for t in twins if t.get("twin_id")]
        meta["downstream_ids"] = new_ids
        session_store.merge_twin_ids(ctx.session_id, new_ids)
        return twins


@mcp.tool(annotations=_READ_ONLY)
async def get_twin_details(ctx: Context, bpnl: str, twin_id: str) -> dict:
    """Fetch the full AAS shell descriptor for a specific digital twin.

    Returns a twin object with the same shape as list_partner_twins entries
    but guaranteed to include the complete submodel list.

    Args:
        bpnl: Business Partner Number Legal of the data provider.
        twin_id: The AAS shell ID of the twin (returned by list_partner_twins).

    The twin_id is stored in the session for follow-up reference.
    """
    async with audit_logger.record_call(
            ctx.session_id, "get_twin_details", {"bpnl": bpnl, "twin_id": twin_id}, _user_sub()
    ) as meta:
        result = await _discovery.get_twin_details(bpnl, twin_id, dtr_policies=_dtr_policies)
        twin = format_shell(result.get("shell_descriptor", {}))
        meta["downstream_ids"] = [twin_id]
        session_store.merge_twin_ids(ctx.session_id, [twin_id])
        return twin


@mcp.tool(annotations=_READ_ONLY)
async def list_twin_submodels(ctx: Context, bpnl: str, twin_id: str) -> list[dict]:
    """List all submodels attached to a digital twin (metadata only, no data fetched).

    Returns a list of submodel descriptor objects. Each contains:
    - submodel_id (str): The submodel ID (use this in fetch_submodel).
    - semantic_id (str): The SAMM semantic ID identifying the aspect type,
      e.g. 'urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation'.
    - status (str): Discovery status for this submodel.
    - connector_url (str): EDC connector endpoint that provides the submodel.

    No submodel data is downloaded. Use fetch_submodel to retrieve data
    for a specific submodel.

    Args:
        bpnl: Business Partner Number Legal of the data provider.
        twin_id: The AAS shell ID of the twin (returned by list_partner_twins).
    """
    async with audit_logger.record_call(
            ctx.session_id, "list_twin_submodels", {"bpnl": bpnl, "twin_id": twin_id}, _user_sub()
    ) as meta:
        result = await _discovery.list_twin_submodels(bpnl, twin_id, dtr_policies=_dtr_policies)
        submodels = format_submodel_descriptors(result)
        meta["downstream_ids"] = [s["submodel_id"] for s in submodels if s.get("submodel_id")]
        session_store.merge_twin_ids(ctx.session_id, [twin_id])
        return submodels


@mcp.tool(annotations=_READ_ONLY)
async def fetch_submodel(
        ctx: Context,
        bpnl: str,
        twin_id: str,
        submodel_id: str,
        semantic_id: str | None = None,
        governance: list[OdrlPolicy] | None = None,
) -> dict:
    """Fetch the data payload of a specific submodel from a partner's twin.

    Negotiates EDC access and retrieves the submodel content. Returns:
    - submodel_id (str): The submodel ID.
    - semantic_id (str): The SAMM semantic ID of the aspect.
    - status (str): Retrieval status ('success', 'error', etc.).
    - data (dict | None): The actual submodel payload (aspect data).

    Args:
        bpnl: Business Partner Number Legal of the data provider.
        twin_id: The AAS shell ID of the twin.
        submodel_id: The submodel ID to fetch (from list_twin_submodels).
        semantic_id: Optional SAMM semantic ID of the submodel (from
                     list_twin_submodels). When provided and governance is
                     omitted, IC-Hub automatically selects the configured
                     access policy for that aspect type.
        governance: Optional list of ODRL policy dicts that IC-Hub must
                    accept to access this submodel. Overrides any policy
                    derived from semantic_id.
    """
    async with audit_logger.record_call(
            ctx.session_id,
            "fetch_submodel",
            {"bpnl": bpnl, "twin_id": twin_id, "submodel_id": submodel_id, "semantic_id": semantic_id},
            _user_sub(),
    ) as meta:
        resolved_governance = (
            [p.model_dump() for p in governance]
            if governance
            else (get_governance_for_semantic_id(semantic_id) if semantic_id else [])
        )
        result = await _discovery.fetch_submodel(
            bpnl, twin_id, submodel_id,
            governance=resolved_governance,
            dtr_policies=_dtr_policies,
        )
        fetched = format_submodel_fetch(result)
        meta["downstream_ids"] = [submodel_id]
        return fetched


_DPP_SEMANTIC_ID_FRAGMENT = "digital_product_passport"


@mcp.tool(annotations=_READ_ONLY)
async def fetch_partner_dpp(
        ctx: Context,
        bpnl: str,
        twin_id: str,
) -> dict:
    """Fetch the Digital Product Passport from a partner's digital twin.

    Discovers the DPP submodel on the twin, negotiates EDC access via the
    partner's connector, and returns the DPP payload.

    Returns an object with the same shape as fetch_submodel:
    - submodel_id (str | null): The DPP submodel ID.
    - semantic_id (str | null): The SAMM semantic ID of the DPP aspect.
    - status (str): Retrieval status ('success', 'not_found', 'error', etc.).
    - data (dict | null): The DPP payload when status is 'success'.

    Args:
        bpnl: Business Partner Number Legal of the data provider.
        twin_id: The AAS shell ID of the twin (returned by list_partner_twins).
    """
    async with audit_logger.record_call(
            ctx.session_id,
            "fetch_partner_dpp",
            {"bpnl": bpnl, "twin_id": twin_id},
            _user_sub(),
    ) as meta:
        submodel_result = await _discovery.list_twin_submodels(bpnl, twin_id, dtr_policies=_dtr_policies)
        descriptors = format_submodel_descriptors(submodel_result)

        dpp_descriptor = next(
            (s for s in descriptors if _DPP_SEMANTIC_ID_FRAGMENT in (s.get("semantic_id") or "").lower()),
            None,
        )
        if dpp_descriptor is None:
            meta["downstream_ids"] = []
            return {"submodel_id": None, "semantic_id": None, "status": "not_found", "data": None}

        submodel_id = dpp_descriptor["submodel_id"]
        semantic_id = dpp_descriptor["semantic_id"]
        meta["downstream_ids"] = [submodel_id]

        governance = get_governance_for_semantic_id(semantic_id) if semantic_id else []
        fetch_result = await _discovery.fetch_submodel(
            bpnl, twin_id, submodel_id,
            governance=governance,
            dtr_policies=_dtr_policies,
        )
        return format_submodel_fetch(fetch_result)


@mcp.tool(annotations=_READ_ONLY)
async def list_my_catalog_parts(
        ctx: Context,
        manufacturer_id: str | None = None,
) -> list[dict]:
    """List catalog parts registered in this IC-Hub instance.

    Returns a list of catalog part objects. Each object contains:
    - catalog_part_id (str): Composite key '<manufacturer_id>::<manufacturer_part_id>'
      — use this string to reference the part in follow-up tools.
    - manufacturer_id (str): The BPNL of the part manufacturer.
    - manufacturer_part_id (str): The manufacturer-assigned part number.
    - name (str): Human-readable part name.
    - category (str | null): Optional part category.
    - bpns (str | null): BPNS site identifier the part is attached to.
    - status (str): Sharing lifecycle status —
        'draft' (not yet submitted),
        'pending' (twin DB row exists, not yet in DTR),
        'registered' (in DTR, not yet shared),
        'shared' (shared with at least one partner).

    This is a pure database read; no dataspace calls are made.
    The returned catalog_part_ids are stored in the session for follow-up reference.

    Args:
        manufacturer_id: Optional BPNL to filter parts by manufacturer.
                         Omit to return all catalog parts across all manufacturers.
    """
    async with audit_logger.record_call(
            ctx.session_id, "list_my_catalog_parts", {"manufacturer_id": manufacturer_id}, _user_sub()
    ) as meta:
        parts = _adapter.list_my_catalog_parts(manufacturer_id=manufacturer_id)
        ids = [p["catalog_part_id"] for p in parts]
        meta["downstream_ids"] = ids
        session_store.merge_catalog_part_ids(ctx.session_id, ids)
        return parts


@mcp.tool(annotations=_READ_ONLY)
async def fetch_dpp(
        ctx: Context,
        dpp_id: str | None = None,
) -> list[dict]:
    """Fetch Digital Product Passports (DPPs) from this IC-Hub instance.

    Returns a list of DPP objects. Each object contains:
    - id (str): The DPP identifier (use this to reference the DPP).
    - passport_id (str): UUID from the DPP metadata.
    - name (str): Part name this DPP is attached to.
    - manufacturer_part_id (str): The manufacturer part number.
    - part_instance_id (str): Part instance ID (empty for catalog parts).
    - part_type (str): 'catalog', 'serialized', or 'batch'.
    - version (str): Semantic version derived from the aspect's semantic ID.
    - semantic_id (str): SAMM semantic ID of the DPP aspect.
    - status (str): 'active' (not yet shared) or 'shared'.
    - issue_date (str | null): Issue date from DPP metadata.
    - expiration_date (str | null): Expiration date from DPP metadata.
    - submodel_id (str): Submodel ID hosting the DPP payload.
    - created_at (str): ISO timestamp when the twin was created.
    - updated_at (str): ISO timestamp of last twin modification.
    - twin (dict | null): Associated digital twin identifiers.

    This is a pure database + local submodel-server read; no EDC negotiation.

    Args:
        dpp_id: Optional DPP identifier (id or passport_id).
                Omit to return all DPPs in this IC-Hub instance.
    """
    async with audit_logger.record_call(
            ctx.session_id, "fetch_dpp", {"dpp_id": dpp_id}, _user_sub()
    ) as meta:
        dpps = _ecopass.fetch_dpp(dpp_id=dpp_id)
        meta["downstream_ids"] = [d["id"] for d in dpps if d.get("id")]
        return dpps


# =====================================================================
# Write tools (Step 7) — no _READ_ONLY annotation
# =====================================================================


@mcp.tool()
async def create_catalog_part(
        ctx: Context,
        manufacturer_id: str,
        manufacturer_part_id: str,
        name: str,
        category: str | None = None,
        description: str | None = None,
        bpns: str | None = None,
) -> dict:
    """Register a new catalog part in this IC-Hub instance.

    Creates a part entry in the metadata database with status 'draft'.
    The part can later be shared with partners via share_catalog_part.

    Returns an object with:
    - catalog_part_id (str): Composite key '<manufacturer_id>::<manufacturer_part_id>'.
    - manufacturer_id (str): The BPNL of the manufacturer.
    - manufacturer_part_id (str): The manufacturer-assigned part number.
    - name (str): Human-readable part name.
    - category (str | null): Part category.
    - bpns (str | null): BPNS site identifier.
    - status (str): 'draft'.

    Args:
        manufacturer_id: The BPNL of the manufacturer (e.g. 'BPNL000000000001').
        manufacturer_part_id: The manufacturer-assigned part number (e.g. 'MPI-123').
        name: Human-readable name for the part.
        category: Optional category (e.g. 'sensor', 'battery').
        description: Optional longer description.
        bpns: Optional BPNS site identifier where the part is produced.
    """
    tool_args = {
        "manufacturer_id": manufacturer_id,
        "manufacturer_part_id": manufacturer_part_id,
        "name": name,
        "category": category,
        "description": description,
        "bpns": bpns,
    }
    async with audit_logger.record_call(
            ctx.session_id, "create_catalog_part", tool_args, _user_sub()
    ) as meta:
        async def _execute():
            return await asyncio.to_thread(
                _adapter.create_catalog_part,
                manufacturer_id=manufacturer_id,
                manufacturer_part_id=manufacturer_part_id,
                name=name,
                category=category,
                description=description,
                bpns=bpns,
            )

        executed, result = await confirm_or_execute(
            session_store, ctx.session_id, "create_catalog_part", tool_args,
            f"Create catalog part '{name}' ({manufacturer_id}::{manufacturer_part_id})",
            _execute,
        )
        if executed:
            part_id = result.get("catalog_part_id", "")
            meta["downstream_ids"] = [part_id]
            session_store.merge_catalog_part_ids(ctx.session_id, [part_id])
        return format_created_part(result) if executed else result


@mcp.tool()
async def update_catalog_part(
        ctx: Context,
        manufacturer_id: str,
        manufacturer_part_id: str,
        name: str | None = None,
        category: str | None = None,
        description: str | None = None,
        bpns: str | None = None,
) -> dict:
    """Update an existing catalog part in this IC-Hub instance.

    Only the provided fields are updated; omitted fields remain unchanged.

    Returns the updated catalog part with the same shape as create_catalog_part.

    Args:
        manufacturer_id: The BPNL of the manufacturer.
        manufacturer_part_id: The manufacturer-assigned part number.
        name: New human-readable name (omit to keep current).
        category: New category (omit to keep current).
        description: New description (omit to keep current).
        bpns: New BPNS site identifier (omit to keep current).
    """
    tool_args = {
        "manufacturer_id": manufacturer_id,
        "manufacturer_part_id": manufacturer_part_id,
        "name": name,
        "category": category,
        "description": description,
        "bpns": bpns,
    }
    async with audit_logger.record_call(
            ctx.session_id, "update_catalog_part", tool_args, _user_sub()
    ) as meta:
        async def _execute():
            return await asyncio.to_thread(
                _adapter.update_catalog_part,
                manufacturer_id=manufacturer_id,
                manufacturer_part_id=manufacturer_part_id,
                name=name,
                category=category,
                description=description,
                bpns=bpns,
            )

        executed, result = await confirm_or_execute(
            session_store, ctx.session_id, "update_catalog_part", tool_args,
            f"Update catalog part {manufacturer_id}::{manufacturer_part_id}",
            _execute,
        )
        if executed:
            part_id = result.get("catalog_part_id", "")
            meta["downstream_ids"] = [part_id]
        return format_created_part(result) if executed else result


@mcp.tool()
async def create_serialized_part(
        ctx: Context,
        manufacturer_id: str,
        manufacturer_part_id: str,
        part_instance_id: str,
        business_partner_number: str,
        customer_part_id: str | None = None,
        van: str | None = None,
        name: str | None = None,
        category: str | None = None,
        bpns: str | None = None,
) -> dict:
    """Register a single serialized part instance in this IC-Hub instance.

    Creates a serialized (instance-level) part entry. If the referenced
    catalog part or partner mapping does not exist yet, they are auto-created.

    Returns an object with:
    - manufacturer_id (str): The BPNL of the manufacturer.
    - manufacturer_part_id (str): The manufacturer-assigned part number.
    - part_instance_id (str): The unique instance identifier.
    - customer_part_id (str | null): Customer-specific part ID.
    - van (str | null): Vehicle Access Number.
    - name (str | null): Part name.

    Args:
        manufacturer_id: The BPNL of the manufacturer (e.g. 'BPNL000000000001').
        manufacturer_part_id: The manufacturer-assigned part number (e.g. 'MPI-123').
        part_instance_id: Unique identifier for this specific part instance.
        business_partner_number: BPNL of the business partner this instance
            is associated with.
        customer_part_id: Optional customer-specific part ID.
        van: Optional Vehicle Access Number.
        name: Optional human-readable name for the part.
        category: Optional part category.
        bpns: Optional BPNS site identifier where the part is produced.
    """
    tool_args = {
        "manufacturer_id": manufacturer_id,
        "manufacturer_part_id": manufacturer_part_id,
        "part_instance_id": part_instance_id,
        "business_partner_number": business_partner_number,
        "customer_part_id": customer_part_id,
        "van": van,
        "name": name,
        "category": category,
        "bpns": bpns,
    }
    async with audit_logger.record_call(
            ctx.session_id, "create_serialized_part", tool_args, _user_sub()
    ) as meta:
        async def _execute():
            return await asyncio.to_thread(
                _adapter.create_serialized_part,
                manufacturer_id=manufacturer_id,
                manufacturer_part_id=manufacturer_part_id,
                part_instance_id=part_instance_id,
                business_partner_number=business_partner_number,
                customer_part_id=customer_part_id,
                van=van,
                name=name,
                category=category,
                bpns=bpns,
            )

        executed, result = await confirm_or_execute(
            session_store, ctx.session_id, "create_serialized_part", tool_args,
            f"Create serialized part {manufacturer_id}::{manufacturer_part_id}::{part_instance_id}",
            _execute,
        )
        if executed:
            meta["downstream_ids"] = [part_instance_id]
        return format_created_serialized_part(result) if executed else result


@mcp.tool()
async def share_catalog_part(
        ctx: Context,
        manufacturer_id: str,
        manufacturer_part_id: str,
        business_partner_number: str,
        customer_part_id: str | None = None,
) -> dict:
    """Share a catalog part with a business partner.

    This is the primary provisioning tool. It performs an 8-step orchestration:
    1. Retrieve the catalog part from the database.
    2. Get or create the enablement service stack for the manufacturer.
    3. Get or create the business partner entity.
    4. Get or create the data exchange agreement.
    5. Get or create the partner catalog part mapping.
    6. Create or retrieve the catalog part digital twin.
    7. Ensure a twin exchange exists.
    8. Create the PartTypeInformation submodel aspect.

    Returns an object with:
    - business_partner_number (str): The BPNL the part was shared with.
    - customer_part_ids (dict): Mapping of customer part IDs to partner info.
    - shared_at (str): ISO timestamp of the share operation.
    - twin (dict | null): Digital twin identifiers (global_id, dtr_aas_id).

    Args:
        manufacturer_id: The BPNL of the manufacturer.
        manufacturer_part_id: The manufacturer-assigned part number.
        business_partner_number: BPNL of the partner to share with.
        customer_part_id: Optional customer-specific part ID mapping.
    """
    tool_args = {
        "manufacturer_id": manufacturer_id,
        "manufacturer_part_id": manufacturer_part_id,
        "business_partner_number": business_partner_number,
        "customer_part_id": customer_part_id,
    }
    async with audit_logger.record_call(
            ctx.session_id, "share_catalog_part", tool_args, _user_sub()
    ) as meta:
        async def _execute():
            return await asyncio.to_thread(
                _adapter.share_catalog_part,
                manufacturer_id=manufacturer_id,
                manufacturer_part_id=manufacturer_part_id,
                business_partner_number=business_partner_number,
                customer_part_id=customer_part_id,
            )

        executed, result = await confirm_or_execute(
            session_store, ctx.session_id, "share_catalog_part", tool_args,
            (
                f"Share catalog part {manufacturer_id}::{manufacturer_part_id} "
                f"with partner {business_partner_number}"
            ),
            _execute,
        )
        if executed:
            twin = result.get("twin") or {}
            meta["downstream_ids"] = [twin.get("global_id", "")]
            session_store.merge_bpnls(ctx.session_id, [business_partner_number])
        return format_shared_part(result) if executed else result


@mcp.tool()
async def register_business_partner(
        ctx: Context,
        bpnl: str,
        name: str,
) -> dict:
    """Register a new business partner in this IC-Hub instance.

    Creates a business partner entry that can be used in sharing operations.

    Returns an object with:
    - bpnl (str): The registered BPNL.
    - name (str): The partner name.

    Args:
        bpnl: Business Partner Number Legal (16-character identifier
              starting with 'BPNL', e.g. 'BPNL000000000001').
        name: Human-readable name of the partner organisation.
    """
    tool_args = {"bpnl": bpnl, "name": name}
    async with audit_logger.record_call(
            ctx.session_id, "register_business_partner", tool_args, _user_sub()
    ) as meta:
        async def _execute():
            return await asyncio.to_thread(
                _adapter.register_business_partner,
                bpnl=bpnl,
                name=name,
            )

        executed, result = await confirm_or_execute(
            session_store, ctx.session_id, "register_business_partner", tool_args,
            f"Register business partner '{name}' ({bpnl})",
            _execute,
        )
        if executed:
            meta["downstream_ids"] = [bpnl]
            session_store.merge_bpnls(ctx.session_id, [bpnl])
        return format_created_partner(result) if executed else result


@mcp.tool()
async def create_catalog_part_twin(
        ctx: Context,
        manufacturer_id: str,
        manufacturer_part_id: str,
) -> dict:
    """Create a digital twin for a catalog part in the Digital Twin Registry.

    Registers an AAS shell descriptor of type 'PartType' in the DTR.
    The part must already exist (use create_catalog_part first).

    Returns an object with:
    - global_id (str): The Catena-X ID (UUID) of the twin.
    - dtr_aas_id (str): The AAS shell ID in the Digital Twin Registry.
    - created_date (str): ISO timestamp.

    Args:
        manufacturer_id: The BPNL of the manufacturer.
        manufacturer_part_id: The manufacturer-assigned part number.
    """
    tool_args = {
        "manufacturer_id": manufacturer_id,
        "manufacturer_part_id": manufacturer_part_id,
    }
    async with audit_logger.record_call(
            ctx.session_id, "create_catalog_part_twin", tool_args, _user_sub()
    ) as meta:
        async def _execute():
            return await asyncio.to_thread(
                _adapter.create_catalog_part_twin,
                manufacturer_id=manufacturer_id,
                manufacturer_part_id=manufacturer_part_id,
            )

        executed, result = await confirm_or_execute(
            session_store, ctx.session_id, "create_catalog_part_twin", tool_args,
            f"Create digital twin for catalog part {manufacturer_id}::{manufacturer_part_id}",
            _execute,
        )
        if executed:
            meta["downstream_ids"] = [result.get("global_id", "")]
            session_store.merge_twin_ids(ctx.session_id, [result.get("global_id", "")])
        return format_created_twin(result) if executed else result


@mcp.tool()
async def create_serialized_part_twin(
        ctx: Context,
        manufacturer_id: str,
        manufacturer_part_id: str,
        part_instance_id: str,
) -> dict:
    """Create a digital twin for a serialized part instance.

    Registers an AAS shell descriptor of type 'PartInstance' in the DTR.
    Automatically generates the SerialPart V3 submodel aspect.
    The serialized part must already exist (use create_serialized_part first).

    Returns an object with:
    - global_id (str): The Catena-X ID (UUID) of the twin.
    - dtr_aas_id (str): The AAS shell ID in the Digital Twin Registry.
    - created_date (str): ISO timestamp.

    Args:
        manufacturer_id: The BPNL of the manufacturer.
        manufacturer_part_id: The manufacturer-assigned part number.
        part_instance_id: The unique instance identifier of the serialized part.
    """
    tool_args = {
        "manufacturer_id": manufacturer_id,
        "manufacturer_part_id": manufacturer_part_id,
        "part_instance_id": part_instance_id,
    }
    async with audit_logger.record_call(
            ctx.session_id, "create_serialized_part_twin", tool_args, _user_sub()
    ) as meta:
        async def _execute():
            return await asyncio.to_thread(
                _adapter.create_serialized_part_twin,
                manufacturer_id=manufacturer_id,
                manufacturer_part_id=manufacturer_part_id,
                part_instance_id=part_instance_id,
            )

        executed, result = await confirm_or_execute(
            session_store, ctx.session_id, "create_serialized_part_twin", tool_args,
            (
                f"Create digital twin for serialized part "
                f"{manufacturer_id}::{manufacturer_part_id}::{part_instance_id}"
            ),
            _execute,
        )
        if executed:
            meta["downstream_ids"] = [result.get("global_id", "")]
            session_store.merge_twin_ids(ctx.session_id, [result.get("global_id", "")])
        return format_created_twin(result) if executed else result


@mcp.tool()
async def attach_twin_aspect(
        ctx: Context,
        global_id: str,
        semantic_id: str,
        payload: dict,
) -> dict:
    """Add a submodel aspect to an existing digital twin.

    Uploads the submodel payload to the submodel service and registers the
    submodel descriptor in the DTR shell.

    Returns an object with:
    - submodel_id (str): The submodel descriptor ID.
    - semantic_id (str): The SAMM semantic ID of the aspect.
    - global_id (str): The Catena-X ID of the twin.

    Args:
        global_id: The Catena-X ID (UUID) of the digital twin
                   (returned by create_catalog_part_twin or
                   create_serialized_part_twin).
        semantic_id: The SAMM semantic ID of the aspect, e.g.
            'urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation'.
        payload: The aspect data as a JSON object. The structure must conform
                 to the schema defined by the semantic_id.
    """
    tool_args = {
        "global_id": global_id,
        "semantic_id": semantic_id,
        "payload": payload,
    }
    async with audit_logger.record_call(
            ctx.session_id, "attach_twin_aspect", tool_args, _user_sub()
    ) as meta:
        async def _execute():
            return await asyncio.to_thread(
                _adapter.attach_twin_aspect,
                global_id=global_id,
                semantic_id=semantic_id,
                payload=payload,
            )

        executed, result = await confirm_or_execute(
            session_store, ctx.session_id, "attach_twin_aspect", tool_args,
            f"Attach aspect {semantic_id} to twin {global_id}",
            _execute,
        )
        if executed:
            meta["downstream_ids"] = [result.get("submodel_id", "")]
        return format_created_aspect(result) if executed else result


@mcp.tool()
async def share_dpp(
        ctx: Context,
        dpp_id: str,
        business_partner_number: str,
) -> dict:
    """Share a Digital Product Passport with a business partner.

    Looks up the DPP by ID, determines whether it belongs to a catalog or
    serialized part twin, and shares the twin with the specified partner.

    Returns an object with:
    - dpp_id (str): The DPP identifier.
    - business_partner_number (str): The BPNL the DPP was shared with.
    - success (bool): Whether the share operation succeeded.

    Args:
        dpp_id: The DPP identifier (id or passport_id from fetch_dpp).
        business_partner_number: BPNL of the partner to share the DPP with.
    """
    tool_args = {
        "dpp_id": dpp_id,
        "business_partner_number": business_partner_number,
    }
    async with audit_logger.record_call(
            ctx.session_id, "share_dpp", tool_args, _user_sub()
    ) as meta:
        async def _execute():
            return await asyncio.to_thread(
                _ecopass.share_dpp,
                dpp_id=dpp_id,
                business_partner_number=business_partner_number,
            )

        executed, result = await confirm_or_execute(
            session_store, ctx.session_id, "share_dpp", tool_args,
            f"Share DPP {dpp_id} with partner {business_partner_number}",
            _execute,
        )
        if executed:
            meta["downstream_ids"] = [dpp_id]
            session_store.merge_bpnls(ctx.session_id, [business_partner_number])
        return format_shared_dpp(result) if executed else result


# Starlette ASGI sub-application for the streamable-HTTP MCP transport. The MCP
# route is registered at mcp_leaf_path (e.g. "/mcp") so that, once the sub-app is
# mounted at mcp_mount_parent_path, the full endpoint is reachable with or without
# a trailing slash. Mounted into the FastAPI app in controllers/fastapi/app.py.
mcp_http_app = mcp.http_app(transport="streamable-http", path=mcp_leaf_path)

# RFC 9728 protected-resource-metadata routes. FastMCP registers these inside
# the mcp_http_app, but because that sub-app is mounted under the parent prefix
# they end up at the wrong (doubly-prefixed) path. They MUST be served at the host
# root with the resource path appended, so controllers/fastapi/app.py re-mounts
# them on the parent FastAPI app. mcp_path=mcp_leaf_path mirrors the path passed
# to mcp.http_app(..., path=mcp_leaf_path) above, so the generated route path
# matches the resource_metadata URL FastMCP advertises in its 401
# WWW-Authenticate challenge.
# Empty when no OAuth provider is active (API-key-only or authorization disabled).
mcp_well_known_routes = (
    _auth_provider.get_well_known_routes(mcp_path=mcp_leaf_path) if _auth_provider else []
)
