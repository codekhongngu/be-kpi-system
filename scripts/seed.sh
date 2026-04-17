#!/usr/bin/env sh
set -eu

# Database seeding script
# Usage: ./scripts/seed.sh [seed_file]
# Example: ./scripts/seed.sh users

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SEED_FILE="${1:-all}"

cd "$ROOT_DIR"

echo "🌱 Seeding database: $SEED_FILE"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Check if dist folder exists (application must be built)
if [ ! -d "dist" ]; then
    echo "⚠️  dist folder not found. Building application..."
    npm run build
fi

# Run seeding
# Option 1: Using NestJS CLI (if you have a seed command)
if grep -q '"seed"' package.json; then
    echo "📦 Running seed via npm script..."
    npm run seed -- "$SEED_FILE"
# Option 2: Using TypeORM seeding
elif [ -d "src/database/seeds" ]; then
    echo "📦 Running TypeORM seeds..."
    npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js seed -d src/config/database.config.ts
# Option 3: Custom seed script
elif [ -f "src/database/seed.ts" ]; then
    echo "📦 Running custom seed script..."
    npx ts-node -r tsconfig-paths/register src/database/seed.ts "$SEED_FILE"
else
    echo "⚠️  No seeding mechanism found."
    echo "   Create one of the following:"
    echo "   - npm script 'seed' in package.json"
    echo "   - src/database/seeds/ directory with TypeORM seeds"
    echo "   - src/database/seed.ts custom seed script"
    exit 1
fi

echo "✅ Seeding completed successfully!"
