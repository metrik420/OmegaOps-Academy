#!/bin/bash
# =============================================================================
# BACKUP.SH - Database and Volume Backup Script
# =============================================================================
# PURPOSE: Create timestamped backups of SQLite database and volumes
# USAGE:
#   ./backup.sh                       # Create backup with rotation
#   DRY_RUN=true ./backup.sh          # Test run
#   KEEP_BACKUPS=30 ./backup.sh       # Keep 30 most recent backups
# =============================================================================

set -Eeuo pipefail
IFS=$'\n\t'

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/docker/backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/omegaops-backup-$TIMESTAMP.tar.gz"
KEEP_BACKUPS="${KEEP_BACKUPS:-14}"  # Keep 14 most recent backups (2 weeks)
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
# CREATE BACKUP
# -----------------------------------------------------------------------------
create_backup() {
    log INFO "Creating backup: $BACKUP_FILE"

    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would create backup"
        return 0
    fi

    mkdir -p "$BACKUP_DIR"

    # Backup Docker volumes
    if docker volume inspect omegaops-data &> /dev/null; then
        docker run --rm \
            -v omegaops-data:/data:ro \
            -v omegaops-logs:/logs:ro \
            -v "$BACKUP_DIR:/backup" \
            alpine tar czf "/backup/$(basename "$BACKUP_FILE")" \
                -C /data . \
                -C /logs .

        log SUCCESS "Backup created: $BACKUP_FILE"
    else
        log ERROR "Volume omegaops-data not found"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# VERIFY BACKUP
# -----------------------------------------------------------------------------
verify_backup() {
    log INFO "Verifying backup integrity..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would verify backup"
        return 0
    fi

    if [[ ! -f "$BACKUP_FILE" ]]; then
        log ERROR "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    # Test archive integrity
    if tar tzf "$BACKUP_FILE" > /dev/null 2>&1; then
        log SUCCESS "Backup integrity verified"
    else
        log ERROR "Backup file is corrupted"
        exit 1
    fi

    # Generate checksum
    local checksum=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
    echo "$checksum  $(basename "$BACKUP_FILE")" > "$BACKUP_FILE.sha256"
    log SUCCESS "Checksum: $checksum"
}

# -----------------------------------------------------------------------------
# ROTATE OLD BACKUPS
# -----------------------------------------------------------------------------
rotate_backups() {
    log INFO "Rotating old backups (keeping $KEEP_BACKUPS most recent)..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would rotate backups"
        return 0
    fi

    local count=$(ls -1t "$BACKUP_DIR"/omegaops-backup-*.tar.gz 2>/dev/null | wc -l)

    if [[ $count -gt $KEEP_BACKUPS ]]; then
        ls -1t "$BACKUP_DIR"/omegaops-backup-*.tar.gz | tail -n +$((KEEP_BACKUPS + 1)) | while read -r old_backup; do
            log INFO "Deleting old backup: $(basename "$old_backup")"
            rm -f "$old_backup" "$old_backup.sha256"
        done
        log SUCCESS "Old backups rotated"
    else
        log INFO "No rotation needed ($count backups < $KEEP_BACKUPS limit)"
    fi
}

# -----------------------------------------------------------------------------
# MAIN EXECUTION
# -----------------------------------------------------------------------------
main() {
    log INFO "===== OmegaOps Academy Backup ====="
    log INFO "Timestamp: $(date)"
    log INFO "Backup directory: $BACKUP_DIR"
    log INFO "Keep backups: $KEEP_BACKUPS"
    echo ""

    create_backup
    verify_backup
    rotate_backups

    log SUCCESS "===== Backup completed successfully ====="
    log INFO "Backup file: $BACKUP_FILE"
    log INFO "Restore with: ./restore.sh --backup=$(basename "$BACKUP_FILE")"
}

trap 'log ERROR "Backup failed at line $LINENO"; exit 1' ERR

main "$@"
