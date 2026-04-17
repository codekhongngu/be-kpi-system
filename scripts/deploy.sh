#!/usr/bin/env sh
set -eu

# Deployment script for NestJS application
# Usage: ./scripts/deploy.sh [environment] [action]
# Example: ./scripts/deploy.sh production up
# Actions: up, down, restart, logs

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENVIRONMENT="${1:-production}"
ACTION="${2:-up}"

cd "$ROOT_DIR"

echo "🚀 Deploying application to environment: $ENVIRONMENT"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please copy .env.example to .env and configure it."
    exit 1
fi

# Validate environment
if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "development" ]; then
    echo "❌ Error: Invalid environment. Use 'production' or 'development'"
    exit 1
fi

# Select compose file
if [ "$ENVIRONMENT" = "production" ]; then
    COMPOSE_FILE="infra/docker/docker-compose.prod.yml"
else
    COMPOSE_FILE="infra/docker/docker-compose.yml"
fi

# Execute action
case "$ACTION" in
    up)
        echo "⬆️  Starting services..."
        docker compose -f "$COMPOSE_FILE" up -d --build
        echo "✅ Services started successfully!"
        echo "📋 View logs with: ./scripts/deploy.sh $ENVIRONMENT logs"
        ;;
    down)
        echo "⬇️  Stopping services..."
        docker compose -f "$COMPOSE_FILE" down
        echo "✅ Services stopped successfully!"
        ;;
    restart)
        echo "🔄 Restarting services..."
        docker compose -f "$COMPOSE_FILE" restart
        echo "✅ Services restarted successfully!"
        ;;
    logs)
        echo "📋 Showing logs (Ctrl+C to exit)..."
        docker compose -f "$COMPOSE_FILE" logs -f
        ;;
    clean)
        echo "🧹 Cleaning up (removing containers and volumes)..."
        docker compose -f "$COMPOSE_FILE" down -v
        echo "✅ Cleanup completed!"
        ;;
    *)
        echo "❌ Error: Invalid action '$ACTION'"
        echo "   Valid actions: up, down, restart, logs, clean"
        exit 1
        ;;
esac
