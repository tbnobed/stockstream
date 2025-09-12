#!/bin/bash
# InventoryPro Multi-Item Transaction Deployment Script
# Updated for Docker deployment with enhanced multi-item transaction support

set -e

echo "🚀 InventoryPro Multi-Item Transaction Deployment"
echo "================================================="

# Configuration
PROJECT_NAME="inventorypro"
DOCKER_TAG="latest"
ENV_FILE=".env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f "$ENV_FILE" ]; then
        print_status "Creating environment file from template..."
        
        cat > "$ENV_FILE" << EOF
# InventoryPro Environment Configuration
# Multi-Item Transaction Support Enabled

# Database Configuration
POSTGRES_DB=inventorypro
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SecureInventoryPassword2025!
POSTGRES_PORT=5432

# Application Configuration
APP_PORT=5000
NODE_ENV=production
SESSION_SECRET=$(openssl rand -hex 32)

# Multi-Item Transaction Features
ENABLE_MULTI_ITEM_CART=true
DEFAULT_QUANTITY=1
MAX_CART_ITEMS=50

# QR Scanner Configuration
QR_SCANNER_TIMEOUT=8000
MOBILE_DEVICE_SUPPORT=true
REPLIT_IFRAME_SUPPORT=true

# Payment Configuration
VENMO_USERNAME=AxemenMCAZ
EOF
        
        print_success "Environment file created: $ENV_FILE"
        print_warning "Please review and update the environment variables as needed"
    else
        print_success "Environment file already exists: $ENV_FILE"
    fi
}

# Build and deploy application
deploy_application() {
    print_status "Building and deploying application..."
    
    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose down || true
    
    # Remove old images to ensure fresh build
    print_status "Cleaning up old images..."
    docker-compose down --rmi all --volumes --remove-orphans || true
    
    # Build new images
    print_status "Building application images..."
    docker-compose build --no-cache
    
    # Start services
    print_status "Starting services..."
    docker-compose up -d
    
    # Wait for application to be ready
    print_status "Waiting for application to be ready..."
    sleep 15
    
    # Health check
    MAX_ATTEMPTS=30
    ATTEMPT=1
    
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        if curl -f http://localhost:5000/api/health &>/dev/null; then
            print_success "Application is healthy and ready!"
            break
        else
            print_status "Attempt $ATTEMPT/$MAX_ATTEMPTS: Application not ready yet..."
            sleep 5
            ((ATTEMPT++))
        fi
    done
    
    if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
        print_error "Application failed to start properly"
        print_status "Checking logs..."
        docker-compose logs app
        exit 1
    fi
}

# Verify multi-item transaction features
verify_features() {
    print_status "Verifying multi-item transaction features..."
    
    # Check database schema
    print_status "Checking database schema for multi-item support..."
    if docker-compose exec -T postgres psql -U postgres -d inventorypro -c "
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'sales' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%order_number%';
    " 2>/dev/null | grep -q "order_number"; then
        print_error "CRITICAL: Unique constraint on order_number still exists!"
        print_error "This will prevent multi-item transactions from working."
        exit 1
    else
        print_success "Database schema supports multi-item transactions"
    fi
    
    # Test API endpoints
    print_status "Testing critical API endpoints..."
    
    # Test inventory search
    if curl -f http://localhost:5000/api/inventory &>/dev/null; then
        print_success "Inventory API is working"
    else
        print_error "Inventory API is not responding"
        exit 1
    fi
    
    # Test sales API
    if curl -f http://localhost:5000/api/sales &>/dev/null; then
        print_success "Sales API is working"
    else
        print_error "Sales API is not responding"
        exit 1
    fi
    
    print_success "All feature verification checks passed!"
}

# Display deployment information
show_deployment_info() {
    print_success "Deployment completed successfully!"
    echo ""
    echo "🎉 InventoryPro Multi-Item Transaction System is now running!"
    echo ""
    echo "📊 Application Details:"
    echo "  • URL: http://localhost:5000"
    echo "  • Admin Username: admin"
    echo "  • Admin Password: ADMIN1"
    echo "  • Database: PostgreSQL (localhost:5432)"
    echo ""
    echo "🛒 Multi-Item Features:"
    echo "  • Shopping cart functionality"
    echo "  • QR code scanning for quick item addition"
    echo "  • Multiple items per transaction"
    echo "  • Quantity adjustment per item"
    echo "  • Stock validation and prevention of overselling"
    echo "  • Unified order numbers for transaction grouping"
    echo ""
    echo "🔧 Management Commands:"
    echo "  • View logs: docker-compose logs -f"
    echo "  • Restart: docker-compose restart"
    echo "  • Stop: docker-compose down"
    echo "  • Database backup: docker-compose exec postgres pg_dump -U postgres inventorypro > backup.sql"
    echo ""
    print_warning "Remember to change the default admin password after first login!"
}

# Main deployment flow
main() {
    echo "Starting deployment at $(date)"
    
    check_prerequisites
    setup_environment
    deploy_application
    verify_features
    show_deployment_info
    
    echo ""
    print_success "Multi-item transaction deployment completed at $(date)"
}

# Run main function
main "$@"