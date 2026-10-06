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

# Bridge to the EcoPass KIT manager package for cross-add-on DPP tools.
# Demonstrates that the MCP Addon can compose over other add-ons without
# duplicating their business logic.

from managers.addons_service.ecopass_kit.v1.passports import PassportsManager
from managers.addons_service.ecopass_kit.v1.provision import ProvisionManager


class EcopassAdapter:
    """Bridge between MCP tools and the EcoPass KIT PassportsManager."""

    def __init__(self) -> None:
        self._passports = PassportsManager()
        self._provision = ProvisionManager()

    def fetch_dpp(self, dpp_id: str | None = None) -> list[dict]:
        """Return DPPs from this IC-Hub instance.

        If dpp_id is given, returns only that DPP (or an empty list if not found).
        If dpp_id is None, returns all DPPs.
        """
        dpps = self._passports.get_all_passports()
        if dpp_id is not None:
            dpps = [d for d in dpps if d.id == dpp_id or d.passport_id == dpp_id]
        return [_dpp_to_dict(d) for d in dpps]

    def share_dpp(self, dpp_id: str, business_partner_number: str) -> dict:
        """Share a Digital Product Passport with a business partner.

        After sharing the twin, registers the manufacturer part ID in BPN
        Discovery so that consumers can resolve the part to this BPNL.
        """
        result = self._provision.share_dpp(dpp_id, business_partner_number)

        # Register manufacturer part ID in BPN Discovery (matches the REST
        # controller flow in ecopass_kit/v1/provision.py)
        bpn_registered = False
        twin_data = result.get("twin_data", {})
        manufacturer_part_id = twin_data.get("manufacturer_part_id")
        if manufacturer_part_id:
            bpn_registered = self._provision.register_in_bpn_discovery(
                manufacturer_part_id
            )

        return {
            "dpp_id": dpp_id,
            "business_partner_number": business_partner_number,
            "success": result.get("success", False),
            "bpn_discovery_registered": bpn_registered,
        }


def _dpp_to_dict(dpp) -> dict:
    ta = dpp.twin_association
    return {
        "id": dpp.id,
        "passport_id": dpp.passport_id,
        "name": dpp.name,
        "manufacturer_part_id": dpp.manufacturer_part_id,
        "part_instance_id": dpp.part_instance_id,
        "part_type": dpp.part_type,
        "version": dpp.version,
        "semantic_id": dpp.semantic_id,
        "status": dpp.status,
        "issue_date": dpp.issue_date,
        "expiration_date": dpp.expiration_date,
        "submodel_id": dpp.submodel_id,
        "created_at": dpp.created_at,
        "updated_at": dpp.updated_at,
        "twin": {
            "twin_id": ta.twin_id,
            "aas_id": ta.aas_id,
            "manufacturer_part_id": ta.manufacturer_part_id,
            "part_instance_id": ta.part_instance_id,
            "twin_name": ta.twin_name,
        } if ta else None,
    }
