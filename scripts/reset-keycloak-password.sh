################################################################################
# Eclipse Tractus-X - Industry Core Hub
#
# Copyright (c) 2025 LKS Next
# Copyright (c) 2025 Contributors to the Eclipse Foundation
#
# See the NOTICE file(s) distributed with this work for additional
# information regarding copyright ownership.
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
################################################################################

# Script to reset ichub-admin password after Keycloak deployment
# This ensures a known password for the ichub-admin user

set -e

KEYCLOAK_URL=${KEYCLOAK_URL:-"http://keycloak.tx.test"}
ADMIN_USER=${KEYCLOAK_ADMIN_USER:-"admin"}
ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD:-"keycloak-admin-password"}
REALM_NAME=${REALM_NAME:-"ICHub"}
TARGET_USER_ID=${TARGET_USER_ID:-"admin-user-001"}
NEW_PASSWORD=${ICHUB_ADMIN_PASSWORD:-"admin123"}

echo "🔄 Resetting ichub-admin password..."

# Wait for Keycloak to be ready
echo "⏳ Waiting for Keycloak to be ready..."
for i in {1..30}; do
  if curl -s -f "$KEYCLOAK_URL/auth/realms/master" > /dev/null 2>&1; then
    echo "✅ Keycloak is ready!"
    break
  fi
  echo "Attempt $i: Waiting for Keycloak..."
  sleep 10
  if [ $i -eq 30 ]; then
    echo "❌ ERROR: Keycloak not available after 5 minutes"
    exit 1
  fi
done

# Get admin token
echo "🔑 Getting admin token..."
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/auth/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER" \
  -d "password=$ADMIN_PASSWORD" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | \
  sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ ERROR: Failed to get admin token"
  exit 1
fi

echo "✅ Admin token obtained"

# Reset user password
echo "🔐 Resetting password for user ichub-admin..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$KEYCLOAK_URL/auth/admin/realms/$REALM_NAME/users/$TARGET_USER_ID/reset-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"password\",\"value\":\"$NEW_PASSWORD\",\"temporary\":false}")

if [ "$HTTP_STATUS" = "204" ]; then
  echo "✅ Password reset successfully!"
  echo ""
  echo "🎉 Login credentials:"
  echo "   Username: ichub-admin"
  echo "   Password: $NEW_PASSWORD"
  echo ""
else
  echo "❌ ERROR: Failed to reset password (HTTP $HTTP_STATUS)"
  exit 1
fi
