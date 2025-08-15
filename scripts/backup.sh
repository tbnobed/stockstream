#!/bin/bash

# Database Backup Script
# Creates automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d-%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

echo "💾 Starting database backup..."

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Create backup
docker-compose exec -T postgres pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-inventorypro} > "$BACKUP_DIR/inventorypro-$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/inventorypro-$DATE.sql"

echo "✅ Backup created: $BACKUP_DIR/inventorypro-$DATE.sql.gz"

# Clean old backups (older than retention period)
echo "🧹 Cleaning old backups (older than $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "inventorypro-*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup completed successfully!"

# Optional: Upload to cloud storage (uncomment and configure as needed)
# if [ ! -z "$AWS_S3_BUCKET" ]; then
#     echo "☁️  Uploading to S3..."
#     aws s3 cp "$BACKUP_DIR/inventorypro-$DATE.sql.gz" "s3://$AWS_S3_BUCKET/backups/"
# fi