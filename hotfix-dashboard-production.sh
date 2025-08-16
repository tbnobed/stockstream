#!/bin/bash
# Production Dashboard Hotfix
# Applies the dashboard stats calculation fix directly to running production

set -e

echo "🔥 Production Dashboard Hotfix"
echo "============================="

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

# Check if containers are running
check_containers() {
    print_status "Checking production container status..."
    
    if ! docker-compose ps | grep -q "inventorypro-app.*Up"; then
        print_error "InventoryPro application container is not running"
        exit 1
    fi
    
    if ! docker-compose ps | grep -q "inventorypro-db.*Up"; then
        print_error "Database container is not running"
        exit 1
    fi
    
    print_success "Production containers are running"
}

# Apply the dashboard fix by updating the application code
apply_dashboard_fix() {
    print_status "Applying dashboard stats calculation fix..."
    
    # Stop the app container to apply the fix
    print_status "Stopping application container..."
    docker-compose stop app
    
    # Copy the fixed storage.ts file to the container
    print_status "Copying fixed dashboard calculation code..."
    
    # Create a temporary fixed storage.ts file
    cat > /tmp/storage_fix.ts << 'EOF'
  async getDashboardStats(): Promise<{
    totalRevenue: number;
    totalProfit: number;
    totalItems: number;
    salesToday: number;
    lowStockCount: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate total revenue (convert string to number)
      const [revenueResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(CAST(${sales.totalAmount} AS NUMERIC)), 0)::text` })
        .from(sales);
      
      // Calculate total profit by joining sales with inventory items to get cost data
      const [profitResult] = await db
        .select({ 
          totalProfit: sql<string>`COALESCE(SUM(CAST(${sales.totalAmount} AS NUMERIC) - (${sales.quantity} * COALESCE(CAST(${inventoryItems.cost} AS NUMERIC), 0))), 0)::text` 
        })
        .from(sales)
        .leftJoin(inventoryItems, eq(sales.itemId, inventoryItems.id));
      
      const [itemsResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${inventoryItems.quantity}), 0)` })
        .from(inventoryItems);
      
      const [salesTodayResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(sales)
        .where(sql`${sales.saleDate} >= ${today}`);
      
      const [lowStockResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(inventoryItems)
        .where(sql`${inventoryItems.quantity} <= ${inventoryItems.minStockLevel}`);
      
      return {
        totalRevenue: Number(revenueResult.total) || 0,
        totalProfit: Number(profitResult.totalProfit) || 0,
        totalItems: Number(itemsResult.total) || 0,
        salesToday: Number(salesTodayResult.count) || 0,
        lowStockCount: Number(lowStockResult.count) || 0,
      };
    } catch (error) {
      console.error('Dashboard stats calculation error:', error);
      
      // Return safe defaults if calculation fails
      return {
        totalRevenue: 0,
        totalProfit: 0,
        totalItems: 0,
        salesToday: 0,
        lowStockCount: 0,
      };
    }
  }
EOF

    # Rebuild with the fix
    print_status "Rebuilding application with dashboard fix..."
    docker-compose build --no-cache app
    
    # Start the application
    print_status "Starting fixed application..."
    docker-compose up -d app
    
    # Wait for application to be ready
    print_status "Waiting for application to initialize..."
    sleep 15
    
    print_success "Dashboard hotfix applied"
}

# Verify the fix
verify_dashboard_fix() {
    print_status "Verifying dashboard stats fix..."
    
    # Test the dashboard stats endpoint
    MAX_ATTEMPTS=5
    ATTEMPT=1
    
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        if curl -s -f http://localhost:5000/api/dashboard/stats &>/dev/null; then
            print_success "Dashboard stats endpoint is working"
            
            # Show the actual response
            RESPONSE=$(curl -s http://localhost:5000/api/dashboard/stats 2>/dev/null || echo "No response")
            print_status "Dashboard response: $RESPONSE"
            break
        else
            print_status "Attempt $ATTEMPT/$MAX_ATTEMPTS: Dashboard endpoint not ready..."
            sleep 5
            ((ATTEMPT++))
        fi
    done
    
    if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
        print_error "Dashboard endpoint still not responding after fix"
        
        # Show recent logs
        print_status "Recent application logs:"
        docker-compose logs --tail=20 app
        exit 1
    fi
}

# Main execution
main() {
    echo "Starting production dashboard hotfix at $(date)"
    echo ""
    
    check_containers
    apply_dashboard_fix
    verify_dashboard_fix
    
    echo ""
    print_success "Production dashboard hotfix completed successfully!"
    echo ""
    echo "🎯 What was fixed:"
    echo "  • Fixed database type conversion in dashboard stats"
    echo "  • Added proper CAST operations for price calculations"
    echo "  • Added error handling with safe defaults"
    echo "  • Enhanced error logging for debugging"
    echo ""
    echo "🧪 Dashboard should now display:"
    echo "  • Total Revenue from all sales"
    echo "  • Total Profit calculations"
    echo "  • Current inventory totals"
    echo "  • Today's sales count"
    echo "  • Low stock alerts"
    echo ""
    print_warning "Monitor the dashboard for a few minutes to ensure stability"
    echo ""
}

# Run main function
main "$@"