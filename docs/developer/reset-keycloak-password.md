# Reset Keycloak Password Script

## Context
The `reset-keycloak-password.sh` script is designed to reset the password of the `ichub-admin` user in Keycloak. This script is particularly useful for development and testing environments where the password needs to be updated frequently for convenience.

The `ichub-admin` user is initially created during the deployment of Keycloak using the `realm-export.json` file. This file defines the user with a hashed password, ensuring security during the initial setup. However, the script allows administrators to set a new password as needed.

## Technical Details
- **Initial User Creation**: The `realm-export.json` file includes the `ichub-admin` user with a hashed password. This ensures that the password is not stored in plaintext.
- **Script Functionality**:
  - Waits for Keycloak to be ready.
  - Retrieves an admin token using the Keycloak API.
  - Resets the password of the `ichub-admin` user to a new value provided via environment variables or defaults.

## Usage
To use the script, follow these steps:

1. Ensure Keycloak is running and accessible.
2. Set the required environment variables:
   - `KEYCLOAK_URL`: URL of the Keycloak server (default: `http://keycloak.tx.test`).
   - `KEYCLOAK_ADMIN_USER`: Admin username (default: `admin`).
   - `KEYCLOAK_ADMIN_PASSWORD`: Admin password (default: `keycloak-admin-password`).
   - `REALM_NAME`: Name of the realm (default: `ICHub`).
   - `TARGET_USER_ID`: ID of the user to reset (default: `admin-user-001`).
   - `ICHUB_ADMIN_PASSWORD`: New password for the user (default: `admin123`).
3. Run the script:
   ```bash
   ./reset-keycloak-password.sh
   ```

## Recommendations
For production environments, it is recommended to:
- Use Kubernetes Secrets or a similar tool to manage sensitive credentials.
- Avoid hardcoding passwords in scripts or configuration files.
- Limit the use of this script to non-production environments or controlled scenarios.

## Example
```bash
export KEYCLOAK_URL="http://keycloak.mycompany.com"
export KEYCLOAK_ADMIN_USER="admin"
export KEYCLOAK_ADMIN_PASSWORD="secure-admin-password"
export REALM_NAME="ICHub"
export TARGET_USER_ID="admin-user-001"
export ICHUB_ADMIN_PASSWORD="new-secure-password"

./reset-keycloak-password.sh
```

## Conclusion
The `reset-keycloak-password.sh` script is a convenient tool for managing the `ichub-admin` user's password in Keycloak. While it simplifies password management in development environments, it is important to follow best practices for security in production deployments.

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2025 LKS Next
- SPDX-FileCopyrightText: 2025 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
