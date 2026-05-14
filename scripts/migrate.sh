#!/usr/bin/env sh
set -eu

# Database migration script
# Usage: ./scripts/migrate.sh [action]
# Actions: run, revert, generate, show
# Example: ./scripts/migrate.sh run

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ACTION="${1:-run}"

cd "$ROOT_DIR"

echo "Database Migration: $ACTION"

case "$ACTION" in
    run)
        node ./scripts/db/typeorm.js run
        ;;
    revert)
        node ./scripts/db/typeorm.js revert
        ;;
    generate)
        MIGRATION_NAME="${2:-Migration}"
        node ./scripts/db/typeorm.js generate "$MIGRATION_NAME"
        ;;
    show)
        node ./scripts/db/typeorm.js show
        ;;
    *)
        echo "Error: Invalid action '$ACTION'"
        echo "Valid actions: run, revert, generate [name], show"
        exit 1
        ;;
esac
