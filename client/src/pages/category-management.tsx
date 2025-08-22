import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Move3D, Settings, Download, Upload } from "lucide-react";

interface Category {
  id: string;
  type: string;
  value: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_TYPES = [
  { value: "type", label: "Types", description: "Available item types (Shirt, Pants, etc.)" },
  { value: "color", label: "Colors", description: "Available colors for inventory items" },
  { value: "size", label: "Sizes", description: "Available sizes for inventory items" },
  { value: "design", label: "Designs", description: "Available designs for inventory items" },
  { value: "groupType", label: "Group Types", description: "Customer group classifications" },
  { value: "styleGroup", label: "Style Groups", description: "Product style classifications" },
] as const;

export default function CategoryManagement() {
  const [selectedType, setSelectedType] = useState<string>(() => {
    return localStorage.getItem("category-selected-type") || "type";
  });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryValue, setNewCategoryValue] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  // Fetch categories by type
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["/api/categories", selectedType],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/categories/${selectedType}`);
      return await response.json() as Category[];
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { type: string; value: string }) => {
      return apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsAddingCategory(false);
      setNewCategoryValue("");
      toast({
        title: "Success",
        description: "Category added successfully",
        duration: 3000,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: { id: string; value: string }) => {
      return apiRequest("PUT", `/api/categories/${data.id}`, { value: data.value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setEditingCategory(null);
      toast({
        title: "Success",
        description: "Category updated successfully",
        duration: 3000,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/categories/${id}`);
    },
    onMutate: async (categoryId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/categories", selectedType] });
      
      // Snapshot the previous value
      const previousCategories = queryClient.getQueryData(["/api/categories", selectedType]);
      
      // Optimistically update to remove the category immediately
      queryClient.setQueryData(["/api/categories", selectedType], (old: Category[] | undefined) => {
        return old?.filter(category => category.id !== categoryId) || [];
      });
      
      // Return a context object with the snapshotted value
      return { previousCategories };
    },
    onSuccess: () => {
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/categories", selectedType] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
        duration: 3000,
      });
    },
    onError: (error: any, categoryId, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(["/api/categories", selectedType], context.previousCategories);
      }
      
      const message = error?.message || "Failed to delete category";
      const isAlreadyDeleted = error?.status === 409;
      
      toast({
        title: isAlreadyDeleted ? "Already Deleted" : "Error",
        description: isAlreadyDeleted ? "This category was already deleted" : message,
        variant: isAlreadyDeleted ? "default" : "destructive",
        duration: 3000,
      });
      
      // Refresh the category list to sync UI with database
      if (isAlreadyDeleted) {
        queryClient.invalidateQueries({ queryKey: ["/api/categories", selectedType] });
      }
    },
  });

  // Reorder categories mutation
  const reorderCategoriesMutation = useMutation({
    mutationFn: async (data: { type: string; categoryIds: string[] }) => {
      return apiRequest("POST", "/api/categories/reorder", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: "Categories reordered successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder categories",
        variant: "destructive",
      });
    },
  });

  // File Import mutation (Excel/CSV)
  const importFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('categoryFile', file);
      
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/categories/import/file', {
        method: 'POST',
        body: formData,
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to import file');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsImporting(false);
      
      const { successCount, skippedCount, errorCount } = data;
      
      if (errorCount > 0) {
        toast({
          title: "Import completed with errors",
          description: `${successCount} new categories imported, ${skippedCount} already existed, ${errorCount} errors occurred`,
          variant: "destructive",
        });
      } else if (skippedCount > 0) {
        toast({
          title: "Import completed",
          description: `${successCount} new categories imported, ${skippedCount} categories already existed`,
          duration: 4000,
        });
      } else {
        toast({
          title: "Success", 
          description: `${successCount} categories imported successfully`,
          duration: 4000,
        });
      }
    },
    onError: () => {
      setIsImporting(false);
      toast({
        title: "Error",
        description: "Failed to import file",
        variant: "destructive",
      });
    },
  });

  const handleAddCategory = () => {
    if (!newCategoryValue.trim()) return;
    
    createCategoryMutation.mutate({
      type: selectedType,
      value: newCategoryValue.trim(),
    });
  };

  const handleUpdateCategory = (category: Category, newValue: string) => {
    if (!newValue.trim()) return;
    
    updateCategoryMutation.mutate({
      id: category.id,
      value: newValue.trim(),
    });
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const moveCategory = (index: number, direction: "up" | "down") => {
    const newCategories = [...categories];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newCategories.length) return;
    
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    
    const categoryIds = newCategories.map(cat => cat.id);
    reorderCategoriesMutation.mutate({
      type: selectedType,
      categoryIds,
    });
  };

  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch('/api/categories/export/excel', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to export Excel');
      }

      const excelData = await response.arrayBuffer();
      const blob = new Blob([excelData], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'categories.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Categories exported to Excel with separate tabs for each type",
        duration: 4000,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export categories to Excel",
        variant: "destructive",
      });
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isValidFile = file.type === 'text/csv' || 
                         file.name.endsWith('.csv') ||
                         file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                         file.name.endsWith('.xlsx');
      
      if (isValidFile) {
        importFileMutation.mutate(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV or Excel (.xlsx) file",
          variant: "destructive",
        });
      }
    }
    // Reset the input
    event.target.value = '';
  };

  const currentTypeInfo = CATEGORY_TYPES.find(t => t.value === selectedType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Category Management</h1>
        <p className="text-muted-foreground">
          Manage categories used for inventory item classification
        </p>
      </div>

      {/* Category Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Category Type
          </CardTitle>
          <CardDescription>
            Select the type of categories you want to manage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORY_TYPES.map((type) => (
              <Card
                key={type.value}
                className={`cursor-pointer transition-colors ${
                  selectedType === type.value 
                    ? "border-primary bg-primary/5" 
                    : "hover:bg-muted/50"
                }`}
                onClick={() => {
                  setSelectedType(type.value);
                  localStorage.setItem("category-selected-type", type.value);
                }}
              >
                <CardContent className="p-4">
                  <h3 className="font-medium">{type.label}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Category Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Manage {currentTypeInfo?.label}</CardTitle>
              <CardDescription>
                {currentTypeInfo?.description} ({categories.length} items)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* CSV Export/Import Buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                title="Export all categories to Excel with separate tabs"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              
              <Dialog open={isImporting} onOpenChange={setIsImporting}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" title="Import categories from Excel or CSV">
                    <Upload className="h-4 w-4 mr-2" />
                    Import File
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Categories</DialogTitle>
                    <DialogDescription>
                      Upload an Excel file (with tabs for each category type) or CSV file to import categories
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <div className="space-y-2">
                        <Label htmlFor="categoryFileInput" className="cursor-pointer">
                          <span className="text-sm font-medium">Click to select Excel or CSV file</span>
                        </Label>
                        <Input
                          id="categoryFileInput"
                          type="file"
                          accept=".csv,.xlsx"
                          onChange={handleImportFile}
                          disabled={importFileMutation.isPending}
                          className="hidden"
                        />
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p><strong>Excel:</strong> Use exported file format with tabs for each category type</p>
                          <p><strong>CSV:</strong> Include columns: type, value, displayOrder, isActive</p>
                        </div>
                      </div>
                    </div>
                    
                    {importFileMutation.isPending && (
                      <div className="text-center">
                        <p className="text-sm">Processing file...</p>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsImporting(false)}
                        disabled={importFileMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New {currentTypeInfo?.label.slice(0, -1)}</DialogTitle>
                  <DialogDescription>
                    Add a new {currentTypeInfo?.label.toLowerCase().slice(0, -1)} option
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="categoryValue">Value</Label>
                    <Input
                      id="categoryValue"
                      value={newCategoryValue}
                      onChange={(e) => setNewCategoryValue(e.target.value)}
                      placeholder={`Enter ${currentTypeInfo?.label.toLowerCase().slice(0, -1)} name`}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryValue("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddCategory}
                      disabled={!newCategoryValue.trim() || createCategoryMutation.isPending}
                    >
                      {createCategoryMutation.isPending ? "Adding..." : "Add Category"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No categories found. Add your first category to get started.
            </div>
          ) : (
            <div className="h-[calc(100vh-32rem)] overflow-y-auto space-y-2 pr-2">
              {categories.map((category, index) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      #{index}
                    </Badge>
                    <span className="font-medium">{category.value}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveCategory(index, "up")}
                      disabled={index === 0}
                      title="Move up"
                    >
                      <Move3D className="h-4 w-4 rotate-90" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveCategory(index, "down")}
                      disabled={index === categories.length - 1}
                      title="Move down"
                    >
                      <Move3D className="h-4 w-4 -rotate-90" />
                    </Button>
                    
                    <Dialog open={editingCategory?.id === category.id} onOpenChange={(open) => !open && setEditingCategory(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" title="Edit" onClick={() => setEditingCategory(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Category</DialogTitle>
                          <DialogDescription>
                            Update the category name
                          </DialogDescription>
                        </DialogHeader>
                        <EditCategoryForm
                          category={category}
                          onSave={(newValue) => handleUpdateCategory(category, newValue)}
                          onCancel={() => setEditingCategory(null)}
                          isLoading={updateCategoryMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={deleteCategoryMutation.isPending}
                      title="Delete"
                      className="text-destructive hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface EditCategoryFormProps {
  category: Category;
  onSave: (value: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function EditCategoryForm({ category, onSave, onCancel, isLoading }: EditCategoryFormProps) {
  const [value, setValue] = useState(category.value);

  const handleSave = () => {
    if (value.trim()) {
      onSave(value.trim());
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="editCategoryValue">Category Name</Label>
        <Input
          id="editCategoryValue"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!value.trim() || isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}