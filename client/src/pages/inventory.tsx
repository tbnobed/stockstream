import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Header from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AddInventoryModal from "@/components/modals/add-inventory-modal";
import QRScanner from "@/components/qr-scanner";
import { Search, Package, AlertTriangle, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Inventory() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const { data: inventoryItems, isLoading } = useQuery({
    queryKey: ["/api/inventory"],
  });

  const filteredItems = inventoryItems?.filter((item: any) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStockStatus = (quantity: number, minLevel: number) => {
    if (quantity <= minLevel) return "low";
    if (quantity <= minLevel * 1.5) return "medium";
    return "good";
  };

  const handleQRScan = (result: string) => {
    setSearchTerm(result);
    setShowScanner(false);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  return (
    <>
      <Header
        title="Inventory Management"
        subtitle="Track and manage your inventory items"
        onAddInventory={() => setShowAddModal(true)}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
        {/* Search and Filters */}
        <Card className="p-4 md:p-6 mb-4 md:mb-6 border-border">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search by name, SKU, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-inventory"
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowScanner(true)}
                data-testid="button-scan-qr"
                className="md:hidden"
              >
                <QrCode size={16} />
              </Button>
              <Button variant="outline" size="sm" data-testid="button-filter">
                Filter
              </Button>
              <Button variant="outline" size="sm" data-testid="button-export">
                Export
              </Button>
            </div>
          </div>
        </Card>

        {/* Inventory Items */}
        <Card className="border-border">
          <div className="px-4 md:px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-secondary">Inventory Items</h3>
          </div>
          <div className="p-4 md:p-6">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading inventory...</div>
            ) : !filteredItems?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No items match your search" : "No inventory items found"}
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="block md:hidden space-y-4">
                  {filteredItems.map((item: any) => {
                    const stockStatus = getStockStatus(item.quantity, item.minStockLevel);
                    
                    return (
                      <Card key={item.id} className="p-4 border-border">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-secondary" data-testid={`item-name-${item.id}`}>
                              {item.name}
                            </h4>
                            <p className="text-sm font-mono text-muted-foreground">
                              SKU: {item.sku}
                            </p>
                          </div>
                          <Badge variant={
                            stockStatus === "low" ? "destructive" :
                            stockStatus === "medium" ? "secondary" : "default"
                          }>
                            {stockStatus === "low" && <AlertTriangle className="mr-1" size={12} />}
                            {stockStatus === "low" ? "Low Stock" :
                             stockStatus === "medium" ? "Medium" : "In Stock"}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-muted-foreground">Type</p>
                            <p className="font-medium capitalize">{item.type}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Price</p>
                            <p className="font-medium">{formatCurrency(Number(item.price))}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Stock</p>
                            <p className="font-medium">{item.quantity} / {item.minStockLevel} min</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Details</p>
                            <p className="font-medium">{item.size || "N/A"} - {item.color || "N/A"}</p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 pt-3 border-t">
                          <Button variant="outline" size="sm" className="flex-1" data-testid={`edit-item-${item.id}`}>
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`print-label-${item.id}`}>
                            <Package size={14} />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm font-medium text-muted-foreground">
                        <th className="pb-3">SKU</th>
                        <th className="pb-3">Item</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Size</th>
                        <th className="pb-3">Color</th>
                        <th className="pb-3">Price</th>
                        <th className="pb-3">Stock</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                  <tbody>
                    {filteredItems.map((item: any) => {
                      const stockStatus = getStockStatus(item.quantity, item.minStockLevel);
                      
                      return (
                        <tr key={item.id} className="border-b border-border/50">
                          <td className="py-3">
                            <span className="font-mono text-sm text-secondary" data-testid={`item-sku-${item.id}`}>
                              {item.sku}
                            </span>
                          </td>
                          <td className="py-3">
                            <div>
                              <p className="text-sm font-medium text-secondary">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <span className="text-sm text-secondary capitalize">{item.type}</span>
                          </td>
                          <td className="py-3">
                            <span className="text-sm text-secondary">{item.size || "N/A"}</span>
                          </td>
                          <td className="py-3">
                            <span className="text-sm text-secondary capitalize">{item.color || "N/A"}</span>
                          </td>
                          <td className="py-3">
                            <span className="text-sm font-medium text-secondary">
                              {formatCurrency(Number(item.price))}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="text-sm">
                              <span className="font-medium text-secondary">{item.quantity}</span>
                              <span className="text-muted-foreground"> / {item.minStockLevel} min</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge variant={
                              stockStatus === "low" ? "destructive" :
                              stockStatus === "medium" ? "secondary" : "default"
                            }>
                              {stockStatus === "low" && <AlertTriangle className="mr-1" size={12} />}
                              {stockStatus === "low" ? "Low Stock" :
                               stockStatus === "medium" ? "Medium" : "In Stock"}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEditItem(item)}
                                data-testid={`edit-item-${item.id}`}
                              >
                                Edit
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`print-label-${item.id}`}>
                                <Package size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Card>
      </main>

      <AddInventoryModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />

      <AddInventoryModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        editingItem={editingItem}
        onClose={() => {
          setShowEditModal(false);
          setEditingItem(null);
        }}
      />
      
      <QRScanner
        isOpen={showScanner}
        onScan={handleQRScan}
        onClose={() => setShowScanner(false)}
      />
    </>
  );
}
