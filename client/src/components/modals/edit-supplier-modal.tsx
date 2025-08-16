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
import { useEffect } from "react";

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

interface EditSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: any;
  onClose?: () => void;
}

// Helper function to parse contact info back into structured fields
const parseContactInfo = (contactInfo: string = ""): Partial<EnhancedSupplierForm> => {
  const lines = contactInfo.split('\n').filter(line => line.trim());
  const parsed: Partial<EnhancedSupplierForm> = {};
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('Contact: ')) {
      parsed.contactPerson = trimmed.substring(9);
    } else if (trimmed.startsWith('Phone: ')) {
      parsed.phone = trimmed.substring(7);
    } else if (trimmed.startsWith('Email: ')) {
      parsed.email = trimmed.substring(7);
    } else if (trimmed.startsWith('Address: ')) {
      parsed.address = trimmed.substring(9);
    } else if (trimmed.startsWith('Website: ')) {
      parsed.website = trimmed.substring(9);
    } else if (trimmed.startsWith('Notes: ')) {
      parsed.notes = trimmed.substring(7);
    }
  });
  
  return parsed;
};

export default function EditSupplierModal({ open, onOpenChange, supplier, onClose }: EditSupplierModalProps) {
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

  // Update form when supplier changes
  useEffect(() => {
    if (supplier) {
      const parsedContact = parseContactInfo(supplier.contactInfo);
      form.reset({
        name: supplier.name || "",
        contactPerson: parsedContact.contactPerson || "",
        email: parsedContact.email || "",
        phone: parsedContact.phone || "",
        address: parsedContact.address || "",
        website: parsedContact.website || "",
        notes: parsedContact.notes || "",
      });
    }
  }, [supplier, form]);

  const updateSupplierMutation = useMutation({
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

      return apiRequest("PUT", `/api/suppliers/${supplier.id}`, supplierData);
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

  const onSubmit = (data: EnhancedSupplierForm) => {
    updateSupplierMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building2 className="mr-2" size={20} />
            Edit Supplier
          </DialogTitle>
          <DialogDescription>
            Update supplier information and contact details.
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
                          data-testid="input-edit-supplier-name" 
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
                          data-testid="input-edit-contact-person" 
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
                          data-testid="input-edit-website" 
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
                          data-testid="input-edit-phone" 
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
                          data-testid="input-edit-email" 
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
                        data-testid="input-edit-address" 
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
                        data-testid="input-edit-notes" 
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

