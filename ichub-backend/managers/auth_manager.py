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

from typing import Any
from fastapi import Request
from tractusx_sdk.dataspace.managers import AuthManager


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
        if isinstance(configured_api_key, (list, tuple, set)):
            self.configured_api_keys = [
                str(k) for k in configured_api_key if k
            ]
            first_key = (
                self.configured_api_keys[0]
                if self.configured_api_keys else ""
            )
        elif isinstance(configured_api_key, str) and configured_api_key:
            self.configured_api_keys = [configured_api_key]
            first_key = configured_api_key
        else:
            self.configured_api_keys = []
            first_key = ""

        super().__init__(
            configured_api_key=first_key,
            api_key_header=api_key_header,
            auth_enabled=auth_enabled
        )

    def is_authenticated(self, request: Request) -> bool:
        if not self.auth_enabled:
            return True
        api_key_from_header = request.headers.get(self.api_key_header, None)
        if api_key_from_header is None:
            return False
        return api_key_from_header in self.configured_api_keys
