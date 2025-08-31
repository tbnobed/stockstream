#!/bin/bash
# Force complete Docker cache refresh

echo "🔄 Forcing complete Docker cache refresh..."

# Stop and remove everything
docker-compose down -v --remove-orphans

# Remove all cached images and builds
docker system prune -a --volumes -f

# Remove any old containers
docker container prune -f

# Remove any old images
docker image prune -a -f

# Rebuild completely from scratch
echo "🔨 Rebuilding completely from scratch..."
docker-compose build --no-cache --pull

# Start fresh
echo "🚀 Starting fresh deployment..."
docker-compose up -d

echo "✅ Complete cache refresh finished!"
echo "📋 View logs with: docker-compose logs -f"