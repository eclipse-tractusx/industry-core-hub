#!/bin/sh

#################################################################################
# Eclipse Tractus-X - Industry Core Hub Frontend
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
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

source_file=${source_file:-/usr/share/nginx/html/index.html.reference}
target_file=${target_file:-/tmp/index.html}

# List of environment variables to be replaced as strings
# (They should be set and match the ones in index.html)
# Sequence is irrelevant
string_vars=" \
ICHUB_BACKEND_URL \
PARTICIPANT_ID \
REQUIRE_HTTPS_URL_PATTERN \
APP_ENVIRONMENT \
APP_VERSION \
API_TIMEOUT \
API_RETRY_ATTEMPTS \
API_KEY \
API_KEY_HEADER \
ENABLE_API_KEY_ROTATION \
API_KEY_EXPIRY_WARNING_DAYS \
AUTH_ENABLED \
AUTH_PROVIDER \
AUTH_SESSION_TIMEOUT \
AUTH_RENEW_TOKEN_MIN_VALIDITY \
AUTH_LOGOUT_REDIRECT_URI \
KEYCLOAK_URL \
KEYCLOAK_REALM \
KEYCLOAK_CLIENT_ID \
KEYCLOAK_ON_LOAD \
KEYCLOAK_CHECK_LOGIN_IFRAME \
KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI \
KEYCLOAK_PKCE_METHOD \
KEYCLOAK_ENABLE_LOGGING \
KEYCLOAK_MIN_VALIDITY \
KEYCLOAK_CHECK_LOGIN_IFRAME_INTERVAL \
KEYCLOAK_FLOW \
ENABLE_ADVANCED_LOGGING \
ENABLE_PERFORMANCE_MONITORING \
ENABLE_DEV_TOOLS \
UI_THEME \
UI_LOCALE \
UI_COMPACT_MODE \
GOVERNANCE_API_URL \
GOVERNANCE_TIMEOUT \
GOVERNANCE_RETRY_ATTEMPTS \
PARTICIPANT_API_URL \
PARTICIPANT_TIMEOUT \
PARTICIPANT_RETRY_ATTEMPTS \
NOTIFICATIONS_POLL_INTERVAL \
"

# List of environment variables to be replaced as JSON objects
json_vars=" \
GOVERNANCE_CONFIG \
DTR_POLICIES_CONFIG \
"

# Start by removing javascript comments from source file
sed 's@^\s*//.*@@g' "${source_file}" > "${target_file}"

# Process string variables (wrapped in quotes)
# Only replaces value if the env var is set and non-empty, preserving index.html defaults otherwise
# Uses awk instead of sed to avoid delimiter conflicts with special characters in values
set -- $string_vars
while [ -n "$1" ]; do
  var=$1
  eval "_env_val=\"\${${var}}\""
  if [ -n "${_env_val}" ]; then
    # Use awk to safely replace: VAR_NAME: "old_value" -> VAR_NAME: "new_value"
    # awk avoids sed delimiter issues with @, /, #, etc. in values
    awk -v varname="${var}" -v varval="${_env_val}" '
    {
      pattern = varname ":[[:space:]]*\"[^\"]*\""
      replacement = varname ": \"" varval "\""
      pos = match($0, pattern)
      if (pos > 0) {
        print substr($0, 1, pos - 1) replacement substr($0, pos + RLENGTH)
      } else {
        print
      }
    }' "${target_file}" > "${target_file}.tmp" && mv "${target_file}.tmp" "${target_file}"
  fi
  shift
done

# Process JSON variables (not wrapped in quotes)
# Uses awk to safely handle JSON values containing @, /, #, and other special chars
set -- $json_vars
while [ -n "$1" ]; do
  var=$1
  eval "_env_val=\"\${${var}}\""
  # Set default empty array if variable is empty or undefined
  if [ -z "${_env_val}" ]; then
    _env_val='[]'
  fi
  # Use awk to replace: VAR_NAME: "old_value" -> VAR_NAME: new_json_value
  awk -v varname="${var}" -v varval="${_env_val}" '
  {
    pattern = varname ":[[:space:]]*\"[^\"]*\""
    replacement = varname ": " varval
    pos = match($0, pattern)
    if (pos > 0) {
      print substr($0, 1, pos - 1) replacement substr($0, pos + RLENGTH)
    } else {
      print
    }
  }' "${target_file}" > "${target_file}.tmp" && mv "${target_file}.tmp" "${target_file}"
  shift
done

echo "Variables injected correctly in $target_file"