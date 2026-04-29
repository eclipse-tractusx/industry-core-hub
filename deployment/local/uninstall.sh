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

# Local ICHub Uninstallation Script
# This script removes the complete local development environment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="umbrella"
RELEASE_NAME="umbrella"

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
Local ICHub Uninstallation Script
==================================

Removes the complete local development environment including:
- Industry Core Hub instances (Manufacturer & Supplier)
- Tractus-X umbrella components (connectors, DTRs, Portal, etc.)
- All dependencies and persistent volumes

Usage:
    $0 [OPTIONS]

Options:
    -h, --help              Show this help message
    -n, --namespace         Set the namespace (default: ichub-local)
    -r, --release           Set the release name (default: ichub-local)
    --force                 Force removal without confirmation
    --keep-namespace        Keep the namespace after uninstallation
    --keep-pvcs             Keep persistent volume claims (database data)
    --dry-run               Show what would be removed without actually removing
    --verbose               Enable verbose output

Examples:
    $0                      Uninstall with confirmation prompt
    $0 --force              Uninstall without confirmation
    $0 --keep-pvcs          Uninstall but keep database data
    $0 -n my-namespace      Uninstall from custom namespace
    $0 --dry-run            Show what would be removed

EOF
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if helm is available
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed or not in PATH"
        exit 1
    fi
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "kubectl is not connected to a cluster"
        exit 1
    fi
    
    # Verify we're in a safe context (local development environment)
    current_context=$(kubectl config current-context)
    log_info "Current kubectl context: $current_context"
    
    # Warn if not using a known local context
    if [[ "$current_context" != "minikube" ]] && [[ "$current_context" != "docker-desktop" ]] && [[ "$current_context" != "kind-"* ]]; then
        log_warning "You are not using a recognized local development context!"
        log_warning "Current context: $current_context"
        echo ""
        read -p "Are you sure you want to proceed with uninstallation? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Uninstallation cancelled"
            exit 0
        fi
    else
        log_info "✓ Using local development context: $current_context"
    fi
    
    log_success "Prerequisites check passed"
}

# Function to confirm uninstallation
confirm_uninstallation() {
    if [[ "${FORCE:-false}" == "true" ]]; then
        log_warning "Force mode enabled - skipping confirmation"
        return 0
    fi
    
    echo ""
    echo "=========================================="
    echo "⚠️  UNINSTALLATION CONFIRMATION ⚠️"
    echo "=========================================="
    echo ""
    echo "This will remove:"
    echo "- Helm release: $RELEASE_NAME"
    echo "- Namespace: $NAMESPACE (unless --keep-namespace is used)"
    echo "- All pods, services, and deployments"
    if [[ "${KEEP_PVCS:-false}" != "true" ]]; then
        echo "- All persistent volume claims and data"
    else
        echo "- Persistent volume claims will be KEPT"
    fi
    echo ""
    
    # Show current resources
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        echo "Current resources in namespace '$NAMESPACE':"
        kubectl get all -n "$NAMESPACE" 2>/dev/null || echo "No resources found or namespace doesn't exist"
        echo ""
    fi
    
    read -p "Are you sure you want to proceed? (yes/no): " -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Uninstallation cancelled by user"
        exit 0
    fi
    
    log_warning "Proceeding with uninstallation..."
}

# Function to uninstall helm release
uninstall_helm_release() {
    log_step "Uninstalling Helm release '$RELEASE_NAME'..."
    
    # Check if release exists
    if ! helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
        log_warning "Helm release '$RELEASE_NAME' not found in namespace '$NAMESPACE'"
        return 0
    fi
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log_info "DRY RUN - Would uninstall: helm uninstall $RELEASE_NAME -n $NAMESPACE"
        return 0
    fi
    
    local helm_args=("uninstall" "$RELEASE_NAME" "-n" "$NAMESPACE")
    
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        helm_args+=("--debug")
    fi
    
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        helm "${helm_args[@]}"
    else
        helm "${helm_args[@]}" > /dev/null 2>&1
    fi
    
    log_success "Helm release uninstalled"
}

