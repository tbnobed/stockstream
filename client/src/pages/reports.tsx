import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Header from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Download, Calendar, TrendingUp, FileBarChart, Package, DollarSign } from "lucide-react";
import ReportsModal from "@/components/modals/reports-modal";

const COLORS = ['hsl(207, 81%, 35%)', 'hsl(122, 39%, 49%)', 'hsl(37, 100%, 56%)', 'hsl(4, 77%, 57%)'];

export default function Reports() {
  const [showReportsModal, setShowReportsModal] = useState(false);

  const { data: sales = [] } = useQuery<any[]>({
    queryKey: ["/api/sales"],
  });

  const { data: stats = {} } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: inventory = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: associates = [] } = useQuery<any[]>({
    queryKey: ["/api/associates"],
  });

  // Process data for charts
  const salesByAssociate = associates.map((associate: any) => {
    const associateSales = sales.filter((sale: any) => sale.salesAssociateId === associate.id) || [];
    const totalSales = associateSales.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount), 0);
    
    return {
      name: associate.name,
      sales: associateSales.length,
      revenue: totalSales,
    };
  });

  const inventoryByType = inventory.reduce((acc: any, item: any) => {
    const type = item.type || 'Unknown';
    if (!acc[type]) {
      acc[type] = { type, count: 0, value: 0 };
    }
    acc[type].count += item.quantity || 0;
    acc[type].value += (item.quantity || 0) * Number(item.price || 0);
    return acc;
  }, {});

  const inventoryData = Object.values(inventoryByType);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <>
      <Header
        title="Reports & Analytics"
        subtitle="Analyze your sales and inventory performance"
      />

      <main className="flex-1 overflow-y-auto p-6 bg-background">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold text-secondary mt-1">
                  {formatCurrency(stats.totalRevenue || 0)}
                </p>
              </div>
              <TrendingUp className="text-accent" size={24} />
            </div>
          </Card>

          <Card className="p-6 border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold text-secondary mt-1">
                  {sales.length || 0}
                </p>
              </div>
              <FileBarChart className="text-primary" size={24} />
            </div>
          </Card>

          <Card className="p-6 border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Sale Value</p>
                <p className="text-2xl font-bold text-secondary mt-1">
                  {sales.length ? formatCurrency((stats.totalRevenue || 0) / sales.length) : "$0.00"}
                </p>
              </div>
              <Calendar className="text-warning" size={24} />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sales by Associate */}
          <Card className="border-border">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-secondary">Sales by Associate</h3>
                <Button variant="outline" size="sm" data-testid="export-associate-report">
                  <Download className="mr-2" size={14} />
                  Export
                </Button>
              </div>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesByAssociate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(Number(value)) : value,
                    name === 'revenue' ? 'Revenue' : 'Sales Count'
                  ]} />
                  <Legend />
                  <Bar dataKey="sales" fill="hsl(207, 81%, 35%)" name="Sales Count" />
                  <Bar dataKey="revenue" fill="hsl(122, 39%, 49%)" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Inventory Distribution */}
          <Card className="border-border">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-secondary">Inventory by Type</h3>
                <Button variant="outline" size="sm" data-testid="export-inventory-report">
                  <Download className="mr-2" size={14} />
                  Export
                </Button>
              </div>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={inventoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, count }) => `${type}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {inventoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Detailed Reports */}
        <Card className="border-border">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-secondary">Generate Detailed Reports</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-start" 
                data-testid="generate-sales-report"
                onClick={() => setShowReportsModal(true)}
              >
                <div className="flex items-center mb-2">
                  <FileBarChart className="mr-2" size={16} />
                  <h4 className="font-medium">Sales Report</h4>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  Comprehensive sales data with filters by date, associate, payment method, and categories
                </p>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-start" 
                data-testid="generate-inventory-report"
                onClick={() => setShowReportsModal(true)}
              >
                <div className="flex items-center mb-2">
                  <Package className="mr-2" size={16} />
                  <h4 className="font-medium">Inventory Report</h4>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  Stock levels, category analysis, low stock alerts, cost analysis, and inventory valuation
                </p>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-start" 
                data-testid="generate-revenue-report"
                onClick={() => setShowReportsModal(true)}
              >
                <div className="flex items-center mb-2">
                  <DollarSign className="mr-2" size={16} />
                  <h4 className="font-medium">Revenue Report</h4>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  Revenue trends, profit margins, category performance, and cost analysis
                </p>
              </Button>
            </div>
          </div>
        </Card>
      </main>

      <ReportsModal 
        open={showReportsModal} 
        onOpenChange={setShowReportsModal} 
      />
    </>
  );
}
