#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 DRÄXLMAIER Group
# (represented by Lisa Dräxlmaier GmbH)
# Copyright (c) 2025 Contributors to the Eclipse Foundation
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

from typing import Any, Dict, List, Optional
import json
from base64 import b64decode
from uuid import UUID

from fastapi import HTTPException

def parse_json_list_parameter(list_param: Optional[List[str]], key_name: str = "name", value_name: str = "value") -> Dict[str, str]:
    result = {}
    if list_param:
        for param_entry in list_param:
            try:
                decoded_param = json.loads(b64decode(param_entry).decode('utf-8'))
                result[decoded_param[key_name]] = decoded_param[value_name]
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                raise HTTPException(status_code=400, detail=f"Invalid parameter format: {param_entry}") from e
    return result

def parse_base64_uuid(base64_uuid: str) -> UUID:
    try:
        decoded_bytes = b64decode(base64_uuid.encode('utf-8'))
        return UUID(decoded_bytes.decode('utf-8'))
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 UUID format: {base64_uuid}") from e