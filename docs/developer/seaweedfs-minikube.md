<!--
Eclipse Tractus-X - Industry Core Hub

Copyright (c) 2026 Contributors to the Eclipse Foundation

See the NOTICE file(s) distributed with this work for additional
information regarding copyright ownership.

This work is made available under the terms of the
Creative Commons Attribution 4.0 International (CC-BY-4.0) license,
which is available at
https://creativecommons.org/licenses/by/4.0/legalcode.

SPDX-License-Identifier: CC-BY-4.0
-->

# SeaweedFS on Minikube (local S3-compatible storage)

The Industry Core Hub Helm chart bundles [SeaweedFS](https://github.com/seaweedfs/seaweedfs) as an
optional, disabled-by-default dependency (`seaweedfs.enabled`). It provides a lightweight,
single-node S3-compatible object store so `backend.configuration.provider.submodel_dispatcher`
can run in `s3` mode locally, without any external cloud dependency. Production/AWS S3 usage is
unaffected: `endpoint_url` stays unset and boto3 talks to real AWS S3 as before.

## Prerequisites

- Minikube running with a default StorageClass (`minikube addons enable default-storageclass storage-provisioner` if needed)
- `kubectl` and `helm` (3.2.0+) configured against the Minikube context
- Python 3.12+ with `ichub-backend/requirements.txt` installed (for the integration tests)

## 1. Fetch the pinned SeaweedFS chart dependency

```bash
helm dependency update charts/industry-core-hub
```

## 2. Lint and render the chart with Minikube values

```bash
helm lint charts/industry-core-hub \
  -f charts/industry-core-hub/values-local-deployment.yaml \
  -f charts/industry-core-hub/values-minikube.yaml

helm template ichub charts/industry-core-hub \
  -f charts/industry-core-hub/values-local-deployment.yaml \
  -f charts/industry-core-hub/values-minikube.yaml \
  --namespace ichub
```

## 3. Install/upgrade on Minikube

```bash
kubectl create namespace ichub --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install ichub charts/industry-core-hub \
  -f charts/industry-core-hub/values-local-deployment.yaml \
  -f charts/industry-core-hub/values-minikube.yaml \
  --namespace ichub --wait --timeout 10m
```

This deploys a single SeaweedFS master, volume server and filer, with the S3 gateway enabled on
port 8333 and S3 authentication turned on. The backend picks up the credentials from the
`ichub-seaweedfs-s3-credentials` Secret via the `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
environment variables (boto3's standard credential chain), and connects through the internal
service DNS name `ichub-seaweedfs-s3.ichub.svc.cluster.local:8333`.

## 4. Run the bundled Helm test

Verifies SeaweedFS becomes ready and exercises create-bucket / upload / download / content
validation / delete / cleanup against the S3 gateway:

```bash
helm test ichub --namespace ichub --logs
```

## 5. Port-forward the S3 gateway for local tooling / integration tests

```bash
kubectl port-forward -n ichub svc/ichub-seaweedfs-s3 8333:8333
```

Keep this running in a separate terminal while you run the Python integration tests below.

## 6. Run the Python S3 integration tests

The integration tests in `ichub-backend/tests/managers/enablement_services/` are environment-driven
and skip automatically when no S3-compatible endpoint is reachable:

```bash
cd ichub-backend

# PowerShell
$env:S3_ENDPOINT_URL = "http://localhost:8333"
$env:S3_REGION = "us-east-1"
$env:S3_ACCESS_KEY = "ichub-admin"
$env:S3_SECRET_KEY = "ichub-local-dev-secret"
$env:S3_BUCKET_NAME = "ichub-submodels"

# bash
export S3_ENDPOINT_URL=http://localhost:8333
export S3_REGION=us-east-1
export S3_ACCESS_KEY=ichub-admin
export S3_SECRET_KEY=ichub-local-dev-secret
export S3_BUCKET_NAME=ichub-submodels

pytest tests/managers/enablement_services/test_seaweedfs_integration.py \
       tests/managers/enablement_services/test_seaweedfs_frontend_s3_adapter.py -v -m seaweedfs
```

These tests create and clean up their own buckets/objects; unit tests elsewhere in the suite do
not depend on SeaweedFS and are unaffected (run `pytest -m "not seaweedfs"` to skip them entirely).

## 7. Cleanup

```bash
helm uninstall ichub --namespace ichub
kubectl delete namespace ichub
```

Deleting the namespace also removes the SeaweedFS PersistentVolumeClaims created for this
Minikube deployment.
