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

from managers.addons_service.mcp_addon.v1.formatters import format_submodel_descriptors


class TestFormatSubmodelDescriptors:
    """Regression tests for format_submodel_descriptors (fixes 3 & 4).

    The formatter must return a *flat* list of plain dicts — the semantic_id
    must be a scalar string, not a nested AAS semanticId object.  This prevents
    the LLM from receiving raw AAS-3 structures that it cannot interpret.
    """

    def test_returns_flat_list_of_dicts(self):
        """Standard dict-keyed response is flattened to a list of dicts with
        scalar string fields."""
        result = {
            "submodelDescriptors": {
                "sm-1": {
                    "semanticId": {
                        "keys": [{"value": "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation"}]
                    },
                    "status": "ok",
                    "connectorUrl": "http://edc.example.com",
                }
            }
        }
        out = format_submodel_descriptors(result)

        assert isinstance(out, list)
        assert len(out) == 1

        entry = out[0]
        assert entry["submodel_id"] == "sm-1"
        # semantic_id must be a flat string, not a dict/object (fixes 3 & 4).
        assert isinstance(entry["semantic_id"], str)
        assert entry["semantic_id"] == "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation"
        assert entry["status"] == "ok"
        assert entry["connector_url"] == "http://edc.example.com"

    def test_missing_descriptors_returns_empty_list(self):
        """A response without submodelDescriptors returns an empty list."""
        assert format_submodel_descriptors({}) == []

    def test_none_descriptors_returns_empty_list(self):
        """None value for submodelDescriptors returns an empty list."""
        assert format_submodel_descriptors({"submodelDescriptors": None}) == []

    def test_list_form_adapts_using_id_field(self):
        """Raw AAS-3 list responses are adapted by keying on each entry's 'id'.

        The adapter logs a warning and keys each descriptor by its 'id' field
        instead of failing, ensuring backward compatibility with services that
        return a plain list rather than a dict.
        """
        result = {
            "submodelDescriptors": [
                {
                    "id": "sm-list-1",
                    "semanticId": {"keys": [{"value": "urn:samm:example:1.0.0#Aspect"}]},
                    "status": "active",
                    "connectorUrl": "http://edc2.example.com",
                }
            ]
        }
        out = format_submodel_descriptors(result)

        assert isinstance(out, list)
        assert len(out) == 1
        assert out[0]["submodel_id"] == "sm-list-1"
        assert isinstance(out[0]["semantic_id"], str)
        assert out[0]["semantic_id"] == "urn:samm:example:1.0.0#Aspect"

    def test_multiple_descriptors(self):
        """Multiple dict entries are all returned."""
        result = {
            "submodelDescriptors": {
                "sm-a": {
                    "semanticId": {"keys": [{"value": "urn:samm:a:1.0.0#A"}]},
                    "status": None,
                    "connectorUrl": None,
                },
                "sm-b": {
                    "semanticId": {"keys": [{"value": "urn:samm:b:1.0.0#B"}]},
                    "status": "ok",
                    "connectorUrl": "http://edc3.example.com",
                },
            }
        }
        out = format_submodel_descriptors(result)
        ids = {e["submodel_id"] for e in out}
        assert ids == {"sm-a", "sm-b"}
