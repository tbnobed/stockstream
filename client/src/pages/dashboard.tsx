import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Header from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NewSaleModal from "@/components/modals/new-sale-modal";
import AddInventoryModal from "@/components/modals/add-inventory-modal";
import PrintLabelsModal from "@/components/modals/print-labels-modal";
import { useAuth } from "@/hooks/useAuth";
import { 
  DollarSign, 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  ArrowUpRight,
  ScanBarcode,
  QrCode,
  Search,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [showPrintLabelsModal, setShowPrintLabelsModal] = useState(false);
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin';

  const { data: stats = {}, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentSales = [], isLoading: salesLoading } = useQuery<any[]>({
    queryKey: ["/api/sales"],
  });

  const { data: lowStockItems = [], isLoading: lowStockLoading } = useQuery<any[]>({
    queryKey: ["/api/inventory/low-stock"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening today."
        onNewSale={() => setShowNewSaleModal(true)}
        onAddInventory={() => setShowAddInventoryModal(true)}
      />

      <main className="flex-1 overflow-y-auto p-6 bg-background">
        {/* Stats Cards */}
        <div className={cn(
          "grid gap-6 mb-8",
          isAdmin ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3"
        )}>
          {isAdmin && (
            <Card className="p-6 border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold text-secondary mt-2" data-testid="stat-total-revenue">
                    {statsLoading ? "Loading..." : formatCurrency(stats?.totalRevenue || 0)}
                  </p>
                  <p className="text-sm text-accent mt-1 flex items-center">
                    <ArrowUpRight className="mr-1" size={12} />
                    +12.5% from last month
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-accent" size={24} />
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6 border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-3xl font-bold text-secondary mt-2" data-testid="stat-total-items">
                  {statsLoading ? "Loading..." : (stats?.totalItems || 0).toLocaleString()}
                </p>
                <p className="text-sm text-primary mt-1 flex items-center">
                  <ArrowUpRight className="mr-1" size={12} />
                  +8 new items added
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package className="text-primary" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sales Today</p>
                <p className="text-3xl font-bold text-secondary mt-2" data-testid="stat-sales-today">
                  {statsLoading ? "Loading..." : stats?.salesToday || 0}
                </p>
                <p className="text-sm text-accent mt-1 flex items-center">
                  <ArrowUpRight className="mr-1" size={12} />
                  +15% vs yesterday
                </p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <ShoppingCart className="text-warning" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock Items</p>
                <p className="text-3xl font-bold text-secondary mt-2" data-testid="stat-low-stock">
                  {statsLoading ? "Loading..." : stats?.lowStockCount || 0}
                </p>
                <p className="text-sm text-error mt-1 flex items-center">
                  <AlertTriangle className="mr-1" size={12} />
                  Requires attention
                </p>
              </div>
              <div className="w-12 h-12 bg-error/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-error" size={24} />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Sales */}
          <div className="lg:col-span-2">
            <Card className="border-border">
              <div className="px-6 py-4 border-b border-border">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-secondary">Recent Sales</h3>
                  <Button variant="ghost" size="sm" className="text-primary">
                    View all
                  </Button>
                </div>
              </div>
              <div className="p-6">
                {salesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading sales...</div>
                ) : !recentSales?.length ? (
                  <div className="text-center py-8 text-muted-foreground">No sales found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm font-medium text-muted-foreground">
                          <th className="pb-3">Order ID</th>
                          <th className="pb-3">Item</th>
                          <th className="pb-3">Associate</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Payment</th>
                          <th className="pb-3">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSales.slice(0, 5).map((sale: any) => (
                          <tr key={sale.id} className="border-b border-border/50">
                            <td className="py-3">
                              <span className="font-mono text-sm text-secondary" data-testid={`sale-id-${sale.id}`}>
                                #{sale.orderNumber}
                              </span>
                            </td>
                            <td className="py-3">
                              <div>
                                <p className="text-sm font-medium text-secondary">{sale.item.name}</p>
                                <p className="text-xs text-muted-foreground">SKU: {sale.item.sku}</p>
                              </div>
                            </td>
                            <td className="py-3">
                              <span className="text-sm text-secondary">{sale.salesAssociate.name}</span>
                            </td>
                            <td className="py-3">
                              <span className="text-sm font-medium text-secondary">
                                {formatCurrency(Number(sale.totalAmount))}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={cn(
                                "px-2 py-1 text-xs rounded-full",
                                sale.paymentMethod === "cash"
                                  ? "bg-accent/10 text-accent"
                                  : "bg-primary/10 text-primary"
                              )}>
                                {sale.paymentMethod === "cash" ? "Cash" : "Venmo"}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className="text-sm text-muted-foreground">
                                {formatTime(sale.saleDate)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Quick Actions & Low Stock Alert */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="p-6 border-border">
              <h3 className="text-lg font-semibold text-secondary mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  variant="ghost"
                  className="w-full justify-between p-3 h-auto hover:bg-muted"
                  onClick={() => setShowNewSaleModal(true)}
                  data-testid="quick-action-sale"
                >
                  <div className="flex items-center">
                    <ScanBarcode className="text-primary mr-3" size={18} />
                    <span className="text-sm font-medium text-secondary">Quick Sale</span>
                  </div>
                  <ArrowUpRight className="text-muted-foreground" size={16} />
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-between p-3 h-auto hover:bg-muted"
                  onClick={() => setShowPrintLabelsModal(true)}
                  data-testid="quick-action-print"
                >
                  <div className="flex items-center">
                    <QrCode className="text-accent mr-3" size={18} />
                    <span className="text-sm font-medium text-secondary">Print Labels</span>
                  </div>
                  <ArrowUpRight className="text-muted-foreground" size={16} />
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-between p-3 h-auto hover:bg-muted"
                  data-testid="quick-action-inventory"
                >
                  <div className="flex items-center">
                    <Search className="text-warning mr-3" size={18} />
                    <span className="text-sm font-medium text-secondary">Inventory Check</span>
                  </div>
                  <ArrowUpRight className="text-muted-foreground" size={16} />
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-between p-3 h-auto hover:bg-muted"
                  data-testid="quick-action-report"
                >
                  <div className="flex items-center">
                    <TrendingUp className="text-secondary mr-3" size={18} />
                    <span className="text-sm font-medium text-secondary">Generate Report</span>
                  </div>
                  <ArrowUpRight className="text-muted-foreground" size={16} />
                </Button>
              </div>
            </Card>

            {/* Low Stock Alert */}
            <Card className="p-6 border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-secondary">Low Stock Alert</h3>
                <span className="px-2 py-1 bg-error/10 text-error text-xs rounded-full">
                  {stats?.lowStockCount || 0} items
                </span>
              </div>
              {lowStockLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : !lowStockItems?.length ? (
                <div className="text-center py-4 text-muted-foreground">No low stock items</div>
              ) : (
                <div className="space-y-3">
                  {lowStockItems.slice(0, 3).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-error/5 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-secondary">{item.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-error">{item.quantity} left</p>
                        <p className="text-xs text-muted-foreground">Min: {item.minStockLevel}</p>
                      </div>
                    </div>
                  ))}
                  {lowStockItems.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-primary hover:text-primary/80"
                      data-testid="view-all-low-stock"
                    >
                      View all low stock items
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      <NewSaleModal
        open={showNewSaleModal}
        onOpenChange={setShowNewSaleModal}
      />
      
      <AddInventoryModal
        open={showAddInventoryModal}
        onOpenChange={setShowAddInventoryModal}
      />
      
      <PrintLabelsModal
        open={showPrintLabelsModal}
        onOpenChange={setShowPrintLabelsModal}
      />
    </>
  );
}
