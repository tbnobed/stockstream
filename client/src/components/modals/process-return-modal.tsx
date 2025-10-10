import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Package, DollarSign, RotateCcw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface ProcessReturnModalProps {
  sale: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isVolunteer?: boolean;
}

export default function ProcessReturnModal({
  sale,
  open,
  onOpenChange,
  isVolunteer = false,
}: ProcessReturnModalProps) {
  const { toast } = useToast();
  const [quantityReturned, setQuantityReturned] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setQuantityReturned(1);
      setReason("");
      setNotes("");
    }
  }, [open]);

  const returnMutation = useMutation({
    mutationFn: async (returnData: any) => {
      const endpoint = isVolunteer ? "/api/volunteer/returns" : "/api/returns";
      const response = await apiRequest("POST", endpoint, returnData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Return Processed",
        description: "The return has been processed successfully and inventory has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process return",
        variant: "destructive",
      });
    },
  });

  if (!sale) return null;

  const unitPrice = Number(sale.unitPrice);
  const refundAmount = (unitPrice * quantityReturned).toFixed(2);

  const handleSubmit = () => {
    if (!reason) {
      toast({
        title: "Reason Required",
        description: "Please select a reason for the return",
        variant: "destructive",
      });
      return;
    }

    returnMutation.mutate({
      saleId: sale.id,
      quantityReturned,
      refundAmount,
      reason,
      notes: notes || null,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="modal-process-return">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Process Return
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sale Information */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Item Details</span>
            </div>
            <div className="space-y-1">
              <p className="font-medium">{sale.item?.name}</p>
              <p className="text-sm text-muted-foreground">SKU: {sale.item?.sku}</p>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm text-muted-foreground">Quantity Sold</span>
                <span className="font-medium">{sale.quantity}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Unit Price</span>
                <span className="font-medium">{formatCurrency(unitPrice)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Return Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity to Return</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={sale.quantity}
                value={quantityReturned}
                onChange={(e) => setQuantityReturned(Math.min(parseInt(e.target.value) || 1, sale.quantity))}
                data-testid="input-return-quantity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Return</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="reason" data-testid="select-return-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defective">Defective/Damaged</SelectItem>
                  <SelectItem value="wrong_item">Wrong Item</SelectItem>
                  <SelectItem value="customer_request">Customer Request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional details about the return..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                data-testid="input-return-notes"
              />
            </div>

            {/* Refund Amount */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="font-medium">Refund Amount</span>
                </div>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(Number(refundAmount))}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-cancel-return"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={returnMutation.isPending || !reason}
              className="flex-1"
              data-testid="button-confirm-return"
            >
              {returnMutation.isPending ? "Processing..." : "Process Return"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
