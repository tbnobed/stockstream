#!/bin/bash

# Quick fix for the current Docker path issue
echo "🚀 Applying quick fix for Docker path resolution..."

# Rebuild the Docker image with a simpler approach
docker-compose down

# Update the build command to use a compatible version
echo "📦 Rebuilding with path fix..."

# Create a temporary fixed version of the build
cat > temp-build.js << 'EOF'
import { execSync } from 'child_process';

// Build frontend
console.log('Building frontend...');
execSync('vite build', { stdio: 'inherit' });

// Build backend with bundle false to preserve import.meta
console.log('Building backend...');
execSync('esbuild server/index.ts --platform=node --packages=external --format=esm --outdir=dist --bundle=false', { stdio: 'inherit' });
EOF

# Run the fixed build
node temp-build.js

# Clean up
rm temp-build.js

# Restart Docker
docker-compose build app
docker-compose up -d

echo "✅ Quick fix applied! Check if the application is now running."