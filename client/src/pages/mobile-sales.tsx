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
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  // Fetch inventory items
  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Add item to cart by SKU
  const addItemBySku = () => {
    console.log("Looking for SKU:", skuInput);
    console.log("Available inventory SKUs:", inventory.map((i: InventoryItem) => i.sku));
    
    // First try exact match
    let item = (inventory as InventoryItem[]).find((i: InventoryItem) => i.sku.toLowerCase() === skuInput.toLowerCase());
    
    // If no exact match, try trimmed comparison (handle whitespace issues)
    if (!item) {
      item = (inventory as InventoryItem[]).find((i: InventoryItem) => 
        i.sku.toLowerCase().trim() === skuInput.toLowerCase().trim()
      );
    }
    
    if (!item) {
      console.log("Item not found for SKU:", skuInput);
      // Try a more flexible search only if exact matches fail
      const partialMatch = (inventory as InventoryItem[]).find((i: InventoryItem) => 
        i.sku.toLowerCase().includes(skuInput.toLowerCase()) || 
        skuInput.toLowerCase().includes(i.sku.toLowerCase())
      );
      
      if (partialMatch) {
        console.log("Found partial match:", partialMatch.sku);
        // Auto-correct the SKU and try again
        setSkuInput(partialMatch.sku);
        setTimeout(() => {
          // Recursively call with corrected SKU
          const correctedItem = (inventory as InventoryItem[]).find((i: InventoryItem) => i.sku === partialMatch.sku);
          if (correctedItem) {
            // Add the corrected item directly
            addItemToCart(correctedItem);
          }
        }, 100);
        return;
      }
      
      toast({
        title: "Item not found",
        description: "No item found with that SKU",
        variant: "destructive",
      });
      return;
    }

    addItemToCart(item);
  };

  // Helper function to add item to cart
  const addItemToCart = (item: InventoryItem) => {

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
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      
      console.log("Processing mobile sale with order:", orderNumber);
      
      // Process each item in the cart as individual sale records with same order number
      const salesPromises = cart.map(item => {
        const saleData = {
          itemId: item.id,
          salesAssociateId: (user as any)?.id,
          quantity: item.cartQuantity,
          unitPrice: item.price.toString(),
          totalAmount: (item.cartQuantity * parseFloat(item.price)).toString(),
          paymentMethod: paymentMethod,
          orderNumber: orderNumber,
        };
        
        console.log("Creating individual sale:", saleData);
        return apiRequest("POST", "/api/sales", saleData);
      });
      
      await Promise.all(salesPromises);
      
      toast({
        title: "Sale processed",
        description: "Transaction completed successfully!",
      });
      
      // Reset on success
      setCart([]);
      setSkuInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
    } catch (error: any) {
      console.error("Sales creation error:", error);
      toast({
        title: "Sale failed",
        description: error instanceof Error ? error.message : "Failed to process sale",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSkuInput(value);
    
    if (value.trim().length > 0) {
      // Filter inventory items that match the search
      const filtered = inventory.filter((item: InventoryItem) =>
        item.sku.toLowerCase().includes(value.toLowerCase()) ||
        item.name.toLowerCase().includes(value.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 5)); // Show max 5 results
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  // Handle SKU input submit
  const handleSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (skuInput.trim()) {
      addItemBySku();
      setShowResults(false);
    }
  };

  // Handle selecting an item from search results
  const handleSelectSearchResult = (item: InventoryItem) => {
    setSkuInput(item.sku);
    setShowResults(false);
    addItemToCart(item);
  };

  // Handle QR scan result
  const handleQRScan = (result: string) => {
    console.log("QR code scanned:", result);
    setSkuInput(result);
    setShowScanner(false);
    
    // Automatically add item if valid SKU - use a more direct approach
    setTimeout(() => {
      const item = (inventory as InventoryItem[]).find((i: InventoryItem) => i.sku.toLowerCase() === result.toLowerCase());
      if (item) {
        console.log("Direct match found for scanned SKU:", result);
        // Add item directly to cart
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
          setCart(prevCart => [...prevCart, { ...item, cartQuantity: 1 }]);
        }

        setSkuInput("");
        toast({
          title: "Item added",
          description: `${item.name} added to cart via QR scan`,
        });
      } else {
        toast({
          title: "Item not found",
          description: "No item found with that QR code",
          variant: "destructive",
        });
      }
    }, 100);
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
          <div className="flex gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="text-xs h-6 px-2"
              data-testid="button-dashboard"
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"  
              size="sm"
              onClick={() => window.location.href = '/inventory'}
              className="text-xs h-6 px-2"
              data-testid="button-inventory"
            >
              Inventory
            </Button>
            <Button
              variant="ghost"  
              size="sm"
              onClick={() => window.location.href = '/sales'}
              className="text-xs h-6 px-2"
              data-testid="button-sales"
            >
              Sales
            </Button>
          </div>
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
            <div className="relative">
              <form onSubmit={handleSkuSubmit} className="flex gap-2">
                <Input
                  value={skuInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => skuInput && setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 200)}
                  placeholder="Scan QR code or enter SKU"
                  className="text-lg"
                  data-testid="input-sku"
                />
                <Button type="submit" disabled={!skuInput.trim()} data-testid="button-add-sku">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
              
              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-64 overflow-y-auto">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSearchResult(item)}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                      data-testid={`search-result-${item.sku}`}
                    >
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <span>SKU: {item.sku}</span>
                        <span>•</span>
                        <span>${item.price}</span>
                        <span>•</span>
                        <span>{item.quantity} in stock</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
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