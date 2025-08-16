import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Header from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AddInventoryModal from "@/components/modals/add-inventory-modal";
import AddSupplierModal from "@/components/modals/add-supplier-modal";
import AddStockModal from "@/components/modals/add-stock-modal";
import AdjustInventoryModal from "@/components/modals/adjust-inventory-modal";
import TransactionHistoryModal from "@/components/modals/transaction-history-modal";
import PrintLabelModal from "@/components/modals/print-label-modal";
import QRScanner from "@/components/qr-scanner";
import { Search, Package, AlertTriangle, QrCode, Plus, Edit, History, Minus, Archive, ArchiveRestore, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ITEM_TYPES, ITEM_COLORS, ITEM_SIZES, ITEM_DESIGNS, GROUP_TYPES, STYLE_GROUPS } from "../../../shared/categories";

export default function Inventory() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPrintLabelModal, setShowPrintLabelModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showArchivedItems, setShowArchivedItems] = useState(false);
  
  // Filter states
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedDesign, setSelectedDesign] = useState<string>("");
  const [selectedGroupType, setSelectedGroupType] = useState<string>("");
  const [selectedStyleGroup, setSelectedStyleGroup] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: inventoryItems, isLoading } = useQuery({
    queryKey: ["/api/inventory", showArchivedItems ? "?includeArchived=true" : ""],
  });

  // Archive item mutation
  const archiveMutation = useMutation({
    mutationFn: (itemId: string) => apiRequest("PATCH", `/api/inventory/${itemId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Item archived",
        description: "The inventory item has been archived successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive the item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Restore item mutation
  const restoreMutation = useMutation({
    mutationFn: (itemId: string) => apiRequest("PATCH", `/api/inventory/${itemId}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Item restored",
        description: "The inventory item has been restored successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore the item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clearAllFilters = () => {
    setSelectedType("");
    setSelectedColor("");
    setSelectedSize("");
    setSelectedDesign("");
    setSelectedGroupType("");
    setSelectedStyleGroup("");
    setSearchTerm("");
  };

  const filteredItems = (inventoryItems as any[] || []).filter((item: any) => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.design?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.groupType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.styleGroup?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || item.type === selectedType;
    const matchesColor = !selectedColor || item.color === selectedColor;
    const matchesSize = !selectedSize || item.size === selectedSize;
    const matchesDesign = !selectedDesign || item.design === selectedDesign;
    const matchesGroupType = !selectedGroupType || item.groupType === selectedGroupType;
    const matchesStyleGroup = !selectedStyleGroup || item.styleGroup === selectedStyleGroup;
    
    return matchesSearch && matchesType && matchesColor && matchesSize && 
           matchesDesign && matchesGroupType && matchesStyleGroup;
  });

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

  const handleAddStock = (item: any) => {
    setSelectedItem(item);
    setShowAddStockModal(true);
  };

  const handleViewHistory = (item: any) => {
    setSelectedItem(item);
    setShowHistoryModal(true);
  };

  const handlePrintLabel = (item: any) => {
    setSelectedItem(item);
    setShowPrintLabelModal(true);
  };

  const handleAdjustInventory = (item: any) => {
    setSelectedItem(item);
    setShowAdjustModal(true);
  };

  const handleArchiveItem = (item: any) => {
    archiveMutation.mutate(item.id);
  };

  const handleRestoreItem = (item: any) => {
    restoreMutation.mutate(item.id);
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
                placeholder="Search by name, SKU, type, description, design, group type, or style..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-inventory"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
                className="flex items-center space-x-1"
              >
                <Filter size={16} />
                <span>Filters</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowScanner(true)}
                data-testid="button-scan-qr"
                className="md:hidden"
              >
                <QrCode size={16} />
              </Button>
              <Button 
                variant={showArchivedItems ? "default" : "outline"}
                size="sm" 
                onClick={() => setShowArchivedItems(!showArchivedItems)}
                data-testid="button-toggle-archived"
              >
                {showArchivedItems ? <ArchiveRestore size={16} className="mr-1" /> : <Archive size={16} className="mr-1" />}
                {showArchivedItems ? "Show Active" : "Show Archived"}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddSupplierModal(true)}
                data-testid="button-add-supplier"
              >
                <Plus size={16} className="mr-1" />
                Supplier
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium">Filter by Categories</h4>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    data-testid="button-clear-filters"
                    className="h-8 px-2 text-xs"
                  >
                    <X size={14} className="mr-1" />
                    Clear All
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-type">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      {ITEM_TYPES.map((type: string) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Color</label>
                  <Select value={selectedColor} onValueChange={setSelectedColor}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-color">
                      <SelectValue placeholder="All colors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All colors</SelectItem>
                      {ITEM_COLORS.map((color: string) => (
                        <SelectItem key={color} value={color}>{color}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Size</label>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-size">
                      <SelectValue placeholder="All sizes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All sizes</SelectItem>
                      {ITEM_SIZES.map((size: string) => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Design</label>
                  <Select value={selectedDesign} onValueChange={setSelectedDesign}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-design">
                      <SelectValue placeholder="All designs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All designs</SelectItem>
                      {ITEM_DESIGNS.map((design: string) => (
                        <SelectItem key={design} value={design}>{design}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Group Type</label>
                  <Select value={selectedGroupType} onValueChange={setSelectedGroupType}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-group-type">
                      <SelectValue placeholder="All groups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All groups</SelectItem>
                      {GROUP_TYPES.map((type: string) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Style Group</label>
                  <Select value={selectedStyleGroup} onValueChange={setSelectedStyleGroup}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-style-group">
                      <SelectValue placeholder="All styles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All styles</SelectItem>
                      {STYLE_GROUPS.map((style: string) => (
                        <SelectItem key={style} value={style}>{style}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters Display */}
              {(selectedType || selectedColor || selectedSize || selectedDesign || selectedGroupType || selectedStyleGroup) && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">Active filters:</span>
                    {selectedType && (
                      <Badge variant="secondary" className="text-xs">
                        Type: {selectedType}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedType("")} 
                        />
                      </Badge>
                    )}
                    {selectedColor && (
                      <Badge variant="secondary" className="text-xs">
                        Color: {selectedColor}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedColor("")} 
                        />
                      </Badge>
                    )}
                    {selectedSize && (
                      <Badge variant="secondary" className="text-xs">
                        Size: {selectedSize}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedSize("")} 
                        />
                      </Badge>
                    )}
                    {selectedDesign && (
                      <Badge variant="secondary" className="text-xs">
                        Design: {selectedDesign}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedDesign("")} 
                        />
                      </Badge>
                    )}
                    {selectedGroupType && (
                      <Badge variant="secondary" className="text-xs">
                        Group: {selectedGroupType}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedGroupType("")} 
                        />
                      </Badge>
                    )}
                    {selectedStyleGroup && (
                      <Badge variant="secondary" className="text-xs">
                        Style: {selectedStyleGroup}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedStyleGroup("")} 
                        />
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
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
                            {item.description && (
                              <p className="text-xs text-muted-foreground mb-1">{item.description}</p>
                            )}
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
                            <p className="text-muted-foreground">Selling Price</p>
                            <p className="font-medium">{formatCurrency(Number(item.price))}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Cost</p>
                            <p className="font-medium">{item.cost ? formatCurrency(Number(item.cost)) : "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Stock</p>
                            <p className="font-medium">{item.quantity} / {item.minStockLevel} min</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Profit Margin</p>
                            <p className="font-medium">
                              {item.cost && item.price ? 
                                `${(((Number(item.price) - Number(item.cost)) / Number(item.price)) * 100).toFixed(1)}%` : 
                                "N/A"
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                          {item.isActive ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditItem(item)}
                                data-testid={`edit-item-${item.id}`}
                              >
                                <Edit size={14} className="mr-1" />
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleAddStock(item)}
                                data-testid={`add-stock-${item.id}`}
                              >
                                <Plus size={14} className="mr-1" />
                                Add
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleAdjustInventory(item)}
                                data-testid={`adjust-item-${item.id}`}
                              >
                                <Minus size={14} className="mr-1" />
                                Adjust
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewHistory(item)}
                                data-testid={`view-history-${item.id}`}
                              >
                                <History size={14} />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handlePrintLabel(item)}
                                data-testid={`print-label-${item.id}`}
                              >
                                <Package size={14} className="mr-1" />
                                Label
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleArchiveItem(item)}
                                data-testid={`archive-item-${item.id}`}
                                disabled={archiveMutation.isPending}
                              >
                                <Archive size={14} className="mr-1" />
                                Archive
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewHistory(item)}
                                data-testid={`view-history-${item.id}`}
                                className="col-span-1"
                              >
                                <History size={14} />
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleRestoreItem(item)}
                                data-testid={`restore-item-${item.id}`}
                                disabled={restoreMutation.isPending}
                                className="col-span-1"
                              >
                                <ArchiveRestore size={14} className="mr-1" />
                                Restore
                              </Button>
                            </>
                          )}
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
                        <th className="pb-3">Cost</th>
                        <th className="pb-3">Margin</th>
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
                            <span className="text-sm text-secondary">
                              {item.cost ? formatCurrency(Number(item.cost)) : "N/A"}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="text-sm font-medium text-secondary">
                              {item.cost && item.price ? 
                                `${(((Number(item.price) - Number(item.cost)) / Number(item.price)) * 100).toFixed(1)}%` : 
                                "N/A"
                              }
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
                            <div className="flex items-center space-x-1">
                              {item.isActive ? (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleEditItem(item)}
                                    data-testid={`edit-item-${item.id}`}
                                  >
                                    <Edit size={14} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleAddStock(item)}
                                    data-testid={`add-stock-${item.id}`}
                                  >
                                    <Plus size={14} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleAdjustInventory(item)}
                                    data-testid={`adjust-item-${item.id}`}
                                  >
                                    <Minus size={14} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleViewHistory(item)}
                                    data-testid={`view-history-${item.id}`}
                                  >
                                    <History size={14} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handlePrintLabel(item)}
                                    data-testid={`print-label-${item.id}`}
                                  >
                                    <Package size={14} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleArchiveItem(item)}
                                    data-testid={`archive-item-${item.id}`}
                                    disabled={archiveMutation.isPending}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Archive size={14} />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleViewHistory(item)}
                                    data-testid={`view-history-${item.id}`}
                                  >
                                    <History size={14} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleRestoreItem(item)}
                                    data-testid={`restore-item-${item.id}`}
                                    disabled={restoreMutation.isPending}
                                    className="text-primary hover:text-primary"
                                  >
                                    <ArchiveRestore size={14} />
                                  </Button>
                                </>
                              )}
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

      <AddStockModal
        open={showAddStockModal}
        onOpenChange={setShowAddStockModal}
        item={selectedItem}
      />

      <AdjustInventoryModal
        open={showAdjustModal}
        onOpenChange={setShowAdjustModal}
        item={selectedItem}
      />

      <TransactionHistoryModal
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        item={selectedItem}
      />

      <PrintLabelModal
        open={showPrintLabelModal}
        onOpenChange={setShowPrintLabelModal}
        item={selectedItem}
      />
      
      <QRScanner
        isOpen={showScanner}
        onScan={handleQRScan}
        onClose={() => setShowScanner(false)}
      />
      
      <AddSupplierModal
        open={showAddSupplierModal}
        onOpenChange={setShowAddSupplierModal}
      />
    </>
  );
}
