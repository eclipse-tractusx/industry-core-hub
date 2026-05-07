#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 LKS Next
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

"""
JSON Schema Validator Utilities.

This module provides JSON Schema validation utilities that handle multiple
JSON Schema draft versions correctly.

NOTE: This functionality is expected to be moved to the Tractus-X SDK
(tractusx_sdk.dataspace.tools.validate_submodels) in a future release.
The current tractusx_sdk.json_validator only supports Draft-07, but many
Catena-X semantic models use Draft-04 schemas.

Reference:
    - https://github.com/eclipse-tractusx/tractusx-sdk
    - JSON Schema Draft specifications
"""

from typing import Any, Dict
import logging

import jsonschema
from requests import HTTPError


logger = logging.getLogger(__name__)


def json_validator_draft_aware(schema: Dict[str, Any], json_to_validate: Dict[str, Any]) -> Dict[str, str]:
    """
    Validates a JSON object against a schema, auto-detecting the JSON Schema draft version.
    
    The tractusx_sdk.json_validator always uses Draft7Validator, but Catena-X schemas
    (like PCF v9.0.0) use Draft-04 format where exclusiveMinimum/exclusiveMaximum are
    booleans instead of numbers. This causes validation errors like "minimum of True".
    
    This function detects the schema version from the $schema property and uses the
    appropriate validator.
    
    NOTE: Expected to be moved to Tractus-X SDK (tractusx_sdk.dataspace.tools.validate_submodels)
    in a future release. See: https://github.com/eclipse-tractusx/tractusx-sdk
    
    Args:
        schema: The JSON schema to validate against
        json_to_validate: The JSON data to validate
        
    Returns:
        Dict with status and message on success
        
    Raises:
        HTTPError: If validation errors are found
    """
    error_records = []
    
    # Detect schema draft version from $schema property
    schema_uri = schema.get("$schema", "")
    
    if "draft-04" in schema_uri:
        validator_cls = jsonschema.Draft4Validator
    elif "draft-06" in schema_uri:
        validator_cls = jsonschema.Draft6Validator
    elif "draft-07" in schema_uri or "draft-7" in schema_uri:
        validator_cls = jsonschema.Draft7Validator
    elif "draft/2019-09" in schema_uri:
        validator_cls = jsonschema.Draft201909Validator
    elif "draft/2020-12" in schema_uri:
        validator_cls = jsonschema.Draft202012Validator
    else:
        # Default to Draft-04 for Catena-X schemas which often omit or use draft-04
        validator_cls = jsonschema.Draft4Validator
        logger.debug(f"No recognized $schema found ('{schema_uri}'), defaulting to Draft4Validator")
    
    validator = validator_cls(schema)
    
    for error in validator.iter_errors(json_to_validate):
        error_records.append({
            "path": ".".join(str(p) for p in error.path) if error.path else "root",
            "message": error.message,
            "validator": error.validator,
            "expected": error.schema.get("type", "N/A"),
            "invalid_value": error.instance
        })
    
    if error_records:
        raise HTTPError(
            f"422 Client Error: Validation error - {len(error_records)} validation errors found: {error_records}"
        )
    
    return {"status": "ok", "message": "JSON validation passed"}
