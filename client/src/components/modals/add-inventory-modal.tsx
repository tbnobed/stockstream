import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";
import { insertInventoryItemSchema, type InsertInventoryItem, type Supplier } from "@shared/schema";
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

interface Category {
  id: string;
  type: string;
  value: string;
  abbreviation?: string;
  parentCategory?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AddInventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: any;
  onClose?: () => void;
}

export default function AddInventoryModal({ open, onOpenChange, editingItem, onClose }: AddInventoryModalProps) {
  const { toast } = useToast();
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [isMultiVariant, setIsMultiVariant] = useState(!editingItem);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Fetch categories dynamically from API
  const { data: colors = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories", "color"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/categories/color");
      return await response.json();
    },
  });

  const { data: sizes = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories", "size"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/categories/size");
      return await response.json();
    },
  });

  const { data: designs = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories", "design"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/categories/design");
      return await response.json();
    },
  });

  const { data: groups = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories", "group"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/categories/group");
      return await response.json();
    },
  });

  const { data: styles = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories", "style"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/categories/style");
      return await response.json();
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories", "category"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/categories/category");
      return await response.json();
    },
  });

  // Filter styles and sizes based on selected category
  const filteredStyles = styles.filter(style => 
    !selectedCategory || !style.parentCategory || style.parentCategory === selectedCategory
  );
  
  const filteredSizes = sizes.filter(size => 
    !selectedCategory || !size.parentCategory || size.parentCategory === selectedCategory
  );

  const form = useForm<InsertInventoryItem>({
    resolver: zodResolver(insertInventoryItemSchema),
    defaultValues: editingItem ? {
      sku: editingItem.sku || "",
      name: editingItem.name || "",
      description: editingItem.description || "",
      category: editingItem.category || editingItem.type || "",
      size: editingItem.size || "",
      color: editingItem.color || "",
      design: editingItem.design || "",
      group: editingItem.group || editingItem.groupType || "",
      style: editingItem.style || editingItem.styleGroup || "",
      price: editingItem.price || "",
      cost: editingItem.cost || "",
      quantity: editingItem.quantity || 0,
      minStockLevel: editingItem.minStockLevel || 10,
      supplierId: editingItem.supplierId || undefined,
    } : {
      sku: "",
      name: "",
      description: "",
      category: "",
      size: "",
      color: "",
      design: "",
      group: "",
      style: "",
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
      const categoryValue = editingItem.category || editingItem.type || "";
      setSelectedCategory(categoryValue);
      form.reset({
        sku: editingItem.sku || "",
        name: editingItem.name || "",
        description: editingItem.description || "",
        category: categoryValue,
        size: editingItem.size || "",
        color: editingItem.color || "",
        design: editingItem.design || "",
        group: editingItem.group || editingItem.groupType || "",
        style: editingItem.style || editingItem.styleGroup || "",
        price: editingItem.price || "",
        cost: editingItem.cost || "",
        quantity: editingItem.quantity || 0,
        minStockLevel: editingItem.minStockLevel || 10,
        supplierId: editingItem.supplierId || undefined,
      });
    } else if (!editingItem && open) {
      setSelectedCategory("");
      form.reset({
        sku: "",
        name: "",
        description: "",
        category: "",
        size: "",
        color: "",
        design: "",
        group: "",
        style: "",
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

  // Generate SKU using abbreviations from database categories
  const generateSKUFromAbbreviations = (formData: any): string => {
    // Helper function to find abbreviation for a category value
    const findAbbreviation = (categoryArray: Category[], value: string): string => {
      const found = categoryArray.find(cat => cat.value === value);
      return found?.abbreviation || value.substring(0, 2).toUpperCase();
    };

    // Get abbreviations for each field
    const categoryAbbr = formData.category ? findAbbreviation(categories, formData.category) : "";
    const designAbbr = formData.design ? findAbbreviation(designs, formData.design) : "";
    const groupAbbr = formData.group ? findAbbreviation(groups, formData.group) : "";
    const styleAbbr = formData.style ? findAbbreviation(filteredStyles, formData.style) : "";
    const colorAbbr = formData.color ? findAbbreviation(colors, formData.color) : "";
    const sizeAbbr = formData.size ? findAbbreviation(filteredSizes, formData.size) : "";

    // Build SKU in format: Category-Design-Group-Style-Color-Size
    const parts = [categoryAbbr, designAbbr, groupAbbr, styleAbbr, colorAbbr, sizeAbbr].filter(Boolean);
    return parts.join("-");
  };

  // Auto-populate item name and SKU based on selections
  const autoPopulateFromCategories = () => {
    const formData = form.getValues();
    
    // Generate item name from categories
    const itemName = generateItemName({
      type: formData.category || undefined,
      color: formData.color || undefined,
      size: formData.size || undefined,
      design: formData.design || undefined,
      groupType: formData.group || undefined,
      styleGroup: formData.style || undefined,
    });
    
    // Generate SKU using abbreviations from database
    const sku = generateSKUFromAbbreviations(formData);
    
    // Update form values
    form.setValue("name", itemName);
    form.setValue("sku", sku);
  };

  const generateSkuFromForm = () => {
    const formData = form.getValues();
    const sku = generateSKUFromAbbreviations(formData);
    form.setValue("sku", sku);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedCategory("");
    setIsMultiVariant(!editingItem);
    if (onClose) onClose();
  };

  const createMultipleVariants = async (baseData: InsertInventoryItem) => {
    if (!isMultiVariant || (selectedColors.length === 0 && selectedSizes.length === 0)) {
      createItemMutation.mutate(baseData);
      return;
    }

    const colors = selectedColors.length > 0 ? selectedColors : [baseData.color || ""];
    const sizes = selectedSizes.length > 0 ? selectedSizes : [baseData.size || ""];
    
    // Generate all combinations
    const variants = [];
    for (const color of colors) {
      for (const size of sizes) {
        const variantData = {
          ...baseData,
          color,
          size,
          name: generateItemName({
            type: baseData.category || undefined,
            color,
            size,
            design: baseData.design || undefined,
            groupType: baseData.group || undefined,
            styleGroup: baseData.style || undefined,
          }),
          sku: generateSKUFromAbbreviations({
            ...baseData,
            color,
            size,
          })
        };
        variants.push(variantData);
      }
    }

    try {
      // Create all variants
      for (const variant of variants) {
        await apiRequest("POST", "/api/inventory", variant);
      }
      
      toast({
        title: "Success",
        description: `Created ${variants.length} inventory variants successfully!`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      handleClose();
    } catch (error) {
      console.error("Failed to create variants:", error);
      toast({
        title: "Error",
        description: "Failed to create inventory variants. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: InsertInventoryItem) => {
    if (editingItem) {
      updateItemMutation.mutate(data);
    } else if (isMultiVariant && (selectedColors.length > 0 || selectedSizes.length > 0)) {
      createMultipleVariants(data);
    } else {
      createItemMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
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

            {!editingItem && (
              <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
                <Switch
                  id="multi-variant"
                  checked={isMultiVariant}
                  onCheckedChange={setIsMultiVariant}
                  data-testid="switch-multi-variant"
                />
                <label htmlFor="multi-variant" className="text-sm font-medium">
                  Create multiple variants (different sizes/colors)
                </label>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedCategory(value);
                      // Clear dependent fields when category changes
                      form.setValue("style", "");
                      form.setValue("size", "");
                      setTimeout(autoPopulateFromCategories, 100);
                    }} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((categoryItem) => (
                          <SelectItem key={categoryItem.id} value={categoryItem.value}>
                            {categoryItem.value}
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
                    {isMultiVariant ? (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Select multiple colors:</div>
                        <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                          {colors.map((colorItem) => (
                            <div key={colorItem.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`color-${colorItem.value}`}
                                checked={selectedColors.includes(colorItem.value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedColors([...selectedColors, colorItem.value]);
                                  } else {
                                    setSelectedColors(selectedColors.filter(c => c !== colorItem.value));
                                  }
                                }}
                                data-testid={`checkbox-color-${colorItem.value}`}
                              />
                              <label htmlFor={`color-${colorItem.value}`} className="text-sm font-medium">
                                {colorItem.value}
                              </label>
                            </div>
                          ))}
                        </div>
                        {selectedColors.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {selectedColors.map((color) => (
                              <Badge key={color} variant="secondary" className="text-xs">
                                {color}
                                <X 
                                  className="w-3 h-3 ml-1 cursor-pointer" 
                                  onClick={() => setSelectedColors(selectedColors.filter(c => c !== color))}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
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
                          {colors.map((colorItem) => (
                            <SelectItem key={colorItem.id} value={colorItem.value}>
                              {colorItem.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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
                        {designs.map((designItem) => (
                          <SelectItem key={designItem.id} value={designItem.value}>
                            {designItem.value}
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
                name="group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setTimeout(autoPopulateFromCategories, 100);
                    }} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-group">
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groups.map((groupItem) => (
                          <SelectItem key={groupItem.id} value={groupItem.value}>
                            {groupItem.value}
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
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Style</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setTimeout(autoPopulateFromCategories, 100);
                    }} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-style">
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredStyles.map((styleItem) => (
                          <SelectItem key={styleItem.id} value={styleItem.value}>
                            {styleItem.value}
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
                    {isMultiVariant ? (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Select multiple sizes:</div>
                        <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto">
                          {filteredSizes.map((sizeItem) => (
                            <div key={sizeItem.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`size-${sizeItem.value}`}
                                checked={selectedSizes.includes(sizeItem.value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedSizes([...selectedSizes, sizeItem.value]);
                                  } else {
                                    setSelectedSizes(selectedSizes.filter(s => s !== sizeItem.value));
                                  }
                                }}
                                data-testid={`checkbox-size-${sizeItem.value}`}
                              />
                              <label htmlFor={`size-${sizeItem.value}`} className="text-sm font-medium">
                                {sizeItem.value}
                              </label>
                            </div>
                          ))}
                        </div>
                        {selectedSizes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {selectedSizes.map((size) => (
                              <Badge key={size} variant="secondary" className="text-xs">
                                {size}
                                <X 
                                  className="w-3 h-3 ml-1 cursor-pointer" 
                                  onClick={() => setSelectedSizes(selectedSizes.filter(s => s !== size))}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
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
                          {filteredSizes.map((sizeItem) => (
                            <SelectItem key={sizeItem.id} value={sizeItem.value}>
                              {sizeItem.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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
                      {suppliers.map((supplier) => (
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

            {/* Preview Section for Multi-Variant Mode */}
            {isMultiVariant && (selectedColors.length > 0 || selectedSizes.length > 0) && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-medium mb-2">Preview: Items to be created</h3>
                <div className="text-xs text-muted-foreground mb-2">
                  {selectedColors.length > 0 && selectedSizes.length > 0 
                    ? `${selectedColors.length} colors × ${selectedSizes.length} sizes = ${selectedColors.length * selectedSizes.length} items`
                    : selectedColors.length > 0 
                    ? `${selectedColors.length} color variants`
                    : `${selectedSizes.length} size variants`
                  }
                </div>
                <div className="grid grid-cols-4 gap-1 max-h-32 overflow-y-auto">
                  {(selectedColors.length > 0 ? selectedColors : [""]).map((color) =>
                    (selectedSizes.length > 0 ? selectedSizes : [""]).map((size) => (
                      <div key={`${color}-${size}`} className="text-xs p-2 bg-background rounded border">
                        {[color, size].filter(Boolean).join(" - ") || "Base item"}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
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
                  : isMultiVariant && (selectedColors.length > 0 || selectedSizes.length > 0)
                  ? (createItemMutation.isPending ? "Creating..." : `Create ${(selectedColors.length || 1) * (selectedSizes.length || 1)} Items`)
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
