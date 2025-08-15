#!/bin/bash

# Database Migration Script
# Runs Drizzle migrations and handles database setup

set -e

echo "🗄️  Starting database migration..."

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set. Please check your .env file."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate migration files if schema has changed
echo "📊 Checking for schema changes..."
npm run db:generate

# Apply migrations
echo "⬆️  Applying database migrations..."
npm run db:migrate

# Seed initial data if needed
if [ "$1" == "--seed" ]; then
    echo "🌱 Seeding initial data..."
    npm run db:seed
fi

echo "✅ Database migration completed successfully!"