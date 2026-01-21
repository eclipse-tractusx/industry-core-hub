# Quick Migration Guide: Bitnami PostgreSQL 15 → CloudPirates PostgreSQL 18

**Estimated Time**: 15-60 minutes depending on database size

> ⚠️ **Important**: This migration requires downtime. Schedule a maintenance window.

## Prerequisites

- Kubernetes cluster access with `kubectl`
- Helm 3.x installed
- Maintenance window scheduled
- Access to the PR/branch with CloudPirates changes (or update Chart.yaml/values.yaml manually)

## Key Information

| Item | Value |
|------|-------|
| Database name | `ichub-postgres` |
| PostgreSQL pod | `industry-core-hub-postgresql-0` |
| Secret name | `ichub-postgres-secret` |
| Source version | PostgreSQL 15.x (Bitnami) |
| Target version | PostgreSQL 18.x (CloudPirates) |

---

## Migration Steps

### 1. Backup Current Data

```bash
# Navigate to backup directory
mkdir -p ~/ichub-migration-backup && cd ~/ichub-migration-backup
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

# Get the password from the secret
POSTGRES_PASSWORD=$(kubectl get secret ichub-postgres-secret -o jsonpath="{.data.postgres-password}" | base64 --decode)

# Create full backup using pg_dumpall
kubectl exec industry-core-hub-postgresql-0 -- \
  env PGPASSWORD="${POSTGRES_PASSWORD}" pg_dumpall -U postgres > backup_${BACKUP_DATE}.sql

# Verify backup file was created
ls -lh backup_${BACKUP_DATE}.sql
head -n 20 backup_${BACKUP_DATE}.sql

# Document current data counts (for verification after migration)
kubectl exec industry-core-hub-postgresql-0 -- \
  env PGPASSWORD="${POSTGRES_PASSWORD}" psql -U postgres -d ichub-postgres -c \
  "SELECT 'business_partner' as table_name, COUNT(*) FROM business_partner
   UNION ALL SELECT 'twin', COUNT(*) FROM twin;"
```

**Expected**: File size > 0, should show SQL statements starting with `-- PostgreSQL database cluster dump`

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
kubectl wait --for=condition=ready pod/industry-core-hub-postgresql-0 --timeout=300s

# Get the password (same secret is reused)
POSTGRES_PASSWORD=$(kubectl get secret ichub-postgres-secret -o jsonpath="{.data.postgres-password}" | base64 --decode)

# Verify PostgreSQL 18.0
kubectl exec industry-core-hub-postgresql-0 -- \
  env PGPASSWORD="${POSTGRES_PASSWORD}" psql -U postgres -c 'SELECT version();'
```

**Expected**: PostgreSQL 18.0 (Debian 18.0-1.pgdg13+3)

---

### 5. Restore Data

```bash
# Navigate to backup directory
cd ~/ichub-migration-backup

# Restore backup (this will take time for large databases)
# Note: The BACKUP_DATE variable should match the backup file created in Step 1
cat backup_${BACKUP_DATE}.sql | kubectl exec -i industry-core-hub-postgresql-0 -- \
  env PGPASSWORD="${POSTGRES_PASSWORD}" psql -U postgres

# Note: You may see warnings like "role already exists" or "database already exists"
# These are expected and safe to ignore. Look for "COPY X" messages which indicate
# successful data restoration (e.g., "COPY 3" means 3 rows were inserted)
```

**Monitor progress**: Watch for `COPY N` messages indicating data rows are being inserted

---

### 6. Verify Migration

```bash
# Verify PostgreSQL version is 18.x
kubectl exec industry-core-hub-postgresql-0 -- \
  env PGPASSWORD="${POSTGRES_PASSWORD}" psql -U postgres -c 'SELECT version();'

# Verify data counts match pre-migration values
kubectl exec industry-core-hub-postgresql-0 -- \
  env PGPASSWORD="${POSTGRES_PASSWORD}" psql -U postgres -d ichub-postgres -c \
  "SELECT 'business_partner' as table_name, COUNT(*) FROM business_partner
   UNION ALL SELECT 'twin', COUNT(*) FROM twin
   ORDER BY table_name;"

# Verify all tables exist
kubectl exec industry-core-hub-postgresql-0 -- \
  env PGPASSWORD="${POSTGRES_PASSWORD}" psql -U postgres -d ichub-postgres -c '\dt'
```

**Expected**: All data counts should match pre-migration state (from Step 1)

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

If issues occur after migration:

```bash
# 1. Stop CloudPirates deployment
helm uninstall industry-core-hub

# 2. Delete PostgreSQL PVC (backend PVCs remain intact)
kubectl delete pvc data-industry-core-hub-postgresql-0

# 3. Restore Bitnami chart configuration
# Revert Chart.yaml and values.yaml to Bitnami configuration (git checkout or manual edit)

# 4. Deploy Bitnami
helm dependency update
helm install industry-core-hub .

# 5. Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod/industry-core-hub-postgresql-0 --timeout=300s

# 6. Get the password and restore backup
POSTGRES_PASSWORD=$(kubectl get secret ichub-postgres-secret -o jsonpath="{.data.postgres-password}" | base64 --decode)
cat backup_${BACKUP_DATE}.sql | kubectl exec -i industry-core-hub-postgresql-0 -- \
  env PGPASSWORD="${POSTGRES_PASSWORD}" psql -U postgres
```

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2025 Contributors to the Eclipse Foundation
- Source URL: <https://github.com/eclipse-tractusx/industry-core-hub>
