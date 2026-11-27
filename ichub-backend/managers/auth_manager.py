###############################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
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
###############################################################################

import hmac
from typing import Any
from fastapi import Request
from tractusx_sdk.dataspace.managers import AuthManager
from managers.config.log_manager import LoggingManager

logger = LoggingManager.get_logger('staging')

PLACEHOLDER_API_KEYS = frozenset({"<example>", "<<example>>"})


def normalize_api_keys(raw: Any) -> list[str]:
    """Return the configured API keys as non-empty strings (scalar or list)."""
    if raw is None:
        return []
    items = raw if isinstance(raw, (list, tuple, set)) else [raw]
    return [str(k) for k in items if k is not None and str(k) != ""]


class MultiApiKeyAuthManager(AuthManager):
    """
    Extends AuthManager to support both single-string API keys and
    lists or sets of allowed API keys. Prevents 401 Unauthorized errors
    when apiKey.value is configured as a list or string.
    """
    configured_api_keys: list[str]

    def __init__(
        self,
        configured_api_key: Any = "password",
        api_key_header: str = "X-Api-Key",
        auth_enabled: bool = False
    ):
        self.configured_api_keys = normalize_api_keys(configured_api_key)
        if auth_enabled and not self.configured_api_keys:
            logger.warning("[API Key Manager] authorization.api_key.value is empty; every API-key request will be rejected")
        if auth_enabled and PLACEHOLDER_API_KEYS.intersection(self.configured_api_keys):
            logger.warning("[API Key Manager] authorization.api_key.value still holds the chart placeholder; set a real key before exposing the backend")
        first_key = self.configured_api_keys[0] if self.configured_api_keys else ""

        super().__init__(
            configured_api_key=first_key,
            api_key_header=api_key_header,
            auth_enabled=auth_enabled
        )

    def is_authenticated(self, request: Request) -> bool:
        if not self.auth_enabled:
            return True
        api_key_from_header = request.headers.get(self.api_key_header, None)
        if not api_key_from_header:
            return False
        presented = api_key_from_header.encode()
        matched = False
        for key in self.configured_api_keys:
            matched |= hmac.compare_digest(presented, key.encode())
        return matched
