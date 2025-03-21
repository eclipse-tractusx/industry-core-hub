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

# Stage 1: Build the React app
FROM node:23-alpine AS builder

# Copy package files and install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts

# Copy the rest of the source code
COPY . /app

# Set the working directory
WORKDIR /app

# Build the application
RUN yarn build


# Stage 2: Serve the app with Nginx
FROM nginxinc/nginx-unprivileged:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Change to root user
USER root

# Rename index.html to index.html.reference, to be used by env variables inject script
# Create symlink for tmp for index.html to enable readOnlyRootFilesystem
RUN mv /usr/share/nginx/html/index.html /usr/share/nginx/html/index.html.reference \
    && ln -s /tmp/index.html /usr/share/nginx/html/index.html

# Add env variables inject script and mark as executable
# Make nginx owner of /usr/share/nginx/html/ and change to nginx user
COPY ./scripts/inject-dynamic-env.sh /docker-entrypoint.d/00-inject-dynamic-env.sh
RUN chmod +x /docker-entrypoint.d/00-inject-dynamic-env.sh \ 
    && chown -R 101:101 /usr/share/nginx/html/

# Change to nginx user
USER 101

# Expose port 80
EXPOSE 80

# Healthcheck to verify Nginx is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
