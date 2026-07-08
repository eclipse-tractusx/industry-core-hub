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

from unittest.mock import patch, MagicMock


class TestIndustryCoreAdapterWriteMethods:
    """Tests for write methods on IndustryCoreAdapter."""

    def setup_method(self):
        # Patch the service constructors to avoid DB/config dependencies
        with patch("managers.addons_service.mcp_addon.v1.adapters.industry_core.PartnerManagementService"), \
             patch("managers.addons_service.mcp_addon.v1.adapters.industry_core.PartManagementService"), \
             patch("managers.addons_service.mcp_addon.v1.adapters.industry_core.SharingService"), \
             patch("managers.addons_service.mcp_addon.v1.adapters.industry_core.TwinManagementService"):
            from managers.addons_service.mcp_addon.v1.adapters.industry_core import IndustryCoreAdapter
            self.adapter = IndustryCoreAdapter()

    def test_create_catalog_part(self):
        mock_result = MagicMock()
        mock_result.manufacturer_id = "BPNL000000000001"
        mock_result.manufacturer_part_id = "MPI-123"
        mock_result.name = "Sensor"
        mock_result.category = "electronics"
        mock_result.bpns = "BPNS000000000001"
        mock_result.status.name = "DRAFT"
        self.adapter._part_service.create_catalog_part.return_value = mock_result

        result = self.adapter.create_catalog_part(
            manufacturer_id="BPNL000000000001",
            manufacturer_part_id="MPI-123",
            name="Sensor",
            category="electronics",
            bpns="BPNS000000000001",
        )

        assert result["catalog_part_id"] == "BPNL000000000001::MPI-123"
        assert result["name"] == "Sensor"
        assert result["status"] == "draft"
        self.adapter._part_service.create_catalog_part.assert_called_once()

    def test_update_catalog_part(self):
        mock_current = MagicMock()
        mock_current.name = "Original Sensor"
        mock_current.category = "electronics"
        mock_current.description = None
        mock_current.bpns = "BPNS000000000001"
        self.adapter._part_service.get_catalog_part_details.return_value = mock_current

        mock_result = MagicMock()
        mock_result.manufacturer_id = "BPNL000000000001"
        mock_result.manufacturer_part_id = "MPI-123"
        mock_result.name = "Updated Sensor"
        mock_result.category = "electronics"
        mock_result.bpns = "BPNS000000000001"
        mock_result.status.name = "DRAFT"
        self.adapter._part_service.update_catalog_part.return_value = mock_result

        result = self.adapter.update_catalog_part(
            manufacturer_id="BPNL000000000001",
            manufacturer_part_id="MPI-123",
            name="Updated Sensor",
        )

        assert result["name"] == "Updated Sensor"
        assert result["bpns"] == "BPNS000000000001"
        self.adapter._part_service.get_catalog_part_details.assert_called_once_with(
            "BPNL000000000001", "MPI-123"
        )
        self.adapter._part_service.update_catalog_part.assert_called_once()

    def test_update_catalog_part_not_found(self):
        self.adapter._part_service.get_catalog_part_details.return_value = None

        import pytest
        with pytest.raises(ValueError, match="Catalog part not found"):
            self.adapter.update_catalog_part(
                manufacturer_id="BPNL000000000001",
                manufacturer_part_id="NONEXISTENT",
                name="New Name",
            )

    def test_create_serialized_part(self):
        mock_result = MagicMock()
        mock_result.manufacturer_id = "BPNL000000000001"
        mock_result.manufacturer_part_id = "MPI-123"
        mock_result.part_instance_id = "SN-001"
        mock_result.customer_part_id = "CP-001"
        mock_result.van = "VAN-123"
        mock_result.name = "Sensor Instance"
        self.adapter._part_service.create_serialized_part.return_value = mock_result

        result = self.adapter.create_serialized_part(
            manufacturer_id="BPNL000000000001",
            manufacturer_part_id="MPI-123",
            part_instance_id="SN-001",
            business_partner_number="BPNL000000000002",
            van="VAN-123",
        )

        assert result["part_instance_id"] == "SN-001"
        assert result["van"] == "VAN-123"
        # Verify auto-generate flags are set
        call_kwargs = self.adapter._part_service.create_serialized_part.call_args
        assert call_kwargs.kwargs.get("auto_generate_catalog_part") is True
        assert call_kwargs.kwargs.get("auto_generate_partner_part") is True

    def test_share_catalog_part(self):
        mock_result = MagicMock()
        mock_result.business_partner_number = "BPNL000000000002"
        mock_result.customer_part_ids = {}
        mock_result.shared_at = "2026-05-20T12:00:00Z"
        mock_result.twin = None
        self.adapter._sharing_service.share_catalog_part.return_value = mock_result

        result = self.adapter.share_catalog_part(
            manufacturer_id="BPNL000000000001",
            manufacturer_part_id="MPI-123",
            business_partner_number="BPNL000000000002",
        )

        assert result["business_partner_number"] == "BPNL000000000002"
        self.adapter._sharing_service.share_catalog_part.assert_called_once()

    def test_register_business_partner(self):
        mock_result = MagicMock()
        mock_result.bpnl = "BPNL000000000002"
        mock_result.name = "BMW"
        self.adapter._partner_service.create_business_partner.return_value = mock_result

        result = self.adapter.register_business_partner(
            bpnl="BPNL000000000002",
            name="BMW",
        )

        assert result["bpnl"] == "BPNL000000000002"
        assert result["name"] == "BMW"

    def test_create_catalog_part_twin(self):
        from uuid import uuid4
        from datetime import datetime

        gid = uuid4()
        aas_id = uuid4()
        mock_result = MagicMock()
        mock_result.global_id = gid
        mock_result.dtr_aas_id = aas_id
        mock_result.created_date = datetime(2026, 5, 20)
        self.adapter._twin_service.create_catalog_part_twin.return_value = mock_result

        result = self.adapter.create_catalog_part_twin(
            manufacturer_id="BPNL000000000001",
            manufacturer_part_id="MPI-123",
        )

        assert result["global_id"] == str(gid)
        assert result["dtr_aas_id"] == str(aas_id)

    def test_create_serialized_part_twin(self):
        from uuid import uuid4
        from datetime import datetime

        gid = uuid4()
        aas_id = uuid4()
        mock_result = MagicMock()
        mock_result.global_id = gid
        mock_result.dtr_aas_id = aas_id
        mock_result.created_date = datetime(2026, 5, 20)
        self.adapter._twin_service.create_serialized_part_twin.return_value = mock_result

        result = self.adapter.create_serialized_part_twin(
            manufacturer_id="BPNL000000000001",
            manufacturer_part_id="MPI-123",
            part_instance_id="SN-001",
        )

        assert result["global_id"] == str(gid)
        # Verify auto_create_serial_part_aspect is set
        call_kwargs = self.adapter._twin_service.create_serialized_part_twin.call_args
        assert call_kwargs.kwargs.get("auto_create_serial_part_aspect") is True

    def test_attach_twin_aspect(self):
        from uuid import uuid4

        mock_result = MagicMock()
        mock_result.submodel_id = uuid4()
        mock_result.semantic_id = "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation"
        mock_result.global_id = uuid4()
        self.adapter._twin_service.create_twin_aspect.return_value = mock_result

        result = self.adapter.attach_twin_aspect(
            global_id=str(uuid4()),
            semantic_id="urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation",
            payload={"key": "value"},
        )

        assert result["semantic_id"] == "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation"
        assert result["submodel_id"] is not None


class TestEcopassAdapterShareDpp:
    """Tests for the share_dpp method on EcopassAdapter."""

    def setup_method(self):
        with patch("managers.addons_service.mcp_addon.v1.adapters.ecopass.PassportsManager"), \
             patch("managers.addons_service.mcp_addon.v1.adapters.ecopass.ProvisionManager"):
            from managers.addons_service.mcp_addon.v1.adapters.ecopass import EcopassAdapter
            self.adapter = EcopassAdapter()

    def test_share_dpp_success(self):
        self.adapter._provision.share_dpp.return_value = {"success": True}

        result = self.adapter.share_dpp(
            dpp_id="dpp-123",
            business_partner_number="BPNL000000000002",
        )

        assert result["dpp_id"] == "dpp-123"
        assert result["business_partner_number"] == "BPNL000000000002"
        assert result["success"] is True
        self.adapter._provision.share_dpp.assert_called_once_with(
            "dpp-123", "BPNL000000000002",
        )
