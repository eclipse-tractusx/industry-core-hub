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
COPY ./ /dataspace-sdk

WORKDIR /dataspace-sdk

## List the contents of the /backend directory
RUN ls -la

## Install Python
RUN apk add python3 py3-pip libpq --no-cache

## Install application requirements
RUN pip3 install --break-system-packages --no-cache-dir -r ./requirements.txt

## Create user groups
RUN addgroup -g 3000 appgroup \
	&& adduser -u 1000 -g 3000 -h /home/nonroot -D nonroot

## Specify the volumes
VOLUME ./data ./logs

## Create the directories
RUN mkdir -p ./logs
RUN mkdir -p ./data

## Update user permissions
RUN chown -R 1000:3000 /dataspace-sdk && chmod -R 775 /dataspace-sdk/

## If necessary to inject documentation do it here:
# COPY ./resources/docs/* ./resources/docs

## Choose the user
USER 1000:3000

## Expose default port
EXPOSE 8000

## Execute the application
CMD ["python3","-m", "ichub_backend.main", "--host", "0.0.0.0", "--port", "8000"]