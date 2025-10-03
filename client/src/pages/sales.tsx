import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Header from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NewSaleModal from "@/components/modals/new-sale-modal";
import SaleDetailsModal from "@/components/modals/sale-details-modal";
import ReceiptModal from "@/components/receipt/receipt-modal";
import { useAuth } from "@/hooks/useAuth";
import { Search, Download, ChevronLeft, ChevronRight, Filter, X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function Sales() {
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showSaleDetailsModal, setShowSaleDetailsModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAssociate, setSelectedAssociate] = useState<string>("all-associates");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all-payments");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all-time");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin';

  const { data: sales = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/sales"],
  });

  const { data: salesAssociates = [] } = useQuery<any[]>({
    queryKey: ['/api/associates']
  });

  const filteredSales = sales.filter((sale: any) => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = sale.item?.name?.toLowerCase().includes(searchLower) ||
           sale.orderNumber?.toLowerCase().includes(searchLower) ||
           (sale.salesAssociate?.name?.toLowerCase() || '').includes(searchLower) ||
           (sale.volunteerEmail?.toLowerCase() || '').includes(searchLower);
    
    // Associate filter
    const matchesAssociate = 
      selectedAssociate === "all-associates" || 
      (selectedAssociate === "volunteers" && !sale.salesAssociateId && sale.volunteerEmail) ||
      sale.salesAssociate?.id === selectedAssociate;
    
    // Payment method filter
    const matchesPayment = selectedPaymentMethod === "all-payments" || 
                          sale.paymentMethod === selectedPaymentMethod;
    
    // Date range filter
    let matchesDate = true;
    const saleDate = new Date(sale.saleDate);
    const now = new Date();
    
    switch (selectedDateRange) {
      case "today":
        matchesDate = saleDate.toDateString() === now.toDateString();
        break;
      case "last-7-days":
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = saleDate >= sevenDaysAgo;
        break;
      case "last-30-days":
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = saleDate >= thirtyDaysAgo;
        break;
      case "last-60-days":
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        matchesDate = saleDate >= sixtyDaysAgo;
        break;
      case "last-90-days":
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        matchesDate = saleDate >= ninetyDaysAgo;
        break;
      case "this-month":
        matchesDate = saleDate.getMonth() === now.getMonth() && 
                     saleDate.getFullYear() === now.getFullYear();
        break;
      case "last-month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        matchesDate = saleDate >= lastMonth && saleDate <= lastMonthEnd;
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate + "T23:59:59");
          matchesDate = saleDate >= startDate && saleDate <= endDate;
        }
        break;
      default:
        matchesDate = true;
    }
    
    return matchesSearch && matchesAssociate && matchesPayment && matchesDate;
  });

  // Pagination logic
  const totalItems = filteredSales.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Reset to first page when items per page changes
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Reset to first page when filters change
  const handleFilterChange = (filterSetter: (value: string) => void, value: string) => {
    filterSetter(value);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSelectedAssociate("all-associates");
    setSelectedPaymentMethod("all-payments");
    setSelectedDateRange("all-time");
    setCustomStartDate("");
    setCustomEndDate("");
    setSearchTerm("");
    setCurrentPage(1);
  };

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

  const handleViewSale = (sale: any) => {
    setSelectedSale(sale);
    setShowSaleDetailsModal(true);
  };

  const handleShowReceipt = (sale: any) => {
    setSelectedSale(sale);
    setShowReceiptModal(true);
  };

  const exportSales = () => {
    if (!filteredSales || filteredSales.length === 0) {
      return;
    }

    let csvContent = "";
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
    
    // Add header
    csvContent += "Sales Export\n";
    csvContent += `Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}\n`;
    csvContent += `Total Transactions: ${filteredSales.length}\n\n`;
    
    // Add CSV headers
    const headers = [
      "Order Number",
      "Date",
      "Item Name",
      "SKU",
      "Quantity",
      "Unit Price",
      "Total Amount",
      "Payment Method",
      "Sales Associate",
      "Associate Code"
    ];
    csvContent += headers.join(",") + "\n";
    
    // Add data rows
    filteredSales.forEach((sale: any) => {
      const row = [
        `"${sale.orderNumber || ''}"`,
        `"${format(new Date(sale.saleDate), 'yyyy-MM-dd HH:mm')}"`,
        `"${sale.item?.name || 'Unknown'}"`,
        `"${sale.item?.sku || 'N/A'}"`,
        sale.quantity || 0,
        Number(sale.unitPrice || 0).toFixed(2),
        Number(sale.totalAmount || 0).toFixed(2),
        `"${sale.paymentMethod || 'Unknown'}"`,
        `"${sale.salesAssociate?.name || sale.volunteerEmail || 'Unknown'}"`,
        `"${sale.salesAssociate?.code || (sale.volunteerEmail ? 'Volunteer' : 'N/A')}"`
      ];
      csvContent += row.join(",") + "\n";
    });
    
    // Add summary
    const totalRevenue = filteredSales.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount || 0), 0);
    csvContent += `\nSummary\n`;
    csvContent += `Total Revenue,${totalRevenue.toFixed(2)}\n`;
    csvContent += `Average Transaction,${(totalRevenue / filteredSales.length).toFixed(2)}\n`;
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-export-${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintReceipt = () => {
    setShowSaleDetailsModal(false);
    setShowReceiptModal(true);
  };

  // Update the modals to pass orderItems instead of single sale when available
  const getOrderItems = (orderNumber: string) => {
    return sales.filter(sale => sale.orderNumber === orderNumber);
  };

  return (
    <>
      <Header
        title="Sales Management"
        subtitle="Track and manage sales transactions"
        onNewSale={() => setShowNewSaleModal(true)}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
        {/* Search and Actions */}
        <Card className="p-4 md:p-6 mb-4 md:mb-6 border-border">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4 flex-1">
              <div className="relative flex-1 md:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Search by order ID, item, or associate..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-sales"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
                className="flex items-center space-x-1"
              >
                <Filter size={16} />
                <span>Filters</span>
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportSales}
              data-testid="button-export-sales"
              disabled={!filteredSales || filteredSales.length === 0}
            >
              <Download className="mr-0 md:mr-2" size={16} />
              <span className="hidden sm:inline ml-2">Export</span>
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium">Filter Sales</h4>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Sales Associate Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Sales Associate</label>
                  <Select value={selectedAssociate} onValueChange={(value) => handleFilterChange(setSelectedAssociate, value)}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-associate">
                      <SelectValue placeholder="All associates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-associates">All associates</SelectItem>
                      <SelectItem value="volunteers">Volunteers</SelectItem>
                      {(salesAssociates as any[])?.map((associate: any) => (
                        <SelectItem key={associate.id} value={associate.id}>
                          {associate.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                  <Select value={selectedPaymentMethod} onValueChange={(value) => handleFilterChange(setSelectedPaymentMethod, value)}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-payment">
                      <SelectValue placeholder="All payments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-payments">All payments</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Date Range</label>
                  <Select value={selectedDateRange} onValueChange={(value) => handleFilterChange(setSelectedDateRange, value)}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-date-range">
                      <SelectValue placeholder="All time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-time">All time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="last-7-days">Last 7 days</SelectItem>
                      <SelectItem value="last-30-days">Last 30 days</SelectItem>
                      <SelectItem value="last-60-days">Last 60 days</SelectItem>
                      <SelectItem value="last-90-days">Last 90 days</SelectItem>
                      <SelectItem value="this-month">This month</SelectItem>
                      <SelectItem value="last-month">Last month</SelectItem>
                      <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Date Range */}
                {selectedDateRange === "custom" && (
                  <div className="space-y-1 lg:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Custom Date Range</label>
                    <div className="flex space-x-2">
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Start date"
                        data-testid="input-start-date"
                      />
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="End date"
                        data-testid="input-end-date"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Active Filters Display */}
              {(selectedAssociate !== "all-associates" || 
                selectedPaymentMethod !== "all-payments" || 
                selectedDateRange !== "all-time") && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">Active filters:</span>
                    {selectedAssociate !== "all-associates" && (
                      <Badge variant="secondary" className="text-xs">
                        Associate: {(salesAssociates as any[])?.find((a: any) => a.id === selectedAssociate)?.name}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedAssociate("all-associates")} 
                        />
                      </Badge>
                    )}
                    {selectedPaymentMethod !== "all-payments" && (
                      <Badge variant="secondary" className="text-xs">
                        Payment: {selectedPaymentMethod === "cash" ? "Cash" : "Venmo"}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => setSelectedPaymentMethod("all-payments")} 
                        />
                      </Badge>
                    )}
                    {selectedDateRange !== "all-time" && (
                      <Badge variant="secondary" className="text-xs">
                        Date: {selectedDateRange === "custom" ? `${customStartDate} to ${customEndDate}` : selectedDateRange.replace('-', ' ')}
                        <X 
                          size={12} 
                          className="ml-1 cursor-pointer" 
                          onClick={() => {
                            setSelectedDateRange("all-time");
                            setCustomStartDate("");
                            setCustomEndDate("");
                          }} 
                        />
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Sales Transactions */}
        <Card className="border-border">
          <div className="px-4 md:px-6 py-4 border-b border-border">
            <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
              <div>
                <h3 className="text-lg font-semibold text-secondary">Sales Transactions</h3>
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} transactions
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
              <div className="text-center py-8 text-muted-foreground">Loading sales...</div>
            ) : !filteredSales?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No sales match your search" : "No sales found"}
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="block md:hidden space-y-4">
                  {paginatedSales.map((sale: any) => (
                    <Card key={sale.id} className="p-4 border-border hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-colors duration-150">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-secondary" data-testid={`sale-order-${sale.id}`}>
                            #{sale.orderNumber}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(sale.saleDate)}
                          </p>
                        </div>
                        <Badge variant={
                          sale.paymentMethod === "cash" ? "default" : "secondary"
                        }>
                          {sale.paymentMethod === "cash" ? "Cash" : "Venmo"}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div>
                          <p className="font-medium text-secondary">{sale.item.name}</p>
                          <p className="text-sm text-muted-foreground">SKU: {sale.item.sku}</p>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Quantity:</span>
                          <span className="font-medium">{sale.quantity}</span>
                        </div>
                        
                        {isAdmin && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Unit Price:</span>
                              <span className="font-medium">{formatCurrency(Number(sale.unitPrice))}</span>
                            </div>
                            <div className="flex justify-between text-sm font-semibold">
                              <span className="text-muted-foreground">Total:</span>
                              <span className="text-accent">{formatCurrency(Number(sale.totalAmount))}</span>
                            </div>
                          </>
                        )}
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Associate:</span>
                          <span className="font-medium">
                            {sale.salesAssociate ? sale.salesAssociate.name : sale.volunteerEmail || "Volunteer"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 pt-3 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1" 
                          onClick={() => handleViewSale(sale)}
                          data-testid={`view-sale-${sale.id}`}
                        >
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1" 
                          onClick={() => handleShowReceipt(sale)}
                          data-testid={`receipt-sale-${sale.id}`}
                        >
                          Receipt
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:block overflow-x-auto">
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
                    {paginatedSales.map((sale: any) => (
                      <tr key={sale.id} className="border-b border-border/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors duration-150">
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
                          <span className="text-sm text-secondary">
                            {sale.salesAssociate ? sale.salesAssociate.name : sale.volunteerEmail || "Volunteer"}
                          </span>
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
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleViewSale(sale)}
                              data-testid={`view-sale-${sale.id}`}
                            >
                              View
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleShowReceipt(sale)}
                              data-testid={`receipt-sale-${sale.id}`}
                            >
                              Receipt
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-border space-y-4 md:space-y-0">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </Button>
                      <div className="flex items-center space-x-1">
                        {[...Array(Math.min(5, totalPages))].map((_, index) => {
                          let pageNumber;
                          if (totalPages <= 5) {
                            pageNumber = index + 1;
                          } else if (currentPage <= 3) {
                            pageNumber = index + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + index;
                          } else {
                            pageNumber = currentPage - 2 + index;
                          }
                          
                          return (
                            <Button
                              key={pageNumber}
                              variant={currentPage === pageNumber ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNumber)}
                              className="w-8 h-8 p-0"
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
                      >
                        Next
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </main>

      <NewSaleModal
        open={showNewSaleModal}
        onOpenChange={setShowNewSaleModal}
      />
      
      <SaleDetailsModal
        sale={selectedSale}
        open={showSaleDetailsModal}
        onOpenChange={setShowSaleDetailsModal}
        onPrintReceipt={handlePrintReceipt}
      />
      
      <ReceiptModal
        sale={selectedSale}
        open={showReceiptModal}
        onOpenChange={setShowReceiptModal}
      />
    </>
  );
}
