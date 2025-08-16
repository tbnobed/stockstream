#!/bin/bash

# Test script to verify Docker database connection works
echo "🧪 Testing Docker database connection..."

# Build the Docker image with database fix
docker-compose build --no-cache app

# Start only the database first
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Test the database connection directly
echo "🔍 Testing database connection..."
docker-compose exec postgres psql -U postgres -d inventorypro -c "SELECT version();"

echo "✅ Database connection test completed!"

# Now start the application
echo "🚀 Starting application..."
docker-compose up -d app

# Wait and check logs
sleep 15
echo "📋 Application logs:"
docker-compose logs app | tail -20