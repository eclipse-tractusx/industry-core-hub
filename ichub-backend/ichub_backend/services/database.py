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

from typing import Generator

from sqlmodel import Session, SQLModel, create_engine

from ichub_backend.config.database import db_settings

# Create SQLModel engine
engine = create_engine(str(db_settings.DATABASE_CONNECTION_STRING), echo=db_settings.DB_ECHO)


def create_db_and_tables() -> None:
    """Create all tables defined by SQLModel metadata."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency for database sessions.

    Usage:
        @app.get("/items/")
        def read_items(session: Session = Depends(get_session)):
            items = session.exec(select(Item)).all()
            return items

    Yields:
        Session: SQLModel database session
    """
    with Session(engine) as session:
        yield session
