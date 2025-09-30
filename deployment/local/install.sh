#!/bin/bash

###############################################################
# Eclipse Tractus-X - Industry Core Hub
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
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
###############################################################

# Local ICHub Installation Script
# This script installs the complete local development environment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHART_DIR="$SCRIPT_DIR/charts/local-ichub"
NAMESPACE="umbrella"
RELEASE_NAME="umbrella"
TIMEOUT="10s"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Function to show help
show_help() {
    cat << EOF
Local ICHub Installation Script
===============================

Installs a complete local development environment with:
- Two Industry Core Hub instances (Manufacturer & Supplier) with local Docker images
- Tractus-X umbrella components (connectors, DTRs, Portal, etc.)
- All necessary dependencies (PostgreSQL, Keycloak, Discovery services, etc.)
- Pre-configured connections between ICHub instances and their respective connectors

Usage:
    $0 [OPTIONS]

Options:
    -h, --help          Show this help message
    -n, --namespace     Set the namespace (default: ichub-local)
    -r, --release       Set the release name (default: ichub-local)
    -t, --timeout       Set deployment timeout (default: 10m)
    --build-images      Build Docker images before deployment
    --setup-minikube    Setup minikube cluster automatically (recommended for local dev)
    --minimal           Deploy only ICHub components without umbrella dependencies
    --force-cleanup     Force removal of all existing resources before deployment
    --dry-run           Show what would be deployed without actually deploying
    --skip-checks       Skip prerequisite checks
    --verbose           Enable verbose output

Examples:
    $0                          Install with default settings
    $0 --setup-minikube         Setup minikube and install (recommended)
    $0 --build-images           Build images and install
    $0 -n my-namespace          Install to custom namespace
    $0 --dry-run                Show deployment plan
    $0 --verbose                Install with detailed output

Prerequisites:
    - kubectl configured and connected to your cluster (or use --setup-minikube)
    - helm installed (version 3.x)
    - Docker running (for image building and pulling)
    - Local Docker images: industry-core-hub-frontend:local and industry-core-hub-backend:local
    
Note: Use --setup-minikube for automatic local cluster setup with minikube

EOF
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    local error_count=0
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        ((error_count++))
    else
        log_info "✓ kubectl found: $(kubectl version --client --short 2>/dev/null | head -1)"
    fi
    
    # Check if helm is available
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed or not in PATH"
        ((error_count++))
    else
        log_info "✓ helm found: $(helm version --short 2>/dev/null)"
    fi
    
    # Check kubectl connection (unless we're setting up minikube)
    if [[ "${SETUP_MINIKUBE:-false}" != "true" ]]; then
        if ! kubectl cluster-info &> /dev/null; then
            log_error "kubectl is not connected to a cluster"
            log_info "  Use --setup-minikube to automatically setup a local cluster"
            ((error_count++))
        else
            log_info "✓ kubectl connected to cluster"
        fi
    else
        log_info "⏳ kubectl connection will be setup with minikube"
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        ((error_count++))
    else
        log_info "✓ Docker is running"
    fi
    
    # Check if Docker images exist (unless we're building them)
    if [[ "${BUILD_IMAGES:-false}" != "true" ]]; then
        if ! docker image inspect industry-core-hub-frontend:local >/dev/null 2>&1; then
            log_error "Docker image 'industry-core-hub-frontend:local' not found"
            log_info "  Use --build-images to build it automatically, or build it manually:"
            log_info "  cd ichub-frontend && docker build -t industry-core-hub-frontend:local ."
            ((error_count++))
        else
            log_info "✓ Frontend Docker image found"
        fi
        
        if ! docker image inspect industry-core-hub-backend:local >/dev/null 2>&1; then
            log_error "Docker image 'industry-core-hub-backend:local' not found"
            log_info "  Use --build-images to build it automatically, or build it manually:"
            log_info "  cd ichub-backend && docker build -t industry-core-hub-backend:local ."
            ((error_count++))
        else
            log_info "✓ Backend Docker image found"
        fi
    fi
    
    if [[ $error_count -gt 0 ]]; then
        log_error "Prerequisites check failed with $error_count error(s)"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Function to setup minikube
setup_minikube() {
    log_step "Setting up minikube for local development..."
    
    # Check if minikube is installed
    if ! command -v minikube &> /dev/null; then
        log_info "minikube not found. Installing minikube..."
        
        # Detect OS and install minikube
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &> /dev/null; then
                log_info "Installing minikube via Homebrew..."
                brew install minikube
            else
                log_info "Installing minikube via direct download..."
                curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-amd64
                sudo install minikube-darwin-amd64 /usr/local/bin/minikube
                rm minikube-darwin-amd64
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            log_info "Installing minikube via direct download..."
            curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
            sudo install minikube-linux-amd64 /usr/local/bin/minikube
            rm minikube-linux-amd64
        else
            log_error "Unsupported OS: $OSTYPE"
            log_info "Please install minikube manually: https://minikube.sigs.k8s.io/docs/start/"
            exit 1
        fi
        
        log_success "minikube installed successfully"
    else
        log_info "✓ minikube found: $(minikube version --short 2>/dev/null)"
    fi
    
    # Check minikube status
    if ! minikube status &> /dev/null; then
        log_info "Starting minikube cluster..."
        
        # Get available Docker memory
        docker_memory=$(docker info --format '{{.MemTotal}}' 2>/dev/null || echo "0")
        if [[ $docker_memory -gt 0 ]]; then
            # Convert bytes to MB and use 85% of available memory, max 10GB
            available_mb=$((docker_memory / 1024 / 1024))
            target_memory=$((available_mb * 85 / 100))
            if [[ $target_memory -gt 10240 ]]; then
                target_memory=10240
            fi
            if [[ $target_memory -lt 6144 ]]; then
                target_memory=6144
            fi
            log_info "Detected ${available_mb}MB Docker memory, using ${target_memory}MB for minikube"
        else
            # Fallback to 6GB minimum
            target_memory=6144
            log_info "Using 6GB memory allocation for minikube"
        fi
        
        # Start minikube with dynamic memory allocation and enhanced resources
        log_info "Starting minikube with ${target_memory}MB memory and enhanced resources..."
        if minikube start --driver=docker --cpus=6 --memory=${target_memory} --disk-size=30g; then
            log_success "minikube cluster started with enhanced resources"
        else
            log_error "Failed to start minikube cluster"
            log_info "You may need to:"
            log_info "  1. Increase Docker Desktop memory allocation in settings"
            log_info "  2. Try a smaller memory allocation: minikube start --driver=docker --memory=6144"
            log_info "  3. Delete existing cluster: minikube delete"
            exit 1
        fi
    else
        log_info "✓ minikube cluster is already running"
    fi
    
    # Set kubectl context to minikube
    log_info "Setting kubectl context to minikube..."
    kubectl config use-context minikube
    
    # Verify we're using minikube context
    current_context=$(kubectl config current-context)
    if [[ "$current_context" != "minikube" ]]; then
        log_error "Failed to switch to minikube context. Current context: $current_context"
        exit 1
    fi
    
    log_info "✓ kubectl context set to: $current_context"
    
    # Enable necessary addons
    log_info "Enabling necessary minikube addons..."
    minikube addons enable ingress
    minikube addons enable metrics-server
    
    # Configure Docker environment to use minikube's Docker daemon
    log_info "Configuring Docker environment for minikube..."
    eval $(minikube docker-env)
    log_info "✓ Docker environment configured"
    
    log_success "minikube setup completed"
}

# Function to check Docker Desktop resources
check_docker_resources() {
    log_step "Checking Docker Desktop resources..."
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        return 1
    fi
    
    # Get Docker memory info
    docker_memory=$(docker info --format '{{.MemTotal}}' 2>/dev/null || echo "0")
    if [[ $docker_memory -gt 0 ]]; then
        memory_gb=$((docker_memory / 1024 / 1024 / 1024))
        log_info "Docker Desktop allocated memory: ${memory_gb}GB"
        
        if [[ $memory_gb -lt 6 ]]; then
            log_warning "Docker Desktop has less than 6GB memory allocated"
            log_info "For better performance, consider increasing Docker memory allocation:"
            log_info "  Docker Desktop → Settings → Resources → Memory"
            log_info "  Recommended: 8GB or more"
        else
            log_info "✓ Docker memory allocation looks good"
        fi
    else
        log_warning "Could not determine Docker memory allocation"
    fi
    
    # Get Docker CPU info
    docker_cpus=$(docker info --format '{{.NCPU}}' 2>/dev/null || echo "0")
    if [[ $docker_cpus -gt 0 ]]; then
        log_info "Docker Desktop allocated CPUs: ${docker_cpus}"
        if [[ $docker_cpus -lt 4 ]]; then
            log_warning "Docker Desktop has less than 4 CPUs allocated"
            log_info "For better performance, consider increasing CPU allocation"
        fi
    fi
}

# Function to check for and handle conflicting deployments
check_conflicts() {
    log_step "Checking for conflicting deployments..."
    
    # Check for existing umbrella deployment in umbrella namespace
    if kubectl get namespace umbrella &> /dev/null; then
        log_info "Found existing 'umbrella' namespace - this is normal for Tractus-X deployments"
        
        # Check if there's a helm release in that namespace
        existing_releases=$(helm list -n umbrella -q 2>/dev/null || echo "")
        if [[ -n "$existing_releases" ]]; then
            log_info "Found existing Helm releases in 'umbrella' namespace: $existing_releases"
            log_info "The local ICHub chart will be installed/upgraded as part of the umbrella release."
        fi
    else
        log_info "No existing 'umbrella' namespace found - umbrella components will be created"
    fi
    
    # Check for existing deployment in our target namespace
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        existing_releases=$(helm list -n "$NAMESPACE" -q 2>/dev/null || echo "")
        if [[ -n "$existing_releases" ]]; then
            log_info "Found existing Helm releases in '$NAMESPACE' namespace: $existing_releases"
            if [[ "$existing_releases" == *"$RELEASE_NAME"* ]]; then
                log_info "Release '$RELEASE_NAME' already exists. It will be upgraded."
            fi
        fi
    fi
    
    log_success "Deployment planning completed"
}

# Function to build Docker images
build_images() {
    log_step "Building Docker images..."
    
    # If using minikube, ensure we're using minikube's Docker daemon
    if [[ "${SETUP_MINIKUBE:-false}" == "true" ]] && command -v minikube &> /dev/null; then
        log_info "Using minikube Docker daemon..."
        eval $(minikube docker-env)
    fi
    
    # Build frontend image
    log_info "Building frontend image..."
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        cd "$SCRIPT_DIR/../../ichub-frontend" && docker build -t industry-core-hub-frontend:local .
    else
        cd "$SCRIPT_DIR/../../ichub-frontend" && docker build -t industry-core-hub-frontend:local . > /dev/null 2>&1
    fi
    log_success "Frontend image built successfully"
    
    # Build backend image
    log_info "Building backend image..."
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        cd "$SCRIPT_DIR/../../ichub-backend" && docker build -t industry-core-hub-backend:local .
    else
        cd "$SCRIPT_DIR/../../ichub-backend" && docker build -t industry-core-hub-backend:local . > /dev/null 2>&1
    fi
    log_success "Backend image built successfully"
    
    cd "$SCRIPT_DIR"
}

# Function to create namespace
create_namespace() {
    log_step "Creating namespace '$NAMESPACE'..."
    
    # Create umbrella namespace for all components
    log_info "Creating namespace '$NAMESPACE'..."
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    log_success "Namespace '$NAMESPACE' is ready"
}

# Function to add Helm repositories
add_helm_repos() {
    log_step "Adding Helm repositories..."
    
    # Add Tractus-X repository
    log_info "Adding Tractus-X dev repository..."
    helm repo add tractusx-dev https://eclipse-tractusx.github.io/charts/dev 2>/dev/null || true
    
    # Add Bitnami for PostgreSQL
    log_info "Adding Bitnami repository..."
    helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || true
    
    # Update repositories
    log_info "Updating repositories..."
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        helm repo update
    else
        helm repo update > /dev/null 2>&1
    fi
    
    log_success "Helm repositories updated"
}

# Function to update chart dependencies
update_dependencies() {
    log_step "Updating chart dependencies..."
    
    cd "$CHART_DIR"
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        helm dependency update
    else
        helm dependency update > /dev/null 2>&1
    fi
    
    log_success "Chart dependencies updated"
}

# Function to deploy the local ichub chart
deploy_local_ichub() {
    log_step "Deploying local ichub chart..."
    
    cd "$CHART_DIR"
    
    local helm_args=(
        "upgrade" "--install" "$RELEASE_NAME" "."
        "--namespace" "$NAMESPACE"
        "--create-namespace"
        "--timeout" "$TIMEOUT"
        "--force"
    )
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        helm_args+=("--dry-run")
        log_info "DRY RUN - No actual deployment will occur"
    fi
    
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        helm_args+=("--debug")
    fi
    
    log_info "Deploying with timeout: $TIMEOUT"
    log_info "This may take several minutes..."
    
    # Comprehensive resource conflict resolution
    if [[ "${DRY_RUN:-false}" != "true" ]]; then
        log_info "Implementing DevOps best practices for resource management..."
        
        # If force cleanup is requested, skip strategies and go straight to cleanup
        if [[ "${FORCE_CLEANUP:-false}" == "true" ]]; then
            log_info "Force cleanup requested - removing all existing resources..."
            kubectl delete configmap umbrella-config -n "$NAMESPACE" --force --grace-period=0 2>/dev/null || true
            kubectl delete pvc umbrella-pvc-data-backend umbrella-pvc-logs-backend -n "$NAMESPACE" --force --grace-period=0 2>/dev/null || true
            sleep 3
        else
            # Strategy 1: Attempt Helm upgrade first (preserves data)
            log_info "Strategy 1: Attempting Helm upgrade to preserve existing resources..."
            if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
                log_info "Existing release found - attempting upgrade..."
                
                # Only clean problematic ConfigMaps that can conflict
                kubectl delete configmap umbrella-config -n "$NAMESPACE" --ignore-not-found=true 2>/dev/null || true
                
                # Try upgrade with force flag
                helm upgrade "$RELEASE_NAME" . --namespace "$NAMESPACE" --timeout "$TIMEOUT" --force --debug 2>/dev/null
                if [[ $? -eq 0 ]]; then
                    log_success "Upgrade successful - existing PVCs preserved!"
                    return 0
                else
                    log_info "Upgrade failed, proceeding to Strategy 2..."
                fi
            fi
            
            # Strategy 2: Adopt existing resources
            log_info "Strategy 2: Adopting existing resources to avoid conflicts..."
            
            # Label existing PVCs for Helm adoption
            kubectl label pvc umbrella-pvc-data-backend -n "$NAMESPACE" app.kubernetes.io/managed-by=Helm --overwrite 2>/dev/null || true
            kubectl label pvc umbrella-pvc-logs-backend -n "$NAMESPACE" app.kubernetes.io/managed-by=Helm --overwrite 2>/dev/null || true
            kubectl label pvc umbrella-pvc-data-backend -n "$NAMESPACE" meta.helm.sh/release-name="$RELEASE_NAME" --overwrite 2>/dev/null || true
            kubectl label pvc umbrella-pvc-logs-backend -n "$NAMESPACE" meta.helm.sh/release-name="$RELEASE_NAME" --overwrite 2>/dev/null || true
            kubectl label pvc umbrella-pvc-data-backend -n "$NAMESPACE" meta.helm.sh/release-namespace="$NAMESPACE" --overwrite 2>/dev/null || true
            kubectl label pvc umbrella-pvc-logs-backend -n "$NAMESPACE" meta.helm.sh/release-namespace="$NAMESPACE" --overwrite 2>/dev/null || true
            
            # Clean up ConfigMaps that always conflict
            kubectl delete configmap umbrella-config -n "$NAMESPACE" --ignore-not-found=true 2>/dev/null || true
            
            sleep 2
            
            # Try installation with --replace flag
            helm install "$RELEASE_NAME" . --namespace "$NAMESPACE" --timeout "$TIMEOUT" --replace --force 2>/dev/null
            if [[ $? -eq 0 ]]; then
                log_success "Installation with resource adoption successful!"
                return 0
            else
                log_info "Resource adoption failed, proceeding to Strategy 3..."
            fi
            
            # Strategy 3: Selective cleanup and reinstall
            log_info "Strategy 3: Selective cleanup preserving data volumes..."
            
            # Clean up everything except data PVCs
            log_info "Removing conflicting resources while preserving data..."
            kubectl delete configmap umbrella-config -n "$NAMESPACE" --ignore-not-found=true 2>/dev/null || true
            kubectl delete pvc umbrella-pvc-logs-backend -n "$NAMESPACE" --ignore-not-found=true 2>/dev/null || true  # Logs can be recreated
            
            # Keep data PVC but remove conflicting labels
            kubectl label pvc umbrella-pvc-data-backend -n "$NAMESPACE" app.kubernetes.io/managed-by- --overwrite 2>/dev/null || true
            
            sleep 3
        fi
    fi
    
    # Final deployment attempt with comprehensive error handling
    log_info "Executing final deployment with optimized helm configuration..."
    
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        helm "${helm_args[@]}"
        deployment_result=$?
    else
        helm "${helm_args[@]}" > /dev/null 2>&1
        deployment_result=$?
    fi
    
    # If deployment still fails, try one last aggressive cleanup
    if [[ $deployment_result -ne 0 ]] && [[ "${DRY_RUN:-false}" != "true" ]]; then
        log_info "Deployment failed, attempting final cleanup strategy..."
        
        # Remove all conflicting resources aggressively
        kubectl delete configmap umbrella-config -n "$NAMESPACE" --force --grace-period=0 2>/dev/null || true
        kubectl delete pvc umbrella-pvc-data-backend umbrella-pvc-logs-backend -n "$NAMESPACE" --force --grace-period=0 2>/dev/null || true
        
        # Wait for cleanup
        sleep 5
        
        # Final attempt
        log_info "Final deployment attempt after aggressive cleanup..."
        if [[ "${VERBOSE:-false}" == "true" ]]; then
            helm "${helm_args[@]}"
            deployment_result=$?
        else
            helm "${helm_args[@]}" > /dev/null 2>&1
            deployment_result=$?
        fi
    fi
    
    if [[ $deployment_result -eq 0 ]] && [[ "${DRY_RUN:-false}" != "true" ]]; then
        log_success "Local ichub chart deployed successfully"
        
        # Quick status check instead of long wait
        log_info "Checking deployment status..."
        kubectl get pods -n "$NAMESPACE" --no-headers | head -10
        
        log_info "To monitor deployment progress, use:"
        log_info "  kubectl get pods -n $NAMESPACE -w"
        log_info "  kubectl logs -f deployment/umbrella-manufacturer-ichub-backend -n $NAMESPACE"
    fi
}

# Function to wait for pods to be ready
wait_for_pods() {
    log_step "Waiting for pods to be ready..."
    
    log_info "Waiting for local ichub components..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/managed-by=Helm -n "$NAMESPACE" --timeout=300s || true
    
    log_info "Waiting for ICHub pods..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name~=ichub -n "$NAMESPACE" --timeout=300s || true
    
    log_success "Pod readiness check completed"
}

# Function to display deployment information
show_deployment_info() {
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        return 0
    fi
    
    log_step "Gathering deployment information..."
    
    echo ""
    echo "=========================================="
    echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉"
    echo "=========================================="
    echo ""
    
    # Get NodePort information
    echo "📡 SERVICES & ACCESS POINTS (namespace: $NAMESPACE):"
    kubectl get services -n "$NAMESPACE" -o wide | grep -E "(NodePort|LoadBalancer)" || echo "No NodePort/LoadBalancer services found"
    echo ""
    
    # Get pod information
    echo "🏗️ PODS STATUS (namespace: $NAMESPACE):"
    kubectl get pods -n "$NAMESPACE" -o wide 2>/dev/null || echo "No pods found"
    echo ""
    
    # Show ICHub access information
    echo "🏭 INDUSTRY CORE HUB ACCESS:"
    
    # Try to get NodePort for manufacturer frontend
    local manu_frontend_port=$(kubectl get service -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null | head -1 || echo "Check services")
    local supplier_frontend_port=$(kubectl get service -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null | tail -1 || echo "Check services")
    
    echo "- Manufacturer ICHub (BPNL00000003CRHK):"
    echo "  Frontend: http://frontend-ichub-manufacturer.tx.test (or use port-forward)"
    echo "  Backend: http://backend-ichub-manufacturer.tx.test/v1"
    echo ""
    echo "- Supplier ICHub (BPNL0000000093Q7):"
    echo "  Frontend: http://frontend-ichub-supplier.tx.test (or use port-forward)"
    echo "  Backend: http://backend-ichub-supplier.tx.test/v1"
    echo ""
    
    # Show infrastructure access
    echo "🛠️ INFRASTRUCTURE ACCESS:"
    echo "- Portal: Check 'kubectl get services -n $NAMESPACE' for portal services"
    echo "- PGAdmin: Check 'kubectl get services -n $NAMESPACE' for pgadmin4 service"
    echo "- Keycloak: Check 'kubectl get services -n $NAMESPACE' for keycloak services"
    echo ""
    
    # Show useful commands
    echo "🔧 USEFUL COMMANDS:"
    echo ""
    echo "General:"
    echo "  kubectl get all -n $NAMESPACE"
    echo "  kubectl get services -n $NAMESPACE"
    echo "  kubectl get pods -n $NAMESPACE"
    echo ""
    echo "Port Forwarding (for local access):"
    echo "  kubectl port-forward svc/ichub-local-industry-core-hub-manufacturer-frontend 8080:8080 -n $NAMESPACE"
    echo "  kubectl port-forward svc/ichub-local-industry-core-hub-supplier-frontend 8081:8080 -n $NAMESPACE"
    echo ""
    echo "Logs:"
    echo "  kubectl logs -f deployment/ichub-local-industry-core-hub-manufacturer-backend -n $NAMESPACE"
    echo "  kubectl logs -f deployment/ichub-local-industry-core-hub-supplier-backend -n $NAMESPACE"
    echo ""
    echo "Cleanup:"
    echo "  ./uninstall.sh"
    echo "  # or manually: helm uninstall $RELEASE_NAME -n $NAMESPACE"
    echo ""
    
    log_success "Deployment information displayed"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--release)
            RELEASE_NAME="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --build-images)
            BUILD_IMAGES=true
            shift
            ;;
        --setup-minikube)
            SETUP_MINIKUBE=true
            shift
            ;;
        --force-cleanup)
            FORCE_CLEANUP=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-checks)
            SKIP_CHECKS=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "🚀 LOCAL ICHUB INSTALLATION 🚀"
    echo "=========================================="
    echo ""
    log_info "Namespace: $NAMESPACE (shared with umbrella components)"
    log_info "Release: $RELEASE_NAME"
    log_info "Timeout: $TIMEOUT"
    log_info "Chart: $CHART_DIR"
    log_info "Note: All components will install in '$NAMESPACE' namespace"
    echo ""
    
    if [[ "${SETUP_MINIKUBE:-false}" == "true" ]]; then
        check_docker_resources
        setup_minikube
        # Force image building when using minikube setup
        BUILD_IMAGES=true
        log_info "Forcing image build for minikube environment"
    fi
    
    if [[ "${SKIP_CHECKS:-false}" != "true" ]]; then
        check_prerequisites
        check_conflicts
    else
        log_warning "Skipping prerequisite checks"
    fi
    
    if [[ "${BUILD_IMAGES:-false}" == "true" ]]; then
        build_images
    fi
    
    create_namespace
    add_helm_repos
    update_dependencies
    deploy_local_ichub
    
    if [[ "${DRY_RUN:-false}" != "true" ]]; then
        wait_for_pods
    fi
    
    show_deployment_info
    
    echo ""
    log_success "Installation completed! 🎉"
    echo ""
}

# Run main function
main "$@"