#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
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
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

from sqlalchemy import text

from managers.config.log_manager import LoggingManager

logger = LoggingManager.get_logger(__name__)


def remove_existing_edr(repos, provider_bpn: str, asset_id: str):
    """
    Before sending a notification, we must remove any edr_connection that we have stored in the database
    related with the DigitalTwinEventAPI to ensure that we are not using an old edr_connection.
    """
    session = repos._session
    session.execute(
        text("DELETE FROM edr_connections WHERE counter_party_id = :cpid AND edr_data->>'assetId' LIKE :asset_id"),
        params={"cpid": provider_bpn, "asset_id": asset_id}
    )
    session.commit()
