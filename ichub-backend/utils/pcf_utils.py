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

"""Shared utilities for PCF Kit operations."""

from typing import Set
from uuid import UUID, NAMESPACE_URL, uuid5

# Supported PCF schema versions
SUPPORTED_PCF_VERSIONS: Set[str] = {"v7.0.0", "v9.0.0"}

# Default PCF version used when no version is specified (backward compatible)
DEFAULT_PCF_VERSION: str = "v9.0.0"

# Mapping from version string to the PCF aspect model semantic ID
PCF_SEMANTIC_IDS: dict[str, str] = {
    "v7.0.0": "urn:samm:io.catenax.pcf:7.0.0#Pcf",
    "v9.0.0": "urn:samm:io.catenax.pcf:9.0.0#Pcf",
}

# Mapping from version string to the PCF async exchange semantic ID
PCF_EXCHANGE_SEMANTIC_IDS: dict[str, str] = {
    "v7.0.0": "urn:samm:io.catenax.pcf:7.0.0#PcfExchangeAsync",
    "v9.0.0": "urn:samm:io.catenax.pcf:9.0.0#PcfExchangeAsync",
}

# Legacy constant kept for backward compatibility — prefer get_pcf_semantic_id()
PCF_SEMANTIC_ID = PCF_EXCHANGE_SEMANTIC_IDS[DEFAULT_PCF_VERSION]

# Asset type used to identify PCF exchange assets in EDC catalogs (CX-0136)
PCF_EXCHANGE_ASSET_TYPE = "https://w3id.org/catenax/taxonomy#PCFExchange"

# CX-0136 §2.1.2.5 / §4.2.2.1 mandated idShort values for PCF submodel descriptors
PCF_ID_SHORT_SYNC = "SynchronousPCFExchangeEndpoint"
PCF_ID_SHORT_ASYNC = "PCFExchangeEndpoint"

# All semantic IDs that belong to PCF aspect models (sync + async, all versions)
_PCF_SEMANTIC_ID_VALUES: set[str] = set(PCF_SEMANTIC_IDS.values()) | set(PCF_EXCHANGE_SEMANTIC_IDS.values())


def validate_pcf_version(version: str) -> None:
    """Raise ``ValueError`` if *version* is not a supported PCF version.

    Args:
        version: Version string to validate (e.g. ``"v7.0.0"``).

    Raises:
        ValueError: When *version* is not in :data:`SUPPORTED_PCF_VERSIONS`.
    """
    if version not in SUPPORTED_PCF_VERSIONS:
        raise ValueError(
            f"Unsupported PCF version '{version}'. "
            f"Supported versions: {sorted(SUPPORTED_PCF_VERSIONS)}"
        )


def get_pcf_semantic_id(version: str) -> str:
    """Return the PCF aspect model semantic ID for the given version.

    Args:
        version: PCF version string (e.g. ``"v7.0.0"`` or ``"v9.0.0"``).

    Returns:
        The SAMM semantic ID for the PCF aspect model.

    Raises:
        ValueError: When *version* is not supported.
    """
    validate_pcf_version(version)
    return PCF_SEMANTIC_IDS[version]


def get_pcf_exchange_semantic_id(version: str) -> str:
    """Return the PCF async-exchange semantic ID for the given version.

    Args:
        version: PCF version string (e.g. ``"v7.0.0"`` or ``"v9.0.0"``).

    Returns:
        The SAMM semantic ID for the async exchange use case.

    Raises:
        ValueError: When *version* is not supported.
    """
    validate_pcf_version(version)
    return PCF_EXCHANGE_SEMANTIC_IDS[version]


def pcf_submodel_id(manufacturer_part_id: str, version: str = DEFAULT_PCF_VERSION) -> UUID:
    """Derive a deterministic UUID for a manufacturer part ID and version.

    Uses UUID5 with NAMESPACE_URL so the same (part, version) pair always
    maps to the same submodel document in the submodel service.
    Including the version in the seed prevents v7 and v9 data for the
    same part from colliding.

    Args:
        manufacturer_part_id: The manufacturer part identifier.
        version: PCF schema version (default: ``"v9.0.0"``).

    Returns:
        Deterministic UUID5 for the (part, version) combination.
    """
    return uuid5(NAMESPACE_URL, f"{manufacturer_part_id}:{version}")


def get_pcf_submodel_overrides(semantic_id: str) -> dict[str, str] | None:
    """Return ``id_short_override`` and ``interface`` for PCF submodel descriptors.

    If *semantic_id* belongs to a PCF aspect model the function returns the
    CX-0136 mandated values; otherwise ``None`` (= use defaults).

    * Synchronous PCF models (``#Pcf``) → ``SynchronousPCFExchangeEndpoint``, ``SUBMODEL-3.0``
    * Asynchronous PCF models (``#PcfExchangeAsync``) → ``PCFExchangeEndpoint``, ``PCF-1.1``

    Args:
        semantic_id: Full SAMM URN of the aspect model.

    Returns:
        ``dict`` with keys ``id_short_override`` and ``interface``, or ``None``.
    """
    if semantic_id not in _PCF_SEMANTIC_ID_VALUES:
        return None

    is_async = semantic_id in PCF_EXCHANGE_SEMANTIC_IDS.values()
    return {
        "id_short_override": PCF_ID_SHORT_ASYNC if is_async else PCF_ID_SHORT_SYNC,
        "interface": "PCF-1.1" if is_async else "SUBMODEL-3.0",
    }
