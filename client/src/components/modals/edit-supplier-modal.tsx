import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { insertSupplierSchema, type InsertSupplier } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface EditSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: any;
  onClose?: () => void;
}

export default function EditSupplierModal({ open, onOpenChange, supplier, onClose }: EditSupplierModalProps) {
  const { toast } = useToast();

  const form = useForm<InsertSupplier>({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: "",
      contactInfo: "",
    },
  });

  // Update form when supplier changes
  useEffect(() => {
    if (supplier) {
      form.reset({
        name: supplier.name || "",
        contactInfo: supplier.contactInfo || "",
      });
    }
  }, [supplier, form]);

  const updateSupplierMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      return apiRequest("PUT", `/api/suppliers/${supplier.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      handleClose();
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
    },
    onError: (error: any) => {
      console.error("Update supplier error:", error);
      let errorMessage = "Failed to update supplier";
      
      if (error.message?.includes("401")) {
        errorMessage = "You need to be logged in to update suppliers";
      } else if (error.message?.includes("400")) {
        errorMessage = "Invalid supplier information provided";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    if (onClose) onClose();
  };

  const onSubmit = (data: InsertSupplier) => {
    updateSupplierMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Supplier</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter supplier name" {...field} data-testid="input-edit-supplier-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contactInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Information (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter contact details (phone, email, address, etc.)"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-edit-supplier-contact"
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
                data-testid="button-cancel-edit-supplier"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateSupplierMutation.isPending}
                data-testid="button-update-supplier"
              >
                {updateSupplierMutation.isPending ? "Updating..." : "Update Supplier"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}