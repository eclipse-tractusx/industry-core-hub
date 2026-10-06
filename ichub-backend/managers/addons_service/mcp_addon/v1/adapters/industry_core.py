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

# Bridge to IC-Hub's PartManagement, Twin, Sharing, and Partner managers.
#
# NOTE — documented deviation (ADR-0005):
#   share_catalog_part calls services/provider/sharing_service.py directly
#   because the atomic dataspace flow (submodel + DTR shell + EDC asset +
#   policy + contract) exists only there. This is the single intentional
#   exception to the add-on convention of calling managers only.

from typing import Any

from models.services.provider.part_management import (
    CatalogPartCreate,
    CatalogPartUpdate,
    SerializedPartCreate,
)
from models.services.provider.partner_management import BusinessPartnerCreate
from models.services.provider.sharing_management import ShareCatalogPart
from models.services.provider.twin_management import (
    CatalogPartTwinCreate,
    SerializedPartTwinCreate,
    TwinAspectCreate,
)
from managers.addons_service.ecopass_kit.v1.provision import ProvisionManager
from services.provider.partner_management_service import PartnerManagementService
from services.provider.part_management_service import PartManagementService
from services.provider.sharing_service import SharingService
from services.provider.twin_management_service import TwinManagementService


class IndustryCoreAdapter:
    """Bridge between MCP tools and IC-Hub's industry-core managers/services."""

    def __init__(self) -> None:
        self._partner_service = PartnerManagementService()
        self._part_service = PartManagementService()
        self._sharing_service = SharingService()
        self._twin_service = TwinManagementService()
        self._provision = ProvisionManager()

    # ------------------------------------------------------------------
    # Read helpers
    # ------------------------------------------------------------------

    def list_known_partners(self) -> list[dict]:
        """Return all business partners registered in this IC-Hub instance."""
        partners = self._partner_service.list_business_partners()
        return [{"bpnl": p.bpnl, "name": p.name} for p in partners]

    def list_my_catalog_parts(self, manufacturer_id: str | None = None) -> list[dict]:
        """Return catalog parts registered in this IC-Hub instance."""
        parts = self._part_service.get_catalog_parts(manufacturer_id=manufacturer_id)
        return [
            {
                "catalog_part_id": f"{p.manufacturer_id}::{p.manufacturer_part_id}",
                "manufacturer_id": p.manufacturer_id,
                "manufacturer_part_id": p.manufacturer_part_id,
                "name": p.name,
                "category": p.category,
                "bpns": p.bpns,
                "status": p.status.name.lower(),
            }
            for p in parts
        ]

    # ------------------------------------------------------------------
    # Write helpers
    # ------------------------------------------------------------------

    def create_catalog_part(
        self,
        manufacturer_id: str,
        manufacturer_part_id: str,
        name: str,
        category: str | None = None,
        description: str | None = None,
        bpns: str | None = None,
    ) -> dict:
        """Register a new catalog part in IC-Hub."""
        result = self._part_service.create_catalog_part(
            CatalogPartCreate(
                manufacturerId=manufacturer_id,
                manufacturerPartId=manufacturer_part_id,
                name=name,
                category=category,
                description=description,
                bpns=bpns,
            )
        )
        return {
            "catalog_part_id": f"{result.manufacturer_id}::{result.manufacturer_part_id}",
            "manufacturer_id": result.manufacturer_id,
            "manufacturer_part_id": result.manufacturer_part_id,
            "name": result.name,
            "category": result.category,
            "bpns": result.bpns,
            "status": result.status.name.lower(),
        }

    def update_catalog_part(
        self,
        manufacturer_id: str,
        manufacturer_part_id: str,
        name: str | None = None,
        category: str | None = None,
        description: str | None = None,
        bpns: str | None = None,
    ) -> dict:
        """Update an existing catalog part."""
        current = self._part_service.get_catalog_part_details(manufacturer_id, manufacturer_part_id)
        if current is None:
            raise ValueError(
                f"Catalog part not found: manufacturer_id={manufacturer_id!r}, "
                f"manufacturer_part_id={manufacturer_part_id!r}"
            )
        result = self._part_service.update_catalog_part(
            manufacturer_id,
            manufacturer_part_id,
            CatalogPartUpdate(
                manufacturerId=manufacturer_id,
                manufacturerPartId=manufacturer_part_id,
                name=name if name is not None else current.name,
                category=category if category is not None else current.category,
                description=description if description is not None else current.description,
                bpns=bpns if bpns is not None else current.bpns,
            ),
        )
        return {
            "catalog_part_id": f"{result.manufacturer_id}::{result.manufacturer_part_id}",
            "manufacturer_id": result.manufacturer_id,
            "manufacturer_part_id": result.manufacturer_part_id,
            "name": result.name,
            "category": result.category,
            "bpns": result.bpns,
            "status": result.status.name.lower(),
        }

    def create_serialized_part(
        self,
        manufacturer_id: str,
        manufacturer_part_id: str,
        part_instance_id: str,
        business_partner_number: str,
        customer_part_id: str | None = None,
        van: str | None = None,
        name: str | None = None,
        category: str | None = None,
        bpns: str | None = None,
    ) -> dict:
        """Register a single serialized part instance in IC-Hub."""
        result = self._part_service.create_serialized_part(
            SerializedPartCreate(
                manufacturerId=manufacturer_id,
                manufacturerPartId=manufacturer_part_id,
                partInstanceId=part_instance_id,
                businessPartnerNumber=business_partner_number,
                customerPartId=customer_part_id,
                van=van,
                name=name,
                category=category,
                bpns=bpns,
            ),
            auto_generate_catalog_part=True,
            auto_generate_partner_part=True,
        )
        return {
            "manufacturer_id": result.manufacturer_id,
            "manufacturer_part_id": result.manufacturer_part_id,
            "part_instance_id": result.part_instance_id,
            "customer_part_id": result.customer_part_id,
            "van": result.van,
            "name": result.name,
        }

    def share_catalog_part(
        self,
        manufacturer_id: str,
        manufacturer_part_id: str,
        business_partner_number: str,
        customer_part_id: str | None = None,
    ) -> dict:
        """Share a catalog part with a business partner (8-step orchestration).

        NOTE — documented deviation (ADR-0005): calls SharingService directly.
        """
        result = self._sharing_service.share_catalog_part(
            ShareCatalogPart(
                manufacturerId=manufacturer_id,
                manufacturerPartId=manufacturer_part_id,
                businessPartnerNumber=business_partner_number,
                customerPartId=customer_part_id,
            )
        )

        # Register manufacturer part ID in BPN Discovery so consumers can
        # resolve this part to the provider's BPNL.
        bpn_registered = self._provision.register_in_bpn_discovery(
            manufacturer_part_id
        )

        twin_info = None
        if result.twin:
            twin_info = {
                "global_id": str(result.twin.global_id),
                "dtr_aas_id": str(result.twin.dtr_aas_id),
            }
        return {
            "business_partner_number": result.business_partner_number,
            "customer_part_ids": {
                k: {"bpnl": v.bpnl, "name": v.name}
                for k, v in (result.customer_part_ids or {}).items()
            },
            "shared_at": str(result.shared_at),
            "twin": twin_info,
            "bpn_discovery_registered": bpn_registered,
        }

    def register_business_partner(
        self,
        bpnl: str,
        name: str,
    ) -> dict:
        """Register a new business partner in IC-Hub."""
        result = self._partner_service.create_business_partner(
            BusinessPartnerCreate(name=name, bpnl=bpnl)
        )
        return {"bpnl": result.bpnl, "name": result.name}

    def create_catalog_part_twin(
        self,
        manufacturer_id: str,
        manufacturer_part_id: str,
    ) -> dict:
        """Create a digital twin for a catalog part."""
        result = self._twin_service.create_catalog_part_twin(
            CatalogPartTwinCreate(
                manufacturerId=manufacturer_id,
                manufacturerPartId=manufacturer_part_id,
            )
        )
        return {
            "global_id": str(result.global_id),
            "dtr_aas_id": str(result.dtr_aas_id),
            "created_date": str(result.created_date),
        }

    def create_serialized_part_twin(
        self,
        manufacturer_id: str,
        manufacturer_part_id: str,
        part_instance_id: str,
    ) -> dict:
        """Create a digital twin for a serialized part instance."""
        result = self._twin_service.create_serialized_part_twin(
            SerializedPartTwinCreate(
                manufacturerId=manufacturer_id,
                manufacturerPartId=manufacturer_part_id,
                partInstanceId=part_instance_id,
            ),
            auto_create_serial_part_aspect=True,
        )
        return {
            "global_id": str(result.global_id),
            "dtr_aas_id": str(result.dtr_aas_id),
            "created_date": str(result.created_date),
        }

    def attach_twin_aspect(
        self,
        global_id: str,
        semantic_id: str,
        payload: dict[str, Any],
    ) -> dict:
        """Add a submodel/aspect to a digital twin."""
        from uuid import UUID

        result = self._twin_service.create_twin_aspect(
            TwinAspectCreate(
                globalId=UUID(global_id),
                semanticId=semantic_id,
                payload=payload,
            )
        )
        return {
            "submodel_id": str(result.submodel_id) if result.submodel_id else None,
            "semantic_id": result.semantic_id,
            "global_id": global_id,
        }
