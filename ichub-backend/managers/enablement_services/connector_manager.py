#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
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

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from managers.enablement_services.consumer import BaseConnectorConsumerManager
    from managers.enablement_services.provider import ConnectorProviderManager

class ConnectorManager:
    consumer: "BaseConnectorConsumerManager"
    provider: "ConnectorProviderManager"

    def __init__(self, connector_consumer_manager: "BaseConnectorConsumerManager", connector_provider_manager: "ConnectorProviderManager"):
        """
        Initialize the ConnectorManager with consumer and provider managers.

        :param connector_consumer_manager: Instance of BaseConnectorConsumerManager
        :param connector_provider_manager: Instance of ConnectorProviderManager
        """
        self.consumer = connector_consumer_manager
        self.provider = connector_provider_manager