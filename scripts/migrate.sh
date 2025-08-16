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

# Apply schema changes using Drizzle push
echo "⬆️  Applying database schema changes..."
npm run db:push

# Note: This project uses Drizzle push workflow
# For seeding data, run the application and use the admin interface

echo "✅ Database migration completed successfully!"