import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Minus } from "lucide-react";

interface AdjustInventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
  } | null;
}

export default function AdjustInventoryModal({ open, onOpenChange, item }: AdjustInventoryModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const adjustMutation = useMutation({
    mutationFn: async (data: { quantity: number; reason: string; notes: string }) => {
      await apiRequest("POST", `/api/inventory/${item?.id}/adjust`, data);
    },
    onSuccess: () => {
      toast({
        title: "Inventory Adjusted",
        description: `Successfully reduced ${item?.name} by ${quantity} units`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      onOpenChange(false);
      setQuantity(1);
      setReason("");
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !reason) return;

    if (quantity > item.quantity) {
      toast({
        title: "Invalid Quantity",
        description: `Cannot deduct ${quantity} units. Only ${item.quantity} units available.`,
        variant: "destructive",
      });
      return;
    }

    adjustMutation.mutate({ quantity, reason, notes });
  };

  if (!item) return null;

  const maxQuantity = item.quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Minus className="text-red-600" size={20} />
            <span>Adjust Inventory - {item.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm"><strong>Current Stock:</strong> {item.quantity}</p>
            <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Deduct *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              required
              data-testid="input-adjust-quantity"
            />
            <p className="text-xs text-muted-foreground">
              Maximum: {maxQuantity} units
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Adjustment *</Label>
            <Select value={reason} onValueChange={setReason} required>
              <SelectTrigger data-testid="select-adjust-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="stolen">Stolen</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="defective">Defective</SelectItem>
                <SelectItem value="returned">Customer Return</SelectItem>
                <SelectItem value="correction">Inventory Correction</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional details about this adjustment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              data-testid="textarea-adjust-notes"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-adjust"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={adjustMutation.isPending || !reason}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-adjust"
            >
              {adjustMutation.isPending ? "Processing..." : `Deduct ${quantity}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}