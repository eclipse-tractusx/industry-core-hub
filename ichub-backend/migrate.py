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

"""Run database migrations independently from the FastAPI application."""

import argparse
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

from managers.config.config_manager import ConfigManager
from tools import env_tools


def build_config() -> Config:
    """Build Alembic configuration from the backend installation directory."""
    config_path = Path(__file__).with_name("alembic.ini")
    config = Config(str(config_path))
    config.set_main_option("script_location", str(config_path.parent / "alembic"))
    return config


def ensure_supported_database() -> None:
    """Reject unversioned databases that already contain application tables."""
    base_dsn = ConfigManager.get_config("database.connection_string", default="")
    connection_string = env_tools.substitute_env_vars(string=base_dsn)
    engine = create_engine(str(connection_string), connect_args={"connect_timeout": 8})

    with engine.connect() as connection:
        has_version_table = connection.execute(
            text("SELECT to_regclass('public.alembic_version') IS NOT NULL")
        ).scalar_one()
        if has_version_table and connection.execute(
            text("SELECT count(*) FROM public.alembic_version")
        ).scalar_one() > 0:
            return

        existing_tables = connection.execute(
            text(
                """
                SELECT tablename
                FROM pg_catalog.pg_tables
                WHERE schemaname = 'public'
                                    AND tablename <> 'alembic_version'
                ORDER BY tablename
                """
            )
        ).scalars().all()

    if existing_tables:
        table_list = ", ".join(existing_tables)
        raise RuntimeError(
            "The database contains unversioned public tables "
            f"({table_list}). This release supports new databases only; "
            "back up and adopt the database through a validated migration "
            "before running Alembic."
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    upgrade_parser = subparsers.add_parser("upgrade", help="Apply migrations")
    upgrade_parser.add_argument("revision", nargs="?", default="head")
    downgrade_parser = subparsers.add_parser("downgrade", help="Revert migrations")
    downgrade_parser.add_argument("revision", nargs="?", default="-1")
    subparsers.add_parser("current", help="Show the current database revision")

    args = parser.parse_args()
    config = build_config()

    if args.command == "upgrade":
        ensure_supported_database()
        command.upgrade(config, args.revision)
    elif args.command == "downgrade":
        command.downgrade(config, args.revision)
    else:
        command.current(config)


if __name__ == "__main__":
    main()