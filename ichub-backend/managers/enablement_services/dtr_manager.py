#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 LKS Next
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

from .consumer import BaseDtrConsumerManager
from .provider import DtrProviderManager

class DtrManager:
    consumer: BaseDtrConsumerManager
    provider: DtrProviderManager

    def __init__(self, dtr_consumer_manager: BaseDtrConsumerManager, dtr_provider_manager: DtrProviderManager):
        """
        Initialize the DtrManager with consumer and provider managers.
        :param dtr_consumer_manager: Instance of BaseDtrConsumerManager
        :param dtr_provider_manager: Instance of DtrProviderManager
        """
        self.consumer = dtr_consumer_manager
        self.provider = dtr_provider_manager

    def purge_edr(self, counter_party_id: str, asset_id: str) -> int:
        """
        Remove a stale or expired EDR from memory and the persistent DB.

        Convenience proxy so callers do not need to reach into ``.consumer``::

            dtr_manager.purge_edr(provider_bpnl, asset_id)

        Args:
            counter_party_id: BPN of the data provider.
            asset_id: Exact EDC asset ID to remove.

        Returns:
            int: Number of DB rows deleted.
        """
        return self.consumer.purge_edr(counter_party_id, asset_id)

    def purge_edrs_matching(self, counter_party_id: str, asset_id_pattern: str) -> int:
        """
        Remove all stale EDRs whose asset ID matches a SQL LIKE pattern.

        Useful when multiple EDRs share a common prefix (e.g. all
        ``ichub:asset:digitaltwin-event:*`` entries for a provider)::

            dtr_manager.purge_edrs_matching(provider_bpnl, "ichub:asset:digitaltwin-event:%")

        Args:
            counter_party_id: BPN of the data provider.
            asset_id_pattern: SQL LIKE pattern (``%`` and ``_`` wildcards supported).

        Returns:
            int: Number of DB rows deleted.
        """
        return self.consumer.purge_edrs_matching(counter_party_id, asset_id_pattern)