#!/bin/bash
# InventoryPro Multi-Item Transaction Update Script
# Updates existing Docker deployment to support multi-item transactions

set -e

echo "🔄 InventoryPro Multi-Item Transaction Update"
echo "============================================="

# Configuration
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
PROJECT_NAME="inventorypro"

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

# Backup current database
backup_database() {
    print_status "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    if docker-compose exec -T postgres pg_dump -U postgres inventorypro > "$BACKUP_DIR/inventorypro_backup.sql"; then
        print_success "Database backup created: $BACKUP_DIR/inventorypro_backup.sql"
    else
        print_error "Failed to create database backup"
        exit 1
    fi
}

# Update database schema for multi-item transactions
update_schema() {
    print_status "Updating database schema for multi-item transactions..."
    
    # Check if unique constraint exists
    CONSTRAINT_EXISTS=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "
        SELECT COUNT(*) 
        FROM information_schema.table_constraints 
        WHERE table_name = 'sales' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%order_number%';
    " 2>/dev/null | tr -d ' \n' || echo "0")
    
    if [ "$CONSTRAINT_EXISTS" != "0" ]; then
        print_warning "Removing unique constraint on order_number to support multi-item transactions..."
        
        docker-compose exec -T postgres psql -U postgres -d inventorypro -c "
            ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_order_number_unique;
        " >/dev/null 2>&1
        
        print_success "Order number unique constraint removed"
    else
        print_success "Database schema already supports multi-item transactions"
    fi
    
    # Verify schema update
    NEW_CONSTRAINT_COUNT=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "
        SELECT COUNT(*) 
        FROM information_schema.table_constraints 
        WHERE table_name = 'sales' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%order_number%';
    " 2>/dev/null | tr -d ' \n' || echo "1")
    
    if [ "$NEW_CONSTRAINT_COUNT" = "0" ]; then
        print_success "Schema update verified: Multi-item transactions enabled"
    else
        print_error "Schema update failed: Unique constraint still exists"
        exit 1
    fi
}

# Update application code
update_application() {
    print_status "Updating application with multi-item transaction support..."
    
    # Stop application (keep database running)
    print_status "Stopping application container..."
    docker-compose stop app
    
    # Rebuild application with latest code
    print_status "Rebuilding application image..."
    docker-compose build --no-cache app
    
    # Start updated application
    print_status "Starting updated application..."
    docker-compose up -d app
    
    # Wait for application to be ready
    print_status "Waiting for application to restart..."
    sleep 10
    
    # Health check
    MAX_ATTEMPTS=20
    ATTEMPT=1
    
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        if curl -f http://localhost:5000/api/health &>/dev/null; then
            print_success "Application updated and running!"
            break
        else
            print_status "Attempt $ATTEMPT/$MAX_ATTEMPTS: Application starting..."
            sleep 3
            ((ATTEMPT++))
        fi
    done
    
    if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
        print_error "Application failed to start after update"
        print_status "Rolling back to previous state..."
        rollback_application
        exit 1
    fi
}

# Rollback application if update fails
rollback_application() {
    print_warning "Rolling back application..."
    
    # Restore database from backup
    if [ -f "$BACKUP_DIR/inventorypro_backup.sql" ]; then
        print_status "Restoring database from backup..."
        docker-compose exec -T postgres psql -U postgres -d inventorypro < "$BACKUP_DIR/inventorypro_backup.sql" >/dev/null 2>&1
        print_success "Database restored from backup"
    fi
    
    # Restart containers
    docker-compose restart
    
    print_warning "Rollback completed. Please check application status."
}

# Test multi-item transaction functionality
test_functionality() {
    print_status "Testing multi-item transaction functionality..."
    
    # Test inventory search endpoint
    if curl -f http://localhost:5000/api/inventory &>/dev/null; then
        print_success "✓ Inventory API responding"
    else
        print_error "✗ Inventory API not responding"
        return 1
    fi
    
    # Test sales endpoint
    if curl -f http://localhost:5000/api/sales &>/dev/null; then
        print_success "✓ Sales API responding"
    else
        print_error "✗ Sales API not responding"
        return 1
    fi
    
    # Check frontend is serving
    if curl -f http://localhost:5000 &>/dev/null; then
        print_success "✓ Frontend serving correctly"
    else
        print_error "✗ Frontend not serving"
        return 1
    fi
    
    # Test database connection
    if docker-compose exec -T postgres psql -U postgres -d inventorypro -c "SELECT COUNT(*) FROM sales;" &>/dev/null; then
        print_success "✓ Database connection working"
    else
        print_error "✗ Database connection failed"
        return 1
    fi
    
    print_success "All functionality tests passed!"
}

# Display update information
show_update_info() {
    print_success "Multi-item transaction update completed successfully!"
    echo ""
    echo "🛒 New Features Available:"
    echo "  • Shopping cart functionality in sales modal"
    echo "  • Multiple items per transaction"
    echo "  • QR code scanning for quick item addition"
    echo "  • Individual quantity adjustment per item"
    echo "  • Real-time stock validation"
    echo "  • Unified order numbers for transaction grouping"
    echo ""
    echo "📊 Application Status:"
    echo "  • URL: http://localhost:5000"
    echo "  • Database backup: $BACKUP_DIR/inventorypro_backup.sql"
    echo "  • Schema updated for multi-item support"
    echo ""
    echo "🔧 Next Steps:"
    echo "  • Test the new sales modal with multiple items"
    echo "  • Verify QR code scanning functionality"
    echo "  • Train users on the enhanced cart system"
    echo ""
}

# Main update flow
main() {
    echo "Starting update at $(date)"
    
    # Check if docker-compose is running
    if ! docker-compose ps | grep -q "Up"; then
        print_error "Docker containers are not running. Please start them first with: docker-compose up -d"
        exit 1
    fi
    
    print_warning "This update will modify your database schema and application code."
    print_warning "A backup will be created, but please ensure you have recent backups."
    echo ""
    read -p "Continue with the update? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Update cancelled by user"
        exit 0
    fi
    
    backup_database
    update_schema
    update_application
    test_functionality
    show_update_info
    
    echo ""
    print_success "Multi-item transaction update completed at $(date)"
}

# Run main function
main "$@"