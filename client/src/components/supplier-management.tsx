import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, Building2, Phone, Mail, User, MapPin, Globe } from "lucide-react";
import AddSupplierModal from "@/components/modals/add-supplier-modal";
import EditSupplierModal from "./modals/edit-supplier-modal";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SupplierManagement() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (supplierId: string) => {
      return apiRequest("DELETE", `/api/suppliers/${supplierId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error("Delete supplier error:", error);
      let errorMessage = "Failed to delete supplier";
      
      if (error.message?.includes("400")) {
        errorMessage = "Cannot delete supplier. It is referenced by inventory items. Please remove or reassign those items first.";
      } else if (error.message?.includes("404")) {
        errorMessage = "Supplier not found";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const filteredSuppliers = suppliers ? (suppliers as any[]).filter((supplier: any) =>
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactInfo?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const handleEditSupplier = (supplier: any) => {
    setEditingSupplier(supplier);
    setShowEditModal(true);
  };

  const handleDeleteSupplier = (supplier: any) => {
    if (confirm(`Are you sure you want to delete supplier "${supplier.name}"? This action cannot be undone.`)) {
      deleteSupplierMutation.mutate(supplier.id);
    }
  };

  const formatContactInfo = (contactInfo: string) => {
    if (!contactInfo) return null;
    
    const lines = contactInfo.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Parse structured contact info with prefixes
      if (trimmedLine.startsWith('Contact: ')) {
        return (
          <div key={index} className="flex items-center text-sm text-muted-foreground">
            <User className="mr-2" size={12} />
            <span>{trimmedLine.substring(9)}</span>
          </div>
        );
      }
      
      if (trimmedLine.startsWith('Phone: ')) {
        return (
          <div key={index} className="flex items-center text-sm text-muted-foreground">
            <Phone className="mr-2" size={12} />
            <span>{trimmedLine.substring(7)}</span>
          </div>
        );
      }
      
      if (trimmedLine.startsWith('Email: ')) {
        return (
          <div key={index} className="flex items-center text-sm text-muted-foreground">
            <Mail className="mr-2" size={12} />
            <span>{trimmedLine.substring(7)}</span>
          </div>
        );
      }
      
      if (trimmedLine.startsWith('Address: ')) {
        return (
          <div key={index} className="flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-2" size={12} />
            <span>{trimmedLine.substring(9)}</span>
          </div>
        );
      }
      
      if (trimmedLine.startsWith('Website: ')) {
        return (
          <div key={index} className="flex items-center text-sm text-muted-foreground">
            <Globe className="mr-2" size={12} />
            <a href={trimmedLine.substring(9)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {trimmedLine.substring(9)}
            </a>
          </div>
        );
      }
      
      if (trimmedLine.startsWith('Notes: ')) {
        return (
          <div key={index} className="flex items-start text-sm text-muted-foreground">
            <Building2 className="mr-2 mt-0.5" size={12} />
            <span className="italic">{trimmedLine.substring(7)}</span>
          </div>
        );
      }
      
      // Fallback for unstructured data (backward compatibility)
      if (trimmedLine.includes('@')) {
        return (
          <div key={index} className="flex items-center text-sm text-muted-foreground">
            <Mail className="mr-2" size={12} />
            <span>{trimmedLine}</span>
          </div>
        );
      }
      
      // Phone number pattern (digits, spaces, dashes, parentheses, at least 10 chars)
      if (/^[\d\s\-\(\)]+$/.test(trimmedLine) && trimmedLine.length >= 10) {
        return (
          <div key={index} className="flex items-center text-sm text-muted-foreground">
            <Phone className="mr-2" size={12} />
            <span>{trimmedLine}</span>
          </div>
        );
      }
      
      // Address patterns (contains address indicators)
      if (/\b(st|street|dr|drive|ave|avenue|rd|road|blvd|boulevard|way|ln|lane|ct|court|pl|place|pkwy|parkway|circle|cir)\b/i.test(trimmedLine) ||
          /\b\d{5}(-\d{4})?\b/.test(trimmedLine) || // ZIP code pattern
          /\b(ca|california|tx|texas|ny|new york|fl|florida)\b/i.test(trimmedLine)) { // Common state patterns
        return (
          <div key={index} className="flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-2" size={12} />
            <span>{trimmedLine}</span>
          </div>
        );
      }
      
      // Default to contact person for other text
      return (
        <div key={index} className="flex items-center text-sm text-muted-foreground">
          <User className="mr-2" size={12} />
          <span>{trimmedLine}</span>
        </div>
      );
    });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h2 className="text-xl font-semibold text-secondary">Supplier Management</h2>
            <p className="text-sm text-muted-foreground">
              Manage your supplier contacts and information
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} data-testid="button-add-supplier-main">
            <Plus size={16} className="mr-2" />
            Add Supplier
          </Button>
        </div>

        {/* Search */}
        <div className="flex space-x-4">
          <Input
            placeholder="Search suppliers by name or contact info..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
            data-testid="input-search-suppliers"
          />
        </div>

        {/* Suppliers List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading suppliers...</div>
          ) : !filteredSuppliers?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No suppliers match your search" : "No suppliers found"}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Card className="overflow-hidden">
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="font-semibold">All Suppliers</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                            Supplier Name
                          </th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                            Contact Information
                          </th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                            Date Added
                          </th>
                          <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredSuppliers.map((supplier: any) => (
                          <tr key={supplier.id} className="hover:bg-muted/50">
                            <td className="px-6 py-4">
                              <div className="font-medium text-secondary" data-testid={`supplier-name-${supplier.id}`}>
                                {supplier.name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                {supplier.contactInfo ? (
                                  formatContactInfo(supplier.contactInfo)
                                ) : (
                                  <span className="text-muted-foreground text-sm">No contact info</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {new Date(supplier.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditSupplier(supplier)}
                                  data-testid={`button-edit-supplier-${supplier.id}`}
                                >
                                  <Edit size={14} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteSupplier(supplier)}
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`button-delete-supplier-${supplier.id}`}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4">
                {filteredSuppliers.map((supplier: any) => (
                  <Card key={supplier.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-secondary mb-1" data-testid={`supplier-name-mobile-${supplier.id}`}>
                          {supplier.name}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          Added {new Date(supplier.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                    
                    {supplier.contactInfo && (
                      <div className="space-y-2 mb-3">
                        {formatContactInfo(supplier.contactInfo)}
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSupplier(supplier)}
                        className="flex-1"
                        data-testid={`button-edit-supplier-mobile-${supplier.id}`}
                      >
                        <Edit size={14} className="mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSupplier(supplier)}
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-supplier-mobile-${supplier.id}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <AddSupplierModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />

      <EditSupplierModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        supplier={editingSupplier}
        onClose={() => {
          setShowEditModal(false);
          setEditingSupplier(null);
        }}
      />
    </>
  );
}