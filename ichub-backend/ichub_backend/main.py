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


from fastapi import FastAPI, HTTPException, Request

## FAST API example for keycloak
from fastapi_keycloak_middleware import CheckPermissions
from fastapi_keycloak_middleware import get_user
import sys
import argparse
from logging import config
import logging
import yaml
import uvicorn
import urllib3
import os

from pathlib import Path
## Import paths
sys.path.append(str(Path(__file__).resolve().parents[1]))
sys.dont_write_bytecode = True

## Import Library Packeges
from tractusx_sdk.dataspace.tools import op
from tractusx_sdk.dataspace.tools import HttpTools
from tractusx_sdk.dataspace.managers import AuthManager
from tractusx_sdk.dataspace.services import EdcService
from tractusx_sdk.industry.services import AasService

## Declare Global Variables
app_configuration:dict
log_config:dict

## In memory storage/management services
edc_service: EdcService

## In memory authentication manager service
auth_manager: AuthManager

urllib3.disable_warnings()
logging.captureWarnings(True)

## Create Logging Folder
op.make_dir("logs")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load the logging config file
logging_config_path = os.path.join(BASE_DIR, './config/logging.yml')
with open(logging_config_path, 'rt') as f:
    log_config = yaml.safe_load(f.read())
    date = op.get_filedate()
    op.make_dir(dir_name="logs/"+date)
    log_config["handlers"]["file"]["filename"] = f'logs/{date}/{op.get_filedatetime()}-ic-backend-sdk.log'
    config.dictConfig(log_config)

# Load the configuation for the application
app_config_path = os.path.join(BASE_DIR, './config/configuration.yml')
with open(app_config_path, 'rt') as f:
    # Read the yaml configuration
    app_configuration = yaml.safe_load(f.read())
    
# Add the previous folder structure to the system path to import the utilities
app = FastAPI(title="main")

@app.get("/example")
async def api_call(request: Request):
    """
    Example documentation

    Returns:
        response: :obj:`__insert response here__`
    """
    try:
        ## Check if the api key is present and if it is authenticated
        if(not auth_manager.is_authenticated(request=request)):
            return HttpTools.get_not_authorized()
        ## Standard way to know if user is calling or the EDC.
        
        ## DO LOGIC HERE!!!
        return None
    
    except Exception as e:
        logger.exception(str(e))
        return HttpTools.get_error_response(
            status=500,
            message="It was not possible to execute the request!"
        )

def start():
    ## Load in memory data storages and authentication manager
    global edc_service, auth_manager, logger
    
    # Initialize the server environment and get the comand line arguments
    args = get_arguments()

    # Configure the logging confiuration depending on the configuration stated
    logger = logging.getLogger('staging')
    if(args.debug):
        logger = logging.getLogger('development')
    
    ## Start storage and edc communication service
    edc_service = EdcService()

    ## Start the authentication manager
    auth_manager = AuthManager()
    
    ## Once initial checks and configurations are done here is the place where it shall be included
    logger.info("[INIT] Application Startup Initialization Completed!")

    # Only start the Uvicorn server if not in test mode
    if not args.test_mode:
        uvicorn.run(app, host=args.host, port=args.port, log_level=("debug" if args.debug else "info"))        
    
def get_arguments():
    
    parser = argparse.ArgumentParser()

    parser.add_argument('--test-mode', action='store_true', help="Run in test mode (skips uvicorn.run())", required=False)
    
    parser.add_argument("--debug", default=False, action="store_false", help="Enable and disable the debug", required=False)
    
    parser.add_argument("--port", default=8080, help="The server port where it will be available", type=int, required=False,)
    
    parser.add_argument("--host", default="localhost", help="The server host where it will be available", type=str, required=False)
    
    args = parser.parse_args()
    return args


if __name__ == "__main__":
    print("\nEclipse Tractus-X Industry Core Hub\n")
    print(r"""
        __________     __  __      __       ____             __                  __
       /  _/ ____/    / / / /_  __/ /_     / __ )____ ______/ /_____  ____  ____/ /
       / // /  ______/ /_/ / / / / __ \   / __  / __ `/ ___/ //_/ _ \/ __ \/ __  / 
     _/ // /__/_____/ __  / /_/ / /_/ /  / /_/ / /_/ / /__/ ,< /  __/ / / / /_/ /  
    /___/\____/    /_/ /_/\__,_/_.___/  /_____/\__,_/\___/_/|_|\___/_/ /_/\__,_/   
    """)
    print("\n\n\t\t\t\t\t\t\t\t\t\tv0.0.1")
    print("Application starting, listening to requests...\n")

    start()

    print("\nClosing the application... Thank you for using the Eclipse Tractus-X Industry Core Hub Backend!")
