#!/usr/bin/env bash
# =============================================================================
# OmegaOps Academy - Deployment Start Script
# =============================================================================
#
# This script automates the deployment process for the OmegaOps Academy
# Docker container. It handles:
#
# 1. Pre-flight checks (Docker, network existence)
# 2. Network creation if needed
# 3. Image building
# 4. Container startup
# 5. Health verification
# 6. Success reporting
#
# Usage:
#   ./docker/scripts/start.sh [OPTIONS]
#
# Options:
#   --no-build     Skip image building (use existing image)
#   --no-network   Skip network creation check
#   --dry-run      Show what would be done without executing
#   --verbose      Enable verbose output
#   --help         Show this help message
#
# Examples:
#   ./docker/scripts/start.sh                    # Full deployment
#   ./docker/scripts/start.sh --dry-run          # Preview actions
#   ./docker/scripts/start.sh --no-build         # Quick restart
#   ./docker/scripts/start.sh --verbose          # Detailed output
#
# =============================================================================

# -----------------------------------------------------------------------------
# STRICT MODE
# -----------------------------------------------------------------------------
# Enable strict error handling to catch issues early.
#
# -E: Inherit ERR trap in functions and subshells
# -e: Exit immediately if any command fails (non-zero exit code)
# -u: Treat unset variables as errors
# -o pipefail: Pipeline fails if any command in it fails (not just last)
#
# These settings prevent silent failures and make scripts more reliable.
# Without them, scripts continue even after errors, leading to cascading failures.
set -Eeuo pipefail

# Set internal field separator for consistent word splitting.
# Default IFS includes space, tab, newline. This is more predictable.
IFS=$'\n\t'

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------
# These can be overridden by environment variables.

# Script location (for resolving relative paths)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project root (two levels up from scripts directory)
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Docker Compose file location
COMPOSE_FILE="${PROJECT_ROOT}/docker/docker-compose.yml"

# Image name and tag
IMAGE_NAME="${IMAGE_NAME:-omegaops-academy}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Container name (must match docker-compose.yml)
CONTAINER_NAME="${CONTAINER_NAME:-omegaops-academy}"

# Network name (external network from Nginx Proxy Manager)
NETWORK_NAME="${NETWORK_NAME:-web}"

# Health check timeout (seconds)
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"

# Flags (can be set via command line)
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_NETWORK="${SKIP_NETWORK:-false}"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"

# -----------------------------------------------------------------------------
# LOGGING FUNCTIONS
# -----------------------------------------------------------------------------
# Consistent logging with timestamps and severity levels.

# ANSI color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Current timestamp in ISO 8601 format
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Log informational message
log_info() {
    echo -e "${CYAN}[$(timestamp)] [INFO]${NC} $*"
}

# Log success message
log_success() {
    echo -e "${GREEN}[$(timestamp)] [SUCCESS]${NC} $*"
}

# Log warning message
log_warn() {
    echo -e "${YELLOW}[$(timestamp)] [WARN]${NC} $*" >&2
}

# Log error message
log_error() {
    echo -e "${RED}[$(timestamp)] [ERROR]${NC} $*" >&2
}

# Log verbose/debug message (only if VERBOSE is true)
log_verbose() {
    if [[ "${VERBOSE}" == "true" ]]; then
        echo -e "${BLUE}[$(timestamp)] [DEBUG]${NC} $*"
    fi
}

# Log dry-run actions (what would be done)
log_dry_run() {
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo -e "${YELLOW}[DRY-RUN]${NC} Would execute: $*"
    fi
}

# -----------------------------------------------------------------------------
# HELPER FUNCTIONS
# -----------------------------------------------------------------------------

