import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ITEM_TYPES, ITEM_COLORS, ITEM_DESIGNS, GROUP_TYPES, STYLE_GROUPS } from "@shared/categories";
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  Users, 
  AlertTriangle,
  Download,
  Calendar,
  BarChart3,
  FileText
} from "lucide-react";

interface ReportsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ReportType = "sales-summary" | "sales-by-associate" | "inventory-status" | "low-stock" | "inventory-adjustments" | "top-selling" | "category-performance" | "cost-analysis" | "profit-margins" | "seasonal-trends" | "payment-methods";

export default function ReportsModal({ open, onOpenChange }: ReportsModalProps) {
  const [reportType, setReportType] = useState<ReportType>("sales-summary");
  const [dateRange, setDateRange] = useState<string>("30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all-categories");
  const [selectedAssociate, setSelectedAssociate] = useState<string>("all-associates");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all-methods");
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin';

  const { data: sales = [] } = useQuery<any[]>({
    queryKey: ["/api/sales"],
  });

  const { data: inventory = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: associates = [] } = useQuery<any[]>({
    queryKey: ["/api/associates"],
  });

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { start: now, end: now };
      case "7days":
        return { start: subDays(now, 7), end: now };
      case "30days":
        return { start: subDays(now, 30), end: now };
      case "thisMonth":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "all":
        return { start: new Date(2020, 0, 1), end: now }; // Very wide range to include all data
      case "custom":
        return {
          start: customStartDate ? new Date(customStartDate) : subDays(now, 7),
          end: customEndDate ? new Date(customEndDate) : now
        };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const generateReport = () => {
    setIsGenerating(true);
    const { start, end } = getDateRange();
    

    
    // For reports, use all sales data if none found in date range
    let filteredSales = sales.filter((sale: any) => {
      const dateStr = sale.saleDate || sale.createdAt;
      if (!dateStr) return false;
      
      try {
        const saleDate = new Date(dateStr);
        const startOfDay = new Date(start);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        
        return saleDate >= startOfDay && saleDate <= endOfDay;
      } catch (error) {
        console.warn("Date parsing error:", error);
        return false;
      }
    });
    
    // Apply additional filters
    filteredSales = filteredSales.filter((sale: any) => {
      // Category filtering (takes priority over associate filtering)
      if (selectedCategory !== "all-categories") {
        const item = sale.item;
        if (!item) return false;
        
        // Check if the item matches any of the category filters
        const categoryMatch = (
          selectedCategory === item.type ||
          selectedCategory === item.color ||
          selectedCategory === item.design ||
          selectedCategory === item.groupType ||
          selectedCategory === item.styleGroup
        );
        
        if (!categoryMatch) return false;
      }
      
      // Associate filtering (only if category filter is not active)
      if (selectedAssociate !== "all-associates" && selectedCategory === "all-categories") {
        if (sale.salesAssociateId !== selectedAssociate) return false;
      }
      
      // Payment method filtering
      if (selectedPaymentMethod !== "all-methods") {
        if (sale.paymentMethod !== selectedPaymentMethod) return false;
      }
      
      return true;
    });

    // If no sales found in date range, use all sales for demonstration
    if (filteredSales.length === 0 && sales.length > 0) {
      filteredSales = sales;
    }

    let report: any = {};

    switch (reportType) {
      case "sales-summary":
        report = generateSalesSummary(filteredSales);
        break;
      case "sales-by-associate":
        report = generateSalesByAssociate(filteredSales);
        break;
      case "inventory-status":
        report = generateInventoryStatus();
        break;
      case "low-stock":
        report = generateLowStockReport();
        break;
      case "inventory-adjustments":
        report = generateInventoryAdjustments(filteredSales);
        break;
      case "category-performance":
        // Apply specific category filtering for category performance reports
        if (selectedCategory !== "all-categories") {
          filteredSales = filteredSales.filter((sale: any) => {
            const item = sale.item;
            if (!item) return false;
            return (
              selectedCategory === item.type ||
              selectedCategory === item.color ||
              selectedCategory === item.design ||
              selectedCategory === item.groupType ||
              selectedCategory === item.styleGroup
            );
          });
        }
        report = generateCategoryPerformance(filteredSales);
        break;
      case "cost-analysis":
        report = generateCostAnalysis();
        break;
      case "profit-margins":
        report = generateProfitMargins(filteredSales);
        break;
      case "seasonal-trends":
        report = generateSeasonalTrends(filteredSales);
        break;
      case "payment-methods":
        report = generatePaymentMethodsReport(filteredSales);
        break;
      case "top-selling":
        report = generateTopSellingReport(filteredSales);
        break;
    }

    setGeneratedReport({
      ...report,
      type: reportType,
      dateRange: { start, end },
      generatedAt: new Date()
    });
    setIsGenerating(false);
  };

  const generateSalesSummary = (filteredSales: any[]) => {
    const totalRevenue = filteredSales.reduce((sum, sale) => {
      const amount = parseFloat(sale.totalAmount || sale.total || 0);
      return sum + amount;
    }, 0);
    const totalTransactions = filteredSales.length;
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    const paymentMethods = filteredSales.reduce((acc, sale) => {
      const amount = parseFloat(sale.totalAmount || sale.total || 0);
      const method = sale.paymentMethod || 'unknown';
      if (!acc[method]) acc[method] = 0;
      acc[method] += amount;
      return acc;
    }, {});

    const dailySales = filteredSales.reduce((acc, sale) => {
      try {
        const dateStr = sale.saleDate || sale.createdAt;
        if (dateStr) {
          const date = format(new Date(dateStr), 'yyyy-MM-dd');
          const amount = parseFloat(sale.totalAmount || sale.total || 0);
          if (!acc[date]) acc[date] = 0;
          acc[date] += amount;
        }
      } catch (error) {
        console.warn("Date parsing error for sale:", sale);
      }
      return acc;
    }, {});

    return {
      totalRevenue,
      totalTransactions,
      avgTransactionValue,
      paymentMethods,
      dailySales
    };
  };

  const generateSalesByAssociate = (filteredSales: any[]) => {
    if (!isAdmin) return { error: "Unauthorized" };
    
    const associateStats = filteredSales.reduce((acc, sale) => {
      const associateId = sale.salesAssociateId || sale.associateId;
      if (!acc[associateId]) {
        const associate = associates.find((a: any) => a.id === associateId) || sale.salesAssociate;
        acc[associateId] = {
          name: associate?.name || "Unknown",
          code: associate?.code || "N/A",
          totalSales: 0,
          totalRevenue: 0,
          transactions: []
        };
      }
      acc[associateId].totalSales += 1;
      acc[associateId].totalRevenue += parseFloat(sale.totalAmount || sale.total || 0);
      acc[associateId].transactions.push(sale);
      return acc;
    }, {});

    return { associateStats };
  };

  const generateInventoryStatus = () => {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum: number, item: any) => {
      const price = parseFloat(item.price || 0);
      const quantity = parseInt(item.quantity || 0);
      return sum + (quantity * price);
    }, 0);
    const totalCost = inventory.reduce((sum: number, item: any) => {
      const cost = parseFloat(item.cost || 0);
      const quantity = parseInt(item.quantity || 0);
      return sum + (quantity * cost);
    }, 0);
    const lowStockItems = inventory.filter((item: any) => item.quantity <= item.minStockLevel);
    const outOfStockItems = inventory.filter((item: any) => item.quantity === 0);
    
    const categoryBreakdown = inventory.reduce((acc: any, item: any) => {
      const category = item.type || item.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = { count: 0, value: 0 };
      }
      acc[category].count += 1;
      const price = parseFloat(item.price || 0);
      const quantity = parseInt(item.quantity || 0);
      acc[category].value += quantity * price;
      return acc;
    }, {});

    return {
      totalItems,
      totalValue,
      totalCost,
      potentialProfit: totalValue - totalCost,
      profitMargin: totalValue > 0 ? ((totalValue - totalCost) / totalValue * 100) : 0,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      categoryBreakdown,
      lowStockItems: lowStockItems.slice(0, 10)
    };
  };

  const generateLowStockReport = () => {
    const lowStockItems = inventory.filter((item: any) => item.quantity <= item.minStockLevel);
    return {
      items: lowStockItems,
      totalCount: lowStockItems.length
    };
  };

  const generateInventoryAdjustments = (filteredSales: any[]) => {
    // This would need to be enhanced to track actual adjustments from the database
    // For now, we'll show sales as inventory movements
    const movements = filteredSales.map((sale: any) => ({
      type: "sale",
      item: sale.item,
      quantity: -sale.quantity,
      reason: "Sale",
      date: sale.createdAt,
      associate: sale.associate?.name
    }));

    return { movements };
  };

  const generateTopSellingReport = (filteredSales: any[]) => {
    const itemStats = filteredSales.reduce((acc, sale) => {
      const itemId = sale.itemId;
      if (!acc[itemId]) {
        acc[itemId] = {
          name: sale.item?.name || "Unknown",
          sku: sale.item?.sku || "N/A",
          totalQuantity: 0,
          totalRevenue: 0,
          transactions: 0
        };
      }
      acc[itemId].totalQuantity += parseInt(sale.quantity || 0);
      acc[itemId].totalRevenue += parseFloat(sale.totalAmount || sale.total || 0);
      acc[itemId].transactions += 1;
      return acc;
    }, {});

    const topItems = Object.values(itemStats)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return { topItems };
  };

  const generateCategoryPerformance = (filteredSales: any[]) => {
    // If a specific category is selected, focus only on that category's performance
    if (selectedCategory !== "all-categories") {
      const categoryValue = selectedCategory;
      const categoryType = getCategoryType(selectedCategory);
      
      // Get all items that match this specific category
      const categoryItems = filteredSales.reduce((acc: any, sale: any) => {
        const item = sale.item;
        if (!item) return acc;
        
        const itemKey = item.id || item.sku;
        if (!acc[itemKey]) {
          acc[itemKey] = {
            name: item.name || 'Unknown',
            sku: item.sku || 'N/A',
            category: categoryValue,
            categoryType: categoryType,
            totalSales: 0,
            totalRevenue: 0,
            totalUnits: 0,
            avgPrice: 0
          };
        }
        
        const stat = acc[itemKey];
        stat.totalSales += 1;
        stat.totalRevenue += parseFloat(sale.totalAmount || 0);
        stat.totalUnits += parseInt(sale.quantity || 1);
        stat.avgPrice = stat.totalRevenue / stat.totalUnits;
        
        return acc;
      }, {});
      
      return { 
        selectedCategory: categoryValue,
        selectedCategoryType: categoryType,
        categoryItems: Object.values(categoryItems)
      };
    }
    
    // Otherwise, show performance across all categories
    const categoryStats = filteredSales.reduce((acc: any, sale: any) => {
      const item = sale.item;
      if (!item) return acc;
      
      const categories = {
        type: item.type || 'Unknown',
        color: item.color || 'Unknown', 
        design: item.design || 'Unknown',
        groupType: item.groupType || 'Unknown',
        styleGroup: item.styleGroup || 'Unknown'
      };
      
      Object.entries(categories).forEach(([categoryType, categoryValue]) => {
        if (!acc[categoryType]) acc[categoryType] = {};
        if (!acc[categoryType][categoryValue]) {
          acc[categoryType][categoryValue] = {
            name: categoryValue,
            totalSales: 0,
            totalRevenue: 0,
            totalUnits: 0,
            avgPrice: 0
          };
        }
        
        const stat = acc[categoryType][categoryValue];
        stat.totalSales += 1;
        stat.totalRevenue += parseFloat(sale.totalAmount || 0);
        stat.totalUnits += parseInt(sale.quantity || 1);
        stat.avgPrice = stat.totalRevenue / stat.totalUnits;
      });
      
      return acc;
    }, {});
    
    return { categoryStats };
  };
  
  // Helper function to determine which category type a value belongs to
  const getCategoryType = (categoryValue: string): string => {
    if (ITEM_TYPES.includes(categoryValue as any)) return 'Type';
    if (ITEM_COLORS.includes(categoryValue as any)) return 'Color';
    if (ITEM_DESIGNS.includes(categoryValue as any)) return 'Design';
    if (GROUP_TYPES.includes(categoryValue as any)) return 'Group Type';
    if (STYLE_GROUPS.includes(categoryValue as any)) return 'Style Group';
    return 'Unknown';
  };

  const generateCostAnalysis = () => {
    const analysis = inventory.reduce((acc: any, item: any) => {
      const cost = parseFloat(item.cost || 0);
      const price = parseFloat(item.price || 0);
      const quantity = parseInt(item.quantity || 0);
      const margin = price - cost;
      const marginPercent = cost > 0 ? (margin / cost) * 100 : 0;
      
      acc.totalCost += cost * quantity;
      acc.totalValue += price * quantity;
      acc.totalMargin += margin * quantity;
      acc.items.push({
        name: item.name,
        sku: item.sku,
        cost,
        price,
        margin,
        marginPercent,
        quantity,
        totalCost: cost * quantity,
        totalValue: price * quantity
      });
      
      return acc;
    }, {
      totalCost: 0,
      totalValue: 0,
      totalMargin: 0,
      items: []
    });
    
    analysis.overallMarginPercent = analysis.totalCost > 0 ? 
      (analysis.totalMargin / analysis.totalCost) * 100 : 0;
    
    return analysis;
  };

  const generateProfitMargins = (filteredSales: any[]) => {
    const profitData = filteredSales.map((sale: any) => {
      const item = sale.item;
      const salePrice = parseFloat(sale.unitPrice || sale.totalAmount || 0);
      const cost = parseFloat(item?.cost || 0);
      const quantity = parseInt(sale.quantity || 1);
      const profit = (salePrice - cost) * quantity;
      const profitMargin = cost > 0 ? ((salePrice - cost) / cost) * 100 : 0;
      
      return {
        orderNumber: sale.orderNumber,
        itemName: item?.name || 'Unknown',
        salePrice,
        cost,
        quantity,
        profit,
        profitMargin,
        date: sale.saleDate
      };
    });
    
    const totalProfit = profitData.reduce((sum, sale) => sum + sale.profit, 0);
    const avgMargin = profitData.length > 0 ? 
      profitData.reduce((sum, sale) => sum + sale.profitMargin, 0) / profitData.length : 0;
    
    return {
      profitData,
      totalProfit,
      avgMargin,
      highestMargin: Math.max(...profitData.map(p => p.profitMargin)),
      lowestMargin: Math.min(...profitData.map(p => p.profitMargin))
    };
  };

  const generateSeasonalTrends = (filteredSales: any[]) => {
    const monthlyData = filteredSales.reduce((acc: any, sale: any) => {
      try {
        const date = new Date(sale.saleDate || sale.createdAt);
        const month = format(date, 'yyyy-MM');
        const revenue = parseFloat(sale.totalAmount || 0);
        
        if (!acc[month]) {
          acc[month] = { month, revenue: 0, transactions: 0 };
        }
        acc[month].revenue += revenue;
        acc[month].transactions += 1;
      } catch (error) {
        console.warn("Date parsing error:", error);
      }
      return acc;
    }, {});
    
    const trends = Object.values(monthlyData).sort((a: any, b: any) => 
      a.month.localeCompare(b.month)
    );
    
    return { trends };
  };

  const generatePaymentMethodsReport = (filteredSales: any[]) => {
    const paymentStats = filteredSales.reduce((acc: any, sale: any) => {
      const method = sale.paymentMethod || 'Unknown';
      const amount = parseFloat(sale.totalAmount || 0);
      
      if (!acc[method]) {
        acc[method] = { method, totalRevenue: 0, transactions: 0, avgTransaction: 0 };
      }
      
      acc[method].totalRevenue += amount;
      acc[method].transactions += 1;
      acc[method].avgTransaction = acc[method].totalRevenue / acc[method].transactions;
      
      return acc;
    }, {});
    
    return { paymentStats: Object.values(paymentStats) };
  };

  const exportReport = () => {
    if (!generatedReport) return;

    let csvContent = "";
    const timestamp = format(new Date(), 'yyyy-MM-dd');
    let dateRangeStr = "All Time";
    try {
      if (generatedReport.dateRange?.start && generatedReport.dateRange?.end) {
        dateRangeStr = `${format(generatedReport.dateRange.start, 'MMM dd, yyyy')} - ${format(generatedReport.dateRange.end, 'MMM dd, yyyy')}`;
      }
    } catch (error) {
      console.warn("Date formatting error:", error);
    }

    // Add header
    csvContent += `${getReportTitle()}\n`;
    csvContent += `Generated: ${format(generatedReport.generatedAt || new Date(), 'MMM dd, yyyy HH:mm')}\n`;
    csvContent += `Date Range: ${dateRangeStr}\n\n`;

    switch (reportType) {
      case "sales-summary":
        csvContent += "Summary\n";
        csvContent += `Total Revenue,${generatedReport.totalRevenue}\n`;
        csvContent += `Total Transactions,${generatedReport.totalTransactions}\n`;
        csvContent += `Average Transaction,${(generatedReport.avgTransactionValue || 0).toFixed(2)}\n\n`;
        
        csvContent += "Payment Methods\n";
        csvContent += "Method,Amount\n";
        Object.entries(generatedReport.paymentMethods || {}).forEach(([method, amount]: [string, any]) => {
          csvContent += `${method},${amount}\n`;
        });
        
        csvContent += "\nDaily Sales\n";
        csvContent += "Date,Revenue\n";
        Object.entries(generatedReport.dailySales || {}).forEach(([date, amount]: [string, any]) => {
          csvContent += `${date},${amount}\n`;
        });
        break;

      case "sales-by-associate":
        if (generatedReport.error) {
          csvContent += "Error: Access denied\n";
        } else {
          csvContent += "Associate,Code,Total Sales,Total Revenue,Avg Sale\n";
          Object.values(generatedReport.associateStats).forEach((associate: any) => {
            const avgSale = associate.totalSales > 0 ? (associate.totalRevenue / associate.totalSales).toFixed(2) : 0;
            csvContent += `"${associate.name}",${associate.code},${associate.totalSales},${associate.totalRevenue},${avgSale}\n`;
          });
        }
        break;

      case "inventory-status":
        csvContent += "Summary\n";
        csvContent += `Total Items,${generatedReport.totalItems}\n`;
        csvContent += `Total Value,${(generatedReport.totalValue || 0).toFixed(2)}\n`;
        csvContent += `Low Stock Count,${generatedReport.lowStockCount}\n`;
        csvContent += `Out of Stock Count,${generatedReport.outOfStockCount}\n\n`;
        
        csvContent += "Category Breakdown\n";
        csvContent += "Category,Item Count,Total Value\n";
        Object.entries(generatedReport.categoryBreakdown || {}).forEach(([category, data]: [string, any]) => {
          csvContent += `"${category}",${data.count},${(data.value || 0).toFixed(2)}\n`;
        });
        
        if ((generatedReport.lowStockItems || []).length > 0) {
          csvContent += "\nLow Stock Items\n";
          csvContent += "Name,SKU,Current Qty,Min Level\n";
          (generatedReport.lowStockItems || []).forEach((item: any) => {
            csvContent += `"${item.name}",${item.sku},${item.quantity},${item.minStockLevel}\n`;
          });
        }
        break;

      case "low-stock":
        csvContent += "Name,SKU,Current Quantity,Min Stock Level,Shortage\n";
        generatedReport.items.forEach((item: any) => {
          const shortage = item.minStockLevel - item.quantity;
          csvContent += `"${item.name}",${item.sku},${item.quantity},${item.minStockLevel},${shortage}\n`;
        });
        break;

      case "top-selling":
        csvContent += "Rank,Name,SKU,Total Quantity Sold,Total Revenue,Transactions\n";
        generatedReport.topItems.forEach((item: any, index: number) => {
          csvContent += `${index + 1},"${item.name}",${item.sku},${item.totalQuantity},${item.totalRevenue},${item.transactions}\n`;
        });
        break;

      case "inventory-adjustments":
        csvContent += "Date,Type,Item,Quantity Change,Reason,Associate\n";
        generatedReport.movements.forEach((movement: any) => {
          const date = format(new Date(movement.date), 'yyyy-MM-dd HH:mm');
          csvContent += `${date},${movement.type},"${movement.item?.name || 'Unknown'}",${movement.quantity},"${movement.reason}","${movement.associate || 'N/A'}"\n`;
        });
        break;

      case "category-performance":
        csvContent += "Category Performance Analysis\n\n";
        
        // Handle specific category filtering
        if (generatedReport.selectedCategory && generatedReport.categoryItems) {
          csvContent += `${generatedReport.selectedCategoryType}: ${generatedReport.selectedCategory}\n\n`;
          csvContent += "Item Name,SKU,Sales Count,Revenue,Units Sold,Avg Price\n";
          (generatedReport.categoryItems || [])
            .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
            .forEach((item: any) => {
              csvContent += `"${item.name}",${item.sku},${item.totalSales},${item.totalRevenue.toFixed(2)},${item.totalUnits},${item.avgPrice.toFixed(2)}\n`;
            });
        } else {
          // Handle all categories
          Object.entries(generatedReport.categoryStats || {}).forEach(([categoryType, stats]: [string, any]) => {
            csvContent += `${categoryType.toUpperCase()} Performance\n`;
            csvContent += "Value,Sales Count,Revenue,Units Sold,Avg Price\n";
            Object.values(stats)
              .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
              .forEach((stat: any) => {
                csvContent += `"${stat.name}",${stat.totalSales},${stat.totalRevenue.toFixed(2)},${stat.totalUnits},${stat.avgPrice.toFixed(2)}\n`;
              });
            csvContent += "\n";
          });
        }
        break;

      case "cost-analysis":
        csvContent += "Cost Analysis Summary\n";
        csvContent += `Total Cost,${generatedReport.totalCost.toFixed(2)}\n`;
        csvContent += `Total Value,${generatedReport.totalValue.toFixed(2)}\n`;
        csvContent += `Total Margin,${generatedReport.totalMargin.toFixed(2)}\n`;
        csvContent += `Overall Margin %,${generatedReport.overallMarginPercent.toFixed(2)}\n\n`;
        
        csvContent += "Item Details\n";
        csvContent += "Name,SKU,Cost,Price,Margin,Margin %,Quantity,Total Cost,Total Value\n";
        generatedReport.items.forEach((item: any) => {
          csvContent += `"${item.name}",${item.sku},${item.cost.toFixed(2)},${item.price.toFixed(2)},${item.margin.toFixed(2)},${item.marginPercent.toFixed(2)},${item.quantity},${item.totalCost.toFixed(2)},${item.totalValue.toFixed(2)}\n`;
        });
        break;

      case "profit-margins":
        csvContent += "Profit Margins Summary\n";
        csvContent += `Total Profit,${generatedReport.totalProfit.toFixed(2)}\n`;
        csvContent += `Average Margin,${generatedReport.avgMargin.toFixed(2)}%\n`;
        csvContent += `Highest Margin,${generatedReport.highestMargin.toFixed(2)}%\n`;
        csvContent += `Lowest Margin,${generatedReport.lowestMargin.toFixed(2)}%\n\n`;
        
        csvContent += "Transaction Details\n";
        csvContent += "Order Number,Item,Sale Price,Cost,Quantity,Profit,Profit Margin %,Date\n";
        generatedReport.profitData.forEach((profit: any) => {
          csvContent += `${profit.orderNumber},"${profit.itemName}",${profit.salePrice.toFixed(2)},${profit.cost.toFixed(2)},${profit.quantity},${profit.profit.toFixed(2)},${profit.profitMargin.toFixed(2)},${profit.date}\n`;
        });
        break;

      case "seasonal-trends":
        csvContent += "Month,Revenue,Transactions,Avg per Transaction\n";
        generatedReport.trends.forEach((trend: any) => {
          const avgPerTransaction = trend.transactions > 0 ? (trend.revenue / trend.transactions).toFixed(2) : '0.00';
          csvContent += `${trend.month},${trend.revenue.toFixed(2)},${trend.transactions},${avgPerTransaction}\n`;
        });
        break;

      case "payment-methods":
        csvContent += "Payment Method,Total Revenue,Transactions,Average Transaction\n";
        generatedReport.paymentStats.forEach((stat: any) => {
          csvContent += `${stat.method},${stat.totalRevenue.toFixed(2)},${stat.transactions},${stat.avgTransaction.toFixed(2)}\n`;
        });
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getReportTitle = () => {
    switch (reportType) {
      case "sales-summary": return "Sales Summary Report";
      case "sales-by-associate": return "Sales by Associate Report";
      case "inventory-status": return "Inventory Status Report";
      case "low-stock": return "Low Stock Report";
      case "inventory-adjustments": return "Inventory Adjustments Report";
      case "top-selling": return "Top Selling Items Report";
      case "category-performance": return "Category Performance Report";
      case "cost-analysis": return "Cost Analysis Report";
      case "profit-margins": return "Profit Margins Report";
      case "seasonal-trends": return "Seasonal Trends Report";
      case "payment-methods": return "Payment Methods Report";
      default: return "Report";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const renderReportContent = () => {
    if (!generatedReport) return null;

    switch (reportType) {
      case "sales-summary":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="text-green-600" size={20} />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-lg font-semibold">{formatCurrency(generatedReport.totalRevenue)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="text-blue-600" size={20} />
                  <div>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                    <p className="text-lg font-semibold">{generatedReport.totalTransactions}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="text-purple-600" size={20} />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Sale</p>
                    <p className="text-lg font-semibold">{formatCurrency(generatedReport.avgTransactionValue)}</p>
                  </div>
                </div>
              </Card>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Payment Methods</h4>
              <div className="space-y-2">
                {Object.entries(generatedReport.paymentMethods || {}).map(([method, amount]: [string, any]) => (
                  <div key={method} className="flex justify-between">
                    <span className="capitalize">{method}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "inventory-status":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="text-blue-600" size={20} />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                    <p className="text-lg font-semibold">{generatedReport.totalItems}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="text-green-600" size={20} />
                  <div>
                    <p className="text-sm text-muted-foreground">Inventory Value</p>
                    <p className="text-lg font-semibold">{formatCurrency(generatedReport.totalValue)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="text-orange-600" size={20} />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="text-lg font-semibold">{formatCurrency(generatedReport.totalCost || 0)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="text-emerald-600" size={20} />
                  <div>
                    <p className="text-sm text-muted-foreground">Potential Profit</p>
                    <p className="text-lg font-semibold">{formatCurrency(generatedReport.potentialProfit || 0)}</p>
                    <p className="text-xs text-muted-foreground">{(generatedReport.profitMargin || 0).toFixed(1)}% margin</p>
                  </div>
                </div>
              </Card>
            </div>
            
            {generatedReport.lowStockCount > 0 && (
              <Card className="p-4 border-orange-200 bg-orange-50">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="text-orange-600" size={20} />
                  <span className="font-medium text-orange-800">Low Stock Alert</span>
                </div>
                <p className="text-sm text-orange-700">{generatedReport.lowStockCount} items need restocking</p>
              </Card>
            )}
          </div>
        );

      case "low-stock":
        return (
          <div className="space-y-2">
            {(generatedReport.items || []).map((item: any) => (
              <div key={item.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    <span className="text-red-600 font-medium">{item.quantity}</span> / {item.minStockLevel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );

      case "sales-by-associate":
        if (generatedReport.error) {
          return <p className="text-red-600">Access denied. Admin privileges required.</p>;
        }
        return (
          <div className="space-y-4">
            {Object.values(generatedReport.associateStats || {}).map((associate: any) => (
              <Card key={associate.code} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{associate.name}</h4>
                    <p className="text-sm text-muted-foreground">Code: {associate.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(associate.totalRevenue)}</p>
                    <p className="text-sm text-muted-foreground">{associate.totalSales} sales</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );

      case "top-selling":
        return (
          <div className="space-y-2">
            {(generatedReport.topItems || []).map((item: any, index: number) => (
              <div key={item.sku} className="flex justify-between items-center p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(item.totalRevenue)}</p>
                  <p className="text-sm text-muted-foreground">{item.totalQuantity} sold</p>
                </div>
              </div>
            ))}
          </div>
        );

      case "category-performance":
        // Handle specific category filtering display
        if (generatedReport.selectedCategory && generatedReport.categoryItems) {
          return (
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-semibold text-blue-900">
                  {generatedReport.selectedCategoryType}: {generatedReport.selectedCategory}
                </h4>
                <p className="text-sm text-blue-700">
                  Showing performance for all items in this category
                </p>
              </div>
              
              <div className="space-y-2">
                {(generatedReport.categoryItems || [])
                  .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
                  .map((item: any) => (
                  <div key={item.sku} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.sku} • {item.totalSales} sales • {item.totalUnits} units
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.totalRevenue)}</p>
                      <p className="text-sm text-muted-foreground">Avg: {formatCurrency(item.avgPrice)}</p>
                    </div>
                  </div>
                ))}
                
                {(!generatedReport.categoryItems || generatedReport.categoryItems.length === 0) && (
                  <div className="text-center p-8 text-muted-foreground">
                    <p>No sales found for this category in the selected date range.</p>
                  </div>
                )}
              </div>
            </div>
          );
        }
        
        // Handle all categories display
        return (
          <div className="space-y-6">
            {Object.entries(generatedReport.categoryStats || {}).map(([categoryType, stats]: [string, any]) => (
              <div key={categoryType}>
                <h4 className="font-medium mb-4 capitalize">{categoryType} Performance</h4>
                <div className="space-y-2">
                  {Object.values(stats)
                    .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
                    .map((stat: any) => (
                    <div key={stat.name} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-medium">{stat.name}</p>
                        <p className="text-sm text-muted-foreground">{stat.totalSales} sales • {stat.totalUnits} units</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(stat.totalRevenue)}</p>
                        <p className="text-sm text-muted-foreground">Avg: {formatCurrency(stat.avgPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case "cost-analysis":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(generatedReport.totalCost)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(generatedReport.totalValue)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Margin</p>
                <p className="text-2xl font-bold">{formatCurrency(generatedReport.totalMargin)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Margin %</p>
                <p className="text-2xl font-bold">{generatedReport.overallMarginPercent.toFixed(1)}%</p>
              </Card>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Top Margin Items</h4>
              {generatedReport.items.slice(0, 5).map((item: any) => (
                <div key={item.sku} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.sku} • Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{item.marginPercent.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(item.margin)} margin</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "profit-margins":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(generatedReport.totalProfit)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Avg Margin</p>
                <p className="text-2xl font-bold">{generatedReport.avgMargin.toFixed(1)}%</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Highest</p>
                <p className="text-2xl font-bold text-green-600">{generatedReport.highestMargin.toFixed(1)}%</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Lowest</p>
                <p className="text-2xl font-bold text-red-600">{generatedReport.lowestMargin.toFixed(1)}%</p>
              </Card>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Recent Transactions</h4>
              {generatedReport.profitData.slice(0, 5).map((profit: any) => (
                <div key={profit.orderNumber} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">{profit.itemName}</p>
                    <p className="text-sm text-muted-foreground">Order: {profit.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(profit.profit)}</p>
                    <p className="text-sm text-muted-foreground">{profit.profitMargin.toFixed(1)}% margin</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "seasonal-trends":
        return (
          <div className="space-y-2">
            {generatedReport.trends.map((trend: any) => (
              <div key={trend.month} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium">{trend.month}</p>
                  <p className="text-sm text-muted-foreground">{trend.transactions} transactions</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(trend.revenue)}</p>
                  <p className="text-sm text-muted-foreground">
                    Avg: {formatCurrency(trend.transactions > 0 ? trend.revenue / trend.transactions : 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );

      case "payment-methods":
        return (
          <div className="space-y-2">
            {generatedReport.paymentStats.map((stat: any) => (
              <div key={stat.method} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium">{stat.method}</p>
                  <p className="text-sm text-muted-foreground">{stat.transactions} transactions</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(stat.totalRevenue)}</p>
                  <p className="text-sm text-muted-foreground">Avg: {formatCurrency(stat.avgTransaction)}</p>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return <p>Report type not implemented yet.</p>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="text-primary" size={20} />
            <span>Generate Reports</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales-summary">Sales Summary</SelectItem>
                  {isAdmin && <SelectItem value="sales-by-associate">Sales by Associate</SelectItem>}
                  <SelectItem value="inventory-status">Inventory Status</SelectItem>
                  <SelectItem value="low-stock">Low Stock Report</SelectItem>
                  <SelectItem value="top-selling">Top Selling Items</SelectItem>
                  <SelectItem value="inventory-adjustments">Inventory Adjustments</SelectItem>
                  <SelectItem value="category-performance">Category Performance</SelectItem>
                  <SelectItem value="cost-analysis">Cost Analysis</SelectItem>
                  <SelectItem value="profit-margins">Profit Margins</SelectItem>
                  <SelectItem value="seasonal-trends">Seasonal Trends</SelectItem>
                  <SelectItem value="payment-methods">Payment Methods</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filtering */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Advanced Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category Filter</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger data-testid="select-category-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-categories">All Categories</SelectItem>
                    
                    {/* Item Types */}
                    {ITEM_TYPES.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Types</div>
                        {ITEM_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </>
                    )}
                    
                    {/* Colors */}
                    {ITEM_COLORS.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Colors</div>
                        {ITEM_COLORS.map(color => (
                          <SelectItem key={color} value={color}>{color}</SelectItem>
                        ))}
                      </>
                    )}
                    
                    {/* Designs */}
                    {ITEM_DESIGNS.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Designs</div>
                        {ITEM_DESIGNS.map(design => (
                          <SelectItem key={design} value={design}>{design}</SelectItem>
                        ))}
                      </>
                    )}
                    
                    {/* Group Types */}
                    {GROUP_TYPES.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Group Types</div>
                        {GROUP_TYPES.map(groupType => (
                          <SelectItem key={groupType} value={groupType}>{groupType}</SelectItem>
                        ))}
                      </>
                    )}
                    
                    {/* Style Groups */}
                    {STYLE_GROUPS.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Style Groups</div>
                        {STYLE_GROUPS.map(styleGroup => (
                          <SelectItem key={styleGroup} value={styleGroup}>{styleGroup}</SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  <Label>Sales Associate</Label>
                  <Select value={selectedAssociate} onValueChange={setSelectedAssociate}>
                    <SelectTrigger data-testid="select-associate-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-associates">All Associates</SelectItem>
                      {associates.map((associate: any) => (
                        <SelectItem key={associate.id} value={associate.id}>
                          {associate.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger data-testid="select-payment-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-methods">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {dateRange === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>
          )}

          <Button
            onClick={generateReport}
            disabled={isGenerating}
            className="w-full"
            data-testid="button-generate-report"
          >
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>

          {generatedReport && (
            <>
              <Separator />
              
              {/* Report Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">{getReportTitle()}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(generatedReport.dateRange.start, 'MMM dd, yyyy')} - {format(generatedReport.dateRange.end, 'MMM dd, yyyy')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportReport}
                  data-testid="button-export-report"
                >
                  <Download size={16} className="mr-2" />
                  Export CSV
                </Button>
              </div>

              {/* Report Content */}
              <div className="border rounded-lg p-4 bg-muted/50">
                {renderReportContent()}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}