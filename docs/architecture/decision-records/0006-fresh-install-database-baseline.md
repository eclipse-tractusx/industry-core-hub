<!--

Eclipse Tractus-X - Industry Core Hub Backend

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

# 6. Fresh-Install Database Baseline

Date: 2026-10-22

## Status

Accepted

## Context

Industry Core Hub previously managed its application database schema through legacy SQL
scripts and had no formal database migration process. Introducing Alembic therefore raises
the question of whether existing databases should be adopted by stamping the initial Alembic
revision or by providing a migration procedure that reconciles legacy tables, constraints,
indexes, and schema ownership with the new baseline.

An adoption procedure would need to account for differences between legacy database objects
and the objects declared in revision `0001_initial_schema`. It would also need to ensure that
the database roles and schemas satisfy the permissions expected by the backend and migration
Job. Supporting and validating that path would add significant complexity to the initial
Alembic integration.

## Decision

Treat Alembic revision `0001_initial_schema` as the fresh-install baseline for application
databases. Do not provide or support an adoption path for databases created using the legacy
SQL scripts, and do not stamp those databases with the initial revision. Deployments must
provision a new database and let the migration Job apply Alembic revisions from the baseline.
For development environments, drop and recreate the database before using the Alembic-based
application.

## Consequences

- Legacy databases cannot be upgraded in place through this Alembic integration. Existing
  data must not be assumed to be preserved when moving to the fresh-install baseline.
- The initial migration and database bootstrap must fully provision the schema, tables,
  indexes, constraints, and permissions required by a clean installation; the backend must
  not depend on stamping or legacy database objects.
- Clean-install migration and startup behavior should be validated independently of any
  legacy adoption workflow.
- If in-place migration or data preservation becomes a requirement, it needs a separately
  scoped migration design and validation effort.
