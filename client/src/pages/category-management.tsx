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
  const [selectedType, setSelectedType] = useState<string>("color");
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
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

  // CSV Import mutation
  const importCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const response = await fetch('/api/categories/import/csv', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to import CSV');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsImporting(false);
      
      if (data.errorCount > 0) {
        toast({
          title: "Import completed with warnings",
          description: `${data.successCount} categories imported, ${data.errorCount} errors occurred`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `${data.successCount} categories imported successfully`,
        });
      }
    },
    onError: () => {
      setIsImporting(false);
      toast({
        title: "Error",
        description: "Failed to import CSV file",
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

  const handleExportCsv = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        'Accept': 'text/csv',
      };
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch('/api/categories/export/csv', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      const csvData = await response.text();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'categories.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Categories exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export categories to CSV",
        variant: "destructive",
      });
    }
  };

  const handleImportCsv = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        importCsvMutation.mutate(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file",
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
                onClick={() => setSelectedType(type.value)}
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
                onClick={handleExportCsv}
                title="Export all categories to CSV"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              
              <Dialog open={isImporting} onOpenChange={setIsImporting}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" title="Import categories from CSV">
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Categories from CSV</DialogTitle>
                    <DialogDescription>
                      Upload a CSV file to import categories. File should have columns: type, value, displayOrder, isActive
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <div className="space-y-2">
                        <Label htmlFor="csvFileInput" className="cursor-pointer">
                          <span className="text-sm font-medium">Click to select CSV file</span>
                        </Label>
                        <Input
                          id="csvFileInput"
                          type="file"
                          accept=".csv"
                          onChange={handleImportCsv}
                          disabled={importCsvMutation.isPending}
                          className="hidden"
                        />
                        <p className="text-xs text-muted-foreground">
                          Supported format: CSV files with type, value, displayOrder, isActive columns
                        </p>
                      </div>
                    </div>
                    
                    {importCsvMutation.isPending && (
                      <div className="text-center">
                        <p className="text-sm">Processing CSV file...</p>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsImporting(false)}
                        disabled={importCsvMutation.isPending}
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
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" title="Edit">
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
                      title="Delete"
                      className="text-destructive hover:text-destructive"
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