import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { insertInventoryItemSchema, type InsertInventoryItem } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateSKU } from "@/lib/sku-generator";
import { 
  ITEM_TYPES, 
  ITEM_COLORS, 
  ITEM_SIZES, 
  ITEM_DESIGNS, 
  GROUP_TYPES, 
  STYLE_GROUPS,
  generateItemName,
  generateSKU as generateCategorySKU
} from "@shared/categories";

interface AddInventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: any;
  onClose?: () => void;
}

export default function AddInventoryModal({ open, onOpenChange, editingItem, onClose }: AddInventoryModalProps) {
  const { toast } = useToast();

  const { data: suppliers } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const form = useForm<InsertInventoryItem>({
    resolver: zodResolver(insertInventoryItemSchema),
    defaultValues: editingItem ? {
      sku: editingItem.sku || "",
      name: editingItem.name || "",
      description: editingItem.description || "",
      type: editingItem.type || "",
      size: editingItem.size || "",
      color: editingItem.color || "",
      design: editingItem.design || "",
      groupType: editingItem.groupType || "",
      styleGroup: editingItem.styleGroup || "",
      price: editingItem.price || "",
      cost: editingItem.cost || "",
      quantity: editingItem.quantity || 0,
      minStockLevel: editingItem.minStockLevel || 10,
      supplierId: editingItem.supplierId || undefined,
    } : {
      sku: "",
      name: "",
      description: "",
      type: "",
      size: "",
      color: "",
      design: "",
      groupType: "",
      styleGroup: "",
      price: "",
      cost: "",
      quantity: 0,
      minStockLevel: 10,
      supplierId: undefined,
    },
  });

  // Reset form when editingItem changes
  useEffect(() => {
    if (editingItem && open) {
      form.reset({
        sku: editingItem.sku || "",
        name: editingItem.name || "",
        description: editingItem.description || "",
        type: editingItem.type || "",
        size: editingItem.size || "",
        color: editingItem.color || "",
        design: editingItem.design || "",
        groupType: editingItem.groupType || "",
        styleGroup: editingItem.styleGroup || "",
        price: editingItem.price || "",
        cost: editingItem.cost || "",
        quantity: editingItem.quantity || 0,
        minStockLevel: editingItem.minStockLevel || 10,
        supplierId: editingItem.supplierId || undefined,
      });
    } else if (!editingItem && open) {
      form.reset({
        sku: "",
        name: "",
        description: "",
        type: "",
        size: "",
        color: "",
        design: "",
        groupType: "",
        styleGroup: "",
        price: "",
        cost: "",
        quantity: 0,
        minStockLevel: 10,
        supplierId: undefined,
      });
    }
  }, [editingItem, open, form]);

  const createItemMutation = useMutation({
    mutationFn: async (data: InsertInventoryItem) => {
      const response = await apiRequest("POST", "/api/inventory", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      handleClose();
      toast({
        title: "Success",
        description: "Inventory item added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add inventory item",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: InsertInventoryItem) => {
      const response = await apiRequest("PATCH", `/api/inventory/${editingItem.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      handleClose();
      toast({
        title: "Success",
        description: "Inventory item updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update inventory item",
        variant: "destructive",
      });
    },
  });

  // Auto-populate item name and SKU based on selections
  const autoPopulateFromCategories = () => {
    const formData = form.getValues();
    
    // Generate item name from categories
    const itemName = generateItemName({
      type: formData.type,
      color: formData.color,
      size: formData.size,
      design: formData.design,
      groupType: formData.groupType,
      styleGroup: formData.styleGroup,
    });
    
    // Generate SKU from categories
    const sku = generateCategorySKU({
      type: formData.type,
      color: formData.color,
      size: formData.size,
      design: formData.design,
      groupType: formData.groupType,
      styleGroup: formData.styleGroup,
    });
    
    // Update form values
    form.setValue("name", itemName);
    form.setValue("sku", sku);
  };

  const generateSkuFromForm = () => {
    const formData = form.getValues();
    const sku = generateSKU({
      type: formData.type,
      color: formData.color,
      size: formData.size,
    });
    form.setValue("sku", sku);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    if (onClose) onClose();
  };

  const onSubmit = (data: InsertInventoryItem) => {
    if (editingItem) {
      updateItemMutation.mutate(data);
    } else {
      createItemMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter item name" {...field} data-testid="input-item-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter item description"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-item-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setTimeout(autoPopulateFromCategories, 100);
                    }} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ITEM_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setTimeout(autoPopulateFromCategories, 100);
                    }} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-color">
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ITEM_COLORS.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Category Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="design"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Design</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setTimeout(autoPopulateFromCategories, 100);
                    }} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-design">
                          <SelectValue placeholder="Select design" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ITEM_DESIGNS.map((design) => (
                          <SelectItem key={design} value={design}>
                            {design}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="groupType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Type</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setTimeout(autoPopulateFromCategories, 100);
                    }} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-group-type">
                          <SelectValue placeholder="Select group type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GROUP_TYPES.map((groupType) => (
                          <SelectItem key={groupType} value={groupType}>
                            {groupType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="styleGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Style Group</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setTimeout(autoPopulateFromCategories, 100);
                    }} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-style-group">
                          <SelectValue placeholder="Select style group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STYLE_GROUPS.map((styleGroup) => (
                          <SelectItem key={styleGroup} value={styleGroup}>
                            {styleGroup}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setTimeout(autoPopulateFromCategories, 100);
                    }} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-size">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ITEM_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-item-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Landed Cost (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-item-cost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Auto-generate button for name and SKU */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={autoPopulateFromCategories}
                data-testid="button-auto-generate"
                className="w-full"
              >
                Auto-Generate Name & SKU from Categories
              </Button>
            </div>
            
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Auto-generated SKU"
                        {...field}
                        data-testid="input-item-sku"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateSkuFromForm}
                        data-testid="button-generate-sku"
                      >
                        Legacy Generate
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-item-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="minStockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Stock Level</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-min-stock"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-supplier">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers && suppliers.map((supplier: any) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-inventory"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createItemMutation.isPending || updateItemMutation.isPending}
                data-testid="button-save-inventory"
              >
                {editingItem 
                  ? (updateItemMutation.isPending ? "Updating..." : "Update Item")
                  : (createItemMutation.isPending ? "Adding..." : "Add Item")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
