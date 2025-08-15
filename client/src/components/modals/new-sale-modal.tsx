import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { QrCode, X } from "lucide-react";
import QRScanner from "@/components/qr-scanner";
import { insertSaleSchema, type InsertSale } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const saleFormSchema = insertSaleSchema.extend({
  sku: z.string().min(1, "SKU is required"),
});

type SaleFormData = z.infer<typeof saleFormSchema>;

interface NewSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewSaleModal({ open, onOpenChange }: NewSaleModalProps) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin';
  


  const { data: associates = [] } = useQuery({
    queryKey: ["/api/associates"],
    enabled: isAdmin, // Only fetch associates if user is admin
  });

  const form = useForm<SaleFormData>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      sku: "",
      quantity: 1,
      unitPrice: "",
      totalAmount: "",
      paymentMethod: "cash",
      orderNumber: "",
      itemId: "",
      salesAssociateId: "",
    },
  });

  // Auto-populate the logged-in associate
  useEffect(() => {
    if (user && open) {
      form.setValue("salesAssociateId", (user as any).id);
    }
  }, [user, open, form]);

  const createSaleMutation = useMutation({
    mutationFn: async (data: InsertSale) => {
      const response = await apiRequest("POST", "/api/sales", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      onOpenChange(false);
      form.reset();
      setSelectedItem(null);
      toast({
        title: "Success",
        description: "Sale processed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process sale",
        variant: "destructive",
      });
    },
  });

  const searchItemsMutation = useMutation({
    mutationFn: async (searchTerm: string) => {
      const response = await apiRequest("GET", `/api/inventory/search/${encodeURIComponent(searchTerm)}`);
      return response.json();
    },
    onSuccess: (items) => {
      setSearchResults(items);
      if (items.length === 1) {
        // If only one result, auto-select it
        const item = items[0];
        setSelectedItem(item);
        form.setValue("itemId", item.id);
        form.setValue("unitPrice", item.price);
        updateTotalAmount();
      } else if (items.length === 0) {
        setSelectedItem(null);
        form.setValue("itemId", "");
        form.setValue("unitPrice", "");
        toast({
          title: "No items found",
          description: "No items match your search",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setSearchResults([]);
      setSelectedItem(null);
      form.setValue("itemId", "");
      form.setValue("unitPrice", "");
      toast({
        title: "Search failed",
        description: "Failed to search inventory items",
        variant: "destructive",
      });
    },
  });

  const generateOrderNumber = () => {
    return `ORD-${Date.now().toString().slice(-6)}`;
  };

  const updateTotalAmount = () => {
    const quantity = form.getValues("quantity");
    const unitPrice = Number(form.getValues("unitPrice"));
    if (quantity && unitPrice) {
      const total = quantity * unitPrice;
      form.setValue("totalAmount", total.toFixed(2));
    }
  };

  const onSkuChange = (sku: string) => {
    form.setValue("sku", sku);
    if (sku.trim()) {
      searchItemsMutation.mutate(sku.trim());
    } else {
      setSearchResults([]);
      setSelectedItem(null);
      form.setValue("itemId", "");
      form.setValue("unitPrice", "");
      form.setValue("totalAmount", "");
    }
  };

  const selectItem = (item: any) => {
    setSelectedItem(item);
    form.setValue("sku", item.sku);
    form.setValue("itemId", item.id);
    form.setValue("unitPrice", item.price);
    updateTotalAmount();
    setSearchResults([]);
  };

  const handleQRScan = (result: string) => {
    onSkuChange(result);
    setShowScanner(false);
  };

  const openScanner = () => {
    setShowScanner(true);
  };

  const onSubmit = (data: SaleFormData) => {
    if (!selectedItem) {
      toast({
        title: "Error",
        description: "Please select a valid item",
        variant: "destructive",
      });
      return;
    }

    const saleData: InsertSale = {
      orderNumber: generateOrderNumber(),
      itemId: data.itemId,
      quantity: data.quantity,
      unitPrice: Number(data.unitPrice).toFixed(2),
      totalAmount: Number(data.totalAmount).toFixed(2),
      paymentMethod: data.paymentMethod,
      salesAssociateId: data.salesAssociateId,
    };

    console.log("Submitting sale data:", saleData);
    createSaleMutation.mutate(saleData);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Sale</DialogTitle>
            <DialogDescription id="dialog-description">
              Process a new sale transaction by scanning or entering item details
            </DialogDescription>
          </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search Item (SKU or Description)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Scan QR code or type SKU..."
                        {...field}
                        onChange={(e) => onSkuChange(e.target.value)}
                        data-testid="input-sku-search"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={openScanner}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        data-testid="button-qr-scan"
                      >
                        <QrCode size={16} />
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                  
                  {/* Search Results Dropdown */}
                  {searchResults.length > 1 && (
                    <div className="mt-2 p-2 border rounded-md bg-background">
                      <p className="text-sm font-medium mb-2">Select an item:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {searchResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => selectItem(item)}
                            className="w-full text-left p-2 text-sm hover:bg-muted rounded border-b last:border-b-0"
                            data-testid={`button-select-item-${item.id}`}
                          >
                            <div className="font-medium">{item.sku}</div>
                            <div className="text-muted-foreground">{item.name} - ${item.price}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedItem && (
                    <div className="text-sm text-muted-foreground">
                      Selected: {selectedItem.name} - ${selectedItem.price}
                    </div>
                  )}
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => {
                          field.onChange(Number(e.target.value));
                          updateTotalAmount();
                        }}
                        data-testid="input-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          updateTotalAmount();
                        }}
                        data-testid="input-unit-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      readOnly
                      className="bg-muted"
                      {...field}
                      data-testid="input-total-amount"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="salesAssociateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sales Associate</FormLabel>
                  {isAdmin ? (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-sales-associate">
                          <SelectValue placeholder="Select associate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(associates as any[]).map((associate: any) => (
                          <SelectItem key={associate.id} value={associate.id}>
                            {associate.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <FormControl>
                      <Input
                        value={`${(user as any)?.firstName} ${(user as any)?.lastName}`.trim()}
                        readOnly
                        className="bg-muted"
                        data-testid="input-current-associate"
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                      data-testid="radio-payment-method"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash">Cash</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="venmo" id="venmo" />
                        <Label htmlFor="venmo">Venmo</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-sale"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSaleMutation.isPending || !selectedItem}
                data-testid="button-process-sale"
              >
                {createSaleMutation.isPending ? "Processing..." : "Process Sale"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    
    <QRScanner
      isOpen={showScanner}
      onScan={handleQRScan}
      onClose={() => setShowScanner(false)}
    />
    </>
  );
}