# Display usage information
show_help() {
    cat << EOF
OmegaOps Academy Deployment Script

USAGE:
    ./docker/scripts/start.sh [OPTIONS]

OPTIONS:
    --no-build     Skip Docker image building (use existing image)
    --no-network   Skip network existence check and creation
    --dry-run      Show what would be done without executing
    --verbose      Enable verbose/debug output
    --help         Display this help message

ENVIRONMENT VARIABLES:
    IMAGE_NAME       Docker image name (default: omegaops-academy)
    IMAGE_TAG        Docker image tag (default: latest)
    CONTAINER_NAME   Container name (default: omegaops-academy)
    NETWORK_NAME     Docker network (default: web)
    HEALTH_TIMEOUT   Health check timeout in seconds (default: 60)
    DRY_RUN          Set to 'true' for dry-run mode
    VERBOSE          Set to 'true' for verbose output

EXAMPLES:
    # Full deployment (build + start)
    ./docker/scripts/start.sh

    # Quick restart (skip building)
    ./docker/scripts/start.sh --no-build

    # Preview what would happen
    ./docker/scripts/start.sh --dry-run

    # Verbose output for debugging
    ./docker/scripts/start.sh --verbose

    # Custom image tag
    IMAGE_TAG=v1.0.0 ./docker/scripts/start.sh

NOTES:
    - Script expects to be run from project root or its own directory
    - Requires Docker and Docker Compose to be installed
    - Requires 'web' network to exist (created by Nginx Proxy Manager)
    - Health check verifies container is responding before completing

EOF
}

# Execute command (or log if dry-run)
execute() {
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_dry_run "$*"
        return 0
    else
        log_verbose "Executing: $*"
        eval "$@"
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Check if Docker is running
docker_is_running() {
    docker info &> /dev/null
}

# Check if Docker network exists
network_exists() {
    docker network ls --format '{{.Name}}' | grep -q "^${1}$"
}

# Check if container is running
container_is_running() {
    docker ps --format '{{.Names}}' | grep -q "^${1}$"
}

# Get container health status
container_health() {
    docker inspect --format='{{.State.Health.Status}}' "$1" 2>/dev/null || echo "unknown"
}

# Wait for container to be healthy
wait_for_health() {
    local container="$1"
    local timeout="$2"
    local elapsed=0
    local interval=2

    log_info "Waiting for container to be healthy (timeout: ${timeout}s)..."

    while [[ $elapsed -lt $timeout ]]; do
        local status
        status=$(container_health "$container")

        if [[ "$status" == "healthy" ]]; then
            log_success "Container is healthy!"
            return 0
        elif [[ "$status" == "unhealthy" ]]; then
            log_error "Container is unhealthy"
            return 1
        fi

        log_verbose "Health status: ${status}, waiting..."
        sleep $interval
        elapsed=$((elapsed + interval))
    done

    log_error "Health check timed out after ${timeout} seconds"
    return 1
}

# Cleanup function called on script exit
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Script failed with exit code: $exit_code"
        log_info "Check logs with: docker logs ${CONTAINER_NAME}"
    fi
}

# Register cleanup function
trap cleanup EXIT

# -----------------------------------------------------------------------------
# PARSE COMMAND LINE ARGUMENTS
# -----------------------------------------------------------------------------
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --no-build)
                SKIP_BUILD="true"
                shift
                ;;
            --no-network)
                SKIP_NETWORK="true"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# -----------------------------------------------------------------------------
# PRE-FLIGHT CHECKS
# -----------------------------------------------------------------------------
preflight_checks() {
    log_info "Running pre-flight checks..."

    # Check for required commands
    local required_commands=("docker" "curl")
    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            log_error "Required command not found: $cmd"
            exit 1
        fi
        log_verbose "Found command: $cmd"
    done

    # Check Docker is running
    if ! docker_is_running; then
        log_error "Docker daemon is not running"
        log_info "Start Docker with: sudo systemctl start docker"
        exit 1
    fi
    log_verbose "Docker daemon is running"

    # Check Docker Compose is available (v2 is built into docker)
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose not available"
        log_info "Docker Compose v2 should be included with Docker"
        exit 1
    fi
    log_verbose "Docker Compose is available"

    # Check Compose file exists
    if [[ ! -f "${COMPOSE_FILE}" ]]; then
        log_error "Docker Compose file not found: ${COMPOSE_FILE}"
        exit 1
    fi
    log_verbose "Compose file found: ${COMPOSE_FILE}"

    # Check project structure
    if [[ ! -d "${PROJECT_ROOT}/frontend" ]]; then
        log_error "Frontend directory not found: ${PROJECT_ROOT}/frontend"
        exit 1
    fi
    log_verbose "Frontend directory found"

    if [[ ! -d "${PROJECT_ROOT}/backend" ]]; then
        log_error "Backend directory not found: ${PROJECT_ROOT}/backend"
        exit 1
    fi
    log_verbose "Backend directory found"

    log_success "Pre-flight checks passed"
}

