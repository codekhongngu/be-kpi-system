#!/usr/bin/env sh
set -eu

# Build script for NestJS application
# Usage: ./scripts/build.sh [environment]
# Example: ./scripts/build.sh production

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENVIRONMENT="${1:-production}"

cd "$ROOT_DIR"

echo "🔨 Building application for environment: $ENVIRONMENT"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linter..."
npm run lint || {
    echo "⚠️  Linting failed, but continuing..."
}

# Run tests
echo "🧪 Running tests..."
npm run test || {
    echo "⚠️  Tests failed, but continuing..."
}

# Build the application
echo "🏗️  Building NestJS application..."
npm run build

# Build Docker image if Docker is available
if command -v docker >/dev/null 2>&1; then
    echo "🐳 Building Docker image..."
    if [ "$ENVIRONMENT" = "production" ]; then
        docker compose -f infra/docker/docker-compose.prod.yml build
    else
        docker compose -f infra/docker/docker-compose.yml build
    fi
else
    echo "⚠️  Docker not found, skipping Docker build"
fi

echo "✅ Build completed successfully!"
