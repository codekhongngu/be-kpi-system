#!/usr/bin/env sh
set -eu

# Database backup script
# Usage: ./scripts/backup-db.sh [backup_name]
# Example: ./scripts/backup-db.sh backup_20240121

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
BACKUP_NAME="${1:-backup_$(date +%Y%m%d_%H%M%S)}"
BACKUP_DIR="$ROOT_DIR/backups"
BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.sql"

cd "$ROOT_DIR"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "💾 Creating database backup: $BACKUP_NAME"

# Check if running in Docker
if docker ps | grep -q "starter-be-postgres"; then
    echo "🐳 Backing up from Docker container..."
    docker exec starter-be-postgres pg_dump -U "${DB_USERNAME:-postgres}" "${DB_DATABASE:-starter_db}" > "$BACKUP_FILE"
elif [ -n "${DB_HOST:-}" ]; then
    echo "📡 Backing up from remote database..."
    PGPASSWORD="${DB_PASSWORD:-postgres}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT:-5432}" \
        -U "${DB_USERNAME:-postgres}" \
        -d "${DB_DATABASE:-starter_db}" \
        > "$BACKUP_FILE"
else
    echo "❌ Error: Cannot determine database connection method"
    echo "   Please ensure database is running in Docker or DB_HOST is set in .env"
    exit 1
fi

# Compress backup
if command -v gzip >/dev/null 2>&1; then
    echo "🗜️  Compressing backup..."
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
fi

# Get file size
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "✅ Backup completed successfully!"
echo "   Location: $BACKUP_FILE"
echo "   Size: $FILE_SIZE"

# Optional: Keep only last N backups
KEEP_BACKUPS="${KEEP_BACKUPS:-10}"
if [ "$KEEP_BACKUPS" -gt 0 ]; then
    echo "🧹 Cleaning old backups (keeping last $KEEP_BACKUPS)..."
    cd "$BACKUP_DIR"
    ls -t *.sql.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs rm -f 2>/dev/null || true
fi
