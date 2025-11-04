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

# Import custom logging and configuration modules, and database utility
from managers.config.log_manager import LoggingManager
from managers.config.config_manager import ConfigManager
from uuid import uuid4

## FAST API example for keycloak
# from fastapi_keycloak_middleware import CheckPermissions
# from fastapi_keycloak_middleware import get_user
import sys
from logging import captureWarnings
import urllib3

from pathlib import Path
## Import paths
sys.path.append(str(Path(__file__).resolve().parents[1]))
sys.dont_write_bytecode = True

# Import the startup function for the FastAPI application
from runtimes.fastapi import start

# Disable SSL warnings from urllib3 and capture warnings into logs
urllib3.disable_warnings()
captureWarnings(True)

# Initialize the logging system based on project configuration
LoggingManager.init_logging()

# Load application-specific configuration settings
ConfigManager.load_config()


# Test database connection
# If uncommented, it will test the database connection at startup
# if it the database connection is invalid or databse is not available
# it will raise an exception and the application will not start
# connect_and_test()

if __name__ == "__main__":
    print("\nEclipse Tractus-X Industry Core Hub\n")
    print(r"""
        __________     __  __      __       ____             __                  __
       /  _/ ____/    / / / /_  __/ /_     / __ )____ ______/ /_____  ____  ____/ /
       / // /  ______/ /_/ / / / / __ \   / __  / __ `/ ___/ //_/ _ \/ __ \/ __  / 
     _/ // /__/_____/ __  / /_/ / /_/ /  / /_/ / /_/ / /__/ ,< /  __/ / / / /_/ /  
    /___/\____/    /_/ /_/\__,_/_.___/  /_____/\__,_/\___/_/|_|\___/_/ /_/\__,_/   
    """)
    print("\n\n\t\t\t\t\t\t\t\t\t\tv0.2.0")
    print("Application starting, listening to requests...\n")
    
    start()

    print("\nClosing the application... Thank you for using the Eclipse Tractus-X Industry Core Hub Backend!")
