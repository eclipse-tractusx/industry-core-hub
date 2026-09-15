<!--

Eclipse Tractus-X - Industry Core Hub Backend

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

# 5. MCP Addon

Date: 2026-06-11

## Status

Accepted

## Context

AI clients such as Claude Desktop and Microsoft Copilot Studio speak the
[Model Context Protocol (MCP)](https://modelcontextprotocol.io/), an emerging
open standard that lets language models call typed tools exposed by a server.
IC-Hub already contains all the orchestration logic needed to discover partners,
browse digital twins, provision catalog parts, and exchange submodels in the
Tractus-X dataspace. The MCP Addon surfaces that logic as high-level,
use-case-oriented MCP tools so that non-technical users can interact with the
dataspace via natural-language chat without writing code or understanding
EDC/DTR internals.

## Decision

Add a new in-process add-on (`mcp_addon`) that mirrors the structure of the
existing EcoPass KIT and mounts a
[FastMCP](https://gofastmcp.com/) ASGI sub-application at
`/addons/mcp-addon/mcp`. The add-on is enabled by default
(`addons.mcp_addon.enabled: true`) and introduces no behavioural change for
existing users when disabled.

### Placement and layer conventions

The MCP Addon is a peer of the EcoPass KIT at Layer 4 (Use Case Add-ons):

```
controllers/fastapi/routers/addons/
  ├── ecopass_kit/…
  └── mcp_addon/           ← new — mounts FastMCP at /addons/mcp-addon/mcp

managers/addons_service/
  ├── ecopass_kit/…
  └── mcp_addon/           ← new — server, session, auth, audit, adapters

models/services/addons/
  ├── ecopass_kit/…
  └── mcp_addon/           ← new — tool I/O and session DTOs
```

No changes to Layer 3 (IC-Hub orchestration managers) or below.

### Auth model

MCP clients authenticate via Bearer token or OAuth 2.0 against IC-Hub's existing Keycloak
realm. The existing backend's OIDC client is used for the MCP server.
IC-Hub uses its own credentials for all downstream calls to EDC, DTR,
and submodel servers. End-user identity is recorded in IC-Hub's audit log but
is **not** impersonated into the dataspace.

Because the MCP ASGI sub-application is mounted directly on the FastAPI app
via `app.mount()` (bypassing the router dependency-injection system), auth is
enforced inside FastMCP via the `auth=` parameter, independent of the
`get_authentication_dependency()` guard used by the REST API.

#### Operating modes

| `authorization.enabled` | `authorization.keycloak.enabled` | MCP auth behaviour                                               |
|-------------------------|----------------------------------|------------------------------------------------------------------|
| `false`                 | any                              | No auth — endpoint publicly accessible (dev/test only)           |
| `true`                  | `true`                           | `KeycloakAuthProvider` (DCR + JWT validation + API-key fallback) |
| `true`                  | `false`                          | API-key Bearer fallback only; OAuth browser flow unavailable     |

#### Keycloak setup

**Prerequisites:**

1. **Set `hostname` in `configuration.yml`** to the publicly accessible URL of
   IC-Hub (e.g. `https://ichub.example.com`). The MCP endpoint URL is derived
   from this: `{hostname}/addons/mcp-addon/mcp`.

2. **IC-Hub configuration:**
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

#### API-key Bearer fallback

System-to-system callers (scripts, CI pipelines) can pass IC-Hub's configured
API key as a Bearer token:

```
Authorization: Bearer <value-of-authorization.api_key.value>
```

This is accepted alongside Keycloak JWTs; the combined verifier tries both in
order.

#### Token validation logic

`managers/addons_service/mcp_addon/v1/auth.py` builds a `MultiAuth`
that tries verifiers in order:

1. `OIDCProxy` — validates Keycloak-issued JWTs
2. `ApiKeyTokenVerifier` — checks the raw token string against the configured
   API key value

### Session state

Per-MCP-session state is held in-process (optionally Redis for multi-replica).
No new Postgres tables and no Alembic migrations are introduced.

### Write-tool confirmation gate

Write tools (create, update, share) return a preview on the first call and
execute only when called a second time with identical arguments. This behaviour
is controlled by `addons.mcp_addon.require_confirmation_for_writes` (default
`true`); set it to `false` to execute write tools on the first call. The state
machine lives in `managers/addons_service/mcp_addon/v1/confirmation.py`.

### Deviation — calling `SharingService` directly

Most add-on tools delegate to managers, as EcoPass does. The single exception
is `share_catalog_part`: the atomic "submodel store + DTR shell + EDC asset +
policy + contract" sequence exists only in
`services/provider/sharing_service.py`. Duplicating it inside the MCP Addon
would fork critical business logic.

**Decision**: `adapters/industry_core.py` calls `SharingService` directly.
This is a deliberate, narrow exception, annotated at the call site. Step 7
shipped with this direct-call approach.

**Alternative still open with maintainers**: extract a `SharingManager`
that both `SharingService` and the MCP adapter depend on. This preserves the
no-direct-service-call convention but requires a larger refactor. It can be
applied later without changing the MCP tool surface.

## Consequences

- A new optional dependency (`fastmcp`) is added to `requirements.txt`.
- All new packages are importable with the add-on disabled; no existing
  behaviour changes.
- The `SharingService` deviation shipped in step 7 with the direct-call
  approach; the optional `SharingManager` refactor remains open with
  maintainers and does not affect the MCP tool surface.
