import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ShoppingCart, Package, UserCheck, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem, Sale } from '@shared/schema';

interface VolunteerSession {
  email: string;
  expiresAt: string;
  sessionToken: string;
}

interface CartItem {
  item: InventoryItem;
  quantity: number;
}

export default function VolunteerSales() {
  const [session, setSession] = useState<VolunteerSession | null>(null);
  const [email, setEmail] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const { toast } = useToast();

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
      loadRecentSales();
    }
  }, [session]);

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
    setInventory([]);
    setEmail('');
    toast({
      title: "Logged Out",
      description: "Your volunteer session has ended."
    });
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
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive"
      });
    }
  };

  const loadRecentSales = async () => {
    try {
      const response = await fetch('/api/volunteer/sales', {
        headers: {
          'x-volunteer-session': session!.sessionToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Show only recent sales (last 10)
        setRecentSales(data.slice(-10).reverse());
      }
    } catch (error) {
      console.error('Failed to load recent sales:', error);
    }
  };

  const searchInventory = async (term: string) => {
    if (!term.trim()) {
      loadInventory();
      return;
    }

    try {
      const response = await fetch(`/api/volunteer/inventory/search/${encodeURIComponent(term)}`, {
        headers: {
          'x-volunteer-session': session!.sessionToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInventory(data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const addToCart = (item: InventoryItem) => {
    const existingItem = cart.find(cartItem => cartItem.item.id === item.id);
    
    if (existingItem) {
      if (existingItem.quantity < item.quantity) {
        setCart(cart.map(cartItem => 
          cartItem.item.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        ));
      } else {
        toast({
          title: "Stock Limit Reached",
          description: `Only ${item.quantity} units available`,
          variant: "destructive"
        });
      }
    } else {
      setCart([...cart, { item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(cartItem => cartItem.item.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    const cartItem = cart.find(ci => ci.item.id === itemId);
    const maxQuantity = cartItem?.item.quantity || 0;
    
    if (quantity > maxQuantity) {
      toast({
        title: "Stock Limit",
        description: `Only ${maxQuantity} units available`,
        variant: "destructive"
      });
      return;
    }
    
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(cartItem => 
        cartItem.item.id === itemId 
          ? { ...cartItem, quantity }
          : cartItem
      ));
    }
  };

  const processSale = async (paymentMethod: 'cash' | 'venmo') => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Add items to cart before processing sale",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingSale(true);
    try {
      const orderNumber = `V${Date.now().toString().slice(-8)}`;

      // Process each cart item as a separate sale
      for (const cartItem of cart) {
        const totalAmount = Number(cartItem.item.price) * cartItem.quantity;
        
        const saleData = {
          orderNumber,
          itemId: cartItem.item.id,
          quantity: cartItem.quantity,
          unitPrice: cartItem.item.price,
          totalAmount: totalAmount.toFixed(2),
          paymentMethod
        };

        const response = await fetch('/api/volunteer/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-volunteer-session': session!.sessionToken
          },
          body: JSON.stringify(saleData)
        });

        if (!response.ok) {
          throw new Error(`Failed to process sale for ${cartItem.item.name}`);
        }
      }

      const totalAmount = cart.reduce((sum, cartItem) => 
        sum + (Number(cartItem.item.price) * cartItem.quantity), 0
      );

      toast({
        title: "Sale Completed",
        description: `Order ${orderNumber} processed successfully. Total: $${totalAmount.toFixed(2)}`,
      });

      setCart([]);
      loadInventory(); // Refresh inventory to show updated stock
      loadRecentSales(); // Refresh recent sales

    } catch (error) {
      toast({
        title: "Sale Failed",
        description: error instanceof Error ? error.message : "Failed to process sale",
        variant: "destructive"
      });
    }
    setIsProcessingSale(false);
  };

  const getTimeRemaining = () => {
    if (!session) return '';
    
    const now = new Date();
    const expires = new Date(session.expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m remaining`;
  };

  // Authentication screen
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <UserCheck className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Volunteer Sales Access</CardTitle>
            <CardDescription>
              Enter your email address to access the sales system for 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && authenticate()}
                data-testid="input-volunteer-email"
              />
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your session will automatically expire after 24 hours for security.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={authenticate} 
              disabled={isAuthenticating}
              className="w-full"
              data-testid="button-volunteer-auth"
            >
              {isAuthenticating ? 'Authenticating...' : 'Get Access'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const totalCartValue = cart.reduce((sum, cartItem) => 
    sum + (Number(cartItem.item.price) * cartItem.quantity), 0
  );

  // Main volunteer interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Volunteer Sales</h1>
              <p className="text-sm text-gray-500">{session.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>{getTimeRemaining()}</span>
              </div>
              <Button variant="outline" onClick={logout} data-testid="button-logout">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sales" data-testid="tab-sales">Sales Terminal</TabsTrigger>
            <TabsTrigger value="recent" data-testid="tab-recent">Recent Sales</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Inventory Search & Selection */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="w-5 h-5" />
                      <span>Inventory</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search by name or SKU..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && searchInventory(searchTerm)}
                          className="pl-10"
                          data-testid="input-search-inventory"
                        />
                      </div>
                      <Button onClick={() => searchInventory(searchTerm)} data-testid="button-search">
                        Search
                      </Button>
                      <Button variant="outline" onClick={() => { setSearchTerm(''); loadInventory(); }}>
                        Clear
                      </Button>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventory.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {item.category} {item.size && `• ${item.size}`} {item.color && `• ${item.color}`}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                              <TableCell>${item.price}</TableCell>
                              <TableCell>
                                <Badge variant={item.quantity > 10 ? "default" : item.quantity > 0 ? "secondary" : "destructive"}>
                                  {item.quantity}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  disabled={item.quantity === 0}
                                  onClick={() => addToCart(item)}
                                  data-testid={`button-add-cart-${item.sku}`}
                                >
                                  Add to Cart
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {inventory.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No items found
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cart */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ShoppingCart className="w-5 h-5" />
                        <span>Cart</span>
                      </div>
                      <Badge variant="secondary">{cart.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cart.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        Cart is empty
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {cart.map((cartItem) => (
                            <div key={cartItem.item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{cartItem.item.name}</p>
                                <p className="text-xs text-gray-500">${cartItem.item.price} each</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(cartItem.item.id, cartItem.quantity - 1)}
                                  className="h-6 w-6 p-0"
                                >
                                  -
                                </Button>
                                <span className="w-8 text-center text-sm">{cartItem.quantity}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(cartItem.item.id, cartItem.quantity + 1)}
                                  className="h-6 w-6 p-0"
                                >
                                  +
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeFromCart(cartItem.item.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 border-t">
                          <div className="flex justify-between items-center text-lg font-semibold">
                            <span>Total:</span>
                            <span>${totalCartValue.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Button
                            onClick={() => processSale('cash')}
                            disabled={isProcessingSale}
                            className="w-full"
                            data-testid="button-pay-cash"
                          >
                            {isProcessingSale ? 'Processing...' : 'Pay with Cash'}
                          </Button>
                          <Button
                            onClick={() => processSale('venmo')}
                            disabled={isProcessingSale}
                            variant="outline"
                            className="w-full"
                            data-testid="button-pay-venmo"
                          >
                            {isProcessingSale ? 'Processing...' : 'Pay with Venmo'}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>Last 10 sales for reference</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono">{sale.orderNumber}</TableCell>
                        <TableCell>{(sale as any).item?.name || 'Unknown Item'}</TableCell>
                        <TableCell>{sale.quantity}</TableCell>
                        <TableCell>${sale.totalAmount}</TableCell>
                        <TableCell>
                          <Badge variant={sale.paymentMethod === 'cash' ? 'default' : 'secondary'}>
                            {sale.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {recentSales.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No recent sales
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}