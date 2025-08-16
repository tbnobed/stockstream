#!/bin/bash
set -e

# InventoryPro Docker Deployment Script
# Complete deployment automation with clean build and database setup

echo "InventoryPro Docker Deployment"
echo "=============================="

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null; then
    echo "Docker Compose not found. Please install Docker Compose."
    exit 1
fi

# Use docker compose or docker-compose depending on what's available
if command -v docker compose &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo "Using: $DOCKER_COMPOSE"

# Clean up any existing containers and volumes
echo "Cleaning up existing deployment..."
$DOCKER_COMPOSE down -v
docker system prune -f

# Remove any existing images to ensure clean build
echo "Removing existing images..."
$DOCKER_COMPOSE down --rmi all 2>/dev/null || true

# Build the application with no cache
echo "Building application (clean build)..."
$DOCKER_COMPOSE build --no-cache --parallel

# Start the database first
echo "Starting PostgreSQL database..."
$DOCKER_COMPOSE up -d postgres

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Verify database is responsive
echo "Verifying database connection..."
timeout=60
counter=0
while ! $DOCKER_COMPOSE exec -T postgres pg_isready -U postgres -d inventorypro &>/dev/null; do
    counter=$((counter + 1))
    if [ $counter -gt $timeout ]; then
        echo "Database failed to start within $timeout seconds"
        $DOCKER_COMPOSE logs postgres
        exit 1
    fi
    echo "  Waiting for database... ($counter/$timeout)"
    sleep 1
done

echo "Database is ready"

# Start the application
echo "Starting application..."
$DOCKER_COMPOSE up -d app

# Wait for application startup
echo "Waiting for application startup..."
sleep 15

# Display deployment status
echo ""
echo "Deployment Successful!"
echo "====================="
echo "Application URL: http://localhost:5000"
echo "Admin Login:"
echo "   Username: admin"
echo "   Password: ADMIN1"
echo ""
echo "Useful commands:"
echo "   View logs:        $DOCKER_COMPOSE logs -f"
echo "   Stop services:    $DOCKER_COMPOSE down"
echo "   Restart app:      $DOCKER_COMPOSE restart app"
echo "   Database access:  $DOCKER_COMPOSE exec postgres psql -U postgres -d inventorypro"
echo ""

echo "InventoryPro is ready for use!"