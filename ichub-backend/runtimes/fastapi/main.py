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
import uvicorn
from controllers.fastapi import app as api
from tractusx_sdk.dataspace.tools.utils import get_arguments
from managers.config.log_manager import LoggingManager
from tractusx_sdk.dataspace.managers import AuthManager

app = api

## In memory authentication manager service
auth_manager: AuthManager


def start():
    ## Load in memory data storages and authentication manager
    global edc_service, auth_manager, logger
    
    # Initialize the server environment and get the comand line arguments
    args = get_arguments()

    # Configure the logging confiuration depending on the configuration stated
    logger = LoggingManager.get_logger('staging')
    if(args.debug):
        logger = LoggingManager.get_logger('development')

    ## Start the authentication manager
    auth_manager = AuthManager()
    
    ## Once initial checks and configurations are done here is the place where it shall be included
    logger.info("[INIT] Application Startup Initialization Completed!")

    # Only start the Uvicorn server if not in test mode
    if not args.test_mode:
        uvicorn.run(app, host=args.host, port=args.port, log_level=("debug" if args.debug else "info"))
