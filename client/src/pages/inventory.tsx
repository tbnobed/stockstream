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
import { Search, Package, AlertTriangle, QrCode, Plus, Edit, History, Minus, Archive, ArchiveRestore, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [selectedType, setSelectedType] = useState<string>("all-types");
  const [selectedColor, setSelectedColor] = useState<string>("all-colors");
  const [selectedSize, setSelectedSize] = useState<string>("all-sizes");
  const [selectedDesign, setSelectedDesign] = useState<string>("all-designs");
  const [selectedGroupType, setSelectedGroupType] = useState<string>("all-groups");
  const [selectedStyleGroup, setSelectedStyleGroup] = useState<string>("all-styles");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: inventoryItems, isLoading } = useQuery({
    queryKey: ["/api/inventory", showArchivedItems ? "?includeArchived=true" : ""],
  });

  // Fetch dynamic categories
  const { data: types } = useQuery({ queryKey: ["/api/categories/type"] });
  const { data: colors } = useQuery({ queryKey: ["/api/categories/color"] });
  const { data: sizes } = useQuery({ queryKey: ["/api/categories/size"] });
  const { data: designs } = useQuery({ queryKey: ["/api/categories/design"] });
  const { data: groupTypes } = useQuery({ queryKey: ["/api/categories/groupType"] });
  const { data: styleGroups } = useQuery({ queryKey: ["/api/categories/styleGroup"] });

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
    setSelectedType("all-types");
    setSelectedColor("all-colors");
    setSelectedSize("all-sizes");
    setSelectedDesign("all-designs");
    setSelectedGroupType("all-groups");
    setSelectedStyleGroup("all-styles");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const filteredItems = (inventoryItems as any[] || []).filter((item: any) => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.design?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.groupType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.styleGroup?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || selectedType === "all-types" || item.type === selectedType;
    const matchesColor = !selectedColor || selectedColor === "all-colors" || item.color === selectedColor;
    const matchesSize = !selectedSize || selectedSize === "all-sizes" || item.size === selectedSize;
    const matchesDesign = !selectedDesign || selectedDesign === "all-designs" || item.design === selectedDesign;
    const matchesGroupType = !selectedGroupType || selectedGroupType === "all-groups" || item.groupType === selectedGroupType;
    const matchesStyleGroup = !selectedStyleGroup || selectedStyleGroup === "all-styles" || item.styleGroup === selectedStyleGroup;
    
    return matchesSearch && matchesType && matchesColor && matchesSize && 
           matchesDesign && matchesGroupType && matchesStyleGroup;
  });

  // Pagination logic
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to first page when search or filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const handleFilterChange = (filterSetter: (value: string) => void, value: string) => {
    filterSetter(value);
    setCurrentPage(1);
  };

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
        <Card className="p-3 md:p-6 mb-3 md:mb-6 border-border">
          <div className="flex flex-col space-y-3 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9 text-sm md:h-10"
                data-testid="input-search-inventory"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
                className="flex items-center h-9 px-3"
              >
                <Filter size={14} />
                <span className="ml-1 hidden sm:inline">Filters</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowScanner(true)}
                data-testid="button-scan-qr"
                className="md:hidden h-9 px-3"
              >
                <QrCode size={14} />
              </Button>
              <Button 
                variant={showArchivedItems ? "default" : "outline"}
                size="sm" 
                onClick={() => setShowArchivedItems(!showArchivedItems)}
                data-testid="button-toggle-archived"
                className="h-9 px-3"
              >
                {showArchivedItems ? <ArchiveRestore size={14} className="mr-1" /> : <Archive size={14} className="mr-1" />}
                <span className="hidden sm:inline">{showArchivedItems ? "Active" : "Archived"}</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddSupplierModal(true)}
                data-testid="button-add-supplier"
                className="h-9 px-3"
              >
                <Plus size={14} className="mr-1" />
                <span className="hidden sm:inline">Supplier</span>
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <Select value={selectedType} onValueChange={(value) => handleFilterChange(setSelectedType, value)}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-type">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-types">All types</SelectItem>
                      {(types as any[] || []).map((type: any) => (
                        <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Color</label>
                  <Select value={selectedColor} onValueChange={(value) => handleFilterChange(setSelectedColor, value)}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-color">
                      <SelectValue placeholder="All colors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-colors">All colors</SelectItem>
                      {(colors as any[] || []).map((color: any) => (
                        <SelectItem key={color.id} value={color.name}>{color.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Size</label>
                  <Select value={selectedSize} onValueChange={(value) => handleFilterChange(setSelectedSize, value)}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-size">
                      <SelectValue placeholder="All sizes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-sizes">All sizes</SelectItem>
                      {(sizes as any[] || []).map((size: any) => (
                        <SelectItem key={size.id} value={size.name}>{size.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Design</label>
                  <Select value={selectedDesign} onValueChange={(value) => handleFilterChange(setSelectedDesign, value)}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-design">
                      <SelectValue placeholder="All designs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-designs">All designs</SelectItem>
                      {(designs as any[] || []).map((design: any) => (
                        <SelectItem key={design.id} value={design.name}>{design.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Group Type</label>
                  <Select value={selectedGroupType} onValueChange={(value) => handleFilterChange(setSelectedGroupType, value)}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-group-type">
                      <SelectValue placeholder="All groups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-groups">All groups</SelectItem>
                      {(groupTypes as any[] || []).map((type: any) => (
                        <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Style Group</label>
                  <Select value={selectedStyleGroup} onValueChange={(value) => handleFilterChange(setSelectedStyleGroup, value)}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-style-group">
                      <SelectValue placeholder="All styles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-styles">All styles</SelectItem>
                      {(styleGroups as any[] || []).map((style: any) => (
                        <SelectItem key={style.id} value={style.name}>{style.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters Display */}
              {(selectedType && selectedType !== "all-types" || 
                selectedColor && selectedColor !== "all-colors" || 
                selectedSize && selectedSize !== "all-sizes" || 
                selectedDesign && selectedDesign !== "all-designs" || 
                selectedGroupType && selectedGroupType !== "all-groups" || 
                selectedStyleGroup && selectedStyleGroup !== "all-styles") && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">Active filters:</span>
                    {selectedType && selectedType !== "all-types" && (
                      <Badge variant="secondary" className="text-xs">
                        Type: {selectedType}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedType("all-types")} 
                        />
                      </Badge>
                    )}
                    {selectedColor && selectedColor !== "all-colors" && (
                      <Badge variant="secondary" className="text-xs">
                        Color: {selectedColor}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedColor("all-colors")} 
                        />
                      </Badge>
                    )}
                    {selectedSize && selectedSize !== "all-sizes" && (
                      <Badge variant="secondary" className="text-xs">
                        Size: {selectedSize}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedSize("all-sizes")} 
                        />
                      </Badge>
                    )}
                    {selectedDesign && selectedDesign !== "all-designs" && (
                      <Badge variant="secondary" className="text-xs">
                        Design: {selectedDesign}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedDesign("all-designs")} 
                        />
                      </Badge>
                    )}
                    {selectedGroupType && selectedGroupType !== "all-groups" && (
                      <Badge variant="secondary" className="text-xs">
                        Group: {selectedGroupType}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedGroupType("all-groups")} 
                        />
                      </Badge>
                    )}
                    {selectedStyleGroup && selectedStyleGroup !== "all-styles" && (
                      <Badge variant="secondary" className="text-xs">
                        Style: {selectedStyleGroup}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedStyleGroup("all-styles")} 
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
            <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
              <div>
                <h3 className="text-lg font-semibold text-secondary">Inventory Items</h3>
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} items
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Items per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-20" data-testid="select-items-per-page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                <div className="block md:hidden space-y-3">
                  {paginatedItems.map((item: any) => {
                    const stockStatus = getStockStatus(item.quantity, item.minStockLevel);
                    
                    return (
                      <Card key={item.id} className="p-4 border-border bg-card min-h-[180px]">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-secondary text-base leading-tight" data-testid={`item-name-${item.id}`}>
                              {item.name}
                            </h4>
                            <p className="text-sm font-mono text-muted-foreground mt-1">
                              {item.sku}
                            </p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                          <Badge variant={
                            stockStatus === "low" ? "destructive" :
                            stockStatus === "medium" ? "secondary" : "default"
                          } className="ml-2 flex-shrink-0">
                            {stockStatus === "low" && <AlertTriangle className="mr-1" size={12} />}
                            {stockStatus === "low" ? "Low Stock" :
                             stockStatus === "medium" ? "Medium" : "In Stock"}
                          </Badge>
                        </div>
                        
                        {/* Expanded info grid */}
                        <div className="grid grid-cols-3 gap-3 text-sm mb-4 bg-muted/30 p-3 rounded">
                          <div className="text-center">
                            <p className="text-muted-foreground text-xs">Price</p>
                            <p className="font-semibold">{formatCurrency(Number(item.price))}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground text-xs">Stock</p>
                            <p className="font-semibold">{item.quantity}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground text-xs">Type</p>
                            <p className="font-semibold capitalize truncate">{item.type}</p>
                          </div>
                        </div>
                        
                        {/* Action buttons in wrapped grid */}
                        <div className="grid grid-cols-3 gap-2">
                          {item.isActive ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditItem(item)}
                                data-testid={`edit-item-${item.id}`}
                                className="h-9 text-xs"
                              >
                                <Edit size={14} className="mr-1" />
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleAddStock(item)}
                                data-testid={`add-stock-${item.id}`}
                                className="h-9 text-xs"
                              >
                                <Plus size={14} className="mr-1" />
                                Add
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleAdjustInventory(item)}
                                data-testid={`adjust-item-${item.id}`}
                                className="h-9 text-xs"
                              >
                                <Minus size={14} className="mr-1" />
                                Adjust
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewHistory(item)}
                                data-testid={`view-history-${item.id}`}
                                className="h-9 text-xs"
                              >
                                <History size={14} />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handlePrintLabel(item)}
                                data-testid={`print-label-${item.id}`}
                                className="h-9 text-xs"
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
                                className="h-9 text-xs"
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
                                className="h-9 text-xs col-span-1"
                              >
                                <History size={14} />
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleRestoreItem(item)}
                                data-testid={`restore-item-${item.id}`}
                                disabled={restoreMutation.isPending}
                                className="h-9 text-xs col-span-2"
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
                    {paginatedItems.map((item: any) => {
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

                {/* Pagination Controls - Mobile Optimized */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-border space-y-3 sm:space-y-0">
                    <div className="text-xs text-muted-foreground order-2 sm:order-1">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-1 order-1 sm:order-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        data-testid="button-prev-page"
                        className="h-8 px-3"
                      >
                        <ChevronLeft size={14} />
                        <span className="hidden sm:inline ml-1">Prev</span>
                      </Button>
                      <div className="flex items-center space-x-1">
                        {[...Array(Math.min(3, totalPages))].map((_, index) => {
                          let pageNumber;
                          if (totalPages <= 3) {
                            pageNumber = index + 1;
                          } else if (currentPage <= 2) {
                            pageNumber = index + 1;
                          } else if (currentPage >= totalPages - 1) {
                            pageNumber = totalPages - 2 + index;
                          } else {
                            pageNumber = currentPage - 1 + index;
                          }
                          
                          return (
                            <Button
                              key={pageNumber}
                              variant={currentPage === pageNumber ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNumber)}
                              className="h-8 w-8 p-0 text-xs"
                              data-testid={`button-page-${pageNumber}`}
                            >
                              {pageNumber}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        data-testid="button-next-page"
                        className="h-8 px-3"
                      >
                        <span className="hidden sm:inline mr-1">Next</span>
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                )}
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
