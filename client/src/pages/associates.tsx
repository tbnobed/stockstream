import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Header from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { insertSalesAssociateSchema, type InsertSalesAssociate } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Associates() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssociate, setSelectedAssociate] = useState<any>(null);
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

  const editForm = useForm<{name: string; email?: string}>({
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: {name: string; email?: string} }) => {
      const response = await apiRequest("PATCH", `/api/associates/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/associates"] });
      setShowEditModal(false);
      setSelectedAssociate(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Sales associate updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sales associate",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: {name: string; email?: string}) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: {name: string; email?: string}) => {
    if (selectedAssociate) {
      updateMutation.mutate({ id: selectedAssociate.id, data });
    }
  };

  const getAssociateSales = (associateId: string) => {
    return sales.filter((sale: any) => sale.salesAssociateId === associateId);
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

  const handleViewDetails = (associate: any) => {
    setSelectedAssociate(associate);
    setShowDetailsModal(true);
  };

  const handleEditAssociate = (associate: any) => {
    setSelectedAssociate(associate);
    editForm.reset({
      name: associate.name || "",
      email: associate.email || "",
    });
    setShowEditModal(true);
  };

  const handleDeleteAssociate = (associate: any) => {
    // TODO: Implement delete functionality  
    toast({
      title: "Delete Associate",
      description: "Delete functionality will be implemented soon",
    });
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
              <div className="space-y-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0">
                {associates.map((associate: any) => {
                  const salesCount = getAssociateSales(associate.id).length;
                  const revenue = getAssociateRevenue(associate.id);
                  
                  return (
                    <Card key={associate.id} className="p-4 md:p-6 border-border">
                      {/* Mobile Layout */}
                      <div className="block md:hidden">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-primary-foreground font-semibold text-sm">
                                {associate.name ? associate.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'NA'}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-secondary" data-testid={`associate-name-${associate.id}`}>
                                {associate.name || "Unknown Associate"}
                              </h4>
                              <div className="text-sm text-muted-foreground">
                                Code: {associate.associateCode}
                              </div>
                            </div>
                          </div>
                          <Badge variant={associate.isActive ? "default" : "secondary"} className="text-xs">
                            {associate.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>

                        {associate.email && (
                          <div className="flex items-center text-sm text-muted-foreground mb-3">
                            <Mail className="mr-2" size={14} />
                            <span className="truncate">{associate.email}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                          <div className="text-center p-2 bg-muted rounded">
                            <div className="font-semibold text-secondary">{salesCount}</div>
                            <div className="text-xs text-muted-foreground">Sales</div>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <div className="font-semibold text-accent text-xs">
                              {formatCurrency(revenue)}
                            </div>
                            <div className="text-xs text-muted-foreground">Revenue</div>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <div className="font-semibold text-secondary text-xs">
                              {salesCount > 0 ? formatCurrency(revenue / salesCount) : "$0.00"}
                            </div>
                            <div className="text-xs text-muted-foreground">Avg Sale</div>
                          </div>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full" 
                          data-testid={`view-associate-${associate.id}`}
                          onClick={() => handleViewDetails(associate)}
                        >
                          <Eye size={14} className="mr-2" />
                          View Details
                        </Button>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden md:block">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-secondary mb-1" data-testid={`associate-name-${associate.id}`}>
                              {associate.name || "Unknown Associate"}
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`associate-menu-${associate.id}`}>
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(associate)}>
                                <Eye className="mr-2" size={14} />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditAssociate(associate)}>
                                <Edit className="mr-2" size={14} />
                                Edit Associate
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteAssociate(associate)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2" size={14} />
                                Delete Associate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full" 
                            data-testid={`view-associate-${associate.id}`}
                            onClick={() => handleViewDetails(associate)}
                          >
                            <Eye size={14} className="mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </main>

      {/* Associate Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye size={20} className="text-primary" />
              <span>Associate Details</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedAssociate && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">
                    {selectedAssociate.name ? selectedAssociate.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'NA'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-secondary">{selectedAssociate.name || "Unknown Associate"}</h3>
                  <p className="text-sm font-mono text-blue-600 dark:text-blue-400">Code: {selectedAssociate.associateCode}</p>
                  <Badge variant={selectedAssociate.isActive ? "default" : "secondary"} className="mt-1">
                    {selectedAssociate.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {selectedAssociate.email && (
                <div className="flex items-center space-x-2">
                  <Mail size={16} className="text-muted-foreground" />
                  <span className="text-sm">{selectedAssociate.email}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{getAssociateSales(selectedAssociate.id).length}</div>
                  <div className="text-xs text-muted-foreground">Total Sales</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-accent">{formatCurrency(getAssociateRevenue(selectedAssociate.id))}</div>
                  <div className="text-xs text-muted-foreground">Revenue</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-secondary">
                    {getAssociateSales(selectedAssociate.id).length > 0 
                      ? formatCurrency(getAssociateRevenue(selectedAssociate.id) / getAssociateSales(selectedAssociate.id).length) 
                      : "$0.00"
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Sale</div>
                </Card>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Recent Sales</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {getAssociateSales(selectedAssociate.id).slice(0, 5).map((sale: any) => (
                    <div key={sale.id} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                      <span>{sale.orderNumber}</span>
                      <span className="font-medium">{formatCurrency(Number(sale.totalAmount))}</span>
                    </div>
                  ))}
                  {getAssociateSales(selectedAssociate.id).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No sales yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Associate Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="w-full max-w-md mx-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-secondary">Edit Associate</DialogTitle>
          </DialogHeader>
          
          {selectedAssociate && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} data-testid="input-edit-associate-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} data-testid="input-edit-associate-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    data-testid="button-cancel-edit-associate"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="button-save-edit-associate"
                  >
                    {updateMutation.isPending ? "Updating..." : "Update Associate"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
