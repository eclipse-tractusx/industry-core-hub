<!--
Eclipse Tractus-X - Industry Core Hub

Copyright (c) 2026 LKS Next
Copyright (c) 2026 Contributors to the Eclipse Foundation

See the NOTICE file(s) distributed with this work for additional
information regarding copyright ownership.

This work is made available under the terms of the
Creative Commons Attribution 4.0 International (CC-BY-4.0) license,
which is available at
https://creativecommons.org/licenses/by/4.0/legalcode.

SPDX-License-Identifier: CC-BY-4.0
-->

# Database Management

Operational guide for Industry Core Hub PostgreSQL database management.

**Database:** PostgreSQL 15.4+  
**ORM:** SQLModel (SQLAlchemy-based)  
**Migrations:** Alembic 1.16.5
**Deployment:** Kubernetes with Helm charts

## Quick Reference

| Task | Command |
|------|---------|
| Connect to DB | `psql -h <host> -U <user> -d <database>` |
| Schema info | `\dt` (tables), `\d <table>` (details) |
| Database size | `SELECT pg_size_pretty(pg_database_size('ichub'));` |
| Active connections | `SELECT * FROM pg_stat_activity;` |
| Backup | `pg_dump -Fc -v <database> > backup.dump` |
| Restore | `pg_restore -d <database> backup.dump` |

---

## Schema Overview

Three schemas manage different aspects:

- **`public`** - Application data. The 25 SQLModel application tables are owned by Alembic.
- **`cache`** - Connector and DTR cache tables owned by Alembic in the explicit `cache` schema.
- **`ichub_keycloak`** - Keycloak authentication, managed by Keycloak and excluded from Alembic.

Alembic migrations run before the backend starts. The supported deployment path
uses a new database initialized by Alembic. Schema changes must be introduced as
new revisions; the chart verifies that the database reaches the current Alembic
head before the backend starts.

See [Schema Documentation](./SCHEMA_DOCUMENTATION.md) and [DDL](./Metadata-DDL-public.sql).

---

## Configuration

### Environment Variables

```bash
POSTGRES_DB=ichub
POSTGRES_USER=ichub
POSTGRES_PASSWORD=<secure-password>
DB_URL=postgresql://ichub:password@postgres:5432/ichub
```

### Connection String Format

```
postgresql://username:password@hostname:5432/database?sslmode=require
```

### Kubernetes Values

In `charts/industry-core-hub/values.yaml`:

```yaml
postgresql:
  enabled: true
  auth:
    username: ichub
    password: <set-via-secrets>
  primary:
    persistence:
      size: 10Gi
```

---

## Migrations

Alembic is the authority for application schema changes. The PostgreSQL init script only
creates users, schemas, and grants; do not add application `CREATE TABLE` statements there.

### Local Docker Compose

The `migrations` service waits for PostgreSQL and applies the latest revision:

```bash
docker compose -f deployment/local/docker-compose/docker-compose.yml up migrations
```

### Manual execution

Run from `ichub-backend` with the same configuration used by the backend:

```bash
python migrate.py current
python migrate.py upgrade head
```

`upgrade head` is idempotent on databases managed by Alembic. New application schema changes
must be represented by a new Alembic revision and deployed using a fix-forward migration.

For an isolated disposable database, a revision can be reverted with:

```bash
python migrate.py downgrade base
```

Do not use downgrade as a production rollback strategy; restore a verified backup or apply a
forward-compatible fix instead.

### Kubernetes automatic execution

Helm runs `migrate.py upgrade head` in a post-install/post-upgrade Job after PostgreSQL is
reachable. The Job must complete successfully before the deployment is considered healthy.

Deploy via:
```bash
helm install industry-core-hub ./charts/industry-core-hub \
  -f values.yaml
```

The `ichub` and `ichub_keycloak` users, schemas, and permissions continue to be bootstrapped
by `configmap-backend-postgres-init.yaml` and `secret-backend-postgres.yaml`. The bootstrap
creates the `cache` schema and its permissions; Alembic creates the cache tables.

---

## Backup & Recovery

### Full Database Backup

```bash
# Create backup
pg_dump -Fc -v -Z9 ichub > ichub_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
pg_restore -l ichub_20260212_120000.dump | head -20
```

### Restore from Backup

```bash
# Connect to database
psql -h localhost -U ichub -d ichub

# Drop and recreate (if needed)
DROP DATABASE ichub;
CREATE DATABASE ichub;

# Restore data
pg_restore -d ichub ichub_20260212_120000.dump
```

---

See the [Data Seeding Guide](./DATA_SEEDING_GUIDE.md) for test data setup. The historical DDL
file is reference material only; do not use it as the deployment mechanism for application tables.

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 LKS Next
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
