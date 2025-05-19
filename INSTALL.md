## Installation Guide

Deploy Industry Core Hub either in a Kubernetes cluster (via Helm) or locally.

### 1. Kubernetes Deployment with Helm

#### Prerequisites

- [Helm](https://helm.sh/)  
- [Minikube](https://minikube.sigs.k8s.io/docs/start/) (for local testing)  
- PV provisioner support in your cluster  

> **Tip:** If using Minikube, run:
> ```sh
> minikube start --cpus=4 --memory=8Gb
> minikube addons enable ingress
> ```

You also need a running DTR and EDC Connector. See the [Umbrella deployment guide](./docs/umbrella/umbrella-deployment-guide.md).

#### 1.1 Prepare `values.yaml`

```sh
cp charts/industry-core-hub/values.yaml ./your-values.yaml
```

Edit `your-values.yaml` under `backend.configuration`:

```yaml
backend:
  configuration:
    authorization:
      enabled: true
      apiKey:
        key: "X-Api-Key"
        value: "<<example>>"
    # -- Database connection config; database connection settings are inferred from postgresql or externalDatabase sections.
    database:
      echo: true
    # -- EDC (Eclipse Dataspace Connector) configuration
      edc:
        controlplane:
          hostname: "https://connector.control.plane"
          apikeyheader: "X-Api-Key"
          apikey: "<<example>>"
          managementpath: "/management"
          protocolPath: "/api/v1/dsp"
          catalogPath: "/catalog"
        dataplane:
          hostname: "https://connector.data.plane"
          publicPath: "/api/public"
    # -- Digital Twin Registry configuration
    digitalTwinRegistry:
      hostname: "https://dataprovider-dtr.tx.test"
      apiPath: "/api/v3"
      # -- Set this to the urlPrefix defined in your DTR values. [Default value](https://github.com/eclipse-tractusx/sldt-digital-twin-registry/blob/cc9c63c12d96e48050a1b24eca022277075cf6c7/charts/registry/values.yaml#L86)
      uri: "/semantics/registry"
      lookup:
        # -- Same as the uri above
        uri: "/semantics/registry"
```

For all chart options, see the [Helm chart README](./charts/industry-core-hub/README.md).

Use kubectl port-forward for localhost access, or set up an Ingress resource (with a controller) in the `values.yaml` to expose your services over HTTP(S).

#### 1.2 Install the Chart

```sh
helm repo add tractusx-dev https://eclipse-tractusx.github.io/
helm repo update
helm install ichub -f your-values.yaml tractusx-dev/industry-core-hub
```

*To use as a dependency in your own chart:*

```yaml
dependencies:
  - name: industry-core-hub
    repository: https://eclipse-tractusx.github.io/industry-core-hub
    version: 0.1.x
```

#### 1.3 Uninstall

```sh
helm uninstall ichub
```

### 2. Local Development

#### 2.1 Backend

##### Prerequisites

* Python ≥ 3.12

##### Setup & Run

```sh
cd ichub-backend/
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Edit [config/configuration.yml](./ichub-backend/config/configuration.yml) with your config

```sh
# run
python -m main --host 0.0.0.0 --port 8000
```

Open the Swagger UI at [http://localhost:8000/docs](http://localhost:8000/docs).

#### 2.2 Frontend

##### Prerequisites

* Node.js & npm

##### Setup & Run

```sh
cd ichub-frontend/
npm install
```

Set on [index.html](./ichub-frontend/index.html) your backend url
```html
<script>
    const ENV = {
        REQUIRE_HTTPS_URL_PATTERN: "false",
        ICHUB_BACKEND_URL: "http://localhost:8000"
    }
</script>
```

Run the frontend
```sh
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173).

## Licenses

- [Apache-2.0](https://raw.githubusercontent.com/eclipse-tractusx/industry-core-hub/main/LICENSE) for code
- [CC-BY-4.0](https://spdx.org/licenses/CC-BY-4.0.html) for non-code

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2025 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub