import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { TrendingUp, TrendingDown, Package, ShoppingCart } from "lucide-react";

interface TransactionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    sku: string;
  } | null;
}

export default function TransactionHistoryModal({ open, onOpenChange, item }: TransactionHistoryModalProps) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/inventory", item?.id, "transactions"],
    enabled: open && !!item?.id,
  });

  if (!item) return null;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "addition":
        return <TrendingUp className="text-green-600" size={16} />;
      case "sale":
        return <ShoppingCart className="text-red-600" size={16} />;
      case "adjustment":
        return <TrendingDown className="text-orange-600" size={16} />;
      default:
        return <Package className="text-gray-600" size={16} />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "addition":
        return "text-green-600";
      case "sale":
        return "text-red-600";
      case "adjustment":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  const formatQuantityChange = (quantity: number) => {
    if (quantity > 0) {
      return `+${quantity}`;
    }
    return quantity.toString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Transaction History - {item.name}</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium text-secondary">SKU: {item.sku}</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading transaction history...</div>
          ) : !Array.isArray(transactions) || transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for this item
            </div>
          ) : (
            transactions.map((transaction: any) => (
              <Card key={transaction.id} className="p-4 border-border">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getTransactionIcon(transaction.transactionType)}
                    <span className="font-medium text-secondary capitalize">
                      {transaction.transactionType}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getTransactionColor(transaction.transactionType)}`}>
                      {formatQuantityChange(transaction.quantity)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Reason:</span>
                    <Badge variant="outline" className="capitalize">
                      {transaction.reason}
                    </Badge>
                  </div>
                  
                  {transaction.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Notes:</span>
                      <p className="mt-1 text-secondary">{transaction.notes}</p>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                    Transaction ID: {transaction.id}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}