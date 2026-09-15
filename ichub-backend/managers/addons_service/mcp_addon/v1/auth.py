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

# Keycloak OAuth 2.0 resource-server bridge for MCP clients.
#
# Reuses IC-Hub's existing Keycloak configuration (authorization.keycloak).
# Two operating modes:
#
#   1. Keycloak enabled (production / staging)
#      Uses KeycloakAuthProvider, which acts as an OAuth 2.0 proxy:
#      - Exposes the OAuth 2.0 metadata endpoints required by the MCP spec
#        (/.well-known/oauth-protected-resource, token/authorize proxying)
#      - Validates incoming Bearer tokens against Keycloak's JWKS endpoint
#      - Also accepts IC-Hub's configured API key as a Bearer token (API-key
#        fallback for system-to-system callers that don't speak OAuth)
#
#   2. Authorization disabled (addons.authorization.enabled: false)
#      Returns None — MCP endpoint is publicly accessible (dev/test only).
#
# The IC-Hub REST API guards its own endpoints via get_authentication_dependency()
# in auth_api.py. That FastAPI dependency does NOT cover the MCP sub-app (which
# is mounted directly on the FastAPI app via app.mount(), bypassing the router
# dependency injection system). Auth for the MCP endpoint must therefore be
# handled entirely inside FastMCP via the auth= parameter.

import logging

from fastmcp.server.auth import AccessToken, MultiAuth, TokenVerifier, OIDCProxy

from managers.config.config_manager import ConfigManager

logger = logging.getLogger(__name__)


class ApiKeyTokenVerifier(TokenVerifier):
    """Accepts IC-Hub's configured REST API key as a Bearer token.

    Allows system-to-system clients to reuse the same X-Api-Key credential
    they use for the REST endpoints, passing it as a Bearer token to the
    MCP endpoint instead.  The token value must match exactly.
    """

    def __init__(self, api_key: str) -> None:
        super().__init__()
        self._api_key = api_key

    async def verify_token(self, token: str) -> AccessToken | None:
        if token != self._api_key:
            return None
        return AccessToken(
            token=token,
            client_id="api-key-client",
            scopes=["openid"],
            expires_at=None,
            claims={"sub": "api-key-client", "client_id": "api-key-client"},
        )


def create_mcp_auth_provider(mcp_server_url: str):
    """Build the FastMCP auth provider from IC-Hub's authorization config.

    Args:
        mcp_server_url: Publicly accessible base URL of the MCP endpoint
            (e.g. ``http://localhost:9000/addons/mcp-addon/mcp``).  Used to
            construct the OAuth 2.0 protected-resource metadata URL that
            MCP clients discover via ``/.well-known/oauth-protected-resource``.

    Returns:
        A FastMCP ``AuthProvider`` (or a bare ``TokenVerifier``) when
        authorization is enabled, or ``None`` when it is disabled.
    """
    if not ConfigManager.get_config("authorization.enabled", False):
        logger.warning(
            "[MCP Addon] Authorization is DISABLED — the MCP endpoint is publicly "
            "accessible. Enable authorization in configuration.yml for production use."
        )
        return None

    keycloak_cfg = ConfigManager.get_config("authorization.keycloak") or {}
    api_key = ConfigManager.get_config("authorization.api_key.value") or ""

    # --- API-key fallback verifier (resource-server, machine-to-machine) ---
    _placeholder = "<<example>>"
    api_verifiers: list[TokenVerifier] = []
    if api_key and api_key != _placeholder:
        api_verifiers.append(ApiKeyTokenVerifier(api_key))
        logger.info("[MCP Addon] API-key Bearer fallback verifier registered.")

    # --- Keycloak OAuth 2.0 proxy (gated by addons.mcp_addon.oauth_enabled) ---
    realm_url: str | None = None
    mcp_oauth_enabled = ConfigManager.get_config("addons.mcp_addon.oauth_enabled", True)
    if mcp_oauth_enabled and keycloak_cfg.get("enabled"):
        auth_url = str(keycloak_cfg.get("auth_url", "")).rstrip("/")
        realm = keycloak_cfg.get("realm", "")
        if auth_url and realm:
            realm_url = f"{auth_url}/realms/{realm}"

    if realm_url:
        # MultiAuth tries Keycloak first (it owns the OAuth routes + discovery metadata),
        # then falls back to the API key for system-to-system callers that don't speak OAuth.
        logger.info(
            "[MCP Addon] OIDCProxy configured — base_url=%s realm=%s",
            mcp_server_url,
            realm_url,
        )

        oidcproxy = OIDCProxy(
            config_url=f"{realm_url}/.well-known/openid-configuration",

            client_id=keycloak_cfg.get("client_id"),
            client_secret=keycloak_cfg.get("client_secret"),

            base_url=mcp_server_url,

            required_scopes=["openid"]
        )
        if api_verifiers:
            return MultiAuth(server=oidcproxy, verifiers=api_verifiers)
        return oidcproxy

    # No Keycloak — resource-server-only mode.
    # Token validation works; MCP OAuth discovery endpoints are NOT exposed,
    # so clients that rely on auto-discovery won't work.
    if not api_verifiers:
        logger.error(
            "[MCP Addon] Authorization is enabled but no verifiers are configured "
            "(Keycloak disabled and no API key set). "
            "All MCP requests will be rejected."
        )
        return None

    logger.warning(
        "[MCP Addon] Keycloak is disabled. OAuth 2.0 browser-based flow will not "
        "work for MCP clients. Only Bearer-token (API-key) requests accepted."
    )
    return api_verifiers[0]