# -----------------------------------------------------------------------------
# ENSURE NETWORK EXISTS
# -----------------------------------------------------------------------------
ensure_network() {
    if [[ "${SKIP_NETWORK}" == "true" ]]; then
        log_info "Skipping network check (--no-network)"
        return 0
    fi

    log_info "Checking Docker network: ${NETWORK_NAME}"

    if network_exists "${NETWORK_NAME}"; then
        log_success "Network '${NETWORK_NAME}' exists"
    else
        log_warn "Network '${NETWORK_NAME}' does not exist"
        log_info "Creating network '${NETWORK_NAME}'..."

        execute "docker network create ${NETWORK_NAME}"

        if [[ "${DRY_RUN}" != "true" ]] && network_exists "${NETWORK_NAME}"; then
            log_success "Network '${NETWORK_NAME}' created"
        fi
    fi
}

# -----------------------------------------------------------------------------
# BUILD DOCKER IMAGE
# -----------------------------------------------------------------------------
build_image() {
    if [[ "${SKIP_BUILD}" == "true" ]]; then
        log_info "Skipping image build (--no-build)"
        return 0
    fi

    log_info "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
    log_verbose "Build context: ${PROJECT_ROOT}"
    log_verbose "Dockerfile: ${PROJECT_ROOT}/docker/Dockerfile"

    # Change to project root for build context
    cd "${PROJECT_ROOT}"

    local build_cmd="docker build -f docker/Dockerfile -t ${IMAGE_NAME}:${IMAGE_TAG} ."

    if [[ "${VERBOSE}" == "true" ]]; then
        execute "${build_cmd}"
    else
        execute "${build_cmd}" | grep -E "^(Step|Successfully|ERROR)" || true
    fi

    if [[ "${DRY_RUN}" != "true" ]]; then
        # Verify image was built
        if docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}:${IMAGE_TAG}$"; then
            local image_size
            image_size=$(docker images --format '{{.Size}}' "${IMAGE_NAME}:${IMAGE_TAG}")
            log_success "Image built successfully: ${IMAGE_NAME}:${IMAGE_TAG} (${image_size})"
        else
            log_error "Image build failed"
            exit 1
        fi
    fi
}

# -----------------------------------------------------------------------------
# STOP EXISTING CONTAINER
# -----------------------------------------------------------------------------
stop_existing() {
    if container_is_running "${CONTAINER_NAME}"; then
        log_info "Stopping existing container: ${CONTAINER_NAME}"
        execute "docker compose -f ${COMPOSE_FILE} down"
        log_verbose "Existing container stopped"
    else
        log_verbose "No existing container to stop"
    fi
}

# -----------------------------------------------------------------------------
# START CONTAINER
# -----------------------------------------------------------------------------
start_container() {
    log_info "Starting container with Docker Compose..."
    log_verbose "Compose file: ${COMPOSE_FILE}"

    cd "${PROJECT_ROOT}"

    local compose_cmd="docker compose -f ${COMPOSE_FILE} up -d"
    execute "${compose_cmd}"

    if [[ "${DRY_RUN}" != "true" ]]; then
        if container_is_running "${CONTAINER_NAME}"; then
            log_success "Container started: ${CONTAINER_NAME}"
        else
            log_error "Container failed to start"
            exit 1
        fi
    fi
}

