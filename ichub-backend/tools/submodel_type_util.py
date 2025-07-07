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

from dataclasses import dataclass
import re

from tools.exceptions import InvalidError

REG_EX_SEMANTIC_ID = re.compile(r'^(([^:]+):)*(\d+(?:\.\d+){1,2})#([\w\-]+)$')

@dataclass
class SubmodelType():
    semantic_id: str
    submodel_name: str
    id_short: str
    version: str
    namespace_prefix: str

def get_submodel_type(semantic_id: str) -> SubmodelType:
    try:
        match: re.Match = REG_EX_SEMANTIC_ID.fullmatch(semantic_id)

        name = match.group(4)
        id_short = name[0].lower() + name[1:]
        version = match.group(3)
        namespace_prefix = match.group(2)
    except (AttributeError, TypeError) as e:
        raise InvalidError(f"Invalid semantic ID: {semantic_id}") from e

    return SubmodelType(semantic_id, name, id_short, version, namespace_prefix)
