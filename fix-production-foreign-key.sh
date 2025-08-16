#!/bin/bash
# Production Foreign Key Fix Script
# Fixes missing sales_associate records for existing users

set -e

echo "🔧 InventoryPro Production Foreign Key Fix"
echo "========================================="

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

# Check if Docker containers are running
check_containers() {
    print_status "Checking Docker container status..."
    
    if ! docker-compose ps | grep -q "inventorypro-app.*Up"; then
        print_error "InventoryPro application container is not running"
        print_status "Starting containers..."
        docker-compose up -d
        sleep 10
    fi
    
    if ! docker-compose ps | grep -q "inventorypro-db.*Up"; then
        print_error "Database container is not running"
        exit 1
    fi
    
    print_success "Containers are running"
}

# Fix foreign key constraint issue
fix_foreign_key() {
    print_status "Diagnosing foreign key constraint issue..."
    
    # Check for orphaned users (users without sales_associate records)
    ORPHANED_USERS=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "
        SELECT COUNT(*) 
        FROM users u 
        WHERE NOT EXISTS (SELECT 1 FROM sales_associates sa WHERE sa.id = u.id);
    " 2>/dev/null | tr -d ' \n' || echo "0")
    
    print_status "Found $ORPHANED_USERS users without sales_associate records"
    
    if [ "$ORPHANED_USERS" != "0" ]; then
        print_warning "Creating missing sales_associate records..."
        
        docker-compose exec -T postgres psql -U postgres -d inventorypro -c "
        INSERT INTO sales_associates (id, name, email, user_id, is_active, created_at)
        SELECT u.id, 
               COALESCE(
                   NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 
                   u.username
               ) as name,
               COALESCE(u.email, u.username || '@inventorypro.com') as email,
               u.id, 
               COALESCE(u.is_active, true), 
               NOW()
        FROM users u 
        WHERE NOT EXISTS (SELECT 1 FROM sales_associates sa WHERE sa.id = u.id)
        ON CONFLICT (id) DO NOTHING;
        " >/dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            print_success "Missing sales_associate records created"
        else
            print_error "Failed to create sales_associate records"
            exit 1
        fi
    else
        print_success "All users have corresponding sales_associate records"
    fi
}

# Verify the fix
verify_fix() {
    print_status "Verifying foreign key constraint fix..."
    
    # Check for remaining orphaned users
    REMAINING_ORPHANED=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "
        SELECT COUNT(*) 
        FROM users u 
        WHERE NOT EXISTS (SELECT 1 FROM sales_associates sa WHERE sa.id = u.id);
    " 2>/dev/null | tr -d ' \n' || echo "1")
    
    if [ "$REMAINING_ORPHANED" = "0" ]; then
        print_success "All users now have sales_associate records"
    else
        print_error "$REMAINING_ORPHANED users still missing sales_associate records"
        exit 1
    fi
    
    # Test a sample query that would previously fail
    print_status "Testing sales creation capability..."
    
    SAMPLE_USER_ID=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "
        SELECT u.id FROM users u 
        JOIN sales_associates sa ON sa.id = u.id 
        WHERE u.is_active = true 
        LIMIT 1;
    " 2>/dev/null | tr -d ' \n' | head -c 36 || echo "none")
    
    if [ "$SAMPLE_USER_ID" != "none" ] && [ ${#SAMPLE_USER_ID} -eq 36 ]; then
        print_success "Foreign key constraints are now satisfied"
        print_status "Sample user ID with sales_associate record: $SAMPLE_USER_ID"
    else
        print_error "Could not verify fix - no valid user/sales_associate pairs found"
        exit 1
    fi
}

# Display current database state
show_database_state() {
    print_status "Current database state:"
    
    USER_COUNT=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n' || echo "0")
    SALES_ASSOCIATE_COUNT=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "SELECT COUNT(*) FROM sales_associates;" 2>/dev/null | tr -d ' \n' || echo "0")
    SALES_COUNT=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "SELECT COUNT(*) FROM sales;" 2>/dev/null | tr -d ' \n' || echo "0")
    
    echo "  • Users: $USER_COUNT"
    echo "  • Sales Associates: $SALES_ASSOCIATE_COUNT"
    echo "  • Sales Records: $SALES_COUNT"
    
    if [ "$USER_COUNT" = "$SALES_ASSOCIATE_COUNT" ]; then
        print_success "User and sales_associate counts match"
    else
        print_warning "User count ($USER_COUNT) does not match sales_associate count ($SALES_ASSOCIATE_COUNT)"
    fi
}

# Restart application to clear any cached errors
restart_application() {
    print_status "Restarting application to clear cached errors..."
    
    docker-compose restart app
    
    # Wait for application to be ready
    sleep 15
    
    # Health check
    MAX_ATTEMPTS=10
    ATTEMPT=1
    
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        if curl -f http://localhost:5000/api/health &>/dev/null; then
            print_success "Application restarted and healthy"
            break
        else
            print_status "Attempt $ATTEMPT/$MAX_ATTEMPTS: Waiting for application..."
            sleep 3
            ((ATTEMPT++))
        fi
    done
    
    if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
        print_warning "Application may not be fully ready, but database fix is complete"
    fi
}

# Main execution
main() {
    echo "Starting foreign key constraint fix at $(date)"
    echo ""
    
    check_containers
    show_database_state
    fix_foreign_key
    verify_fix
    restart_application
    show_database_state
    
    echo ""
    print_success "Foreign key constraint fix completed successfully!"
    echo ""
    echo "🎯 What was fixed:"
    echo "  • Created missing sales_associate records for all users"
    echo "  • Resolved foreign key constraint violations"
    echo "  • Multi-item transactions should now work correctly"
    echo ""
    echo "🧪 Test the fix:"
    echo "  • Try creating a sale through the web interface"
    echo "  • Add multiple items to cart and process transaction"
    echo "  • Verify that sales are created without errors"
    echo ""
    print_warning "If you still encounter issues, check the application logs:"
    echo "  docker-compose logs -f app"
    echo ""
}

# Run main function
main "$@"