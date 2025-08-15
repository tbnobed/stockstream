import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const addStockSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

type AddStockForm = z.infer<typeof addStockSchema>;

interface AddStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
  } | null;
}

export default function AddStockModal({ open, onOpenChange, item }: AddStockModalProps) {
  const { toast } = useToast();

  const form = useForm<AddStockForm>({
    resolver: zodResolver(addStockSchema),
    defaultValues: {
      quantity: 1,
      reason: "restock",
      notes: "",
    },
  });

  const addStockMutation = useMutation({
    mutationFn: async (data: AddStockForm) => {
      if (!item) throw new Error("No item selected");
      const response = await apiRequest("POST", `/api/inventory/${item.id}/add-stock`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      onOpenChange(false);
      form.reset();
      toast({
        title: "Success",
        description: "Stock added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add stock",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddStockForm) => {
    addStockMutation.mutate(data);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stock to {item.name}</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium text-secondary">Current Stock: {item.quantity}</p>
          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity to Add</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      data-testid="input-add-quantity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-reason">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="restock">Restock</SelectItem>
                      <SelectItem value="new_shipment">New Shipment</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                      <SelectItem value="found">Found Items</SelectItem>
                      <SelectItem value="adjustment">Inventory Adjustment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about this stock addition..."
                      {...field}
                      value={field.value || ""}
                      data-testid="input-add-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-add-stock"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addStockMutation.isPending}
                data-testid="button-confirm-add-stock"
              >
                {addStockMutation.isPending ? "Adding..." : "Add Stock"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}