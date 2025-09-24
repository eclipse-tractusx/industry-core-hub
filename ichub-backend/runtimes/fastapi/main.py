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
import os
import yaml
from controllers.fastapi import app as api
from tractusx_sdk.dataspace.tools.utils import get_arguments
from managers.config.log_manager import LoggingManager
from managers.config.config_manager import ConfigManager
from tractusx_sdk.dataspace.managers import AuthManager
app = api

## In memory authentication manager service
auth_manager: AuthManager


def start():
    ## Load in memory data storages and authentication manager
    global auth_manager, logger
    
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
        # Load configuration using ConfigManager
        ConfigManager.load_config()
        
        # Get server configuration with fallbacks to environment variables and then defaults
        server_config = ConfigManager.get_config('server', {})
        workers_config = server_config.get('workers', {})
        timeouts_config = server_config.get('timeouts', {})
        
        logger.info(f"[CONFIG] Loaded server configuration from configuration.yml")
        
        # Simple configuration with sensible defaults
        max_workers = int(os.getenv("UVICORN_MAX_WORKERS") or workers_config.get("max_workers", 1))
        worker_threads = int(os.getenv("UVICORN_WORKER_THREADS") or workers_config.get("worker_threads", 100))
        timeout_keep_alive = int(os.getenv("UVICORN_TIMEOUT_KEEP_ALIVE") or timeouts_config.get("keep_alive", 300))
        timeout_graceful_shutdown = int(os.getenv("UVICORN_TIMEOUT_GRACEFUL_SHUTDOWN") or timeouts_config.get("graceful_shutdown", 30))
        
        logger.info(f"[UVICORN] Starting server with {max_workers} worker(s)")
        logger.info(f"[UVICORN] Thread pool size: {worker_threads}")
        logger.info(f"[UVICORN] Timeouts: keep_alive={timeout_keep_alive}s, graceful_shutdown={timeout_graceful_shutdown}s")
        
        # Set up asyncio default thread pool for blocking operations
        import asyncio
        import concurrent.futures
        
        # Configure asyncio's default thread pool executor globally
        logger.info(f"[ASYNCIO] Configured default thread pool - blocking calls handled automatically!")
        
        # Simple uvicorn configuration
        uvicorn_config = {
            "app": app,
            "host": args.host,
            "port": args.port,
            "log_level": ("debug" if args.debug else "info")
        }
        
        
        try:
            uvicorn.run(**uvicorn_config)
        except KeyboardInterrupt:
            logger.info("[UVICORN] Server shutdown requested")
        except Exception as e:
            logger.error(f"[UVICORN] Server error: {e}")
        finally:
            logger.info("[UVICORN] Server shutdown completed")
