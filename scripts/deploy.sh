#!/bin/bash

# InventoryPro Deployment Script for Ubuntu
# This script sets up and deploys the inventory management system

set -e

echo "🚀 Starting InventoryPro deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed. Please log out and back in to use Docker without sudo."
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed."
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment configuration..."
    cat > .env << EOF
# Production Environment Configuration
POSTGRES_DB=inventorypro
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:\$(POSTGRES_PASSWORD)@postgres:5432/inventorypro

# Application Configuration
NODE_ENV=production
PORT=5000
APP_PORT=5000

# Session Configuration (IMPORTANT: Change this!)
SESSION_SECRET=$(openssl rand -base64 64)

# Authentication Configuration
ISSUER_URL=https://replit.com/oidc
REPL_ID=your_repl_id_here
REPLIT_DOMAINS=localhost:5000

# Logging
LOG_LEVEL=info
EOF
    echo "✅ Environment file created. Please edit .env with your specific values."
    echo "⚠️  IMPORTANT: Update REPL_ID and REPLIT_DOMAINS in .env file!"
fi

# Create logs directory
mkdir -p logs

# Build and start services
echo "🏗️  Building application..."
docker-compose build

echo "🗄️  Starting database and running migrations..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations using the builder stage with dev dependencies
echo "📊 Running database migrations..."
docker-compose run --rm app sh -c "npm install --include=dev && npm run db:push"

echo "🚀 Starting application..."
docker-compose up -d

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your application should be available at:"
echo "   http://localhost:5000"
echo ""
echo "📋 Management commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:       docker-compose restart"
echo "   Update:        ./scripts/update.sh"
echo ""
echo "⚠️  Remember to:"
echo "   1. Update .env with your actual domain and Repl ID"
echo "   2. Set up SSL/TLS certificate for production"
echo "   3. Configure firewall rules"
echo "   4. Set up regular backups"