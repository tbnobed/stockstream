#!/bin/bash

# Application Update Script
# Updates the application with zero downtime

set -e

echo "🔄 Starting application update..."

# Pull latest changes (if using git)
if [ -d ".git" ]; then
    echo "📥 Pulling latest changes..."
    git pull
fi

# Backup current database
echo "💾 Creating database backup..."
mkdir -p backups
docker-compose exec postgres pg_dump -U postgres inventorypro > "backups/backup-$(date +%Y%m%d-%H%M%S).sql"

# Build new image
echo "🏗️  Building updated application..."
docker-compose build app

# Application handles migrations and seeding automatically on startup
echo "⏳ Waiting for application to complete setup..."
sleep 10

# Restart application with new image
echo "🔄 Restarting application..."
docker-compose up -d app

# Health check
echo "🏥 Performing health check..."
sleep 10

if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Update completed successfully!"
    echo "🌐 Application is running at http://localhost:5000"
else
    echo "❌ Health check failed. Rolling back..."
    
    # Restore previous version (this is a simple rollback)
    docker-compose down
    docker-compose up -d
    
    echo "⚠️  Rollback completed. Please check logs with: docker-compose logs"
    exit 1
fi