###############################################################
# Eclipse Tractus-X - Industry Core Hub
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
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
###############################################################

"""Explicit registry of SQLModel classes managed by Alembic."""

from .addons.ccm_kit.v1.models import (
    Ccm,
    CcmInboundRequest,
    CcmOutboundRequest,
    CcmReceived,
    CcmSite,
    CertificateShare,
)
from .consumer.models import KnownConnectors, KnownDtrs
from .notification.models import NotificationEntity
from .pcf.models import PcfExchangeEntity, PcfRelationshipEntity
from .provider.models import (
    Batch,
    BatchBusinessPartner,
    BusinessPartner,
    CatalogPart,
    DataExchangeAgreement,
    DataExchangeContract,
    EnablementServiceStack,
    JISPart,
    LegalEntity,
    PartnerCatalogPart,
    SerializedPart,
    Twin,
    TwinAspect,
    TwinAspectRegistration,
    TwinExchange,
    TwinRegistration,
)

__all__ = [
    "Batch",
    "BatchBusinessPartner",
    "BusinessPartner",
    "CatalogPart",
    "Ccm",
    "CcmInboundRequest",
    "CcmOutboundRequest",
    "CcmReceived",
    "CcmSite",
    "CertificateShare",
    "DataExchangeAgreement",
    "DataExchangeContract",
    "EnablementServiceStack",
    "JISPart",
    "KnownConnectors",
    "KnownDtrs",
    "LegalEntity",
    "NotificationEntity",
    "PartnerCatalogPart",
    "PcfExchangeEntity",
    "PcfRelationshipEntity",
    "SerializedPart",
    "Twin",
    "TwinAspect",
    "TwinAspectRegistration",
    "TwinExchange",
    "TwinRegistration",
]