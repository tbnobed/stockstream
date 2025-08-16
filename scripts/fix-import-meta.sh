#!/bin/bash

# Fix import.meta.dirname issue in Docker environment
# This script patches the built server to use __dirname instead

echo "🔧 Fixing import.meta.dirname issue in Docker build..."

# First, let's rebuild with a different approach
echo "📦 Rebuilding server with proper path resolution..."

# Update the esbuild command to inject __dirname
npm run build:server-fixed

echo "✅ Server rebuilt with path fix!"