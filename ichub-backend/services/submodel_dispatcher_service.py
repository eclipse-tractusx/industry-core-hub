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

from uuid import UUID
from typing import Dict, Any, Optional

from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from tools.submodel_type_util import get_submodel_type

class SubmodelNotSharedWithBusinessPartnerError(ValueError):
    """
    Exception raised when a requested twin is not shared with the specified business partner.
    """

class SubmodelDispatcherService:
    """
    Service class for managing submodel dispatching.
    """

    def __init__(self):
        # TODO: Deal with the proper config => Submodel Service is normally a singleton
        self.submodel_service_manager = SubmodelServiceManager()

    def get_submodel_content(self, edc_bpn: Optional[str],
                             edc_contract_agreement_id: Optional[str], semantic_id: str,
                             global_id: UUID) -> Dict[str, Any]:
        """
        Dispatch a submodel to the appropriate service or endpoint.
        """

        get_submodel_type(semantic_id)  # Validate the semantic ID

        # This implementation just checks if the twin where the submodel belongs to is shared with the business partner
        # via any data exchange agreement.
        # It does not check the semantic ID of the sumodel. This could later be done when we also manage the
        # submodel contracts behind the data exchange agreements.
        # Also to be analyzed later: does the contract agreement ID (which the EDC Data Plane provides to us)
        # somehow give us more possibilities of evaluating? (drawback: in this service we should actually
        # avoid calling too many other services - especially not the EDC Control Plane)
        # with RepositoryManagerFactory.create() as repos:
            # db_twin_exchange = repos.twin_exchange_repository.find_by_global_id_business_partner_number(
            #     global_id, edc_bpn)

            # # We found no "share" for the part => raise an error
            # if not db_twin_exchange:
            #     raise SubmodelNotSharedWithBusinessPartnerError(
            #         f"Requested twin with global ID {global_id} not shared with business partner {edc_bpn}."
            #     )

            # Call the submodel service manager to get the submodel content from the submodel service
        return self.submodel_service_manager.get_twin_aspect_document(
            global_id, semantic_id)

    def upload_submodel(self, global_id: UUID, semantic_id: str, submodel_payload: Dict[str, Any]) -> None:
        """
        Uploads a submodel to the appropriate submodel service.

        Args:
            global_id (UUID): The global asset ID.
            semantic_id (str): The semantic identifier for the submodel.
            submodel_payload (Dict[str, Any]): The content of the submodel to upload.

        Raises:
            SubmodelNotSharedWithBusinessPartnerError: If the twin is not shared with the given business partner.
        """
        get_submodel_type(semantic_id)  # Validate the semantic ID

        self.submodel_service_manager.upload_twin_aspect_document(global_id, semantic_id, submodel_payload)

    def delete_submodel(self, global_id: UUID, semantic_id: str) -> None:
        """
        Deletes a submodel from the submodel service.

        Args:
            global_id (UUID): The global asset ID.
            semantic_id (str): The semantic identifier for the submodel.
        """
        get_submodel_type(semantic_id)  # Validate the semantic ID
        self.submodel_service_manager.delete_twin_aspect_document(global_id, semantic_id)
