###############################################################
# Eclipse Tractus-X - Industry Core Hub
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
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
###############################################################

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from managers.config.config_manager import ConfigManager
from tools import env_tools

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

base_dsn = ConfigManager.get_config("database.connection_string", default="")
connection_string = env_tools.substitute_env_vars(string=base_dsn)
config.set_main_option("sqlalchemy.url", str(connection_string))

target_metadata = SQLModel.metadata


def include_name(name: str | None, type_: str, parent_names: dict[str, str]) -> bool:
    """Keep Alembic focused on application-owned schemas."""
    if type_ == "schema":
        return name not in {"cache", "ichub_keycloak"}
    if type_ == "table":
        schema = parent_names.get("schema_name")
        return schema not in {"cache", "ichub_keycloak"}
    return True


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_name=include_name,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_name=include_name,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()