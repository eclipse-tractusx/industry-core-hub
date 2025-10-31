# Scripts - Industry Core Hub

Esta carpeta contiene scripts utilitarios para la gestión y administración del Industry Core Hub.

## 🔐 reset-keycloak-password.sh

Script para resetear la contraseña del usuario `ichub-admin` en Keycloak después del despliegue.

### Propósito

Cuando se despliega Keycloak con el realm exportado, los usuarios tienen contraseñas hasheadas que no conocemos. Este script permite establecer una contraseña conocida para el usuario administrativo `ichub-admin`.

### Uso Básico

```bash
# Usar con valores por defecto (contraseña: admin123)
./scripts/reset-keycloak-password.sh

# Especificar una contraseña personalizada
ICHUB_ADMIN_PASSWORD="mi-contraseña-segura" ./scripts/reset-keycloak-password.sh

# Uso simplificado para minikube con valores por defecto
KEYCLOAK_ADMIN_PASSWORD="keycloak-admin-password" ./scripts/reset-keycloak-password.sh
```

### Variables de Entorno

| Variable | Valor por Defecto | Descripción |
|----------|-------------------|-------------|
| `KEYCLOAK_URL` | `http://keycloak.tx.test` | URL base de Keycloak |
| `KEYCLOAK_ADMIN_USER` | `admin` | Usuario administrador de Keycloak |
| `KEYCLOAK_ADMIN_PASSWORD` | `keycloak-admin-password` | Contraseña del admin de Keycloak |
| `REALM_NAME` | `ICHub` | Nombre del realm de Keycloak |
| `TARGET_USER_ID` | `admin-user-001` | ID del usuario a modificar |
| `ICHUB_ADMIN_PASSWORD` | `admin123` | Nueva contraseña para ichub-admin |

### Ejemplo Completo

```bash
# Para entorno de desarrollo local con minikube
KEYCLOAK_URL="http://keycloak.tx.test" \
KEYCLOAK_ADMIN_USER="admin" \
KEYCLOAK_ADMIN_PASSWORD="keycloak-admin-password" \
REALM_NAME="ICHub" \
TARGET_USER_ID="admin-user-001" \
ICHUB_ADMIN_PASSWORD="admin123" \
./scripts/reset-keycloak-password.sh
```

### Salida Esperada

```
🔄 Resetting ichub-admin password...
⏳ Waiting for Keycloak to be ready...
✅ Keycloak is ready!
🔑 Getting admin token...
✅ Admin token obtained
🔐 Resetting password for user ichub-admin...
✅ Password reset successfully!

🎉 Login credentials:
   Username: ichub-admin
   Password: admin123
```

### Credenciales Resultantes

Después de ejecutar el script, podrás hacer login en el frontend con:

- **Usuario:** `ichub-admin`
- **Contraseña:** La especificada en `ICHUB_ADMIN_PASSWORD` (por defecto: `admin123`)

### Solución de Problemas

#### Error: "Keycloak not available"
```bash
❌ ERROR: Keycloak not available after 5 minutes
```
**Solución:** Verifica que Keycloak esté desplegado y accesible en la URL especificada.

#### Error: "Failed to get admin token"
```bash
❌ ERROR: Failed to get admin token
```
**Solución:** Verifica las credenciales del administrador de Keycloak (`KEYCLOAK_ADMIN_USER` y `KEYCLOAK_ADMIN_PASSWORD`).

#### Error: "Failed to reset password"
```bash
❌ ERROR: Failed to reset password (HTTP XXX)
```
**Solución:** Verifica que el `TARGET_USER_ID` y `REALM_NAME` sean correctos.

### Requisitos

- `curl` instalado
- Acceso de red a Keycloak
- Credenciales válidas del administrador de Keycloak

### Notas de Seguridad

⚠️ **Importante:** 
- Este script es para entornos de desarrollo y testing
- En producción, gestiona las contraseñas de forma segura
- No hardcodees contraseñas en scripts de producción
- Considera usar secretos de Kubernetes para credenciales sensibles