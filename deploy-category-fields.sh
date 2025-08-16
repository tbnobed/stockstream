#!/bin/bash
# InventoryPro Category Fields Deployment Script
# Deploys new inventory categorization fields (Design, Group Type, Style Group)
# Compatible with existing multi-item transaction deployments

set -e

echo "🏷️  InventoryPro Category Fields Deployment"
echo "==========================================="

# Configuration
BACKUP_DIR="./backups/category_fields_$(date +%Y%m%d_%H%M%S)"
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

# Check if Docker deployment is running
check_deployment() {
    print_status "Checking existing deployment..."
    
    if ! docker-compose ps | grep -q "Up"; then
        print_error "No running InventoryPro deployment found"
        print_status "Please run deploy-multi-item.sh first to set up the initial deployment"
        exit 1
    fi
    
    print_success "Found running deployment"
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

# Add category fields to database schema
add_category_fields() {
    print_status "Adding category fields to inventory schema..."
    
    docker-compose exec -T postgres psql -U postgres -d inventorypro -c "
        DO \$\$
        BEGIN
            -- Add design column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'inventory_items' 
                AND column_name = 'design' 
                AND table_schema = 'public'
            ) THEN
                ALTER TABLE inventory_items ADD COLUMN design TEXT;
                RAISE NOTICE 'Added design column to inventory_items';
            ELSE
                RAISE NOTICE 'Design column already exists';
            END IF;
            
            -- Add group_type column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'inventory_items' 
                AND column_name = 'group_type' 
                AND table_schema = 'public'
            ) THEN
                ALTER TABLE inventory_items ADD COLUMN group_type TEXT;
                RAISE NOTICE 'Added group_type column to inventory_items';
            ELSE
                RAISE NOTICE 'Group_type column already exists';
            END IF;
            
            -- Add style_group column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'inventory_items' 
                AND column_name = 'style_group' 
                AND table_schema = 'public'
            ) THEN
                ALTER TABLE inventory_items ADD COLUMN style_group TEXT;
                RAISE NOTICE 'Added style_group column to inventory_items';
            ELSE
                RAISE NOTICE 'Style_group column already exists';
            END IF;
            
            RAISE NOTICE 'Category fields migration completed successfully';
        END \$\$;
    " && print_success "Category fields added to inventory schema" || (print_error "Failed to add category fields" && exit 1)
}

# Update application with new code
update_application() {
    print_status "Updating application with category field support..."
    
    # Stop application (keep database running)
    print_status "Stopping application container..."
    docker-compose stop app
    
    # Rebuild application with latest code
    print_status "Rebuilding application image with category fields..."
    docker-compose build --no-cache app
    
    # Start updated application
    print_status "Starting updated application..."
    docker-compose up -d app
    
    # Wait for application to be ready
    print_status "Waiting for application to restart..."
    sleep 10
}

# Verify deployment
verify_deployment() {
    print_status "Verifying category fields deployment..."
    
    # Health check
    MAX_ATTEMPTS=20
    ATTEMPT=1
    
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        if curl -f http://localhost:5000/api/health &>/dev/null; then
            print_success "Application health check passed!"
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
        rollback_deployment
        exit 1
    fi
    
    # Verify category fields exist in database
    print_status "Verifying category fields in database..."
    
    DESIGN_EXISTS=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "
        SELECT EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'inventory_items' 
            AND column_name = 'design' 
            AND table_schema = 'public'
        );
    " 2>/dev/null | tr -d ' \n' || echo "f")
    
    GROUP_TYPE_EXISTS=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "
        SELECT EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'inventory_items' 
            AND column_name = 'group_type' 
            AND table_schema = 'public'
        );
    " 2>/dev/null | tr -d ' \n' || echo "f")
    
    STYLE_GROUP_EXISTS=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "
        SELECT EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'inventory_items' 
            AND column_name = 'style_group' 
            AND table_schema = 'public'
        );
    " 2>/dev/null | tr -d ' \n' || echo "f")
    
    if [ "$DESIGN_EXISTS" = "t" ] && [ "$GROUP_TYPE_EXISTS" = "t" ] && [ "$STYLE_GROUP_EXISTS" = "t" ]; then
        print_success "All category fields verified in database schema"
    else
        print_error "Category fields verification failed"
        print_error "Design: $DESIGN_EXISTS, Group Type: $GROUP_TYPE_EXISTS, Style Group: $STYLE_GROUP_EXISTS"
        exit 1
    fi
}

# Rollback deployment if update fails
rollback_deployment() {
    print_warning "Rolling back deployment..."
    
    # Restore database from backup
    if [ -f "$BACKUP_DIR/inventorypro_backup.sql" ]; then
        print_status "Restoring database from backup..."
        docker-compose exec -T postgres psql -U postgres -d inventorypro < "$BACKUP_DIR/inventorypro_backup.sql" >/dev/null 2>&1
        print_success "Database restored from backup"
    fi
    
    # Restart application
    print_status "Restarting application..."
    docker-compose restart app
    
    print_warning "Rollback completed"
}

# Show completion summary
show_summary() {
    echo ""
    echo "🎉 Category Fields Deployment Summary"
    echo "====================================="
    echo ""
    print_success "✅ Database backup created: $BACKUP_DIR"
    print_success "✅ Category fields added to inventory_items table:"
    print_success "   • design (e.g., Lipstick, Cancer, Event-Specific)"
    print_success "   • group_type (e.g., Supporter, Ladies, Member-Only)"
    print_success "   • style_group (e.g., T-Shirt, V-Neck, Tank Top)"
    print_success "✅ Application updated with category field support"
    print_success "✅ Enhanced search functionality across all fields"
    print_success "✅ Form validation and UI components updated"
    echo ""
    print_status "🌐 Your application is now available at: http://localhost:5000"
    print_status "🗃️  Admin login: username 'admin', password 'ADMIN1'"
    echo ""
    print_status "💡 New inventory items can now include:"
    print_status "   • Design categorization for visual themes"
    print_status "   • Group Type for customer segments"
    print_status "   • Style Group for product variations"
    echo ""
}

# Main execution
main() {
    echo ""
    print_status "Starting category fields deployment process..."
    echo ""
    
    check_deployment
    backup_database
    add_category_fields
    update_application
    verify_deployment
    
    show_summary
    
    print_success "Category fields deployment completed successfully! 🎯"
    echo ""
}

# Execute main function
main "$@"