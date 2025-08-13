import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Header from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, MoreHorizontal } from "lucide-react";
import { insertSalesAssociateSchema, type InsertSalesAssociate } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Associates() {
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();

  const { data: associates = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/associates"],
  });

  const { data: sales = [] } = useQuery<any[]>({
    queryKey: ["/api/sales"],
  });

  const form = useForm<{name: string; email?: string}>({
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {name: string; email?: string}) => {
      const response = await apiRequest("POST", "/api/associates", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/associates"] });
      setShowAddModal(false);
      form.reset();
      toast({
        title: "Success",
        description: "Sales associate added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add sales associate",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: {name: string; email?: string}) => {
    createMutation.mutate(data);
  };

  const getAssociateSales = (associateId: string) => {
    return sales.filter((sale: any) => sale.associateId === associateId);
  };

  const getAssociateRevenue = (associateId: string) => {
    const associateSales = getAssociateSales(associateId);
    return associateSales.reduce((total: number, sale: any) => total + Number(sale.totalAmount), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <>
      <Header
        title="Sales Associates"
        subtitle="Manage your sales team"
      />

      <main className="flex-1 overflow-y-auto p-6 bg-background">
        {/* Add Associate Button */}
        <div className="mb-6">
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-add-associate">
                <Plus className="mr-2" size={16} />
                Add Associate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Sales Associate</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} data-testid="input-associate-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email address" {...field} data-testid="input-associate-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddModal(false)}
                      data-testid="button-cancel-associate"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-save-associate"
                    >
                      {createMutation.isPending ? "Adding..." : "Add Associate"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Associates List */}
        <Card className="border-border">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-secondary">Sales Associates</h3>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading associates...</div>
            ) : !associates.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No sales associates found. Add your first associate to get started.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {associates.map((associate: any) => {
                  const salesCount = getAssociateSales(associate.id).length;
                  const revenue = getAssociateRevenue(associate.id);
                  
                  return (
                    <Card key={associate.id} className="p-6 border-border">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-secondary mb-1" data-testid={`associate-name-${associate.id}`}>
                            {associate.name}
                          </h4>
                          <div className="text-sm font-mono text-blue-600 dark:text-blue-400 mb-2">
                            Code: {associate.associateCode}
                          </div>
                          {associate.email && (
                            <div className="flex items-center text-sm text-muted-foreground mb-2">
                              <Mail className="mr-1" size={14} />
                              {associate.email}
                            </div>
                          )}
                          <Badge variant={associate.isActive ? "default" : "secondary"}>
                            {associate.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm" data-testid={`associate-menu-${associate.id}`}>
                          <MoreHorizontal size={16} />
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Sales</span>
                          <span className="text-sm font-medium text-secondary">{salesCount}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Revenue</span>
                          <span className="text-sm font-medium text-secondary">
                            {formatCurrency(revenue)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Avg. Sale</span>
                          <span className="text-sm font-medium text-secondary">
                            {salesCount > 0 ? formatCurrency(revenue / salesCount) : "$0.00"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-border">
                        <Button variant="outline" size="sm" className="w-full" data-testid={`view-associate-${associate.id}`}>
                          View Details
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </main>
    </>
  );
}
