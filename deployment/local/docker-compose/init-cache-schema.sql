-- Cache schema is infrastructure-owned; Alembic owns its tables.
CREATE SCHEMA IF NOT EXISTS cache;
ALTER SCHEMA cache OWNER TO "user";
GRANT USAGE, CREATE ON SCHEMA cache TO "user";
