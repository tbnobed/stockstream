#!/bin/bash

# Quick Fix for Current Deployment Issues
# Run this if you encounter the drizzle-kit not found error

echo "🔧 Fixing deployment migration issue..."

# Run migrations directly from host with correct environment
echo "📊 Running database migrations from host..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Set DATABASE_URL for Docker container connection
export DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-your_secure_password_here}@localhost:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-inventorypro}"

# Run migrations from host
npm run db:push

echo "✅ Migrations completed! Now starting application..."
docker-compose up -d app

echo "🌐 Application should be available at http://localhost:5000"