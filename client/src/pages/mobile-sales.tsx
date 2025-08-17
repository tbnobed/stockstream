import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  QrCode, 
  ShoppingCart, 
  Plus, 
  Minus, 
  DollarSign, 
  CreditCard, 
  Trash2,
  Camera,
  LogOut
} from "lucide-react";
import QRScanner from "@/components/qr-scanner";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  price: string;
  quantity: number;
  type: string;
  size?: string;
  color?: string;
}

interface CartItem extends InventoryItem {
  cartQuantity: number;
}

export default function MobileSales() {
  const { user, logout } = useAuth();
  const [skuInput, setSkuInput] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "venmo">("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();

  // Fetch inventory items
  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Process sale mutation
  const processSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      return apiRequest("POST", "/api/sales", saleData);
    },
    onSuccess: () => {
      toast({
        title: "Sale processed",
        description: "Transaction completed successfully!",
      });
      setCart([]);
      setSkuInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired", 
          description: "Please log in again",
          variant: "destructive",
        });
        setTimeout(() => logout(), 1000);
      } else {
        toast({
          title: "Sale failed",
          description: error instanceof Error ? error.message : "Failed to process sale",
          variant: "destructive",
        });
      }
    }
  });

  // Add item to cart by SKU
  const addItemBySku = () => {
    const item = (inventory as InventoryItem[]).find((i: InventoryItem) => i.sku.toLowerCase() === skuInput.toLowerCase());
    if (!item) {
      toast({
        title: "Item not found",
        description: "No item found with that SKU",
        variant: "destructive",
      });
      return;
    }

    if (item.quantity <= 0) {
      toast({
        title: "Out of stock",
        description: "This item is currently out of stock",
        variant: "destructive",
      });
      return;
    }

    const existingCartItem = cart.find(c => c.id === item.id);
    if (existingCartItem) {
      if (existingCartItem.cartQuantity >= item.quantity) {
        toast({
          title: "Insufficient stock",
          description: "Cannot add more items than available in stock",
          variant: "destructive",
        });
        return;
      }
      setCart(cart.map(c => 
        c.id === item.id 
          ? { ...c, cartQuantity: c.cartQuantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, { ...item, cartQuantity: 1 }]);
    }

    setSkuInput("");
    toast({
      title: "Item added",
      description: `${item.name} added to cart`,
    });
  };

  // Update cart item quantity
  const updateCartQuantity = (itemId: string, change: number) => {
    const item = (inventory as InventoryItem[]).find((i: InventoryItem) => i.id === itemId);
    if (!item) return;

    setCart(cart.map(cartItem => {
      if (cartItem.id === itemId) {
        const newQuantity = cartItem.cartQuantity + change;
        if (newQuantity <= 0) {
          return null;
        }
        if (newQuantity > item.quantity) {
          toast({
            title: "Insufficient stock",
            description: "Cannot exceed available quantity",
            variant: "destructive",
          });
          return cartItem;
        }
        return { ...cartItem, cartQuantity: newQuantity };
      }
      return cartItem;
    }).filter(Boolean) as CartItem[]);
  };

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (parseFloat(item.price) * item.cartQuantity), 0);
  };

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to cart before processing sale",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const saleItems = cart.map(item => ({
        inventoryItemId: item.id,
        quantity: item.cartQuantity,
        unitPrice: parseFloat(item.price)
      }));

      await processSaleMutation.mutateAsync({
        items: saleItems,
        paymentMethod,
        associateId: (user as any)?.id
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle SKU input submit
  const handleSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (skuInput.trim()) {
      addItemBySku();
    }
  };

  // Handle QR scan result
  const handleQRScan = (result: string) => {
    console.log("QR code scanned:", result);
    setSkuInput(result);
    setShowScanner(false);
    
    // Automatically add item if valid SKU
    const item = (inventory as InventoryItem[]).find((i: InventoryItem) => i.sku.toLowerCase() === result.toLowerCase());
    if (item) {
      setSkuInput(result);
      // Use setTimeout to ensure state is updated before calling addItemBySku
      setTimeout(() => addItemBySku(), 100);
    } else {
      // Keep the scanned value in input for manual review
      toast({
        title: "Scanned code",
        description: "Please verify the SKU and add manually if needed",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sales Terminal
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Welcome, {(user as any)?.firstName} {(user as any)?.lastName}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* SKU Scanner/Input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scan or Enter SKU
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <form onSubmit={handleSkuSubmit} className="flex gap-2">
              <Input
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                placeholder="Scan QR code or enter SKU"
                className="text-lg"
                data-testid="input-sku"
              />
              <Button type="submit" disabled={!skuInput.trim()} data-testid="button-add-sku">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
            
            <Button
              onClick={() => setShowScanner(true)}
              className="w-full"
              variant="outline"
              data-testid="button-open-scanner"
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan QR Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cart */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart ({cart.length} items)
            </CardTitle>
            {cart.length > 0 && (
              <Badge variant="secondary" className="text-lg">
                ${calculateTotal().toFixed(2)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {cart.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Cart is empty. Scan items to add them.
            </p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      SKU: {item.sku} • ${item.price}
                      {item.size && ` • Size: ${item.size}`}
                      {item.color && ` • Color: ${item.color}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCartQuantity(item.id, -1)}
                      data-testid={`button-decrease-${item.id}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">
                      {item.cartQuantity}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCartQuantity(item.id, 1)}
                      disabled={item.cartQuantity >= item.quantity}
                      data-testid={`button-increase-${item.id}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeFromCart(item.id)}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment & Checkout */}
      {cart.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment & Checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value: "cash" | "venmo") => setPaymentMethod(value)}>
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Cash
                    </div>
                  </SelectItem>
                  <SelectItem value="venmo">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Venmo
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={processSale}
              disabled={isProcessing}
              data-testid="button-process-sale"
            >
              {isProcessing ? "Processing..." : "Process Sale"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* QR Scanner Modal */}
      <QRScanner 
        isOpen={showScanner}
        onScan={handleQRScan}
        onClose={() => setShowScanner(false)}
      />
    </div>
  );
}