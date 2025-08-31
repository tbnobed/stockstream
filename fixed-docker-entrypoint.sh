#!/bin/sh

# InventoryPro Production Deployment Script
# DEFINITIVE FIX: Simplified script with zero unquoted group keywords

set -e

# Environment checks
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not set"
    exit 1
fi

echo "🚀 Starting InventoryPro deployment..."

# Wait for database
echo "⏳ Waiting for PostgreSQL..."
max_attempts=30
attempt=0
until pg_isready -d "$DATABASE_URL" > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -gt $max_attempts ]; then
        echo "❌ Database not available after $max_attempts attempts"
        exit 1
    fi
    echo "   Attempt $attempt/$max_attempts..."
    sleep 2
done
echo "✅ PostgreSQL is ready"

# Run Drizzle migrations (this handles all table creation safely)
echo "📦 Applying database schema..."
if ! npm run db:push; then
    echo "❌ Database schema application failed"
    exit 1
fi
echo "✅ Database schema applied successfully"

# Seed initial data if this is a fresh database
echo "🌱 Seeding initial data..."
if ! node seed-initial-data.js; then
    echo "❌ Initial data seeding failed"
    exit 1
fi
echo "✅ Initial data seeded successfully"

# Start the application
echo "🎯 Starting InventoryPro application..."
exec npm run start