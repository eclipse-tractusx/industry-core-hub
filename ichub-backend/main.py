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

## FAST API example for keycloak
# from fastapi_keycloak_middleware import CheckPermissions
# from fastapi_keycloak_middleware import get_user
import sys
import argparse
from logging import captureWarnings
import urllib3

from pathlib import Path
## Import paths before any local imports so modules resolve correctly
sys.path.append(str(Path(__file__).resolve().parents[1]))
sys.dont_write_bytecode = True

# Parse --config argument early — BEFORE importing any local modules that call
# ConfigManager at import time (connector.py, dtr.py run module-level code).
# Also strip the flag from sys.argv so the SDK's strict parse_args() doesn't fail.
_arg_parser = argparse.ArgumentParser(add_help=False)
_arg_parser.add_argument("--config", default=None, help="Path to the application configuration YAML file", type=str)
_known_args, _ = _arg_parser.parse_known_args()
_config_path = _known_args.config

_i = 0
while _i < len(sys.argv):
    if sys.argv[_i] == "--config":
        sys.argv.pop(_i)
        if _i < len(sys.argv):
            sys.argv.pop(_i)
    elif sys.argv[_i].startswith("--config="):
        sys.argv.pop(_i)
    else:
        _i += 1

# Import custom logging and configuration modules, and database utility.
# These must come AFTER sys.path is set up.
from managers.config.log_manager import LoggingManager
from managers.config.config_manager import ConfigManager

# Disable SSL warnings from urllib3 and capture warnings into logs
urllib3.disable_warnings()
captureWarnings(True)

# Initialize the logging system based on project configuration
LoggingManager.init_logging()

# Load the configuration BEFORE importing runtimes.fastapi, because connector.py
# and dtr.py call ConfigManager.get_config() at module level when imported.
ConfigManager.load_config(config_path=_config_path)

# Import the startup function for the FastAPI application (triggers connector.py
# and dtr.py module-level code, which now reads the already-loaded config).
from runtimes.fastapi import start

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
    print("\n\n\t\t\t\t\t\t\t\t\t\tv0.5.0")
    print("Application starting, listening to requests...\n")
    
    start(config_path=_config_path)

    print("\nClosing the application... Thank you for using the Eclipse Tractus-X Industry Core Hub Backend!")
