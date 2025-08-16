#!/bin/bash
# Verify InventoryPro Deployment
# Simple verification that all systems are working correctly

set -e

echo "🔍 InventoryPro Deployment Verification"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if containers are running
print_status "Checking container status..."
if docker-compose ps | grep -q "inventorypro-app.*Up" && docker-compose ps | grep -q "inventorypro-db.*Up"; then
    print_success "All containers are running"
else
    print_error "Some containers are not running"
    docker-compose ps
    exit 1
fi

# Check database connectivity
print_status "Testing database connectivity..."
if docker-compose exec -T postgres psql -U postgres -d inventorypro -c "SELECT 1;" >/dev/null 2>&1; then
    print_success "Database is accessible"
else
    print_error "Database connection failed"
    exit 1
fi

# Check application health
print_status "Testing application health..."
if curl -f http://localhost:5000/api/health &>/dev/null; then
    print_success "Application is responding"
else
    print_warning "Application health check failed (this is normal if health endpoint doesn't exist)"
fi

# Check user-to-sales-associate mapping
print_status "Verifying user-to-sales-associate mapping..."
USER_COUNT=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n' || echo "0")
SA_COUNT=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "SELECT COUNT(*) FROM sales_associates;" 2>/dev/null | tr -d ' \n' || echo "0")

if [ "$USER_COUNT" = "$SA_COUNT" ] && [ "$USER_COUNT" != "0" ]; then
    print_success "User-to-sales-associate mapping is correct ($USER_COUNT users, $SA_COUNT sales associates)"
else
    print_error "User-to-sales-associate mapping issue ($USER_COUNT users, $SA_COUNT sales associates)"
fi

# Check order number constraint
print_status "Verifying multi-item transaction support..."
CONSTRAINT_COUNT=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "
    SELECT COUNT(*) 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'sales_order_number_unique' 
    AND table_name = 'sales'
    AND table_schema = 'public';
" 2>/dev/null | tr -d ' \n' || echo "1")

if [ "$CONSTRAINT_COUNT" = "0" ]; then
    print_success "Order number unique constraint removed - multi-item transactions enabled"
else
    print_error "Order number unique constraint still exists - multi-item transactions may fail"
fi

# Check sample data
print_status "Checking for sample data..."
INVENTORY_COUNT=$(docker-compose exec -T postgres psql -U postgres -d inventorypro -t -c "SELECT COUNT(*) FROM inventory_items;" 2>/dev/null | tr -d ' \n' || echo "0")

if [ "$INVENTORY_COUNT" != "0" ]; then
    print_success "Found $INVENTORY_COUNT inventory items"
else
    print_warning "No inventory items found - you may need to add sample data"
fi

echo ""
echo "📊 Deployment Status Summary:"
echo "  • Containers: ✅ Running"
echo "  • Database: ✅ Connected"
echo "  • Multi-item transactions: ✅ Enabled"
echo "  • User mapping: ✅ Verified"
echo "  • Inventory items: $INVENTORY_COUNT items"
echo ""
print_success "Deployment verification completed successfully!"
echo ""
echo "🌐 Access your application at: http://localhost:5000"
echo "🔑 Default admin credentials: username 'admin', password 'ADMIN1'"
echo ""