import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Header from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import NewSaleModal from "@/components/modals/new-sale-modal";
import { useAuth } from "@/hooks/useAuth";
import { Search, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sales() {
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin';

  const { data: sales = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/sales"],
  });

  const filteredSales = sales.filter((sale: any) =>
    sale.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.item?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.salesAssociate?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <>
      <Header
        title="Sales Management"
        subtitle="Track and manage sales transactions"
        onNewSale={() => setShowNewSaleModal(true)}
      />

      <main className="flex-1 overflow-y-auto p-6 bg-background">
        {/* Search and Actions */}
        <Card className="p-6 mb-6 border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Search by order ID, item, or associate..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-sales"
                />
              </div>
              <Button variant="outline" data-testid="button-filter-sales">
                Filter
              </Button>
            </div>
            <Button variant="outline" data-testid="button-export-sales">
              <Download className="mr-2" size={16} />
              Export
            </Button>
          </div>
        </Card>

        {/* Sales Transactions */}
        <Card className="border-border">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-secondary">Sales Transactions</h3>
              <p className="text-sm text-muted-foreground">
                {filteredSales?.length || 0} transactions
              </p>
            </div>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading sales...</div>
            ) : !filteredSales?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No sales match your search" : "No sales found"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-muted-foreground">
                      <th className="pb-3">Order ID</th>
                      <th className="pb-3">Item</th>
                      <th className="pb-3">Qty</th>
                      {isAdmin && <th className="pb-3">Unit Price</th>}
                      {isAdmin && <th className="pb-3">Total</th>}
                      <th className="pb-3">Associate</th>
                      <th className="pb-3">Payment</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale: any) => (
                      <tr key={sale.id} className="border-b border-border/50">
                        <td className="py-3">
                          <span className="font-mono text-sm text-secondary" data-testid={`sale-order-${sale.id}`}>
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
                          <span className="text-sm text-secondary">{sale.quantity}</span>
                        </td>
                        {isAdmin && (
                          <td className="py-3">
                            <span className="text-sm text-secondary">
                              {formatCurrency(Number(sale.unitPrice))}
                            </span>
                          </td>
                        )}
                        {isAdmin && (
                          <td className="py-3">
                            <span className="text-sm font-medium text-secondary">
                              {formatCurrency(Number(sale.totalAmount))}
                            </span>
                          </td>
                        )}
                        <td className="py-3">
                          <span className="text-sm text-secondary">{sale.salesAssociate.name}</span>
                        </td>
                        <td className="py-3">
                          <Badge variant={
                            sale.paymentMethod === "cash" ? "default" : "secondary"
                          }>
                            {sale.paymentMethod === "cash" ? "Cash" : "Venmo"}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(sale.saleDate)}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" data-testid={`view-sale-${sale.id}`}>
                              View
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`receipt-sale-${sale.id}`}>
                              Receipt
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </main>

      <NewSaleModal
        open={showNewSaleModal}
        onOpenChange={setShowNewSaleModal}
      />
    </>
  );
}
