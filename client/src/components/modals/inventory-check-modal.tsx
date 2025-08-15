import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import QRScanner from "@/components/qr-scanner";
import { Search, QrCode, Package, Check, X, AlertTriangle, Eye, Edit3 } from "lucide-react";

interface InventoryCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InventoryCheckModal({ open, onOpenChange }: InventoryCheckModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [actualCount, setActualCount] = useState("");
  const [checkingMode, setCheckingMode] = useState<"search" | "verify">("search");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: inventoryItems } = useQuery({
    queryKey: ["/api/inventory"],
  });

  const searchResults = inventoryItems?.filter((item: any) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5) || [];

  const adjustMutation = useMutation({
    mutationFn: async (data: { quantity: number; reason: string; notes: string }) => {
      await apiRequest("POST", `/api/inventory/${currentItem?.id}/adjust`, data);
    },
    onSuccess: () => {
      toast({
        title: "Inventory Updated",
        description: `Adjusted ${currentItem?.name} inventory count`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setCurrentItem(null);
      setActualCount("");
      setCheckingMode("search");
      setSearchTerm("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addStockMutation = useMutation({
    mutationFn: async (data: { quantity: number; reason: string; notes: string }) => {
      await apiRequest("POST", `/api/inventory/${currentItem?.id}/add-stock`, data);
    },
    onSuccess: () => {
      toast({
        title: "Stock Added",
        description: `Added stock to ${currentItem?.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setCurrentItem(null);
      setActualCount("");
      setCheckingMode("search");
      setSearchTerm("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleQRScan = (result: string) => {
    setSearchTerm(result);
    setShowScanner(false);
    
    // Try to find item by SKU first
    const item = inventoryItems?.find((item: any) => 
      item.sku?.toLowerCase() === result.toLowerCase()
    );
    
    if (item) {
      handleSelectItem(item);
    }
  };

  const handleSelectItem = (item: any) => {
    setCurrentItem(item);
    setActualCount(item.quantity.toString());
    setCheckingMode("verify");
  };

  const handleConfirmCount = () => {
    const actual = parseInt(actualCount);
    const expected = currentItem.quantity;
    const difference = actual - expected;

    if (difference === 0) {
      toast({
        title: "Count Verified",
        description: `${currentItem.name} count is correct (${actual})`,
      });
      setCurrentItem(null);
      setActualCount("");
      setCheckingMode("search");
      setSearchTerm("");
      return;
    }

    // Determine if we need to add or adjust
    if (difference > 0) {
      // Need to add stock
      addStockMutation.mutate({
        quantity: difference,
        reason: "recount",
        notes: `Inventory check - found ${difference} extra units`,
      });
    } else {
      // Need to adjust (reduce) stock
      adjustMutation.mutate({
        quantity: Math.abs(difference),
        reason: "recount",
        notes: `Inventory check - missing ${Math.abs(difference)} units`,
      });
    }
  };

  const getCountStatus = () => {
    if (!actualCount || !currentItem) return null;
    
    const actual = parseInt(actualCount);
    const expected = currentItem.quantity;
    const difference = actual - expected;
    
    if (difference === 0) {
      return { status: "correct", message: "Count matches", color: "text-green-600" };
    } else if (difference > 0) {
      return { status: "over", message: `+${difference} extra`, color: "text-blue-600" };
    } else {
      return { status: "under", message: `${difference} missing`, color: "text-red-600" };
    }
  };

  const countStatus = getCountStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="text-primary" size={20} />
            <span>Inventory Check</span>
          </DialogTitle>
        </DialogHeader>

        {showScanner ? (
          <div className="space-y-4">
            <QRScanner onScan={handleQRScan} />
            <Button
              variant="outline"
              onClick={() => setShowScanner(false)}
              className="w-full"
              data-testid="button-close-scanner"
            >
              Close Scanner
            </Button>
          </div>
        ) : checkingMode === "search" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Item</Label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    id="search"
                    placeholder="Search by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-inventory-search"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScanner(true)}
                  data-testid="button-scan-qr"
                >
                  <QrCode size={16} />
                </Button>
              </div>
            </div>

            {searchTerm && (
              <div className="space-y-2">
                {searchResults.length > 0 ? (
                  searchResults.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted"
                      onClick={() => handleSelectItem(item)}
                      data-testid={`item-result-${item.id}`}
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Qty: {item.quantity}</p>
                        <Badge variant={item.quantity <= item.minStockLevel ? "destructive" : "secondary"}>
                          {item.quantity <= item.minStockLevel ? "Low Stock" : "In Stock"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No items found for "{searchTerm}"
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium">{currentItem.name}</h3>
              <p className="text-sm text-muted-foreground">SKU: {currentItem.sku}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm">System Count:</span>
                <span className="font-medium">{currentItem.quantity}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actualCount">Actual Count</Label>
              <Input
                id="actualCount"
                type="number"
                min="0"
                placeholder="Enter actual count..."
                value={actualCount}
                onChange={(e) => setActualCount(e.target.value)}
                data-testid="input-actual-count"
              />
              {countStatus && (
                <div className={`flex items-center space-x-2 text-sm ${countStatus.color}`}>
                  {countStatus.status === "correct" ? (
                    <Check size={16} />
                  ) : countStatus.status === "over" ? (
                    <AlertTriangle size={16} />
                  ) : (
                    <X size={16} />
                  )}
                  <span>{countStatus.message}</span>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentItem(null);
                  setActualCount("");
                  setCheckingMode("search");
                }}
                data-testid="button-back"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmCount}
                disabled={!actualCount || adjustMutation.isPending || addStockMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-count"
              >
                {adjustMutation.isPending || addStockMutation.isPending ? "Updating..." : "Confirm Count"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}