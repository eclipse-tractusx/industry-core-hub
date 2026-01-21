#!/bin/sh
###############################################################
# Eclipse Tractus-X - Industry Core Hub
#
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
REALM_FILE="/realm-template.json"

if [ ! -f "$REALM_FILE" ]; then
    echo "ERROR: Realm template not found at $REALM_FILE"
    exit 1
fi

echo "Found realm template at: $REALM_FILE"

# Install Python (no additional packages needed - using stdlib)
apk add --no-cache python3

# Export REALM_FILE for Python script
export REALM_FILE

# Generate password hash and update realm template
python3 <<'PYTHON_SCRIPT'
import json
import os
import base64
import sys

try:
    # Get the realm file path from environment
    realm_file = os.environ.get('REALM_FILE', '/realm-data/realm-export.json')
    print(f"Reading realm template from: {realm_file}")
    
    # Read the realm template from the shared volume
    with open(realm_file, 'r') as f:
        realm_data = json.load(f)

    # Get password from environment (default if not set)
    password = os.environ.get('ICHUB_ADMIN_PASSWORD', 'changeme')
    print(f"Using password from environment (length: {len(password)})")

    # Generate PBKDF2-SHA512 hash manually (Keycloak's default algorithm)
    # Keycloak uses 210,000 iterations for PBKDF2-SHA512
    import hashlib
    import os as os_module
    
    # Generate random salt (16 bytes)
    salt = os_module.urandom(16)
    
    # Generate PBKDF2-SHA512 hash
    password_bytes = password.encode('utf-8')
    hash_bytes = hashlib.pbkdf2_hmac('sha512', password_bytes, salt, 210000)
    
    # Encode to standard Base64 (with padding)
    salt_b64 = base64.b64encode(salt).decode('utf-8')
    hash_b64 = base64.b64encode(hash_bytes).decode('utf-8')
    
    # Prepare the secretData JSON structure for Keycloak
    secret_data = {
        "value": hash_b64,
        "salt": salt_b64,
        "additionalParameters": {}
    }

    # Update the user credentials
    users_updated = 0
    for user in realm_data.get('users', []):
        if user.get('username') == 'ichub-admin':
            for cred in user.get('credentials', []):
                if cred.get('type') == 'password':
                    cred['secretData'] = json.dumps(secret_data)
                    users_updated += 1

    if users_updated == 0:
        print("WARNING: No ichub-admin user credentials were updated")
    else:
        print(f"Updated {users_updated} user credential(s)")

    # Write the processed realm to the output volume
    with open('/output/realm-export.json', 'w') as f:
        json.dump(realm_data, f, indent=2)

    print("Password hash generated and realm template processed successfully")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
PYTHON_SCRIPT

echo "Realm template ready for import"
