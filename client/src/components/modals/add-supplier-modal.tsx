import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { insertSupplierSchema, type InsertSupplier } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building2, Phone, Mail, MapPin } from "lucide-react";
import { z } from "zod";

// Enhanced form schema with structured fields
const enhancedSupplierSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  contactPerson: z.string().optional(),
  email: z.string().email("Invalid email format").or(z.literal("")).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url("Invalid website URL").or(z.literal("")).optional(),
  notes: z.string().optional(),
});

type EnhancedSupplierForm = z.infer<typeof enhancedSupplierSchema>;

interface AddSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
}

export default function AddSupplierModal({ open, onOpenChange, onClose }: AddSupplierModalProps) {
  const { toast } = useToast();

  const form = useForm<EnhancedSupplierForm>({
    resolver: zodResolver(enhancedSupplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      website: "",
      notes: "",
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: async (data: EnhancedSupplierForm) => {
      // Convert enhanced form data to the basic supplier format
      const contactInfo = [
        data.contactPerson && `Contact: ${data.contactPerson}`,
        data.phone && `Phone: ${data.phone}`,
        data.email && `Email: ${data.email}`,
        data.address && `Address: ${data.address}`,
        data.website && `Website: ${data.website}`,
        data.notes && `Notes: ${data.notes}`,
      ].filter(Boolean).join('\n');

      const supplierData: InsertSupplier = {
        name: data.name,
        contactInfo: contactInfo || undefined,
      };

      return apiRequest("POST", "/api/suppliers", supplierData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      form.reset();
      handleClose();
      toast({
        title: "Success",
        description: "Supplier added successfully",
      });
    },
    onError: (error: any) => {
      console.error("Add supplier error:", error);
      let errorMessage = "Failed to add supplier";
      
      if (error.message?.includes("401")) {
        errorMessage = "You need to be logged in to add suppliers";
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

  const onSubmit = (data: EnhancedSupplierForm) => {
    createSupplierMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building2 className="mr-2" size={20} />
            Add New Supplier
          </DialogTitle>
          <DialogDescription>
            Enter detailed supplier information for better organization and tracking.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Information */}
            <div className="space-y-4">
              <div className="flex items-center">
                <Building2 className="mr-2" size={16} />
                <h3 className="text-sm font-medium text-secondary">Company Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter company name" 
                          {...field} 
                          data-testid="input-supplier-name" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Doe" 
                          {...field} 
                          data-testid="input-contact-person" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://company.com" 
                          {...field} 
                          data-testid="input-website" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center">
                <Phone className="mr-2" size={16} />
                <h3 className="text-sm font-medium text-secondary">Contact Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+1 (555) 123-4567" 
                          {...field} 
                          data-testid="input-phone" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="contact@company.com" 
                          type="email"
                          {...field} 
                          data-testid="input-email" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Address Information */}
            <div className="space-y-4">
              <div className="flex items-center">
                <MapPin className="mr-2" size={16} />
                <h3 className="text-sm font-medium text-secondary">Address</h3>
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Physical Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="123 Business St, Suite 100&#10;Business City, BC 12345&#10;Country"
                        {...field} 
                        rows={3}
                        data-testid="input-address" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            {/* Additional Notes */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Payment terms, special instructions, account numbers, etc."
                        {...field} 
                        rows={3}
                        data-testid="input-notes" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-supplier"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSupplierMutation.isPending}
                data-testid="button-add-supplier"
              >
                {createSupplierMutation.isPending ? "Adding..." : "Add Supplier"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}