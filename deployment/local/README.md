# Local ICHub Deployment - Quick Start Guide

This directory contains scripts and charts for deploying a complete local development environment including Industry Core Hub instances and the full Tractus-X ecosystem.

## 🚀 Quick Start

### Prerequisites

- Docker Desktop running
- For local development: Use the `--setup-minikube` option (recommended)
- OR: kubectl configured (connected to your cluster) + Helm 3.x installed

### 1. Easy Installation with Minikube (Recommended)

```bash
# One-command setup: installs minikube, builds images, and deploys everything
./install.sh --setup-minikube

# With verbose output to see what's happening
./install.sh --setup-minikube --verbose
```

### 2. Manual Installation

```bash
# Simple installation (will check for Docker images)
./install.sh

# Build images and install in one command
./install.sh --build-images

# Install with verbose output
./install.sh --verbose --build-images
```

### 3. Access the Applications

After installation, use port-forwarding to access the applications locally:

```bash
# Manufacturer ICHub Frontend
kubectl port-forward svc/ichub-local-industry-core-hub-manufacturer-frontend 8080:8080 -n ichub-local

# Supplier ICHub Frontend
kubectl port-forward svc/ichub-local-industry-core-hub-supplier-frontend 8081:8080 -n ichub-local
```

Then open in your browser:

- Manufacturer ICHub: <http://localhost:8080>
- Supplier ICHub: <http://localhost:8081>

### 4. Clean Up

```bash
# Remove everything
./uninstall.sh

# Keep persistent data (databases)
./uninstall.sh --keep-pvcs

# See what would be removed without actually removing
./uninstall.sh --dry-run
```

## 📁 Project Structure

```text
deployment/local/
├── install.sh                    # Main installation script
├── uninstall.sh                  # Cleanup script
├── README.md                     # This file
└── charts/
    └── local-ichub/               # Main local ichub chart
        ├── Chart.yaml             # Chart definition with dependencies
        ├── values.yaml            # Configuration values
        └── charts/                # Downloaded dependencies
```

## 🏗️ What Gets Deployed

### Industry Core Hub Instances

- **Manufacturer ICHub** (BPNL00000003CRHK)
  - Frontend: Local image (industry-core-hub-frontend:local)
  - Backend: Local image (industry-core-hub-backend:local)
  - Connected to manufacturer-connector and manufacturer-dtr

- **Supplier ICHub** (BPNL0000000093Q7)
  - Frontend: Local image (industry-core-hub-frontend:local)
  - Backend: Local image (industry-core-hub-backend:local)
  - Connected to supplier-connector and supplier-dtr

### Tractus-X Infrastructure

- **Connectors**: manufacturer-connector, supplier-connector
- **Digital Twin Registries**: manufacturer-dtr, supplier-dtr
- **Discovery Services**: discovery-finder, bpn-discovery, discovery-service
- **Portal**: Tractus-X Portal for administration
- **Keycloak**: Identity and access management
- **PostgreSQL**: Database backend for all services
- **HashiCorp Vault**: Secrets management

### Network & Access

- All services configured with proper ingress (using .tx.test domains)
- Port-forwarding available for local access to ICHub frontends
- Simplified authentication for development

### Authentication

- Simplified authentication for development
- Pre-configured users and permissions
- Keycloak integration for SSO

### Policies & Governance

- Complete policy configurations for data consumption
- DTR governance configurations
- Connector policy enforcement

## 🔧 Advanced Usage

### Building Docker Images

If you need to rebuild the Docker images:

```bash
# From project root
cd ichub-frontend
docker build -t industry-core-hub-frontend:local .

cd ../ichub-backend
docker build -t industry-core-hub-backend:local .
```

### Debugging

#### View logs

```bash
# Manufacturer Backend logs
kubectl logs -f deployment/ichub-local-industry-core-hub-manufacturer-backend -n ichub-local

# Supplier Frontend logs
kubectl logs -f deployment/ichub-local-industry-core-hub-supplier-frontend -n ichub-local
```

#### Port forwarding for debugging

```bash
# Frontend applications
kubectl port-forward svc/ichub-local-industry-core-hub-manufacturer-frontend 8080:8080 -n ichub-local
kubectl port-forward svc/ichub-local-industry-core-hub-supplier-frontend 8081:8080 -n ichub-local

# Backend APIs (for testing/debugging)
kubectl port-forward svc/ichub-local-industry-core-hub-manufacturer-backend 8000:8000 -n ichub-local
kubectl port-forward svc/ichub-local-industry-core-hub-supplier-backend 8001:8000 -n ichub-local
```

### Customization

#### Namespace and Release Name

```bash
# Custom namespace
./install.sh --namespace my-ichub

# Custom release name
./install.sh --release my-release

# Both
./install.sh --namespace my-ichub --release my-release
```

#### Timeout Configuration

```bash
# Increase timeout for slower systems
./install.sh --timeout 30m
```

#### Skip Checks

```bash
# Skip prerequisite checks (advanced users)
./install.sh --skip-checks
```

## 🐛 Troubleshooting

### Common Issues

1. **Docker images not found**: Use `--build-images` or build them manually
2. **kubectl not connected**: Use `--setup-minikube` or configure kubectl manually
3. **Port conflicts**: Modify the port-forward commands to use different local ports
4. **Docker memory insufficient**:
   - Increase Docker Desktop memory allocation (Settings → Resources → Memory)
   - Recommended: 8GB+ for smooth operation
   - If you get "Docker Desktop has only XXXMB memory" error, try: `minikube delete && ./install.sh --setup-minikube`
5. **Minikube startup issues**:
   - Delete existing cluster: `minikube delete`
   - Start fresh: `./install.sh --setup-minikube`
   - For persistent issues: `minikube delete --all && ./install.sh --setup-minikube`

### Logs and Status

```bash
# Check pod status
kubectl get pods -n ichub-local

# Check service status
kubectl get svc -n ichub-local

# View events
kubectl get events -n ichub-local --sort-by='.lastTimestamp'
```

## 📝 Configuration

- All configuration is in `charts/local-ichub/values.yaml`
- Modify ICHub-specific settings in the respective sections
- See `charts/local-ichub/values.yaml` for detailed configuration options
- Changes require reinstallation: `./uninstall.sh && ./install.sh`

## 🤝 Contributing

If you encounter issues or have improvements:

1. Check existing issues in the repository
2. Create detailed bug reports with logs
3. Submit pull requests with fixes or enhancements

---

For more details, see the main project documentation in the repository root.
