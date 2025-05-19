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

from managers.config.log_manager import LoggingManager

import os
import yaml

logger = LoggingManager.get_logger(__name__)


class ConfigManager:
    _config = None

    @classmethod
    def load_config(cls, config_path=None):
        """
        Load the configuration from a YAML file. Should be called once at startup.
        """
        if cls._config is not None:
            return cls._config

        if config_path is None:
            config_path = os.path.join(os.getcwd(), "config", "configuration.yml")

        try:
            with open(config_path, "r") as f:
                cls._config = yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Failed to load config from '{config_path}': {e}")
            cls._config = {}

        return cls._config

    @classmethod
    def get_config(cls, key=None, default=None):
        """
        Access the loaded config, optionally fetch a nested key.
        """
        if cls._config is None:
            cls.load_config()
        if key is None:
            return cls._config
        # Support dot-notation for nested keys: e.g., "authorization.apiKey.key"
        keys = key.split(".")
        value = cls._config
        for k in keys:
            if not isinstance(value, dict) or k not in value:
                return default
            value = value[k]
        return value
