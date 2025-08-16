#!/bin/bash

# Production database seeding script
# Creates the default admin account if it doesn't exist

echo "🌱 Checking and creating default admin account..."

# Run the seeding script inside the Docker container
docker-compose run --rm app node scripts/seed-docker.js

echo "✅ Admin account setup completed!"