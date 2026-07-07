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

- **`public`** - Application data (19 core tables: batch, twin, catalog_part, etc.)
- **`ichub`** - EDC connector cache (edr_connections, known_connectors, known_dtrs)
- **`ichub_keycloak`** - Keycloak authentication (managed by Keycloak)

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

## Setup

### Manual Schema Creation

Use the provided DDL script to initialize the public schema:

```bash
psql -h postgres -U ichub -d ichub < Metadata-DDL-public.sql
```

### Kubernetes Automatic Initialization

The database initializes automatically during Helm deployment via:
- `configmap-backend-postgres-init.yaml` - Runs DDL scripts
- `secret-backend-postgres.yaml` - Sets credentials

Deploy via:
```bash
helm install industry-core-hub ./charts/industry-core-hub \
  -f values.yaml
```

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

See the [Database DDL](./Metadata-DDL-public.sql) for schema definition and [Data Seeding Guide](./DATA_SEEDING_GUIDE.md) for test data setup.

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 LKS Next
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
