#!/bin/bash
# =============================================================================
# RESTORE.SH - Database and Volume Restore Script
# =============================================================================
# PURPOSE: Restore OmegaOps Academy from backup with integrity checks
# USAGE:
#   ./restore.sh --backup=omegaops-backup-20251118-120000.tar.gz
#   DRY_RUN=true ./restore.sh --backup=...  # Test run
# =============================================================================

set -Eeuo pipefail
IFS=$'\n\t'

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/docker/backups}"
BACKUP_FILE=""
DRY_RUN="${DRY_RUN:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# -----------------------------------------------------------------------------
# LOGGING
# -----------------------------------------------------------------------------
log() {
    local level="$1"
    shift
    local message="$*"

    case "$level" in
        INFO)  echo -e "${BLUE}[INFO]${NC} $message" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" ;;
    esac
}

# -----------------------------------------------------------------------------
# PARSE ARGUMENTS
# -----------------------------------------------------------------------------
parse_args() {
    for arg in "$@"; do
        case $arg in
            --backup=*)
                BACKUP_FILE="${arg#*=}"
                shift
                ;;
            --help)
                echo "Usage: $0 --backup=BACKUP_FILE"
                echo ""
                echo "Options:"
                echo "  --backup=FILE    Backup file to restore (required)"
                echo "  DRY_RUN=true     Test run without actual restore"
                echo ""
                echo "Example:"
                echo "  $0 --backup=omegaops-backup-20251118-120000.tar.gz"
                exit 0
                ;;
        esac
    done

    if [[ -z "$BACKUP_FILE" ]]; then
        log ERROR "Backup file not specified. Use --backup=FILE"
        log INFO "Available backups:"
        ls -1t "$BACKUP_DIR"/omegaops-backup-*.tar.gz 2>/dev/null | head -10 || log WARN "No backups found"
        exit 1
    fi

    # Convert to absolute path if relative
    if [[ "$BACKUP_FILE" != /* ]]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    fi
}

# -----------------------------------------------------------------------------
# VERIFY BACKUP INTEGRITY
# -----------------------------------------------------------------------------
verify_integrity() {
    log INFO "Verifying backup integrity..."

    if [[ ! -f "$BACKUP_FILE" ]]; then
        log ERROR "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    # Verify checksum if available
    if [[ -f "$BACKUP_FILE.sha256" ]]; then
        if cd "$(dirname "$BACKUP_FILE")" && sha256sum -c "$(basename "$BACKUP_FILE.sha256")" > /dev/null 2>&1; then
            log SUCCESS "Checksum verified"
        else
            log ERROR "Checksum verification failed"
            exit 1
        fi
    else
        log WARN "No checksum file found, skipping verification"
    fi

    # Test archive integrity
    if tar tzf "$BACKUP_FILE" > /dev/null 2>&1; then
        log SUCCESS "Archive integrity verified"
    else
        log ERROR "Archive is corrupted"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# STOP SERVICES
# -----------------------------------------------------------------------------
stop_services() {
    log WARN "Stopping OmegaOps Academy services..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would stop services"
        return 0
    fi

    cd "$PROJECT_ROOT/docker"

    if docker ps | grep -q "omegaops-academy"; then
        docker-compose -f docker-compose.production.yml down
        log SUCCESS "Services stopped"
    else
        log INFO "Services not running"
    fi
}

# -----------------------------------------------------------------------------
# RESTORE DATA
# -----------------------------------------------------------------------------
restore_data() {
    log INFO "Restoring data from backup..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would restore data"
        return 0
    fi

    # Remove existing volumes (DANGEROUS - only in restore scenario)
    log WARN "Removing existing data volumes..."
    docker volume rm -f omegaops-data omegaops-logs 2>/dev/null || true

    # Create fresh volumes
    docker volume create omegaops-data
    docker volume create omegaops-logs

    # Extract backup into volumes
    docker run --rm \
        -v omegaops-data:/data \
        -v omegaops-logs:/logs \
        -v "$(dirname "$BACKUP_FILE"):/backup:ro" \
        alpine sh -c "cd /data && tar xzf /backup/$(basename "$BACKUP_FILE")"

    log SUCCESS "Data restored from backup"
}

# -----------------------------------------------------------------------------
# RESTART SERVICES
# -----------------------------------------------------------------------------
restart_services() {
    log INFO "Restarting OmegaOps Academy services..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would restart services"
        return 0
    fi

    cd "$PROJECT_ROOT/docker"
    docker-compose -f docker-compose.production.yml up -d

    log SUCCESS "Services restarted"
}

# -----------------------------------------------------------------------------
# VERIFY RESTORE
# -----------------------------------------------------------------------------
verify_restore() {
    log INFO "Verifying restore..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would verify restore"
        return 0
    fi

    # Wait for services to be healthy
    local max_attempts=30
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        attempt=$((attempt + 1))

        if curl -f -s -o /dev/null "http://localhost:3001/health"; then
            log SUCCESS "Services responding"
            return 0
        fi

        sleep 2
    done

    log ERROR "Services not responding after restore"
    exit 1
}

# -----------------------------------------------------------------------------
# MAIN EXECUTION
# -----------------------------------------------------------------------------
main() {
    parse_args "$@"

    log INFO "===== OmegaOps Academy Restore ====="
    log INFO "Timestamp: $(date)"
    log INFO "Backup file: $BACKUP_FILE"
    log INFO "Dry run: $DRY_RUN"
    echo ""

    log WARN "WARNING: This will REPLACE all current data!"
    if [[ "$DRY_RUN" != "true" ]]; then
        read -p "Continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log INFO "Restore cancelled"
            exit 0
        fi
    fi

    verify_integrity
    stop_services
    restore_data
    restart_services
    verify_restore

    log SUCCESS "===== Restore completed successfully ====="
    log INFO "Services available at http://localhost"
}

trap 'log ERROR "Restore failed at line $LINENO"; exit 1' ERR

main "$@"
