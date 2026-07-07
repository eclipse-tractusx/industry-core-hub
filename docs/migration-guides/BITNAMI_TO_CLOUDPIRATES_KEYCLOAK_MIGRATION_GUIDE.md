# Industry Core Hub: Keycloak Migration Guide

**Migration**: Bitnami Keycloak 25.x → CloudPirates Keycloak 26.x

> 📖 For general Keycloak migration concepts applicable to other projects, see the [Generic Keycloak Migration Guide](./GENERIC_BITNAMI_TO_CLOUDPIRATES_KEYCLOAK_MIGRATION_GUIDE.md)

---

## Who Is This Guide For?

| Scenario | What to Do |
|----------|------------|
| **New installation** (no existing Keycloak) | Just deploy! All configurations are already applied. Skip to [Quick Start](#quick-start-new-installation). |
| **Upgrading from Bitnami** (existing deployment) | Follow the [Migration Steps](#migration-steps-upgrading-from-bitnami) below. |
| **Understanding the changes** | Read the [What Changed](#what-changed) section. |

---

## Quick Start (New Installation)

If you're deploying Industry Core Hub for the first time, no migration is needed. The chart already uses CloudPirates Keycloak:

```bash
# Clone the repository
git clone https://github.com/eclipse-tractusx/industry-core-hub.git
cd industry-core-hub/charts/industry-core-hub

# Update dependencies
helm dependency update

# Deploy
helm install ichub . -n ichub --create-namespace

# Wait for all pods to be ready (~2-3 minutes)
kubectl get pods -n ichub -w
```

**Expected result:**
```
NAME                                       READY   STATUS    AGE
ichub-postgresql-0                         1/1     Running   2m
ichub-keycloak-0                           1/1     Running   2m
industry-core-hub-backend-xxx              1/1     Running   2m
industry-core-hub-frontend-xxx             1/1     Running   2m
```

**Verify Keycloak works:**
```bash
kubectl port-forward svc/ichub-keycloak 8080:80 -n ichub &
curl -s http://localhost:8080/auth/realms/ICHub | jq .realm
# Expected: "ICHub"
```

---

## What Changed

### Summary of Changes

| Component | Bitnami (Old) | CloudPirates (New) |
|-----------|---------------|-------------------|
| Chart dependency | `bitnamicharts/keycloak:23.0.0` | `cloudpirates/keycloak:0.13.6` |
| Keycloak version | 25.0.6 | 26.5.2 |
| Docker image | `bitnami/keycloak` (custom) | `keycloak/keycloak` (official) |
| Themes path | `/opt/bitnami/keycloak/themes/` | `/opt/keycloak/themes/` |
| Config structure | `keycloak.auth.*` | `keycloak.keycloak.*` |
| Realm config | `keycloak.realm` | `keycloak.ichubRealm` |
| Proxy setting | `proxy: edge` | `proxyHeaders: "xforwarded"` |
| Init containers | `initContainers` | `extraInitContainers` |

### Configuration Mapping

```yaml
# OLD (Bitnami)                        # NEW (CloudPirates)
keycloak:                              keycloak:
  auth:                                  keycloak:
    adminUser: admin                       adminUser: admin
    adminPassword: "..."                   adminPassword: "..."
  proxy: edge                              proxyHeaders: "xforwarded"
  production: false                        production: false
  httpRelativePath: /auth/                 httpRelativePath: /auth  # NO trailing slash!
  realm:                                 ichubRealm:
    users: [...]                           users: [...]
  initContainers: [...]                  extraInitContainers: [...]
```

### Files Modified

| File | Change |
|------|--------|
| `Chart.yaml` | Keycloak dependency: Bitnami → CloudPirates |
| `values.yaml` | Configuration restructured for CloudPirates |
| `templates/_helpers.tpl` | Added password helper for consistency |
| `templates/secret-keycloak-db.yaml` | **NEW** - Auto-creates DB secret |
| `templates/service-postgresql-alias.yaml` | **NEW** - Auto-resolves DB host |
| `templates/secret-backend-postgres.yaml` | Uses shared password helper |
| `templates/configmap-realm-data.yaml` | Updated `realm` → `ichubRealm` references |
| `templates/job-realm-import.yaml` | Updated for CloudPirates |

### Automatic Configurations

Industry Core Hub handles these CloudPirates requirements automatically:

1. **Database Host**: Creates `ichub-postgresql-alias` service that resolves to the PostgreSQL pod
2. **Database Secret**: Creates `ichub-keycloak-db` secret with required `db-username`/`db-password` keys
3. **Password Sync**: Uses shared helper to ensure PostgreSQL and Keycloak use the same database password

---

## Migration Steps (Upgrading from Bitnami)

> ⚠️ **This migration requires downtime.** Schedule a maintenance window.

### Step 1: Backup Your Data

#### 1a. Export Realm from Keycloak Admin Console

```bash
# Set your namespace
NAMESPACE=ichub
RELEASE=ichub

# Port forward to Keycloak (skip if using ingress)
kubectl port-forward svc/${RELEASE}-keycloak 8080:80 -n ${NAMESPACE} &
```

1. Navigate to the Keycloak Admin Console (e.g., `https://ichub-iam.int.catena-x.net/auth/admin` or `http://localhost:8080/auth/admin`)
2. Login with admin credentials
3. Select the **ICHub** realm
4. Go to **Realm Settings → Action → Partial Export**
5. Check all options and click **Export**
6. Save the JSON file (e.g., `ichub-realm-export.json`)

#### 1b. Backup Database Using pgAdmin

> 💡 **pgAdmin is already deployed** as part of Industry Core Hub. If you have ingress configured, access it directly at your pgAdmin URL (e.g., `https://pgadmin-ichub.int.catena-x.net`).
>
> The pgAdmin deployment is controlled via `values.yaml`:
> ```yaml
> pgadmin4:
>   enabled: true
>   env:
>     email: <your-admin-email>
>     password: <your-admin-password>
> ```
>
> If pgAdmin is not yet deployed or you prefer a local instance, enable it with `pgadmin4.enabled: true` and redeploy, or use a local pgAdmin installation.

**Register the PostgreSQL server in pgAdmin:**

1. Open pgAdmin and log in
2. Right-click **Servers** → **Register** → **Server...**
3. In the **General** tab, set a name (e.g., `ICHub PostgreSQL`)
4. In the **Connection** tab, fill in:

| Field | Value |
|-------|-------|
| **Host name/address** | `<release-name>-postgresql` (e.g., `ichub-postgresql`) — pgAdmin can resolve this directly since both run in the same cluster |
| **Port** | `5432` |
| **Maintenance database** | `ichub-postgres` |
| **Username** | `ichub_keycloak` |
| **Password** | *(retrieve from secret, see below)* |
| **Save password** | ✅ (optional) |

> If pgAdmin runs **outside** the cluster, create a port-forward first:
> ```bash
> kubectl port-forward svc/${RELEASE}-postgresql 5432:5432 -n ${NAMESPACE} &
> ```
> Then use `localhost` as the host.

To retrieve the current database password:
```bash
kubectl get secret ichub-postgres-secret -n ${NAMESPACE} -o jsonpath='{.data.ichub_keycloak}' | base64 -d
```

**Create the backup in pgAdmin:**

1. In the pgAdmin browser tree, expand **Servers → ICHub PostgreSQL → Databases**
2. Right-click on `ichub-postgres` → **Backup...**
3. Configure the backup:
   - **Filename**: `keycloak_backup` (pgAdmin will add the extension)
   - **Format**: `Custom` (recommended, supports selective restore) or `Plain` (SQL text)
   - **Encoding**: `UTF8`
4. In the **Data/Objects** tab:
   - Enable **Include CREATE DATABASE statement** if you want a full restore option
   - Enable **Use Column Inserts** for maximum compatibility *(optional)*
5. Click **Backup**
6. Verify the backup completed successfully in the pgAdmin notifications panel (bell icon, bottom-right)

### Step 2: Uninstall Current Deployment

```bash
# Uninstall the release
helm uninstall ${RELEASE} -n ${NAMESPACE}

# Wait for pods to terminate
kubectl wait --for=delete pod/${RELEASE}-keycloak-0 -n ${NAMESPACE} --timeout=120s

# Optional: Delete PVCs for clean start (will lose data!)
# kubectl delete pvc --all -n ${NAMESPACE}
```

### Step 3: Get the Updated Chart

```bash
# If using git
git pull origin main

# Or fetch the latest chart
# (already done if you have the migrated chart)
```

### Step 4: Update Dependencies

```bash
cd charts/industry-core-hub
helm dependency update
```

### Step 5: Deploy New Version

```bash
# Deploy (no --set flags needed!)
helm install ${RELEASE} . -n ${NAMESPACE}

# Watch the deployment
kubectl get pods -n ${NAMESPACE} -w
```

### Step 6: Verify Migration

```bash
# Wait for all pods to be ready
kubectl wait --for=condition=ready pod/${RELEASE}-keycloak-0 -n ${NAMESPACE} --timeout=300s

# Port forward
kubectl port-forward svc/${RELEASE}-keycloak 8080:80 -n ${NAMESPACE} &

# Verify realm exists
curl -s http://localhost:8080/auth/realms/ICHub | jq .realm
# Expected: "ICHub"

# Get admin token and verify users
TOKEN=$(curl -s -X POST "http://localhost:8080/auth/realms/master/protocol/openid-connect/token" \
  -d "username=admin" \
  -d "password=keycloak-admin-password" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

curl -s "http://localhost:8080/auth/admin/realms/ICHub/users" \
  -H "Authorization: Bearer $TOKEN" | jq '.[].username'
# Expected: "ichub-admin"
```

### Step 7: Test the Application

```bash
# Port forward frontend
kubectl port-forward svc/industry-core-hub-frontend 3000:8080 -n ${NAMESPACE} &

# Access the application
echo "Frontend: http://localhost:3000"
echo "Login with: ichub-admin / <password-from-values.yaml>"
```

---

## Troubleshooting

### Pod Shows 0/1 Ready (CrashLoopBackOff)

**Check logs:**
```bash
kubectl logs ${RELEASE}-keycloak-0 -n ${NAMESPACE} --tail=50
```

**Common causes:**

| Error | Solution |
|-------|----------|
| `password authentication failed for user "ichub_keycloak"` | Secrets mismatch. Delete secrets and redeploy: `kubectl delete secret ichub-keycloak-db ichub-postgres-secret -n ${NAMESPACE}` |
| `Connection refused` to PostgreSQL | PostgreSQL not ready yet. Wait and check: `kubectl get pods -n ${NAMESPACE}` |
| `readiness probe failed` with double slash | Check `httpRelativePath: /auth` has NO trailing slash |

### Realm Import Job Stuck (Init:0/1)

**Check wait container:**
```bash
kubectl logs ${RELEASE}-realm-import-xxx -c wait-for-keycloak -n ${NAMESPACE}
```

**Causes:**
- Keycloak pod not ready yet (wait longer)
- Wrong URL (check service name and port)

### Users/Clients Not Present

**Check job logs:**
```bash
kubectl logs job/${RELEASE}-realm-import-xxx -n ${NAMESPACE}
```

**Verify secret exists:**
```bash
kubectl get secret ${RELEASE}-keycloak-realm-users -n ${NAMESPACE}
```

---

## Rollback

If migration fails:

```bash
# Uninstall
helm uninstall ${RELEASE} -n ${NAMESPACE}

# Delete new resources
kubectl delete secret ichub-keycloak-db -n ${NAMESPACE}
kubectl delete svc ichub-postgresql-alias -n ${NAMESPACE}

# Revert chart changes
git checkout HEAD~1 -- charts/industry-core-hub/Chart.yaml
git checkout HEAD~1 -- charts/industry-core-hub/values.yaml
git checkout HEAD~1 -- charts/industry-core-hub/templates/

# Update dependencies (back to Bitnami)
helm dependency update

# Redeploy Bitnami version
helm install ${RELEASE} . -n ${NAMESPACE}
```

---

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2025 Contributors to the Eclipse Foundation
- Source URL: <https://github.com/eclipse-tractusx/industry-core-hub>
