<!--
Eclipse Tractus-X - Industry Core Hub

Copyright (c) 2026 LKS Next
Copyright (c) 2026 Contributors to the Eclipse Foundation

See the NOTICE file(s) distributed with this work for additional
information regarding copyright ownership.

This work is made available under the terms of the
Creative Commons Attribution 4.0 International (CC-BY-4.0) license,
which is available at
https://creativecommons.org/licenses/by/4.0/legalcode.

SPDX-License-Identifier: CC-BY-4.0
-->

# Quickstart Guide

Get up and running with Industry Core Hub in about 30-45 minutes. This guide walks you through setting up the application, creating your first digital twin, and consuming data from a partner.

## What's Covered

- Deploy locally (fast) or on Kubernetes (production-ready)
- Configure EDC and Digital Twin Registry connections
- Create a catalog part and add data
- Generate and share digital twins
- Discover and consume partner data

## What You Need

**For any setup:**
- A running EDC (Eclipse Dataspace Connector) - control and data planes
- A Digital Twin Registry instance
- Your organization's BPN (Business Partner Number)
- Basic familiarity with REST APIs and JSON

**For local setup:**
- Python 3.12+
- Node.js 18+ with npm
- PostgreSQL 16+ (or Docker)
- Git

**For Kubernetes:**
- A Kubernetes cluster (Minikube, k3s, or cloud)
- kubectl configured
- Helm 3.2.0+
- 4+ CPU cores and 16GB RAM

**Optional:** If you don't have EDC and DTR running, use the [Umbrella deployment guide](./umbrella/umbrella-deployment-guide.md) to set those up first.

## Choose Your Setup

### Local Setup (Recommended for Getting Started)

Fastest way to get running - about 10 minutes.

#### Clone the Repository

```bash
git clone https://github.com/eclipse-tractusx/industry-core-hub.git
cd industry-core-hub
```

#### Setup the Database

**With Docker (easiest):**

```bash
cd deployment/local/docker-compose
docker-compose up -d
```

This gives you PostgreSQL on localhost:5432 with username `user`, password `password`, and database `ichub`.

Alternatively, install PostgreSQL locally and create an `ichub` database.

#### Run the Backend

```bash
cd ichub-backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Configure the backend** by editing `config/configuration.yml`:

```yaml
authorization:
  enabled: true
  apiKey:
    key: "X-Api-Key"
    value: "your-secure-api-key-here"  # Change this!

database:
  # Connection details are auto-detected from DATABASE_URL environment variable
  echo: false
  timeout: 8
  retry_interval: 5

provider:
  connector:
    controlplane:
      hostname: "https://your-edc-control-plane.example.com"
      apiKey: "your-edc-api-key"
      apiKeyHeader: "X-Api-Key"
      managementPath: "/management"
      protocolPath: "/api/v1/dsp"
    dataplane:
      hostname: "https://your-edc-data-plane.example.com"
      publicPath: "/api/public"
  
  digitalTwinRegistry:
    hostname: "https://your-dtr.example.com"
    apiPath: "/api/v3"
    uri: "/semantics/registry"

consumer:
  connector:
    controlplane:
      hostname: "https://consumer-edc-control-plane.example.com"
      apiKey: "consumer-edc-api-key"
      apiKeyHeader: "X-Api-Key"
      catalogPath: "/catalog"
      managementPath: "/management"
      protocolPath: "/api/v1/dsp"
  
  discovery:
    discovery_finder:
      url: "https://discovery-finder.example.com/api/v1.0/administration/connectors/discovery/search"
    oauth:
      url: "https://central-idp.example.com/auth/"
      realm: "CX-Central"
      client_id: "your-client-id"
      client_secret: "your-client-secret"
```

**Set database connection:**

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/ichub"
```

**Run the backend:**

```bash
python main.py --host 0.0.0.0 --port 8000
```

The backend is now running at http://localhost:8000. Check the Swagger UI at http://localhost:8000/docs to explore the API.

#### Run the Frontend

Open a new terminal:

```bash
cd ichub-frontend

# Install dependencies
npm install
```

**Update `index.html`** with your configuration:

```html
<script>
    const ENV = {
        REQUIRE_HTTPS_URL_PATTERN: "false",
        ICHUB_BACKEND_URL: "http://localhost:8000"
        PARTICIPANT_ID: "BPNL....."
    }
</script>
```

**Run the frontend:**

```bash
npm run dev
```

Frontend runs at http://localhost:5173. You're all set!

---

### Kubernetes Setup (Production-Ready)

For a production-like environment.

Make sure you have EDC, Digital Twin Registry, and optionally Keycloak running first. See the [Umbrella Deployment Guide](./umbrella/umbrella-deployment-guide.md) if you need to set those up.

#### Add the Helm Repository

```bash
helm repo add tractusx-dev https://eclipse-tractusx.github.io/charts/dev
helm repo update
```

#### Prepare Your Values File

Create `my-values.yaml`:

