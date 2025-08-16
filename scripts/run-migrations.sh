#!/bin/bash

# Run database migrations and seeding with proper permissions
echo "🔧 Running database setup..."

# Run migrations as root to avoid permission issues
docker-compose run --rm --user root app sh -c "
  chown -R nextjs:nodejs /app && 
  su nextjs -c 'npm install --include=dev' && 
  su nextjs -c 'npm run db:push'
"

# Run seeding
echo "🌱 Creating admin account..."
docker-compose run --rm app npx tsx scripts/seed-docker.js

echo "✅ Database setup completed!"