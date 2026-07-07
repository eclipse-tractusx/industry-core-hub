# Migration Guides

This directory contains comprehensive migration guides for the Industry Core Hub application.

## Available Guides

### [PostgreSQL Migration Guide](./BITNAMI_TO_CLOUDPIRATES_MIGRATION_GUIDE.md) ⭐ **PostgreSQL**

**Purpose**: Concise step-by-step guide for migrating from Bitnami PostgreSQL 15 to CloudPirates PostgreSQL 18.0

**When to use this guide**:

- You need a quick reference during PostgreSQL migration
- You want clear, actionable commands
- You're migrating the Industry Core Hub database

**Features**:

- 7 simple steps with commands
- 15-60 minute estimated timeline
- Quick rollback procedure

**Target Audience**: Anyone performing the PostgreSQL migration for Industry Core Hub

---

### [Keycloak Migration Guide](./BITNAMI_TO_CLOUDPIRATES_KEYCLOAK_MIGRATION_GUIDE.md) ⭐ **Keycloak**

**Purpose**: Comprehensive guide for migrating from Bitnami Keycloak 25.x to CloudPirates Keycloak 26.x

**When to use this guide**:

- You need to migrate Keycloak from Bitnami to CloudPirates chart
- You want to upgrade to Keycloak 26.x
- You need to understand configuration mapping between charts

**Features**:

- 8 detailed steps with commands
- Configuration mapping reference table
- Troubleshooting section
- 30-90 minute estimated timeline
- Quick rollback procedure

**Target Audience**: Anyone performing the Keycloak migration for Industry Core Hub

---

## Migration Strategy Overview

All guides in this directory follow a similar strategy:

1. **Pre-Migration**
   - Verify current state
   - Document existing data (business_partner, twin tables, etc.)
   - Create comprehensive backup using `pg_dumpall`

2. **Migration**
   - Stop current deployment
   - Delete only PostgreSQL PVC (backend PVCs preserved)
   - Update Chart.yaml and values.yaml
   - Deploy CloudPirates PostgreSQL 18
   - Restore data from backup

3. **Verification**
   - Verify PostgreSQL 18 version
   - Verify data integrity in `ichub-postgres` database
   - Test application and connectivity
   - Verify backend PVCs remain bound

4. **Post-Migration**
   - Monitor application logs
   - Verify backend functionality
   - Archive backups

## Important Notes

- **Database Name**: Industry Core Hub uses `ichub-postgres` as the database name
- **PVC Strategy**: Only the PostgreSQL PVC is migrated; backend data and logs PVCs are preserved
- **Tables**: Main tables include `business_partner`, `twin`, `catalog_part`, `batch`, etc.
- **Pod Name**: PostgreSQL pod is named `industry-core-hub-postgresql-0`

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2025 Contributors to the Eclipse Foundation
- Source URL: <https://github.com/eclipse-tractusx/industry-core-hub>
