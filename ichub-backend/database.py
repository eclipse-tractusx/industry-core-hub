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

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from sqlmodel import SQLModel, create_engine, text
from tools import env_tools

base_dsn = ConfigManager.get_config("database.connectionString", default={})
logger = LoggingManager.get_logger(__name__)
# Substitute the environment variables in the connection string if available
connection_string = env_tools.substitute_env_vars(string=base_dsn)

db_echo = ConfigManager.get_config("database.echo", default={False})
db_timeout = ConfigManager.get_config("database.timeout", default=8)

logger.info("Attempting database connection... with timeout %s seconds", db_timeout)
engine = create_engine(str(connection_string), echo=db_echo, connect_args={"connect_timeout": db_timeout})


database_error:bool = False

def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)

def connect_and_test():
    global database_error, db_timeout
    try:
        with engine.connect() as conn:
            # run a lightweight test query
            conn.execute(text("SELECT 1"))
        logger.info("Database connection established successfully.")
    except Exception as e:
        logger.critical(f"Failed to establish database connection: {e}")
        database_error = True
        raise
