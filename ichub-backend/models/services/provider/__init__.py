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

from .dtr_facade import (
    DtrPagingStrResponse,
)

from .part_management import (
    CatalogPartDetailsRead,
    CatalogPartCreate,
    CatalogPartDelete,
    CatalogPartQuery,
    PartnerCatalogPartCreate,
    PartnerCatalogPartDelete,
    BatchRead,
    BatchCreate,
    BatchDelete,
    BatchQuery,
    SerializedPartDetailsRead,
    SerializedPartCreate,
    SerializedPartDelete,
    SerializedPartQuery,
    JISPartRead,
    JISPartCreate,
    JISPartDelete,
    JISPartQuery
)

from .partner_management import (
    BusinessPartnerRead,
    DataExchangeContractRead,
    DataExchangeContractCreate,
    DataExchangeAgreementCreate,
    DataExchangeAgreementRead
)

from .twin_management import (
    TwinAspectRegistrationStatus,
    TwinsAspectRegistrationMode,
    TwinAspectRegistration,
    TwinAspectRead,
    TwinAspectCreate,
    TwinRead,
    TwinCreateBase,
    CatalogPartTwinCreate,
    CatalogPartTwinDetailsRead,
    BatchTwinCreate,
    JISPartTwinCreate,
    SerializedPartTwinCreate,
    SerializedPartTwinRead,
    SerializedPartTwinDetailsRead,
)
