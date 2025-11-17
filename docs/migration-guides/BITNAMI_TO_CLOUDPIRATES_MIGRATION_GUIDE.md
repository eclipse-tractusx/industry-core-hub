# Quick Migration Guide: Bitnami PostgreSQL 15 → CloudPirates PostgreSQL 18

**Estimated Time**: 15-60 minutes depending on database size

## Prerequisites

- Kubernetes cluster access with `kubectl`
- Helm 3.x installed
- Maintenance window scheduled

---

## Migration Steps

### 1. Backup Current Data

```bash
# Navigate to backup directory
mkdir -p ~/ichub-migration-backup && cd ~/ichub-migration-backup
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

# Get the password
POSTGRES_PASSWORD=$(kubectl get secret ichub-postgres-secret -o jsonpath="{.data.postgres-password}" | base64 --decode)

```bash
# Create full backup
kubectl exec industry-core-hub-postgresql-0 -- bash -c \
  "PGPASSWORD=${POSTGRES_PASSWORD} pg_dumpall -U postgres" > backup_${BACKUP_DATE}.sql

# Verify backup
ls -lh backup_${BACKUP_DATE}.sql
head -n 20 backup_${BACKUP_DATE}.sql

# Document current data (example with business_partner table)
kubectl exec industry-core-hub-postgresql-0 -- bash -c \
  "PGPASSWORD=${POSTGRES_PASSWORD} psql -U postgres -d ichub-postgres -c 'SELECT COUNT(*) FROM business_partner;'"
```

**Expected**: File size > 0, should show SQL statements

---

### 2. Stop Current Deployment

```bash
# Uninstall Bitnami deployment
cd /path/to/industry-core-hub/charts/industry-core-hub
helm uninstall industry-core-hub

# Delete only PostgreSQL PVC (ONLY after backup is verified!)
# Note: Backend PVCs (data and logs) will be preserved and reused
kubectl delete pvc data-industry-core-hub-postgresql-0

# Verify PostgreSQL PVC is deleted (backend PVCs should remain)
kubectl get pvc
```

**Expected**: PostgreSQL PVC deleted.

---

### 3. Update Chart Configuration

Update `Chart.yaml`:

```yaml
dependencies:
  - name: postgres
    repository: oci://registry-1.docker.io/cloudpirates
    version: 0.11.0
    condition: postgresql.enabled
    alias: postgresql
```

Update `values.yaml`:

```yaml
postgresql:
  fullnameOverride: ichub-postgres
  enabled: true
  image:
    registry: docker.io
    repository: postgres
    tag: "18.0@sha256:1ffc019dae94eca6b09a49ca67d37398951346de3c3d0cfe23d8d4ca33da83fb"
  persistence:
    enabled: true
    size: 10Gi
    storageClass: standard
```

---

### 4. Deploy CloudPirates PostgreSQL

```bash
# Update dependencies
helm dependency update

# Install CloudPirates chart
helm install industry-core-hub .

# Wait for pods to be ready
kubectl wait --for=condition=ready pod --all --timeout=300s

# Get the password
POSTGRES_PASSWORD=$(kubectl get secret ichub-postgres-secret -o jsonpath="{.data.postgres-password}" | base64 --decode)

# Verify PostgreSQL 18.0
kubectl exec industry-core-hub-postgresql-0 -- bash -c \
  "PGPASSWORD=${POSTGRES_PASSWORD} psql -U postgres -c 'SELECT version();'"
```

**Expected**: PostgreSQL 18.0 (Debian 18.0-1.pgdg13+3)

---

### 5. Restore Data

```bash
# Navigate to backup directory
cd ~/ichub-migration-backup

# IMPORTANT: Truncate existing tables to avoid duplicate key errors (optional if starting fresh)
kubectl exec industry-core-hub-postgresql-0 -- bash -c \
  "PGPASSWORD=${POSTGRES_PASSWORD} psql -U postgres -d ichub-postgres -c \
  'TRUNCATE TABLE batch, batch_business_partner, business_partner, catalog_part, data_exchange_agreement, data_exchange_contract, enablement_service_stack, legal_entity, partner_catalog_part, twin, twin_aspect, twin_aspect_registration, twin_exchange, twin_registration, jis_part, serialized_part CASCADE;'"

# Restore backup (this will take time for large databases)
cat backup_${BACKUP_DATE}.sql | kubectl exec -i industry-core-hub-postgresql-0 -- \
  bash -c "PGPASSWORD=${POSTGRES_PASSWORD} psql -U postgres"

# Note: You may see warnings like "database already exists" - this is normal
```

**Monitor progress**: Watch for `COPY 4` messages indicating data rows are being inserted

---

### 6. Verify Migration

```bash
# Verify PostgreSQL version
kubectl exec industry-core-hub-postgresql-0 -- bash -c \
  "PGPASSWORD=${POSTGRES_PASSWORD} psql -U postgres -c 'SELECT version();'"

# Verify data counts (example tables)
kubectl exec industry-core-hub-postgresql-0 -- bash -c \
  "PGPASSWORD=${POSTGRES_PASSWORD} psql -U postgres -d ichub-postgres -c 'SELECT COUNT(*) FROM business_partner;'"

# Verify tables
kubectl exec industry-core-hub-postgresql-0 -- bash -c \
  "PGPASSWORD=${POSTGRES_PASSWORD} psql -U postgres -d ichub-postgres -c '\dt'"
```

**Expected**: All data should match pre-migration counts

---

### 7. Test Application

```bash
# Check application
APP_POD=$(kubectl get pod -l app.kubernetes.io/name=industry-core-hub-backend -o jsonpath='{.items[0].metadata.name}')

# Check logs
kubectl logs $APP_POD --tail=50

# Verify backend PVC is being used
kubectl get pvc
```

---

## Quick Rollback

If issues occur:

```bash
# 1. Stop CloudPirates
helm uninstall industry-core-hub

# 2. Delete only PostgreSQL PVC (backend PVCs remain intact)
kubectl delete pvc data-industry-core-hub-postgresql-0

# 3. Restore Bitnami chart configuration
# (revert Chart.yaml and values.yaml changes)

# 4. Deploy Bitnami
helm dependency update
helm install industry-core-hub .

# Get the password
POSTGRES_PASSWORD=$(kubectl get secret ichub-postgres-secret -o jsonpath="{.data.postgres-password}" | base64 --decode)

# 5. Restore backup
cat backup_${BACKUP_DATE}.sql | kubectl exec -i industry-core-hub-postgresql-0 -- \
  bash -c "PGPASSWORD=${POSTGRES_PASSWORD} psql -U postgres"
```

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2025 Contributors to the Eclipse Foundation
- Source URL: <https://github.com/eclipse-tractusx/industry-core-hub>
