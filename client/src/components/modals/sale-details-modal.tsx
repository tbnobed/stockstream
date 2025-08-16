import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, User, CreditCard, Hash, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

interface SaleDetailsModalProps {
  sale: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrintReceipt: () => void;
}

export default function SaleDetailsModal({
  sale,
  open,
  onOpenChange,
  onPrintReceipt,
}: SaleDetailsModalProps) {
  // Fetch all items for this order - hooks must be called before any conditional returns
  const { data: orderItems = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/sales/order/${sale?.orderNumber || 'null'}`],
    enabled: open && !!sale?.orderNumber,
  });

  if (!sale) return null;

  // Use order items if available, fallback to single sale
  const items = orderItems.length > 0 ? orderItems : [sale];
  const firstItem = items[0];
  const totalAmount = items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'venmo':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="modal-sale-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Sale Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Order Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Order Number</span>
              </div>
              <Badge variant="outline" className="font-mono">
                {firstItem.orderNumber}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Sale Date</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDate(firstItem.saleDate)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Sales Associate</span>
              </div>
              <span className="text-sm font-medium">
                {firstItem.salesAssociate?.name || 'Unknown'}
              </span>
            </div>
          </div>

          <Separator />

          {/* Items Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Items ({items.length})</span>
            </div>
            
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading items...</div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm">{item.item?.name || 'Unknown Item'}</h4>
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.item?.sku || 'N/A'}
                        </p>
                        {item.item?.type && (
                          <div className="flex gap-2 text-xs">
                            {item.item.type && (
                              <Badge variant="secondary" className="text-xs">
                                {item.item.type}
                              </Badge>
                            )}
                            {item.item.size && (
                              <Badge variant="secondary" className="text-xs">
                                Size: {item.item.size}
                              </Badge>
                            )}
                            {item.item.color && (
                              <Badge variant="secondary" className="text-xs">
                                {item.item.color}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-xs text-muted-foreground">Qty: {item.quantity}</div>
                        <div className="text-xs text-muted-foreground">
                          Unit: {formatCurrency(Number(item.unitPrice) || 0)}
                        </div>
                        <div className="text-xs font-medium">
                          {formatCurrency(Number(item.totalAmount) || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Payment Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Payment Method</span>
              </div>
              <Badge className={getPaymentMethodColor(firstItem.paymentMethod)}>
                {firstItem.paymentMethod?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Order Total</span>
              </div>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrintReceipt}
              className="flex-1"
              data-testid="button-print-receipt"
            >
              Print Receipt
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-close-details"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}