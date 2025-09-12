import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { QrCode, X, Plus, Minus, ShoppingCart, Trash2 } from "lucide-react";
import QRScanner from "@/components/qr-scanner";
import { insertSaleSchema, type InsertSale } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

// Cart item type for multi-item transactions
interface CartItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  totalPrice: number;
  availableStock: number;
}

const transactionFormSchema = z.object({
  paymentMethod: z.enum(["cash", "venmo"]),
  salesAssociateId: z.string().min(1, "Sales associate is required"),
  customerName: z.string().optional(),
  customerEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface NewSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewSaleModal({ open, onOpenChange }: NewSaleModalProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin';

  const { data: associates = [] } = useQuery({
    queryKey: ["/api/associates"],
    enabled: isAdmin, // Only fetch associates if user is admin
  });

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      paymentMethod: "cash",
      salesAssociateId: "",
      customerName: "",
      customerEmail: "",
    },
  });

  // Auto-populate the logged-in associate
  useEffect(() => {
    if (user && open) {
      form.setValue("salesAssociateId", (user as any).id);
    }
  }, [user, open, form]);

  // Reset cart when modal opens/closes
  useEffect(() => {
    if (!open) {
      setCart([]);
      setSearchTerm("");
      setSearchResults([]);
      setSelectedQuantity(1);
      form.reset();
    }
  }, [open, form]);

  const processSaleMutation = useMutation({
    mutationFn: async (data: { items: CartItem[], formData: TransactionFormData }) => {
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      
      // Process each item in the cart as individual sale records with same order number
      const salesPromises = data.items.map(item => {
        const saleData: InsertSale = {
          itemId: item.id,
          salesAssociateId: data.formData.salesAssociateId,
          quantity: item.quantity,
          unitPrice: item.price.toString(),
          totalAmount: item.totalPrice.toString(),
          paymentMethod: data.formData.paymentMethod,
          orderNumber: orderNumber,
          customerEmail: data.formData.customerEmail?.trim() || undefined,
          customerName: data.formData.customerName?.trim() || undefined,
        };
        return apiRequest("POST", "/api/sales", saleData);
      });
      
      await Promise.all(salesPromises);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: `Transaction completed! ${cart.length} item(s) processed.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process transaction",
        variant: "destructive",
      });
      console.error("Sale processing error:", error);
    },
  });

  const searchItemsMutation = useMutation({
    mutationFn: async (searchTerm: string) => {
      const response = await apiRequest("GET", `/api/inventory/search/${encodeURIComponent(searchTerm)}`);
      return response.json();
    },
    onSuccess: (items) => {
      setSearchResults(items);
      if (items.length === 0) {
        toast({
          title: "No items found",
          description: "No items match your search",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setSearchResults([]);
      toast({
        title: "Search failed",
        description: "Failed to search inventory items",
        variant: "destructive",
      });
    },
  });

  // Cart management functions
  const addToCart = (item: any) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      // Increase quantity if item already in cart
      if (existingItem.quantity + selectedQuantity > item.quantity) {
        toast({
          title: "Insufficient stock",
          description: `Only ${item.quantity} units available`,
          variant: "destructive",
        });
        return;
      }
      
      setCart(cart.map(cartItem => 
        cartItem.id === item.id 
          ? { 
              ...cartItem, 
              quantity: cartItem.quantity + selectedQuantity,
              totalPrice: (cartItem.quantity + selectedQuantity) * cartItem.price
            }
          : cartItem
      ));
    } else {
      // Add new item to cart
      if (selectedQuantity > item.quantity) {
        toast({
          title: "Insufficient stock",
          description: `Only ${item.quantity} units available`,
          variant: "destructive",
        });
        return;
      }
      
      const cartItem: CartItem = {
        id: item.id,
        sku: item.sku,
        name: item.name,
        price: Number(item.price),
        quantity: selectedQuantity,
        totalPrice: selectedQuantity * Number(item.price),
        availableStock: item.quantity,
      };
      
      setCart([...cart, cartItem]);
    }
    
    setSearchTerm("");
    setSearchResults([]);
    setSelectedQuantity(1);
    
    toast({
      title: "Item added",
      description: `${item.name} added to cart`,
    });
  };

  const updateCartItemQuantity = (itemId: string, newQuantity: number) => {
    const item = cart.find(cartItem => cartItem.id === itemId);
    if (!item) return;
    
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    if (newQuantity > item.availableStock) {
      toast({
        title: "Insufficient stock",
        description: `Only ${item.availableStock} units available`,
        variant: "destructive",
      });
      return;
    }
    
    setCart(cart.map(cartItem => 
      cartItem.id === itemId 
        ? { 
            ...cartItem, 
            quantity: newQuantity,
            totalPrice: newQuantity * cartItem.price
          }
        : cartItem
    ));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
    toast({
      title: "Item removed",
      description: "Item removed from cart",
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.totalPrice, 0);
  };

  const onSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      searchItemsMutation.mutate(value.trim());
    } else {
      setSearchResults([]);
    }
  };

  const handleQRScan = (result: string) => {
    onSearchChange(result);
    setShowScanner(false);
  };

  const onSubmit = (data: TransactionFormData) => {
    if (cart.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to cart before processing",
        variant: "destructive",
      });
      return;
    }
    
    processSaleMutation.mutate({ items: cart, formData: data });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sale Transaction</DialogTitle>
            <DialogDescription>
              Add multiple items to cart and process as one transaction
            </DialogDescription>
          </DialogHeader>
          
          {/* Item Search Section */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Scan QR code or type SKU..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  data-testid="input-item-search"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowScanner(true)}
                data-testid="button-scan-qr"
              >
                <QrCode size={20} />
              </Button>
            </div>
            
            {/* Quantity Selector for Adding Items */}
            <div className="flex items-center gap-2">
              <Label htmlFor="quantity">Quantity:</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                  data-testid="button-decrease-quantity"
                >
                  <Minus size={16} />
                </Button>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                  data-testid="input-selected-quantity"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuantity(selectedQuantity + 1)}
                  data-testid="button-increase-quantity"
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-md p-2 space-y-2 max-h-32 overflow-y-auto">
                {searchResults.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center p-2 hover:bg-muted rounded">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">SKU: {item.sku} • ${Number(item.price).toFixed(2)} • Stock: {item.quantity}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => addToCart(item)}
                      data-testid={`button-add-item-${item.id}`}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Cart Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart size={20} />
                Cart ({cart.length} items)
              </h3>
              {cart.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  data-testid="button-clear-cart"
                >
                  Clear Cart
                </Button>
              )}
            </div>
            
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Cart is empty. Search and add items above.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {cart.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        <p className="text-sm">Unit Price: ${Number(item.price).toFixed(2)}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                          data-testid={`button-decrease-cart-${item.id}`}
                        >
                          <Minus size={14} />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                          data-testid={`button-increase-cart-${item.id}`}
                        >
                          <Plus size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          data-testid={`button-remove-cart-${item.id}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 text-right">
                      <Badge variant="secondary">
                        Total: ${item.totalPrice.toFixed(2)}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            
            {cart.length > 0 && (
              <div className="text-right">
                <p className="text-xl font-bold">
                  Total Amount: ${getTotalAmount().toFixed(2)}
                </p>
              </div>
            )}
          </div>
          
          {/* Transaction Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              {/* Venmo Code Display */}
              {form.watch("paymentMethod") === "venmo" && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label className="text-sm font-medium text-blue-800">Venmo Payment Code</Label>
                  <div className="mt-2 text-2xl font-bold text-blue-900" data-testid="text-venmo-code">
                    @AxemenMCAZ
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Show this code to the customer for Venmo payment
                  </p>
                </div>
              )}

              {/* Customer Information Fields */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <Label className="text-sm font-medium">Customer Information (Optional - for Email Receipt)</Label>
                
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter customer name"
                          {...field}
                          data-testid="input-modal-customer-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter customer email"
                          {...field}
                          data-testid="input-modal-customer-email"
                        />
                      </FormControl>
                      {field.value && (
                        <FormDescription className="text-xs">
                          ✉️ Customer will receive a digital receipt via email
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
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
                  disabled={processSaleMutation.isPending || cart.length === 0}
                  data-testid="button-process-transaction"
                >
                  {processSaleMutation.isPending ? "Processing..." : `Process Transaction (${cart.length} items)`}
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