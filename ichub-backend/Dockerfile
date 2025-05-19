#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
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


FROM alpine:3.21

USER root

## Move all the files from the project to the sdk directory
COPY ./ /industry-core-hub

## Create user groups
RUN addgroup -g 10001 appgroup \
	&& adduser -u 10000 -g 10001 -h /home/nonroot -D nonroot

WORKDIR /industry-core-hub

## List the contents of the /backend directory
RUN ls -la

## Install Python
RUN apk add python3 py3-pip libpq gettext --no-cache

## Install application requirements
RUN pip3 install --break-system-packages --no-cache-dir -r ./requirements.txt

## Specify the volumes
VOLUME ./data ./logs

## Create the directories
RUN mkdir -p ./logs
RUN mkdir -p ./data
RUN mkdir -p ./data/submodels

## Update user permissions
RUN chown -R 10000:10001 /industry-core-hub && chmod -R 775 /industry-core-hub/

## Set entrypoint to executable
#RUN chmod +x /industry-core-hub/entrypoint.sh

# Rename configuration.yml to configuration.yml.reference, to be used by env variables inject script
# Create symlink for tmp for configuration.yml to enable readOnlyRootFilesystem
#RUN mv /industry-core-hub/config/configuration.yml /tmp/configuration.yml.reference \
    #&& ln -s /tmp/configuration.yml /industry-core-hub/config/configuration.yml

# Same for logging.yml, but as we don't need to inject env variables, we can just copy it
# and create the symlink
#RUN mv /industry-core-hub/config/logging.yml /tmp/logging.yml \
    #&& ln -s /tmp/logging.yml /industry-core-hub/config/logging.yml

## If necessary to inject documentation do it here:
# COPY ./resources/docs/* ./resources/docs

## Choose the user
USER 10000:10001 

## Expose default port
EXPOSE 8000

## Execute the application
CMD ["python3","./main.py", "--host", "0.0.0.0", "--port", "8000"]
