import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, User, CreditCard, Hash, DollarSign } from "lucide-react";

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
  if (!sale) return null;

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

        <div className="space-y-4">
          {/* Order Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Order Number</span>
              </div>
              <Badge variant="outline" className="font-mono">
                {sale.orderNumber}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Sale Date</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDate(sale.saleDate)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Sales Associate</span>
              </div>
              <span className="text-sm font-medium">
                {sale.salesAssociate?.name || 'Unknown'}
              </span>
            </div>
          </div>

          <Separator />

          {/* Item Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Item Details</span>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">{sale.item?.name || 'Unknown Item'}</h4>
                  <p className="text-xs text-muted-foreground">
                    SKU: {sale.item?.sku || 'N/A'}
                  </p>
                  {sale.item?.type && (
                    <div className="flex gap-2 text-xs">
                      {sale.item.type && (
                        <Badge variant="secondary" className="text-xs">
                          {sale.item.type}
                        </Badge>
                      )}
                      {sale.item.size && (
                        <Badge variant="secondary" className="text-xs">
                          Size: {sale.item.size}
                        </Badge>
                      )}
                      {sale.item.color && (
                        <Badge variant="secondary" className="text-xs">
                          {sale.item.color}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <div className="text-xs text-muted-foreground">Qty: {sale.quantity}</div>
                  <div className="text-xs text-muted-foreground">
                    Unit: {formatCurrency(Number(sale.unitPrice) || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Payment Method</span>
              </div>
              <Badge className={getPaymentMethodColor(sale.paymentMethod)}>
                {sale.paymentMethod?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Amount</span>
              </div>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(Number(sale.totalAmount) || 0)}
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