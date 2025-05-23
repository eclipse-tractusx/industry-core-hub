#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
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
# This code was generated by Claude 3.7 Sonnet and reviwed by a contributor.

from urllib import parse


def extract_aspect_id_name_from_urn(aspect_urn: str) -> str:
    """
    Extracts the aspect name from a full URN.

    Example:
    "urn:bamm:io.catenax.material_for_recycling:1.1.0#MaterialForRecycling" -> "MaterialForRecycling"

    Args:
        aspect_urn: Full URN of the aspect

    Returns:
        The extracted aspect name

    Raises:
        ValueError: If the URN doesn't contain a fragment part after '#'
    """
    parsed = parse.urlparse(aspect_urn)
    if not parsed.fragment:
        raise ValueError(
            f"Invalid aspect URN format: {aspect_urn}. Expected format: 'urn:bamm:namespace:version#AspectName'"
        )

    return parsed.fragment


def extract_aspect_id_name_from_urn_camelcase(aspect_urn: str) -> str:
    """
    Extracts the aspect name from a full URN and returns it in camelCase.
    Example:
    "urn:bamm:io.catenax.material_for_recycling:1.1.0#MaterialForRecycling" -> "materialForRecycling"
    """
    name = extract_aspect_id_name_from_urn(aspect_urn)
    # lower‐case the first character
    return name[0].lower() + name[1:]