# -----------------------------------------------------------------------------
# VERIFY HEALTH
# -----------------------------------------------------------------------------
verify_health() {
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_dry_run "Would verify container health"
        return 0
    fi

    log_info "Verifying container health..."

    # Wait for health check to pass
    if ! wait_for_health "${CONTAINER_NAME}" "${HEALTH_TIMEOUT}"; then
        log_error "Health verification failed"
        log_info "Container logs:"
        docker logs --tail 50 "${CONTAINER_NAME}" 2>&1 | head -20
        exit 1
    fi

    # Additional verification: HTTP request
    log_verbose "Testing HTTP endpoint..."
    local http_status
    http_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/health" 2>/dev/null || echo "000")

    if [[ "$http_status" == "200" ]]; then
        log_success "HTTP health check passed (status: ${http_status})"
    else
        log_warn "HTTP check returned status: ${http_status}"
        log_info "Container may be healthy but not externally accessible"
        log_info "If using external NPM, this is expected behavior"
    fi
}

# -----------------------------------------------------------------------------
# DISPLAY SUCCESS SUMMARY
# -----------------------------------------------------------------------------
show_summary() {
    log_success "Deployment completed successfully!"

    echo ""
    echo "============================================"
    echo "  OmegaOps Academy Deployment Summary"
    echo "============================================"
    echo ""
    echo "Container: ${CONTAINER_NAME}"
    echo "Image:     ${IMAGE_NAME}:${IMAGE_TAG}"
    echo "Network:   ${NETWORK_NAME}"
    echo ""

    if [[ "${DRY_RUN}" != "true" ]]; then
        local container_id
        container_id=$(docker ps --format '{{.ID}}' --filter "name=${CONTAINER_NAME}")
        echo "Container ID: ${container_id}"
        echo "Health:       $(container_health "${CONTAINER_NAME}")"
        echo ""
    fi

    echo "Useful commands:"
    echo "  View logs:      docker logs -f ${CONTAINER_NAME}"
    echo "  Check status:   docker ps | grep ${CONTAINER_NAME}"
    echo "  Stop container: docker compose -f ${COMPOSE_FILE} down"
    echo "  Restart:        docker compose -f ${COMPOSE_FILE} restart"
    echo "  Shell access:   docker exec -it ${CONTAINER_NAME} sh"
    echo ""

    if [[ "${DRY_RUN}" != "true" ]]; then
        echo "Next steps:"
        echo "  1. Configure Nginx Proxy Manager to route to '${CONTAINER_NAME}:80'"
        echo "  2. Set up SSL certificate in NPM"
        echo "  3. Point DNS to your server"
        echo "  4. Access your application at https://your-domain.com"
        echo ""
    fi

    echo "============================================"
}

# -----------------------------------------------------------------------------
# MAIN FUNCTION
# -----------------------------------------------------------------------------
main() {
    # Display banner
    echo ""
    echo "============================================"
    echo "  OmegaOps Academy Deployment Script"
    echo "============================================"
    echo ""

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_warn "DRY-RUN MODE: No changes will be made"
        echo ""
    fi

    # Parse command line arguments
    parse_args "$@"

    # Log configuration
    log_verbose "Configuration:"
    log_verbose "  PROJECT_ROOT: ${PROJECT_ROOT}"
    log_verbose "  COMPOSE_FILE: ${COMPOSE_FILE}"
    log_verbose "  IMAGE_NAME: ${IMAGE_NAME}"
    log_verbose "  IMAGE_TAG: ${IMAGE_TAG}"
    log_verbose "  CONTAINER_NAME: ${CONTAINER_NAME}"
    log_verbose "  NETWORK_NAME: ${NETWORK_NAME}"
    log_verbose "  SKIP_BUILD: ${SKIP_BUILD}"
    log_verbose "  SKIP_NETWORK: ${SKIP_NETWORK}"
    log_verbose "  DRY_RUN: ${DRY_RUN}"
    log_verbose "  VERBOSE: ${VERBOSE}"

    # Execute deployment steps
    preflight_checks
    ensure_network
    stop_existing
    build_image
    start_container
    verify_health
    show_summary

    log_success "Deployment complete!"
}

# Run main function with all arguments
main "$@"