```bash
cp charts/industry-core-hub/values.yaml my-values.yaml
```

Then update it with your configuration:

```yaml
backend:
  configuration:
    authorization:
      enabled: true
      apiKey:
        key: "X-Api-Key"
        value: "your-secure-api-key"
    
    provider:
      connector:
        controlplane:
          hostname: "https://your-edc-control.example.com"
          apiKey: "your-edc-api-key"
          apiKeyHeader: "X-Api-Key"
          managementPath: "/management"
          protocolPath: "/api/v1/dsp"
        dataplane:
          hostname: "https://your-edc-dataplane.example.com"
          publicPath: "/api/public"
      
      digitalTwinRegistry:
        hostname: "https://your-dtr.example.com"
        apiPath: "/api/v3"
        uri: "/semantics/registry"
    
    consumer:
      connector:
        controlplane:
          hostname: "https://consumer-edc.example.com"
          apiKey: "consumer-edc-api-key"
      discovery:
        discovery_finder:
          url: "https://discovery-finder.example.com/api/v1.0/administration/connectors/discovery/search"
        oauth:
          url: "https://central-idp.example.com/auth/"
          realm: "CX-Central"
          client_id: "your-client-id"
          client_secret: "your-client-secret"

  ingress:
    enabled: true
    className: "nginx"
    hosts:
      - host: "ichub-backend.example.com"
        paths:
          - path: "/"
            pathType: ImplementationSpecific

frontend:
  ingress:
    enabled: true
    className: "nginx"
    hosts:
      - host: "ichub.example.com"
        paths:
          - path: "/"
            pathType: ImplementationSpecific

postgresql:
  enabled: true
  auth:
    password: "change-me-in-production"
    database: "ichub"
```

#### Install the Helm Chart

```bash
helm install industry-core-hub tractusx-dev/industry-core-hub \
  -f my-values.yaml \
  --namespace ichub \
  --create-namespace
```

#### Verify It's Running

```bash
# Check pod status
kubectl get pods -n ichub

# Check services
kubectl get svc -n ichub

# Check ingress
kubectl get ingress -n ichub
```

Once all pods show `Running`, you're good to go.

#### Access the Application

If using Minikube:

```bash
minikube service industry-core-hub-frontend -n ichub
```

Or use your configured ingress hostname.

---

## Next Steps

Great! Your instance is running. Now you're ready to start working with parts and data.

For detailed workflows on creating and sharing digital products, managing partners, and consuming data from other organizations, see these guides:

- **[Part Management Guide](./user/PART_MANAGEMENT_GUIDE.md)** - Create catalog and serialized parts
- **[Partner Management Guide](./user/PARTNER_MANAGEMENT_GUIDE.md)** - Connect with business partners
- **[Data Sharing Guide](./user/DATA_SHARING_GUIDE.md)** - Share data via EDC contracts

---

## Having Issues?

Here's how to debug common problems.

### Backend Won't Start

Getting Python errors? Make sure you're in the virtual environment:

```bash
source venv/bin/activate
pip install -r requirements.txt --force-reinstall
```

Database connection errors? Check PostgreSQL is running:

```bash
docker ps  # if using Docker
psql $DATABASE_URL -c "SELECT 1"  # test connection
```

### Frontend Issues

Can't connect to backend? 
- Check `ICHUB_BACKEND_URL` in `index.html`
- Make sure the backend is running on the right port
- Look at browser console for CORS errors

Module errors?

```bash
rm -rf node_modules package-lock.json
npm install
```

### EDC Connection Issues

Can't reach EDC? 
- Verify the URLs work: `curl https://your-edc.example.com/management/v3/assets`
- Check your API keys
- Make sure your network can reach EDC
- Verify TLS certificates

### DTR Issues

Can't reach Digital Twin Registry?
- Check the URL and API path
- Verify your credentials
- Test the connection: `curl https://your-dtr.example.com/api/v3/shell-descriptors`

### Kubernetes Pods Won't Start

Check what's wrong:

```bash
kubectl logs -n ichub <pod-name>
kubectl describe pod -n ichub <pod-name>
```

Common issues:
- Wrong configuration in values.yaml
- Not enough CPU/memory
- Can't pull the image

### Need Help?

- Check existing [GitHub Issues](https://github.com/eclipse-tractusx/industry-core-hub/issues)
- Ask in [GitHub Discussions](https://github.com/eclipse-tractusx/industry-core-hub/discussions)
- Come to [Community Office Hours](https://eclipse-tractusx.github.io/community/open-meetings/)
- [Create a new issue](https://github.com/eclipse-tractusx/industry-core-hub/issues/new/choose) if you can't find your problem

---

## Feedback

We'd love to hear from you. Let us know if this guide was helpful or if you hit any issues in our [GitHub Discussions](https://github.com/eclipse-tractusx/industry-core-hub/discussions) or [Issues](https://github.com/eclipse-tractusx/industry-core-hub/issues).

---

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 LKS Next
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
