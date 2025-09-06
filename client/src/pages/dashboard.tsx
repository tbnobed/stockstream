import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NewSaleModal from "@/components/modals/new-sale-modal";
import AddInventoryModal from "@/components/modals/add-inventory-modal";
import InventoryCheckModal from "@/components/modals/inventory-check-modal";
import ReportsModal from "@/components/modals/reports-modal";
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
  const [, navigate] = useLocation();
  const [showInventoryCheckModal, setShowInventoryCheckModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
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

      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-br from-background via-background to-muted/20">
        {/* Stats Cards */}
        <div className={cn(
          "grid gap-4 md:gap-6 mb-6 md:mb-8",
          isAdmin ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
        )}>
          {isAdmin && (
            <Card className="p-4 md:p-6 border-border shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50/50 dark:from-card dark:to-muted/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-xl md:text-3xl font-bold text-secondary mt-1 md:mt-2" data-testid="stat-total-revenue">
                    {statsLoading ? "Loading..." : formatCurrency(stats?.totalRevenue || 0)}
                  </p>
                  <p className="text-xs md:text-sm text-accent mt-1 flex items-center">
                    <ArrowUpRight className="mr-1" size={10} />
                    +12.5% from last month
                  </p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl flex items-center justify-center shadow-sm">
                  <DollarSign className="text-accent" size={20} />
                </div>
              </div>
            </Card>
          )}

          {isAdmin && (
            <Card className="p-4 md:p-6 border-border shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-emerald-50/30 dark:from-card dark:to-emerald-500/5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Profit</p>
                  <p className="text-xl md:text-3xl font-bold text-secondary mt-1 md:mt-2" data-testid="stat-total-profit">
                    {statsLoading ? "Loading..." : formatCurrency(stats?.totalProfit || 0)}
                  </p>
                  <p className="text-xs md:text-sm text-green-600 mt-1 flex items-center">
                    <TrendingUp className="mr-1" size={10} />
                    Real profit from sales
                  </p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl flex items-center justify-center shadow-sm">
                  <TrendingUp className="text-green-600" size={20} />
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4 md:p-6 border-border shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30 dark:from-card dark:to-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-xl md:text-3xl font-bold text-secondary mt-1 md:mt-2" data-testid="stat-total-items">
                  {statsLoading ? "Loading..." : (stats?.totalItems || 0).toLocaleString()}
                </p>
                <p className="text-xs md:text-sm text-primary mt-1 flex items-center">
                  <ArrowUpRight className="mr-1" size={10} />
                  +8 new items added
                </p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Package className="text-primary" size={20} />
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6 border-border shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-orange-50/30 dark:from-card dark:to-orange-500/5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Sales Today</p>
                <p className="text-xl md:text-3xl font-bold text-secondary mt-1 md:mt-2" data-testid="stat-sales-today">
                  {statsLoading ? "Loading..." : stats?.salesToday || 0}
                </p>
                <p className="text-xs md:text-sm text-accent mt-1 flex items-center">
                  <ArrowUpRight className="mr-1" size={10} />
                  +15% vs yesterday
                </p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-400/20 to-orange-500/10 rounded-xl flex items-center justify-center shadow-sm">
                <ShoppingCart className="text-warning" size={20} />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-red-50/30 dark:from-card dark:to-destructive/5">
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
              <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl flex items-center justify-center shadow-sm">
                <AlertTriangle className="text-error" size={24} />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Sales */}
          <div className="lg:col-span-2">
            <Card className="border-border shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50/30 dark:from-card dark:to-muted/5">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border/50 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                <div className="flex justify-between items-center">
                  <h3 className="text-base md:text-lg font-semibold text-secondary">Recent Sales</h3>
                  <Button variant="ghost" size="sm" className="text-primary text-xs md:text-sm h-8 hover:bg-primary/10 transition-colors">
                    View all
                  </Button>
                </div>
              </div>
              <div className={cn(
                "p-4 md:p-6",
                (recentSales?.length ?? 0) > 15 && "max-h-[800px] overflow-y-auto"
              )}>
                {salesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading sales...</div>
                ) : !recentSales?.length ? (
                  <div className="text-center py-8 text-muted-foreground">No sales found</div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
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
                          {recentSales.map((sale: any) => (
                            <tr key={sale.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors duration-200">
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
                    
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {recentSales.map((sale: any) => (
                        <div key={sale.id} className="bg-gradient-to-br from-muted/10 to-muted/30 rounded-xl p-3 border border-border/30 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-secondary text-sm" data-testid={`sale-id-${sale.id}`}>
                                {sale.item.name}
                              </h4>
                              <p className="text-xs text-muted-foreground font-mono">
                                #{sale.orderNumber}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm text-secondary">
                                {formatCurrency(Number(sale.totalAmount))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(sale.saleDate)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <span className="text-xs text-muted-foreground">
                                {sale.salesAssociate.name}
                              </span>
                              <span className={cn(
                                "px-2 py-1 text-xs rounded-full font-medium",
                                sale.paymentMethod === "cash"
                                  ? "bg-accent/20 text-accent"
                                  : "bg-primary/20 text-primary"
                              )}>
                                {sale.paymentMethod === "cash" ? "Cash" : "Venmo"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">
                              {sale.item.sku}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Quick Actions & Low Stock Alert */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="p-6 border-border shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30 dark:from-card dark:to-primary/5">
              <h3 className="text-lg font-semibold text-secondary mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  variant="ghost"
                  className="w-full justify-between p-3 h-auto hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 transition-all duration-200 hover:shadow-sm border border-transparent hover:border-primary/20 rounded-lg"
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
                  className="w-full justify-between p-3 h-auto hover:bg-gradient-to-r hover:from-orange-500/5 hover:to-orange-400/10 transition-all duration-200 hover:shadow-sm border border-transparent hover:border-orange-400/20 rounded-lg"
                  onClick={() => navigate('/labels')}
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
                  className="w-full justify-between p-3 h-auto hover:bg-gradient-to-r hover:from-green-500/5 hover:to-green-400/10 transition-all duration-200 hover:shadow-sm border border-transparent hover:border-green-400/20 rounded-lg"
                  onClick={() => setShowInventoryCheckModal(true)}
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
                  className="w-full justify-between p-3 h-auto hover:bg-gradient-to-r hover:from-purple-500/5 hover:to-purple-400/10 transition-all duration-200 hover:shadow-sm border border-transparent hover:border-purple-400/20 rounded-lg"
                  onClick={() => setShowReportsModal(true)}
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
            <Card className="p-6 border-border shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-red-50/30 dark:from-card dark:to-destructive/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-secondary bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">Low Stock Alert</h3>
                <span className="px-2 py-1 bg-gradient-to-r from-red-500/10 to-red-600/20 text-error text-xs rounded-full border border-red-500/20 shadow-sm">
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
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/30 rounded-xl border border-red-200/30 dark:border-red-800/30 hover:shadow-sm transition-all duration-200">
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
      
      
      <InventoryCheckModal
        open={showInventoryCheckModal}
        onOpenChange={setShowInventoryCheckModal}
      />
      
      <ReportsModal
        open={showReportsModal}
        onOpenChange={setShowReportsModal}
        reportCategory="sales"
      />
    </>
  );
}
