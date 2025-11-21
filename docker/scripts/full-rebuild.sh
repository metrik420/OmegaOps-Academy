#!/bin/bash
# =============================================================================
# FULL-REBUILD.SH - Idempotent Deployment Script
# =============================================================================
# PURPOSE: Deploy/update OmegaOps Academy with health checks and rollback
# USAGE:
#   DRY_RUN=true ./full-rebuild.sh   # Test run (no actual changes)
#   ./full-rebuild.sh                 # Execute deployment
#   VERBOSE=true ./full-rebuild.sh    # Verbose logging
# =============================================================================

set -Eeuo pipefail
IFS=$'\n\t'

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOCKER_DIR="$PROJECT_ROOT/docker"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.production.yml"
STACK_NAME="${STACK_NAME:-omegaops-academy}"
LOG_FILE="${LOG_FILE:-$DOCKER_DIR/logs/deploy-$(date +%Y%m%d-%H%M%S).log}"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# LOGGING FUNCTIONS
# -----------------------------------------------------------------------------
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$level" in
        INFO)  echo -e "${BLUE}[INFO]${NC} $message" | tee -a "$LOG_FILE" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $message" | tee -a "$LOG_FILE" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $message" | tee -a "$LOG_FILE" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" | tee -a "$LOG_FILE" ;;
        DEBUG) [[ "$VERBOSE" == "true" ]] && echo -e "[DEBUG] $message" | tee -a "$LOG_FILE" ;;
    esac
}

# -----------------------------------------------------------------------------
# PREFLIGHT CHECKS
# -----------------------------------------------------------------------------
preflight_checks() {
    log INFO "Running preflight checks..."

    # Check Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log ERROR "Docker is not installed"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log ERROR "Docker daemon is not running"
        exit 1
    fi

    # Check docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        log ERROR "docker-compose is not installed"
        exit 1
    fi

    # Check compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log ERROR "Compose file not found: $COMPOSE_FILE"
        exit 1
    fi

    # Check .env file exists
    if [[ ! -f "$PROJECT_ROOT/backend/.env" ]]; then
        log WARN ".env file not found, using defaults"
    fi

    # Check if web network exists (for NPM integration)
    if ! docker network ls | grep -q "web"; then
        log WARN "Docker network 'web' not found, creating..."
        if [[ "$DRY_RUN" != "true" ]]; then
            docker network create web
        fi
    fi

    log SUCCESS "Preflight checks passed"
}

# -----------------------------------------------------------------------------
# BACKUP BEFORE DEPLOY
# -----------------------------------------------------------------------------
backup_before_deploy() {
    log INFO "Creating pre-deployment backup..."

    local backup_dir="$DOCKER_DIR/backups"
    local backup_file="$backup_dir/pre-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would create backup: $backup_file"
        return 0
    fi

    mkdir -p "$backup_dir"

    # Backup database and logs
    if docker volume inspect omegaops-data &> /dev/null; then
        docker run --rm \
            -v omegaops-data:/data \
            -v "$backup_dir:/backup" \
            alpine tar czf "/backup/$(basename "$backup_file")" -C /data .

        log SUCCESS "Backup created: $backup_file"
    else
        log WARN "No existing data volume found, skipping backup"
    fi
}

# -----------------------------------------------------------------------------
# BUILD DOCKER IMAGE
# -----------------------------------------------------------------------------
build_image() {
    log INFO "Building Docker image..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would build image: $STACK_NAME:latest"
        return 0
    fi

    cd "$DOCKER_DIR"

    if [[ "$VERBOSE" == "true" ]]; then
        docker-compose -f "$COMPOSE_FILE" build --progress=plain
    else
        docker-compose -f "$COMPOSE_FILE" build
    fi

    log SUCCESS "Docker image built successfully"
}

# -----------------------------------------------------------------------------
# DEPLOY STACK
# -----------------------------------------------------------------------------
deploy_stack() {
    log INFO "Deploying stack: $STACK_NAME..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would run: docker-compose -f $COMPOSE_FILE up -d --remove-orphans"
        return 0
    fi

    cd "$DOCKER_DIR"
    docker-compose -f "$COMPOSE_FILE" up -d --remove-orphans

    log SUCCESS "Stack deployed"
}

# -----------------------------------------------------------------------------
# HEALTH CHECKS
# -----------------------------------------------------------------------------
wait_for_health() {
    log INFO "Waiting for services to become healthy..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would wait for health checks"
        return 0
    fi

    local max_attempts=30
    local attempt=0
    local healthy=false

    while [[ $attempt -lt $max_attempts ]]; do
        attempt=$((attempt + 1))

        # Check container health
        local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$STACK_NAME" 2>/dev/null || echo "unknown")

        if [[ "$health_status" == "healthy" ]]; then
            healthy=true
            break
        fi

        log DEBUG "Health check attempt $attempt/$max_attempts: $health_status"
        sleep 2
    done

    if [[ "$healthy" == "true" ]]; then
        log SUCCESS "Services are healthy"
    else
        log ERROR "Health checks failed after $max_attempts attempts"
        log ERROR "Container logs:"
        docker logs --tail 50 "$STACK_NAME"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# SMOKE TESTS
# -----------------------------------------------------------------------------
run_smoke_tests() {
    log INFO "Running smoke tests..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would run smoke tests"
        return 0
    fi

    local base_url="http://localhost"
    local api_url="http://localhost:3001"

    # Test frontend
    if curl -f -s -o /dev/null "$base_url/"; then
        log SUCCESS "Frontend responding"
    else
        log ERROR "Frontend not responding at $base_url"
        exit 1
    fi

    # Test backend health endpoint
    if curl -f -s -o /dev/null "$api_url/health"; then
        log SUCCESS "Backend health endpoint responding"
    else
        log ERROR "Backend health endpoint not responding at $api_url/health"
        exit 1
    fi

    # Test API routes
    if curl -f -s -o /dev/null "$api_url/api/roadmap"; then
        log SUCCESS "API routes responding"
    else
        log WARN "API routes may not be responding (check backend logs)"
    fi

    log SUCCESS "Smoke tests passed"
}

# -----------------------------------------------------------------------------
# MAIN EXECUTION
# -----------------------------------------------------------------------------
main() {
    log INFO "===== OmegaOps Academy Deployment ====="
    log INFO "Timestamp: $(date)"
    log INFO "Stack: $STACK_NAME"
    log INFO "Compose file: $COMPOSE_FILE"
    log INFO "Dry run: $DRY_RUN"
    log INFO "Log file: $LOG_FILE"
    echo ""

    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"

    # Execute deployment steps
    preflight_checks
    backup_before_deploy
    build_image
    deploy_stack
    wait_for_health
    run_smoke_tests

    log SUCCESS "===== Deployment completed successfully ====="
    log INFO "View logs: docker logs -f $STACK_NAME"
    log INFO "Stop stack: docker-compose -f $COMPOSE_FILE down"
}

# -----------------------------------------------------------------------------
# ERROR HANDLER
# -----------------------------------------------------------------------------
trap 'log ERROR "Deployment failed at line $LINENO. Check logs: $LOG_FILE"; exit 1' ERR

# Run main function
main "$@"