# Function to remove persistent volume claims
remove_pvcs() {
    if [[ "${KEEP_PVCS:-false}" == "true" ]]; then
        log_info "Keeping persistent volume claims (--keep-pvcs flag used)"
        return 0
    fi
    
    log_step "Removing persistent volume claims..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log_info "DRY RUN - Would remove PVCs in namespace '$NAMESPACE'"
        kubectl get pvc -n "$NAMESPACE" 2>/dev/null || echo "No PVCs found"
        return 0
    fi
    
    # Get all PVCs in the namespace
    local pvcs
    pvcs=$(kubectl get pvc -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$pvcs" ]]; then
        log_info "No persistent volume claims found"
        return 0
    fi
    
    log_info "Found PVCs: $pvcs"
    
    for pvc in $pvcs; do
        log_info "Removing PVC: $pvc"
        if [[ "${VERBOSE:-false}" == "true" ]]; then
            kubectl delete pvc "$pvc" -n "$NAMESPACE"
        else
            kubectl delete pvc "$pvc" -n "$NAMESPACE" > /dev/null 2>&1
        fi
    done
    
    log_success "Persistent volume claims removed"
}

# Function to wait for resource cleanup
wait_for_cleanup() {
    log_step "Waiting for resources to be cleaned up..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log_info "DRY RUN - Would wait for cleanup"
        return 0
    fi
    
    # Wait for pods to be terminated
    local timeout=60
    local elapsed=0
    
    while [[ $elapsed -lt $timeout ]]; do
        local pods
        pods=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
        
        if [[ $pods -eq 0 ]]; then
            break
        fi
        
        log_info "Waiting for $pods pod(s) to terminate... (${elapsed}s/${timeout}s)"
        sleep 5
        elapsed=$((elapsed + 5))
    done
    
    if [[ $elapsed -ge $timeout ]]; then
        log_warning "Timeout waiting for pods to terminate"
    else
        log_success "All pods terminated"
    fi
}

# Function to remove namespace
remove_namespace() {
    if [[ "${KEEP_NAMESPACE:-false}" == "true" ]]; then
        log_info "Keeping namespace '$NAMESPACE' (--keep-namespace flag used)"
        return 0
    fi
    
    log_step "Removing namespace '$NAMESPACE'..."
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_info "Namespace '$NAMESPACE' does not exist"
        return 0
    fi
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log_info "DRY RUN - Would remove namespace '$NAMESPACE'"
        return 0
    fi
    
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        kubectl delete namespace "$NAMESPACE"
    else
        kubectl delete namespace "$NAMESPACE" > /dev/null 2>&1
    fi
    
    log_success "Namespace removed"
}

# Function to clean up Docker images (optional)
cleanup_docker_images() {
    log_step "Checking for local Docker images..."
    
    if ! command -v docker &> /dev/null; then
        log_warning "Docker not available, skipping image cleanup"
        return 0
    fi
    
    if ! docker info &> /dev/null; then
        log_warning "Docker not running, skipping image cleanup"
        return 0
    fi
    
    local images_to_remove=()
    
    if docker image inspect industry-core-hub-frontend:local >/dev/null 2>&1; then
        images_to_remove+=("industry-core-hub-frontend:local")
    fi
    
    if docker image inspect industry-core-hub-backend:local >/dev/null 2>&1; then
        images_to_remove+=("industry-core-hub-backend:local")
    fi
    
    if [[ ${#images_to_remove[@]} -eq 0 ]]; then
        log_info "No local ICHub Docker images found"
        return 0
    fi
    
    echo ""
    echo "Found local Docker images:"
    for img in "${images_to_remove[@]}"; do
        echo "  - $img"
    done
    echo ""
    
    if [[ "${FORCE:-false}" != "true" ]]; then
        read -p "Do you want to remove these local Docker images? (yes/no): " -r
        echo ""
        
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Keeping Docker images"
            return 0
        fi
    fi
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log_info "DRY RUN - Would remove Docker images: ${images_to_remove[*]}"
        return 0
    fi
    
    for img in "${images_to_remove[@]}"; do
        log_info "Removing Docker image: $img"
        if [[ "${VERBOSE:-false}" == "true" ]]; then
            docker rmi "$img"
        else
            docker rmi "$img" > /dev/null 2>&1
        fi
    done
    
    log_success "Docker images removed"
}

# Function to show final status
show_final_status() {
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        echo ""
        echo "=========================================="
        echo "🔍 DRY RUN COMPLETED"
        echo "=========================================="
        echo ""
        log_info "No actual changes were made to your cluster"
        return 0
    fi
    
    echo ""
    echo "=========================================="
    echo "✅ UNINSTALLATION COMPLETED"
    echo "=========================================="
    echo ""
    
    # Check remaining resources
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        echo "Remaining resources in namespace '$NAMESPACE':"
        kubectl get all -n "$NAMESPACE" 2>/dev/null || echo "No resources found"
        echo ""
        
        if [[ "${KEEP_PVCS:-false}" == "true" ]]; then
            echo "Persistent Volume Claims (kept):"
            kubectl get pvc -n "$NAMESPACE" 2>/dev/null || echo "No PVCs found"
            echo ""
        fi
    else
        log_success "Namespace '$NAMESPACE' has been removed"
    fi
    
    echo "🧹 Cleanup Summary:"
    echo "- Helm release '$RELEASE_NAME': Removed"
    if [[ "${KEEP_NAMESPACE:-false}" != "true" ]]; then
        echo "- Namespace '$NAMESPACE': Removed"
    else
        echo "- Namespace '$NAMESPACE': Kept"
    fi
    if [[ "${KEEP_PVCS:-false}" != "true" ]]; then
        echo "- Persistent Volume Claims: Removed"
    else
        echo "- Persistent Volume Claims: Kept"
    fi
    echo ""
    
    log_success "Local ichub environment has been cleaned up! 🎉"
    echo ""
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
        --force)
            FORCE=true
            shift
            ;;
        --keep-namespace)
            KEEP_NAMESPACE=true
            shift
            ;;
        --keep-pvcs)
            KEEP_PVCS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
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
    echo "🗑️  LOCAL ICHUB UNINSTALLATION 🗑️"
    echo "=========================================="
    echo ""
    log_info "Namespace: $NAMESPACE"
    log_info "Release: $RELEASE_NAME"
    echo ""
    
    check_prerequisites
    confirm_uninstallation
    uninstall_helm_release
    wait_for_cleanup
    remove_pvcs
    remove_namespace
    cleanup_docker_images
    show_final_status
}

# Run main function
main "$@"