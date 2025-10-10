import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  QrCode, 
  ShoppingCart, 
  Plus, 
  Minus, 
  DollarSign, 
  CreditCard, 
  Trash2,
  Camera,
  LogOut,
  UserCheck, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  RotateCcw 
} from 'lucide-react';
import QRScanner from "@/components/qr-scanner";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import ProcessReturnModal from "@/components/modals/process-return-modal";
import QRCode from 'qrcode';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import type { InventoryItem } from '@shared/schema';

interface VolunteerSession {
  email: string;
  expiresAt: string;
  sessionToken: string;
}

interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: string;
  quantity: number;
  cartQuantity: number;
  type: string;
  size?: string;
  color?: string;
}

export default function VolunteerSales() {
  const [session, setSession] = useState<VolunteerSession | null>(null);
  const [email, setEmail] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [skuInput, setSkuInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "venmo" | "paypal">("cash");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [receiptToken, setReceiptToken] = useState<string | null>(null);
  const [showReceiptQR, setShowReceiptQR] = useState(false);
  const [venmoQRCode, setVenmoQRCode] = useState<string>("");
  const [venmoUsername, setVenmoUsername] = useState<string>("");
  const [paypalQRCode, setPaypalQRCode] = useState<string>("");
  const [paypalUsername, setPaypalUsername] = useState<string>("");
  const [mode, setMode] = useState<"sale" | "return">("sale");
  const [orderNumberForReturn, setOrderNumberForReturn] = useState("");
  const [saleForReturn, setSaleForReturn] = useState<any>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const { toast } = useToast();

  // Fetch application configuration
  const { data: config } = useQuery<{ venmoUsername: string; paypalUsername: string }>({
    queryKey: ["/api/config"],
  });

  // Check for existing session on load
  useEffect(() => {
    const token = localStorage.getItem('volunteer_session_token');
    if (token) {
      validateSession(token);
    }
  }, []);

  // Load inventory when session is established
  useEffect(() => {
    if (session) {
      loadInventory();
    }
  }, [session]);

  // Generate payment QR codes when payment method changes or config loads
  useEffect(() => {
    const generatePaymentQRs = async () => {
      const venmoUser = config?.venmoUsername;
      const paypalUser = config?.paypalUsername;
      
      // Generate Venmo QR code
      if (paymentMethod === "venmo" && venmoUser) {
        try {
          const venmoUrl = `https://venmo.com/u/${venmoUser}`;
          const qrDataUrl = await QRCode.toDataURL(venmoUrl, {
            width: 512,
            margin: 4,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });
          setVenmoQRCode(qrDataUrl);
          setVenmoUsername(venmoUser);
        } catch (error) {
          console.error('Error generating Venmo QR code:', error);
          setVenmoQRCode("");
        }
      } else {
        setVenmoQRCode("");
        setVenmoUsername("");
      }

      // Generate PayPal QR code
      if (paymentMethod === "paypal" && paypalUser) {
        try {
          const paypalUrl = `https://paypal.me/${paypalUser}`;
          const qrDataUrl = await QRCode.toDataURL(paypalUrl, {
            width: 512,
            margin: 4,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });
          setPaypalQRCode(qrDataUrl);
          setPaypalUsername(paypalUser);
        } catch (error) {
          console.error('Error generating PayPal QR code:', error);
          setPaypalQRCode("");
        }
      } else {
        setPaypalQRCode("");
        setPaypalUsername("");
      }
    };

    generatePaymentQRs();
  }, [paymentMethod, config]);

  const validateSession = async (token: string) => {
    try {
      const response = await fetch('/api/volunteer/session', {
        headers: {
          'x-volunteer-session': token
        }
      });

      if (response.ok) {
        const sessionData = await response.json();
        setSession({
          email: sessionData.email,
          expiresAt: sessionData.expiresAt,
          sessionToken: token
        });
      } else {
        localStorage.removeItem('volunteer_session_token');
      }
    } catch (error) {
      localStorage.removeItem('volunteer_session_token');
    }
  };

  const authenticate = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setIsAuthenticating(true);
    try {
      const response = await fetch('/api/volunteer/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        const sessionData = {
          email: data.email,
          expiresAt: data.expiresAt,
          sessionToken: data.sessionToken
        };
        
        setSession(sessionData);
        localStorage.setItem('volunteer_session_token', data.sessionToken);
        
        toast({
          title: "Access Granted",
          description: `Welcome! Your session is valid for 24 hours.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Access Denied",
          description: error.error || "Failed to authenticate",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect. Please try again.",
        variant: "destructive"
      });
    }
    setIsAuthenticating(false);
  };

  const logout = () => {
    localStorage.removeItem('volunteer_session_token');
    setSession(null);
    setCart([]);
    setEmail('');
  };

  const loadInventory = async () => {
    try {
      const response = await fetch('/api/volunteer/inventory', {
        headers: {
          'x-volunteer-session': session!.sessionToken
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInventory(data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load inventory",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive"
      });
    }
  };

  const lookupSaleForReturn = async () => {
    if (!orderNumberForReturn.trim()) {
      toast({
        title: "Order Number Required",
        description: "Please enter an order number",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/volunteer/sales/${orderNumberForReturn}`, {
        headers: {
          'x-volunteer-session': session!.sessionToken
        }
      });

      if (response.ok) {
        const sales = await response.json();
        if (sales.length > 0) {
          // For now, just take the first item from the order
          setSaleForReturn(sales[0]);
          setShowReturnModal(true);
        } else {
          toast({
            title: "Not Found",
            description: "No sale found with that order number",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to lookup sale",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to lookup sale",
        variant: "destructive"
      });
    }
  };

  // Search items as user types
  const searchItems = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const results = inventory.filter((i: InventoryItem) =>
      i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setSearchResults(results.slice(0, 8)); // Limit to 8 results
    setShowResults(results.length > 0);
  };

  // Handle SKU input change with real-time search
  const handleSkuInputChange = (value: string) => {
    setSkuInput(value);
    searchItems(value);
  };

  // Add item to cart by SKU
  const addItemBySku = () => {
    const item = inventory.find((i: InventoryItem) => 
      i.sku.toLowerCase() === skuInput.toLowerCase()
    );
    
    if (item) {
      addToCart(item);
      setSkuInput("");
      setSearchResults([]);
      setShowResults(false);
      toast({
        title: "Added to cart",
        description: `${item.name} added to cart`,
      });
    } else if (searchResults.length > 0) {
      // If no exact match but have search results, add the first result
      const firstResult = searchResults[0];
      addToCart(firstResult);
      setSkuInput("");
      setSearchResults([]);
      setShowResults(false);
      toast({
        title: "Added to cart",
        description: `${firstResult.name} added to cart`,
      });
    } else {
      toast({
        title: "Item not found",
        description: `No item found matching: ${skuInput}`,
        variant: "destructive"
      });
    }
  };

  // Add item to cart
  const addToCart = (item: InventoryItem) => {
    if (item.quantity <= 0) {
      toast({
        title: "Out of stock",
        description: `${item.name} is out of stock`,
        variant: "destructive"
      });
      return;
    }

    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      if (existingItem.cartQuantity >= item.quantity) {
        toast({
          title: "Insufficient stock",
          description: `Only ${item.quantity} available`,
          variant: "destructive"
        });
        return;
      }
      
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, cartQuantity: cartItem.cartQuantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, {
        id: item.id,
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        type: item.category || 'Unknown',
        size: item.size || undefined,
        color: item.color || undefined,
        cartQuantity: 1
      }]);
    }
  };

  // Update cart item quantity
  const updateCartQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const inventoryItem = inventory.find(item => item.id === itemId);
    if (inventoryItem && newQuantity > inventoryItem.quantity) {
      toast({
        title: "Insufficient stock",
        description: `Only ${inventoryItem.quantity} available`,
        variant: "destructive"
      });
      return;
    }

    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, cartQuantity: newQuantity }
        : item
    ));
  };

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (Number(item.price) * item.cartQuantity), 0);
  };

  // Handle QR scan result
  const handleQRScan = (result: string) => {
    console.log("QR scan result:", result);
    setSkuInput(result);
    setShowScanner(false);
    
    // Auto-add if exact match found
    const item = inventory.find((i: InventoryItem) => 
      i.sku.toLowerCase() === result.toLowerCase()
    );
    
    if (item) {
      addToCart(item);
      toast({
        title: "Added to cart",
        description: `${item.name} added to cart`,
      });
    }
  };

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before processing sale",
        variant: "destructive"
      });
      return;
    }

    const total = calculateTotal();
    if (total <= 0) {
      toast({
        title: "Invalid Sale",
        description: "Sale total must be greater than $0",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/volunteer/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-volunteer-session': session!.sessionToken
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            inventoryItemId: item.id,
            quantity: item.cartQuantity,
            priceAtSale: Number(item.price)
          })),
          paymentMethod,
          customerName: customerName || undefined,
          customerEmail: customerEmail || undefined,
          totalAmount: total,
          volunteerEmail: session!.email
        })
      });

      if (response.ok) {
        const result = await response.json();
        setReceiptToken(result.receiptToken);
        setShowReceiptQR(true);
        setCart([]);
        setCustomerName("");
        setCustomerEmail("");
        
        // Reload inventory to reflect updated quantities
        await loadInventory();
        
        toast({
          title: "Sale Processed",
          description: `Sale completed successfully! Total: $${total.toFixed(2)}`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Sale Failed",
          description: error.error || "Failed to process sale",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process sale. Please try again.",
        variant: "destructive"
      });
    }
    setIsProcessing(false);
  };

  // Authentication form
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <UserCheck className="mx-auto mb-4 text-blue-600" size={48} />
            <CardTitle className="text-2xl">Volunteer Access</CardTitle>
            <CardDescription>
              Enter your email to access the sales terminal for 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="volunteer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && authenticate()}
                disabled={isAuthenticating}
                data-testid="input-volunteer-email"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={authenticate}
              disabled={isAuthenticating}
              data-testid="button-volunteer-login"
            >
              {isAuthenticating ? "Authenticating..." : "Get Access"}
            </Button>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No password required. Just enter any valid email address to get 24-hour access.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main mobile sales interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">Mobile Sales Terminal</h1>
            <p className="text-sm text-gray-600">Volunteer: {session.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout} data-testid="button-volunteer-logout">
            <LogOut size={16} />
          </Button>
        </div>
        
        {/* Session timer */}
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <Clock size={14} className="mr-1" />
          Session expires: {new Date(session.expiresAt).toLocaleString()}
        </div>

        {/* Mode Switcher */}
        <div className="mt-4 flex gap-2">
          <Button 
            variant={mode === "sale" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("sale")}
            className="flex-1"
            data-testid="button-mode-sale"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            New Sale
          </Button>
          <Button 
            variant={mode === "return" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("return")}
            className="flex-1"
            data-testid="button-mode-return"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Process Return
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {mode === "return" ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw size={20} />
                Process Return
              </CardTitle>
              <CardDescription>
                Enter the order number to look up and process a return
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="order-number">Order Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="order-number"
                    placeholder="Enter order number"
                    value={orderNumberForReturn}
                    onChange={(e) => setOrderNumberForReturn(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && lookupSaleForReturn()}
                    className="flex-1"
                    data-testid="input-return-order-number"
                  />
                  <Button 
                    onClick={lookupSaleForReturn}
                    disabled={!orderNumberForReturn.trim()}
                    data-testid="button-lookup-return"
                  >
                    Lookup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
          {/* SKU Input & QR Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode size={20} />
              Add Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter SKU or scan QR"
                value={skuInput}
                onChange={(e) => handleSkuInputChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addItemBySku()}
                className="flex-1"
                data-testid="input-sku"
              />
              <Button onClick={addItemBySku} disabled={!skuInput} data-testid="button-add-sku">
                <Plus size={16} />
              </Button>
              <Button 
                onClick={() => setShowScanner(true)} 
                variant="outline"
                data-testid="button-open-scanner"
              >
                <Camera size={16} />
              </Button>
            </div>

            {/* Live Search Results */}
            {showResults && searchResults.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                <p className="text-sm font-medium">
                  Found {searchResults.length} item{searchResults.length !== 1 ? 's' : ''}:
                </p>
                {searchResults.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-600">{item.sku}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-semibold text-green-600">${item.price}</span>
                        <Badge variant={item.quantity > 0 ? "default" : "destructive"} className="text-xs">
                          {item.quantity > 0 ? `${item.quantity} in stock` : "Out of stock"}
                        </Badge>
                      </div>
                      {(item.size || item.color) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {[item.size, item.color].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        addToCart(item);
                        setSkuInput("");
                        setSearchResults([]);
                        setShowResults(false);
                      }}
                      disabled={item.quantity <= 0}
                      data-testid={`button-add-${item.id}`}
                      className="ml-3 shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                ))}
                {skuInput && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSkuInput("");
                      setSearchResults([]);
                      setShowResults(false);
                    }}
                    className="w-full"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}

            {/* No results message */}
            {skuInput.trim() && showResults && searchResults.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No items found matching "{skuInput}"</p>
                <p className="text-xs mt-1">Try searching by SKU or product name</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shopping Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} />
                Cart ({cart.length} items)
              </div>
              <div className="text-lg font-bold">
                ${calculateTotal().toFixed(2)}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Cart is empty</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.sku} - ${item.price} each</p>
                      {(item.size || item.color) && (
                        <p className="text-xs text-gray-500">
                          {[item.size, item.color].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                        data-testid={`button-decrease-${item.id}`}
                      >
                        <Minus size={14} />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.cartQuantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                        data-testid={`button-increase-${item.id}`}
                      >
                        <Plus size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFromCart(item.id)}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checkout */}
        {cart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard size={20} />
                Checkout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(value: "cash" | "venmo" | "paypal") => setPaymentMethod(value)}>
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Venmo QR Code Display */}
              {paymentMethod === "venmo" && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label className="text-sm font-medium text-blue-800">Venmo Payment</Label>
                  <div className="flex items-center justify-center space-x-4 mt-3">
                    {venmoQRCode && (
                      <div className="text-center">
                        <img 
                          src={venmoQRCode} 
                          alt="Venmo QR Code"
                          className="mx-auto mb-2"
                          style={{ width: '200px', height: '200px' }}
                          data-testid="img-venmo-qr"
                        />
                        <p className="text-[10px] text-blue-600">Scan to pay</p>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-900 mb-1" data-testid="text-venmo-code">
                        @{venmoUsername || 'AxemenMCAZ'}
                      </div>
                      <p className="text-[10px] text-blue-600">
                        Or search this username
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PayPal QR Code Display */}
              {paymentMethod === "paypal" && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label className="text-sm font-medium text-blue-800">PayPal Payment</Label>
                  <div className="flex items-center justify-center space-x-4 mt-3">
                    {paypalQRCode && (
                      <div className="text-center">
                        <img 
                          src={paypalQRCode} 
                          alt="PayPal QR Code"
                          className="mx-auto mb-2"
                          style={{ width: '200px', height: '200px' }}
                          data-testid="img-paypal-qr"
                        />
                        <p className="text-[10px] text-blue-600">Scan to pay</p>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-900 mb-1" data-testid="text-paypal-code">
                        @{paypalUsername || 'AxemenMCAZ'}
                      </div>
                      <p className="text-[10px] text-blue-600">
                        Or search this username
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="customer-name">Customer Name (Optional)</Label>
                <Input
                  id="customer-name"
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  data-testid="input-customer-name"
                />
              </div>

              <div>
                <Label htmlFor="customer-email">Customer Email (Optional)</Label>
                <Input
                  id="customer-email"
                  type="email"
                  placeholder="customer@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  data-testid="input-customer-email"
                />
              </div>

              <Separator />

              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={processSale}
                disabled={isProcessing}
                data-testid="button-process-sale"
              >
                {isProcessing ? "Processing..." : "Process Sale"}
              </Button>
            </CardContent>
          </Card>
        )}
          </div>
        )
        }
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
      />

      {/* Receipt QR Modal */}
      <Dialog open={showReceiptQR} onOpenChange={setShowReceiptQR}>
        <DialogContent className="max-w-sm w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">Sale Complete!</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-2">
            <CheckCircle className="mx-auto text-green-600" size={48} />
            <p className="text-sm">Transaction processed successfully</p>
            {receiptToken && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 font-medium">Customer Receipt:</p>
                {/* Mobile-optimized QR display */}
                <div className="flex justify-center p-2">
                  <div className="bg-white p-3 rounded-lg border shadow-sm">
                    <QRCodeDisplay 
                      url={`${window.location.origin}/receipt/${receiptToken}`}
                      title=""
                      showUrl={false}
                      className="border-0 shadow-none"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 px-2">
                  Customer can scan this QR code to view their digital receipt
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button 
              className="w-full" 
              onClick={() => {
                setShowReceiptQR(false);
                // Reset for next sale
                setReceiptToken(null);
              }}
              data-testid="button-new-sale"
            >
              Continue Shopping
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setShowReceiptQR(false)}
              data-testid="button-close-receipt"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ProcessReturnModal
        sale={saleForReturn}
        open={showReturnModal}
        onOpenChange={(open) => {
          setShowReturnModal(open);
          if (!open) {
            setSaleForReturn(null);
            setOrderNumberForReturn("");
          }
        }}
        isVolunteer={true}
      />
    </div>
  );
}