#!/usr/bin/env sh
set -eu

# Database migration script
# Usage: ./scripts/migrate.sh [action]
# Actions: run, revert, generate, show
# Example: ./scripts/migrate.sh run

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ACTION="${1:-run}"

cd "$ROOT_DIR"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo "🗄️  Database Migration: $ACTION"

case "$ACTION" in
    run)
        echo "▶️  Running migrations..."
        # Using TypeORM CLI
        if command -v ts-node >/dev/null 2>&1; then
            npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d src/config/database.config.ts
        else
            echo "⚠️  TypeORM CLI not found. Please install dependencies first."
            echo "   Run: npm install"
            exit 1
        fi
        echo "✅ Migrations completed!"
        ;;
    revert)
        echo "⏮️  Reverting last migration..."
        if command -v ts-node >/dev/null 2>&1; then
            npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:revert -d src/config/database.config.ts
        else
            echo "⚠️  TypeORM CLI not found."
            exit 1
        fi
        echo "✅ Migration reverted!"
        ;;
    generate)
        MIGRATION_NAME="${2:-Migration}"
        echo "📝 Generating migration: $MIGRATION_NAME"
        if command -v ts-node >/dev/null 2>&1; then
            npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate -d src/config/database.config.ts -n "$MIGRATION_NAME"
        else
            echo "⚠️  TypeORM CLI not found."
            exit 1
        fi
        echo "✅ Migration generated!"
        ;;
    show)
        echo "📋 Showing migration status..."
        if command -v ts-node >/dev/null 2>&1; then
            npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:show -d src/config/database.config.ts
        else
            echo "⚠️  TypeORM CLI not found."
            exit 1
        fi
        ;;
    *)
        echo "❌ Error: Invalid action '$ACTION'"
        echo "   Valid actions: run, revert, generate [name], show"
        exit 1
        ;;
esac
