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

# Bridge to IC-Hub's DTR consumer manager for read-only consumption tools.
#
# All methods are async thin wrappers that run the synchronous DTR manager
# calls in a thread pool (asyncio.to_thread) so the MCP event loop is never
# blocked. EDR token caching is handled inside the DTR manager itself.

import asyncio
from typing import Optional

from managers.config.log_manager import LoggingManager

logger = LoggingManager.get_logger(__name__)


class DiscoveryAdapter:
    """Bridge between MCP consumption tools and IC-Hub's DTR consumer manager."""

    def _dtr(self):
        from dtr import dtr_manager
        if dtr_manager is None:
            raise RuntimeError(
                "DTR consumer manager is not initialized. "
                "Check consumer.* configuration and startup logs."
            )
        return dtr_manager

    async def list_partner_twins(
            self,
            bpnl: str,
            query_spec: Optional[list] = None,
            dtr_policies: Optional[list] = None,
    ) -> dict:
        """Discover AAS shell descriptors for a partner via their DTR."""
        return await asyncio.to_thread(
            self._dtr().consumer.discover_shells,
            counter_party_id=bpnl,
            query_spec=query_spec or [],
            dtr_policies=dtr_policies,
        )

    async def get_twin_details(
            self,
            bpnl: str,
            twin_id: str,
            dtr_policies: Optional[list] = None,
    ) -> dict:
        """Fetch one AAS shell descriptor by ID from a partner's DTR."""
        return await asyncio.to_thread(
            self._dtr().consumer.discover_shell,
            counter_party_id=bpnl,
            id=twin_id,
            dtr_policies=dtr_policies,
        )

    async def list_twin_submodels(
            self,
            bpnl: str,
            twin_id: str,
            dtr_policies: Optional[list] = None,
    ) -> dict:
        """Return submodel descriptor metadata for all submodels of a twin."""
        return await asyncio.to_thread(
            self._dtr().consumer.discover_submodels,
            counter_party_id=bpnl,
            id=twin_id,
            dtr_policies=dtr_policies,
            governance=None,
        )

    async def fetch_submodel(
            self,
            bpnl: str,
            twin_id: str,
            submodel_id: str,
            governance: Optional[list] = None,
            dtr_policies: Optional[list] = None,
    ) -> dict:
        """Fetch one submodel's payload via EDC negotiation + DTR lookup."""
        return await asyncio.to_thread(
            self._dtr().consumer.discover_submodel,
            counter_party_id=bpnl,
            id=twin_id,
            dtr_policies=dtr_policies,
            governance=governance,
            submodel_id=submodel_id,
        )
