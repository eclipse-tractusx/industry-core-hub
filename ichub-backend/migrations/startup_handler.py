import logging
import sys
from pathlib import Path

from alembic.config import Config as AlembicConfig
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext
from alembic import command as alembic_command
from sqlalchemy import inspect
from sqlmodel import Session, select

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from database import engine as db_engine
from models.metadata_database.models import LegalEntity, EnablementServiceStack

logger = LoggingManager.get_logger(__name__)

# Determine the project root directory to locate alembic.ini
# This assumes startup_handler.py is in ichub-backend/migrations/
# and alembic.ini is in the parent directory of migrations (i.e., ichub-backend)
# Adjust this path if your alembic.ini is located elsewhere.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ALEMBIC_INI_PATH = str(PROJECT_ROOT / "alembic.ini")


def check_and_apply_migrations():
    """
    Checks the database schema revision against Alembic's head.
    If the schema is not initialized, it attempts to upgrade to head.
    If the schema is outdated, it logs an error and exits.
    """
    logger.info(f"Loading Alembic configuration from: {ALEMBIC_INI_PATH}")
    alembic_cfg = AlembicConfig(ALEMBIC_INI_PATH)

    script = ScriptDirectory.from_config(alembic_cfg)
    head_rev = script.get_current_head()

    with db_engine.connect() as connection:
        context = MigrationContext.configure(connection)
        current_rev = context.get_current_revision()

        inspector = inspect(connection)
        existing_table_names = inspector.get_table_names()

        if current_rev is None:
            if existing_table_names:
                logger.warning(
                    f"Database has no Alembic version but already contains tables: {existing_table_names}.\n"
                    f"This might indicate an existing schema not managed by Alembic. "
                    f"If you are managing the database schema manually, you can ignore this message. "
                    f"Otherwise, to use Alembic, please manually inspect the database. "
                    f"If the schema matches the head revision ({head_rev}), run 'alembic stamp head'. "
                    f"Alternatively, establish a baseline migration. "
                    f"Automatic upgrade is disabled to prevent potential data loss or errors."
                )

            else:
                # Database is confirmed empty (no tables) and has no Alembic version.
                logger.info(
                    f"Database is empty and has no Alembic version. Attempting to initialize schema to Alembic head: {head_rev}."
                )
                try:
                    # Programmatically run 'alembic upgrade head'
                    alembic_command.upgrade(alembic_cfg, "head")
                    logger.info("Alembic upgrade to 'head' command executed.")
                    # Re-check revision after upgrade
                    current_rev = context.get_current_revision()
                    if current_rev != head_rev:
                        logger.error(
                            f"Database upgraded, but current revision '{current_rev}' does not match head '{head_rev}'. Manual intervention required."
                        )
                        sys.exit(1)
                    logger.info(f"Database is now at revision: {current_rev}")
                except Exception as e:
                    logger.error(
                        f"Failed to apply Alembic migrations: {e}", exc_info=True
                    )
                    sys.exit(1)
        elif head_rev and current_rev != head_rev:
            # Delegate database upgrade to the user, as this is a critical operation
            logger.error(
                f"Database schema is outdated. Current revision: {current_rev}, Expected (head) revision: {head_rev}. Please run migrations manually or check configuration."
                f"If the schema matches the head revision ({head_rev}), run 'alembic stamp head'. "
            )
            sys.exit(1)
        else:
            logger.info(f"Database schema is up to date at revision: {current_rev}.")


def initialize_core_entities():
    """
    Initializes core entities like LegalEntity and EnablementServiceStack.
    Reads BPNL from settings, creates LegalEntity if not exists.
    Creates a default EnablementServiceStack for the LegalEntity if not exists.
    """
    bpnl = ConfigManager.get_config("bpnl")
    if not bpnl or not isinstance(bpnl, str):
        logger.error(
            "BPNL not configured in settings. Cannot initialize core entities."
        )
        sys.exit(1)

    logger.info(f"Initializing core entities for BPNL: {bpnl}")

    with Session(db_engine) as session:
        # Check/Create LegalEntity
        statement = select(LegalEntity).where(LegalEntity.bpnl == bpnl)
        legal_entity = session.exec(statement).first()

        if not legal_entity:
            logger.info(f"LegalEntity with BPNL {bpnl} not found. Creating...")
            legal_entity = LegalEntity(bpnl=bpnl)
            session.add(legal_entity)
            session.commit()
            session.refresh(legal_entity)
            logger.info(
                f"LegalEntity created with ID: {legal_entity.id} for BPNL: {bpnl}"
            )
        else:
            logger.info(f"Found LegalEntity with BPNL {bpnl}, ID: {legal_entity.id}")

        # Check/Create EnablementServiceStack for this LegalEntity
        # Assuming one primary stack per Legal Entity for this initialization.

        # First, check if a stack already exists for this legal entity
        stack_statement = select(EnablementServiceStack).where(
            EnablementServiceStack.legal_entity_id == legal_entity.id
        )
        enablement_stack = session.exec(stack_statement).first()

        if not enablement_stack:
            # Define the default name for the stack
            stack_name = "EDC/DTR Default"
            logger.info(
                f"No EnablementServiceStack found for LegalEntity ID {legal_entity.id}. Attempting to create one named '{stack_name}'..."
            )

            # Verify this name isn't taken by another stack
            existing_stack_with_name_stmt = select(EnablementServiceStack).where(
                EnablementServiceStack.name == stack_name
            )
            if session.exec(existing_stack_with_name_stmt).first():
                logger.error(
                    f"An EnablementServiceStack with the name '{stack_name}' already exists but is not linked to this LegalEntity. This indicates a naming conflict or data inconsistency. Halting."
                )
                sys.exit(1)

            enablement_stack = EnablementServiceStack(
                name=stack_name,
                legal_entity_id=legal_entity.id,
                connection_settings=None,
            )
            session.add(enablement_stack)
            session.commit()
            session.refresh(enablement_stack)
            logger.info(
                f"EnablementServiceStack '{stack_name}' created with ID: {enablement_stack.id} for LegalEntity ID: {legal_entity.id}"
            )
        else:
            logger.info(
                f"Found existing EnablementServiceStack (ID: {enablement_stack.id}, Name: '{enablement_stack.name}') for LegalEntity ID: {legal_entity.id}"
            )


def on_startup():
    """
    Main function to be called on application startup.
    Orchestrates schema checks and core entity initialization.
    """
    logger.info("Application startup sequence initiated...")
    check_and_apply_migrations()
    initialize_core_entities()
    logger.info("Application startup sequence completed successfully.")


# Example of how this might be called if this script is run directly (for testing)
# In a FastAPI app, you would register `on_startup` with `app.on_event("startup")`.
if __name__ == "__main__":
    # Basic logging setup for direct execution test
    logging.basicConfig(level=logging.INFO)

    logger.info("Running startup_handler.py directly for testing...")
    on_startup()
    logger.info("Direct execution test finished.")
