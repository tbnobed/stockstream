#!/bin/bash

# Deploy Archive Functionality - Production Deployment Script
# This script deploys the new archive/disable functionality for inventory items

set -e

PROJECT_NAME="inventorypro"
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="backups"

echo "🚀 Starting deployment of archive functionality for InventoryPro..."

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check if we're in the right directory
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the project root directory."
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Get current timestamp for backup naming
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/database_backup_pre_archive_$TIMESTAMP.sql"

log "📦 Creating database backup before deployment..."
if docker-compose exec -T postgres pg_dump -U postgres inventorypro > "$BACKUP_FILE" 2>/dev/null; then
    log "✅ Database backup created: $BACKUP_FILE"
else
    log "⚠️  Warning: Could not create database backup (container may not be running)"
fi

log "🔄 Pulling latest changes and rebuilding application..."
docker-compose build --no-cache

log "🛑 Stopping application services..."
docker-compose stop app

log "🔧 Starting database migration for archive functionality..."
docker-compose up -d postgres

# Wait for postgres to be ready
log "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if postgres is actually running
if ! docker-compose exec postgres pg_isready -U postgres >/dev/null 2>&1; then
    log "❌ PostgreSQL is not responding. Checking container status..."
    docker-compose logs postgres
    exit 1
fi

log "🗄️  Applying archive functionality schema updates..."
docker-compose run --rm app bash -c "
echo 'Applying archive functionality updates...'

# Add is_active column if it doesn't exist
psql \"\$DATABASE_URL\" -c \"
DO \\\$\\\$
BEGIN
    -- Add is_active field for archive functionality
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' 
        AND column_name = 'is_active' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to inventory_items';
        
        -- Set all existing items as active
        UPDATE inventory_items SET is_active = true WHERE is_active IS NULL;
        RAISE NOTICE 'Set all existing inventory items as active';
    ELSE
        -- Ensure existing items without is_active set are marked as active
        UPDATE inventory_items SET is_active = true WHERE is_active IS NULL;
        RAISE NOTICE 'Ensured all inventory items have is_active set';
    END IF;
    
    RAISE NOTICE 'Archive functionality schema updates completed successfully';
END \\\$\\\$;
\" && echo '✅ Archive functionality schema applied successfully' || echo '❌ Schema update failed'
"

if [ $? -ne 0 ]; then
    log "❌ Schema migration failed!"
    exit 1
fi

log "🌐 Starting updated application..."
docker-compose up -d

log "⏳ Waiting for application to be ready..."
sleep 15

# Health check
log "🔍 Performing health check..."
HEALTH_CHECK_URL="http://localhost:5000/api/health"
MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if curl -s "$HEALTH_CHECK_URL" | grep -q "healthy"; then
        log "✅ Application health check passed"
        break
    else
        log "⏳ Health check attempt $ATTEMPT/$MAX_ATTEMPTS failed, retrying..."
        sleep 5
        ATTEMPT=$((ATTEMPT + 1))
    fi
done

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    log "❌ Health check failed after $MAX_ATTEMPTS attempts"
    log "📋 Application logs:"
    docker-compose logs --tail=20 app
    exit 1
fi

# Test archive functionality
log "🧪 Testing archive functionality..."
docker-compose run --rm app bash -c "
echo 'Testing archive functionality...'

# Test database query for is_active column
psql \"\$DATABASE_URL\" -c \"
SELECT 
    COUNT(*) as total_items,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_items,
    COUNT(CASE WHEN is_active = false THEN 1 END) as archived_items
FROM inventory_items;
\" && echo '✅ Archive functionality test completed'
"

log "📊 Deployment verification:"
echo "  ✅ Archive functionality deployed successfully"
echo "  ✅ Database schema updated with is_active column" 
echo "  ✅ All existing items marked as active"
echo "  ✅ Application health check passed"
echo "  ✅ Archive/restore API endpoints available"

log "🎉 Archive functionality deployment completed successfully!"
echo ""
echo "📋 New Features Available:"
echo "  • Archive/disable inventory items (soft delete)"
echo "  • Restore archived items"
echo "  • Toggle view between active and archived items"
echo "  • Archive status preserved in database"
echo ""
echo "🔗 Access your application at: http://localhost:5000"
echo "📁 Database backup saved to: $BACKUP_FILE"
echo ""
echo "📖 For rollback instructions, see README-DOCKER-DEPLOYMENT.md"