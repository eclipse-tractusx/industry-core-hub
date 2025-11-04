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

# Set working directory first
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./

# Install dependencies with optimizations for Docker
RUN npm ci --include=dev --ignore-scripts --prefer-offline

# Copy only necessary source files for better caching
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./

# Set production environment for optimized build
ENV NODE_ENV=production

# Build the application with optimized settings
RUN npm run build


# Stage 2: Serve the app with Nginx
FROM nginxinc/nginx-unprivileged:alpine3.21

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Change to root user
USER root

# Update libxml2
RUN apk update && apk add --no-cache libxml2=2.13.9-r0

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

# Expose port 8080
EXPOSE 8080

# Healthcheck to verify Nginx is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:8080 || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
