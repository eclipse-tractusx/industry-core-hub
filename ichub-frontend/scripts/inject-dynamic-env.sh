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

source_file=/usr/share/nginx/html/index.html.reference
target_file=/tmp/index.html

# List of environment variables to be replaced
# (They should be set and match the ones in index.html)
# Sequence is irrelevant
vars=" \
REQUIRE_HTTPS_URL_PATTERN \
ICHUB_BACKEND_URL \
GOVERNANCE_CONFIG \
"

# base sed command: output source file and remove javascript comments
sed_command="cat ${source_file} | sed -e \"s@^\\\s*//.*@@g\""

set -- $vars
while [ -n "$1" ]; do
  var=$1
  # add a replace expression for each variable
  sed_command="${sed_command} -e \"s@${var}:\s*\\\".*\\\"@${var}: \\\"\${${var}}\\\"@g\""
  shift
done

# execute the built replace command and write to target file
echo ${sed_command} | sh > ${target_file}

echo "Variables injected correctly in $target_file"