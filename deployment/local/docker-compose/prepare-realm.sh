#!/bin/sh
###############################################################
# Eclipse Tractus-X - Industry Core Hub
#
# Copyright (c) 2026 Technovative Solutions
# Copyright (c) 2026 LKS Next
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
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
###############################################################

set -e

echo "Preparing realm import with password hash..."

# Check if realm template file exists
if [ ! -f "$REALM_TEMPLATE_FILE" ]; then
    echo "ERROR: Realm template not found at $REALM_TEMPLATE_FILE"
    exit 1
fi

echo "Found realm template at: $REALM_TEMPLATE_FILE"

# Install PyYAML for YAML parsing (python:3.11-alpine already includes Python and pip)
pip install --quiet pyyaml

# Inject users from values-keycloak.yaml and hash their passwords
python3 <<'PYTHON_SCRIPT'
import json
import os
import base64
import hashlib
import sys
import yaml

try:
    realm_template_file = os.environ.get('REALM_TEMPLATE_FILE', '/realm-template.json')
    values_file = os.environ.get('KEYCLOAK_VALUES_FILE', '/keycloak-values.yaml')

    print(f"Reading realm template from: {realm_template_file}")
    with open(realm_template_file, 'r') as f:
        realm_data = json.load(f)

    print(f"Reading Keycloak values from: {values_file}")
    with open(values_file, 'r') as f:
        values = yaml.safe_load(f)

    yaml_users = values.get('keycloak', {}).get('ichubRealm', {}).get('users', [])
    if not yaml_users:
        print("ERROR: No users found at keycloak.ichubRealm.users in values file")
        sys.exit(1)

    print(f"Found {len(yaml_users)} user(s) in values file")

    def build_credential(password):
        salt = os.urandom(16)
        hash_bytes = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt, 210000)
        salt_b64 = base64.b64encode(salt).decode('utf-8')
        hash_b64 = base64.b64encode(hash_bytes).decode('utf-8')
        secret_data = json.dumps({"value": hash_b64, "salt": salt_b64, "additionalParameters": {}})
        credential_data = json.dumps({"hashIterations": 210000, "algorithm": "pbkdf2-sha512", "additionalParameters": {}})
        return {"type": "password", "secretData": secret_data, "credentialData": credential_data}

    # Keycloak protocol mappers read lowercase attribute keys (bpn, bpns), but the
    # values file uses uppercase (BPN, BPNS). Normalize here so the claims are populated.
    # This mirrors the Helm configmap-realm-data.yaml rename logic.
    ATTRIBUTE_KEY_MAP = {"BPN": "bpn", "BPNS": "bpns"}

    def normalize_attributes(attrs):
        if not attrs:
            return {}
        normalized = {}
        for key, value in attrs.items():
            normalized_key = ATTRIBUTE_KEY_MAP.get(key, key)
            # Keycloak stores every user attribute as a list of strings
            normalized[normalized_key] = value if isinstance(value, list) else [value]
        return normalized

    kc_users = []
    for user in yaml_users:
        password = user.get('password', 'changeme')
        kc_users.append({
            "username": user["username"],
            "email": user.get("email", ""),
            "firstName": user.get("firstName", ""),
            "lastName": user.get("lastName", ""),
            "emailVerified": user.get("emailVerified", False),
            "enabled": user.get("enabled", True),
            "credentials": [build_credential(password)],
            "disableableCredentialTypes": [],
            "requiredActions": [],
            "notBefore": 0,
            "realmRoles": user.get("realmRoles", []),
            "attributes": normalize_attributes(user.get("attributes", {}))
        })
        print(f"Prepared user: {user['username']}")

    realm_data['users'] = kc_users

    admin_found = any(u['username'] == 'ichub-admin' for u in kc_users)
    if not admin_found:
        print("WARNING: ichub-admin user was not found in values file")

    with open('/output/realm-export.json', 'w') as f:
        json.dump(realm_data, f, indent=2)

    print(f"Realm template processed successfully with {len(kc_users)} user(s)")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
PYTHON_SCRIPT

echo "Realm template ready for import"
