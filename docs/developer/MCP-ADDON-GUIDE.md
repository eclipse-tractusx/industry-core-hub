<!--
Eclipse Tractus-X - Industry Core Hub

Copyright (c) 2026 Capgemini Deutschland GmbH
Copyright (c) 2026 Contributors to the Eclipse Foundation

See the NOTICE file(s) distributed with this work for additional
information regarding copyright ownership.

This work is made available under the terms of the
Creative Commons Attribution 4.0 International (CC-BY-4.0) license,
which is available at
https://creativecommons.org/licenses/by/4.0/legalcode.

SPDX-License-Identifier: CC-BY-4.0
-->

# MCP Addon Guide

The **MCP Addon** is an IC-Hub backend add-on that exposes the hub's dataspace
capabilities as high-level tools for AI clients (Claude Desktop, Microsoft
Copilot Studio, custom LLM agents) over the
[Model Context Protocol (MCP)](https://modelcontextprotocol.io/).

It is implemented as an in-process [FastMCP](https://gofastmcp.com/) ASGI
sub-application mounted into the FastAPI backend. AI clients call typed tools
in natural-language chat; IC-Hub uses **its own** dataspace credentials for all
downstream EDC/DTR/submodel calls — the end user is never impersonated into the
dataspace, only recorded in the audit log.

For the design rationale and layer placement, see
[ADR 0005 — MCP Addon](../architecture/decision-records/0005-mcp-addon.md).
For the runtime sequence diagrams, see the
[Runtime View](../architecture/4-runtime-view.md#mcp-addon-interaction-diagrams).

> **Status:** the MCP Addon is enabled by default. When disabled it adds no
> endpoints and changes no existing behaviour.

## Contents

- [Endpoints](#endpoints)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [Connecting a client](#connecting-a-client)
- [Tool reference](#tool-reference)
- [Write-tool confirmation](#write-tool-confirmation)
- [Sessions](#sessions)
- [Auditing](#auditing)
- [Troubleshooting](#troubleshooting)

## Endpoints

| Purpose           | Method / transport    | Path                                            |
|-------------------|-----------------------|-------------------------------------------------|
| MCP tool surface  | Streamable HTTP (MCP) | `{hostname}/addons/mcp-addon/mcp`               |
| Liveness check    | `GET`                 | `{hostname}/v1/addons/mcp-addon/health`         |
| Audit log (admin) | `GET`                 | `{hostname}/v1/addons/mcp-addon/audit?limit=50` |

The MCP transport is mounted at the **top level** (no `/v1` prefix) so that MCP
clients can reach it directly; the `mcp` path is configurable via
`addons.mcp_addon.mount_path`. The `health` and `audit` endpoints are regular
REST routes under the versioned API.

`{hostname}` is taken from the `hostname` config key (default
`http://localhost:9000`). The public MCP URL is derived as
`{hostname}{mount_path}` and is used to build the OAuth 2.0
protected-resource metadata that clients auto-discover.

## Configuration

All keys live under `addons.mcp_addon` in `ichub-backend/config/configuration.yml`
(or the equivalent Helm values). Defaults shown:

```yaml
hostname: "http://localhost:9000"   # public base URL; MCP URL = hostname + mount_path

addons:
  mcp_addon:
    # Mount the FastMCP server at mount_path.
    enabled: true
    # Enable OAuth 2.0 (Keycloak) authentication for the MCP endpoint.
    # When false, only the API-key Bearer fallback is used
    # (or no auth at all if authorization.enabled is false).
    oauth_enabled: false
    # ASGI mount path for the FastMCP streamable-HTTP transport.
    mount_path: /addons/mcp-addon/mcp
    # When true, write tools return a preview on the first call and execute
    # only on a second call with identical arguments.
    require_confirmation_for_writes: true
    # Idle TTL for in-process MCP sessions (seconds).
    session_ttl_seconds: 7200
    # Background sweep interval for expiring idle sessions (seconds).
    session_eviction_interval_seconds: 300
    audit:
      # Expose GET /v1/addons/mcp-addon/audit.
      expose_admin_endpoint: true
```

Authentication reuses IC-Hub's existing top-level `authorization` block
(`authorization.enabled`, `authorization.keycloak.*`, `authorization.api_key.value`).

## Authentication

Auth is enforced **inside FastMCP** via its `auth=` parameter, independent of
the dependency-injection guard used by the REST API (the MCP sub-app is mounted
directly on the FastAPI app and bypasses router dependencies).

The effective mode is derived from three flags:

| `authorization.enabled` | `addons.mcp_addon.oauth_enabled` + `keycloak.enabled` | MCP auth behaviour                                                                                               |
|-------------------------|-------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| `false`                 | any                                                   | **No auth** — endpoint publicly accessible (dev/test only; logs a warning)                                       |
| `true`                  | both `true`                                           | **`OIDCProxy`** — OAuth 2.0 proxy, JWT validation, plus API-key Bearer fallback                                  |
| `true`                  | either `false`                                        | **API-key Bearer fallback only** — token validation works, but OAuth browser-discovery endpoints are not exposed |

Two verifiers are tried in order (first success wins):

1. **`OIDCProxy`** — validates Keycloak-issued JWTs.
2. **`ApiKeyTokenVerifier`** — accepts IC-Hub's configured REST API key
   (`authorization.api_key.value`) passed as a Bearer token, for
   system-to-system callers that don't speak OAuth:

   ```
   Authorization: Bearer <value-of-authorization.api_key.value>
   ```

> If `authorization.enabled` is `true` but neither a Keycloak verifier nor a
> non-placeholder API key is configured, **all MCP requests are rejected** and
> an error is logged at startup.

### Keycloak setup (OAuth 2.0)

The OAuth path uses the existing Keycloak client of the IC-Hub backend.

1. **Set `hostname`** to the publicly reachable IC-Hub URL — the MCP endpoint
   URL and OAuth metadata are derived from it.
2. **Enable the OAuth flags:**
   ```yaml
   authorization:
     enabled: true
     keycloak:
       enabled: true
       auth_url: "https://keycloak.example.com"
       realm: "ICHub"
   addons:
     mcp_addon:
       enabled: true
       oauth_enabled: true
   hostname: "https://ichub.example.com"
   ```

## Connecting a client

### Claude Desktop (remote HTTP server)

Add the IC-Hub MCP endpoint to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ichub": {
      "url": "https://ichub.example.com/addons/mcp-addon/mcp"
    }
  }
}
```

- With **OAuth enabled**, Claude Desktop opens a browser to authenticate against
  Keycloak.
- With **API-key only** (or for non-OAuth clients), supply the key as a Bearer
  token in the client's HTTP-header configuration:
  ```json
  {
    "mcpServers": {
      "ichub": {
        "url": "https://ichub.example.com/addons/mcp-addon/mcp",
        "headers": { "Authorization": "Bearer <api-key>" }
      }
    }
  }
  ```

Restart the client after editing its config. The server advertises itself as
**"IC-Hub MCP Addon"** with usage instructions the client surfaces to the model.

### Microsoft Copilot Studio / custom agents

Point any MCP-capable client at the same streamable-HTTP URL. OAuth 2.0
discovery is served from `{hostname}/addons/mcp-addon/mcp/.well-known/oauth-protected-resource`
when OAuth is enabled.

### Local development (no auth)

For local testing, leave `authorization.enabled: false`. The endpoint is then
open at `http://localhost:9000/addons/mcp-addon/mcp` with no credentials. **Never
run this way in production** — a startup warning is logged.

## Tool reference

18 tools are registered: 9 read-only and 9 write. Read tools execute
immediately; write tools are gated by the
[confirmation step](#write-tool-confirmation).

### Read-only tools

| Tool                    | Purpose                                                                                                               |
|-------------------------|-----------------------------------------------------------------------------------------------------------------------|
| `list_known_partners`   | List business partners registered in this IC-Hub (DB read).                                                           |
| `list_my_catalog_parts` | List catalog parts (optionally filtered by `manufacturer_id`) with sharing status.                                    |
| `list_partner_twins`    | Discover a partner's digital twin shells via EDC negotiation + DTR lookup (`bpnl`, optional `query_spec`).            |
| `get_twin_details`      | Fetch the full AAS shell descriptor for one twin (`bpnl`, `twin_id`).                                                 |
| `list_twin_submodels`   | List a twin's submodel descriptors — metadata only, no data fetched (`bpnl`, `twin_id`).                              |
| `fetch_submodel`        | Fetch a submodel payload from a partner twin (`bpnl`, `twin_id`, `submodel_id`, optional `semantic_id`/`governance`). |
| `fetch_partner_dpp`     | Discover and fetch a partner twin's Digital Product Passport (`bpnl`, `twin_id`).                                     |
| `fetch_dpp`             | Fetch DPP(s) hosted by this IC-Hub instance (optional `dpp_id`).                                                      |
| `get_session_summary`   | Show what the current MCP session has learned (known BPNLs, twin IDs, catalog-part IDs).                              |

### Write tools

| Tool                          | Purpose                                                                                                                                           |
|-------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| `create_catalog_part`         | Register a new catalog part (status `draft`).                                                                                                     |
| `update_catalog_part`         | Update fields of an existing catalog part.                                                                                                        |
| `create_serialized_part`      | Register a serialized part instance (auto-creates catalog part / partner mapping if missing).                                                     |
| `register_business_partner`   | Register a business partner (`bpnl`, `name`).                                                                                                     |
| `create_catalog_part_twin`    | Create a `PartType` digital twin in the DTR for a catalog part.                                                                                   |
| `create_serialized_part_twin` | Create a `PartInstance` digital twin (+ SerialPart V3 aspect) for a serialized part.                                                              |
| `attach_twin_aspect`          | Add a submodel aspect to an existing twin (`global_id`, `semantic_id`, `payload`).                                                                |
| `share_catalog_part`          | Primary provisioning flow — runs the atomic submodel + DTR shell + EDC asset + policy + contract sequence to share a catalog part with a partner. |
| `share_dpp`                   | Share an existing DPP's twin with a business partner.                                                                                             |

> **Note:** `share_catalog_part` calls `SharingService` directly (a documented
> exception); see [ADR 0005](../architecture/decision-records/0005-mcp-addon.md).

## Write-tool confirmation

When `require_confirmation_for_writes` is `true` (default), every write tool
uses a **preview / confirm** state machine:

1. **First call** returns a `status: "preview"` object summarising the operation
   and stages it in the session (keyed by tool name + a hash of the arguments).
2. **Second call with identical arguments** executes the staged action and
   clears the stage.
3. **A call with different arguments** discards the previous stage and previews
   the new one.

Set `require_confirmation_for_writes: false` to execute write tools on the first
call (e.g. for trusted automation). The state machine lives in
`managers/addons_service/mcp_addon/v1/confirmation.py`.

## Sessions

Per-MCP-session state (known BPNLs, twin IDs, catalog-part IDs, and any pending
write confirmation) is held **in-process** by default. Idle sessions expire
after `session_ttl_seconds` and are swept every
`session_eviction_interval_seconds`. No Postgres tables or Alembic migrations
are introduced.

For multi-replica deployments, set `redis_url` so sessions (and confirmation
state) are shared across replicas — otherwise a confirm call may land on a
different replica than the preview and fail to match.

## Auditing

Every tool call is recorded via the audit logger. When
`audit.expose_admin_endpoint` is `true`, recent records are available:

```
GET /v1/addons/mcp-addon/audit?limit=50
```

Each record contains `mcp_tool_name`, `mcp_session_id`, `end_user_sub` (the
authenticated subject, or `anonymous`), `outcome`, `duration_ms`,
`downstream_ids`, and a timestamp. Records are returned newest-last; `limit`
ranges from 1 to 500 (default 50).

## Troubleshooting

| Symptom                                     | Likely cause / fix                                                                                                                 |
|---------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| Client can't authenticate via browser/OAuth | `oauth_enabled` or `keycloak.enabled` is `false`, or Keycloak < 26.6.0, or anonymous client registration not enabled on the realm. |
| All MCP requests rejected at startup        | `authorization.enabled: true` but no Keycloak verifier and no (non-placeholder) API key configured.                                |
| Endpoint open without credentials           | `authorization.enabled: false` — expected for dev only; a warning is logged.                                                       |
| Write tool never executes                   | Confirmation gate is on — call the tool a **second time with identical arguments**.                                                |
| Confirm call fails on a scaled deployment   | Sessions are in-process                                                                                                            |
| OAuth discovery URL wrong                   | `hostname` not set to the publicly reachable URL; the MCP URL and metadata are derived from it.                                    |
| `404` on the MCP path                       | `addons.mcp_addon.enabled: false`, or a non-default `mount_path` the client isn't using.                                           |

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
