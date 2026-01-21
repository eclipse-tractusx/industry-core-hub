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

import os
import sys
import yaml
from logging import config, getLogger
from tractusx_sdk.dataspace.tools import op


class LoggingManager:
    _initialized = False

    @classmethod
    def init_logging(cls, config_path=None):
        if cls._initialized:
            return

        if config_path is None:
            config_path = os.path.join(os.getcwd(), "config", "logging.yml")

        try:
            date = op.get_filedate()
            log_dir = f"logs/{date}"
            op.make_dir(dir_name=log_dir)

            with open(config_path, "r") as f:
                log_config = yaml.safe_load(f)

            log_config["handlers"]["file"]["filename"] = (
                f"{log_dir}/{op.get_filedatetime()}-ic-backend-sdk.log"
            )

            config.dictConfig(log_config)
            cls._initialized = True
        except Exception as e:
            print(
                f"[LoggingManager] Failed to load logging config from '{config_path}': {e}",
                file=sys.stderr,
            )
            print(
                "[LoggingManager] Defaulting to Python's built-in logging settings.",
                file=sys.stderr,
            )
            cls._initialized = True

    @classmethod
    def get_logger(cls, name=None):
        if not cls._initialized:
            cls.init_logging()
        return getLogger(name if name else __name__)
