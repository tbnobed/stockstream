import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireAdmin, generateAssociateCode } from "./replitAuth";
import { 
  insertSalesAssociateSchema,
  insertSupplierSchema,
  insertInventoryItemSchema,
  insertSaleSchema,
  insertCategorySchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint (before auth middleware)
  app.get('/api/health', async (req, res) => {
    try {
      // Test database connection
      await storage.getInventoryItems();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
        node_version: process.version,
        environment: process.env.NODE_ENV || 'development'
      };

      res.status(200).json(health);
    } catch (error) {
      console.error('Health check failed:', error);
      
      const health = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        uptime: process.uptime(),
        pid: process.pid
      };

      res.status(503).json(health);
    }
  });

  // Setup authentication routes
  await setupAuth(app);
  // Dashboard Stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ 
        message: "Failed to fetch dashboard stats",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Associates (Admin Only)
  app.get("/api/associates", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const associates = await storage.getAssociates();
      res.json(associates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch associates" });
    }
  });

  app.post("/api/associates", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { name, email } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      // Generate associate code and username
      const associateCode = generateAssociateCode();
      const username = name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
      
      const userData = {
        username,
        associateCode,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || '',
        email: email || null,
        role: 'associate',
        isActive: true,
      };

      const newUser = await storage.createUser(userData);
      res.status(201).json({
        id: newUser.id,
        name: `${newUser.firstName} ${newUser.lastName}`.trim(),
        email: newUser.email,
        associateCode: newUser.associateCode,
        isActive: newUser.isActive,
      });
    } catch (error) {
      console.error("Create associate error:", error);
      res.status(500).json({ message: "Failed to create associate" });
    }
  });

  app.patch("/api/associates/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      const updateData = {
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || '',
        email: email || null,
      };

      const updatedUser = await storage.updateUser(id, updateData);
      res.json({
        id: updatedUser.id,
        name: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
        email: updatedUser.email,
        associateCode: updatedUser.associateCode,
        isActive: updatedUser.isActive,
      });
    } catch (error) {
      console.error("Update associate error:", error);
      res.status(500).json({ message: "Failed to update associate" });
    }
  });

  // Suppliers
  app.get("/api/suppliers", isAuthenticated, async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", isAuthenticated, async (req, res) => {
    try {
      const supplier = insertSupplierSchema.parse(req.body);
      const newSupplier = await storage.createSupplier(supplier);
      res.status(201).json(newSupplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create supplier" });
      }
    }
  });

  app.put("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const supplier = insertSupplierSchema.parse(req.body);
      const updatedSupplier = await storage.updateSupplier(id, supplier);
      if (!updatedSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(updatedSupplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update supplier" });
      }
    }
  });

  app.delete("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Attempting to delete supplier: ${id}`);
      
      // Check if supplier is referenced by inventory items
      const referencedItems = await storage.getInventoryItems();
      const hasReferences = referencedItems.some((item: any) => item.supplierId === id);
      
      if (hasReferences) {
        return res.status(400).json({ 
          message: "Cannot delete supplier. It is referenced by inventory items. Please remove or reassign those items first." 
        });
      }
      
      const deleted = await storage.deleteSupplier(id);
      if (!deleted) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Delete supplier error:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Inventory Items
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      const items = await storage.getInventoryItems(includeArchived);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  app.get("/api/inventory/low-stock", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getLowStockItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  // Search inventory items (partial matching)
  app.get("/api/inventory/search/:term", async (req, res) => {
    try {
      let searchTerm = req.params.term.trim();
      
      // Decode URL-encoded search terms
      try {
        searchTerm = decodeURIComponent(searchTerm);
      } catch (e) {
        console.log("Could not decode search term, using as-is");
      }
      
      console.log("Search request for:", searchTerm);
      
      if (!searchTerm) {
        res.json([]);
        return;
      }
      
      // Try to parse JSON if it looks like JSON
      let actualSearchTerm = searchTerm;
      if (searchTerm.startsWith('{') && searchTerm.endsWith('}')) {
        try {
          const parsed = JSON.parse(searchTerm);
          console.log("Parsed JSON search term:", parsed);
          // Extract the actual search value from JSON
          actualSearchTerm = parsed.sku || parsed.id || parsed.name || searchTerm;
          console.log("Using extracted search term:", actualSearchTerm);
        } catch (e) {
          console.log("Failed to parse JSON search term, using as-is");
        }
      }
      
      const items = await storage.searchInventoryItems(actualSearchTerm);
      console.log("Search results count:", items.length);
      res.json(items);
    } catch (error) {
      console.error("Search inventory error:", error);
      res.status(500).json({ message: "Failed to search inventory items" });
    }
  });

  // Get exact inventory item by SKU
  app.get("/api/inventory/sku/:sku", async (req, res) => {
    try {
      const item = await storage.getInventoryItemBySku(req.params.sku);
      if (!item) {
        // If exact match fails, try searching for partial matches
        const searchResults = await storage.searchInventoryItems(req.params.sku);
        if (searchResults.length === 1) {
          // If only one result, return it
          res.json(searchResults[0]);
          return;
        } else if (searchResults.length > 1) {
          // Multiple matches, return the first one or let frontend handle
          res.json(searchResults[0]);
          return;
        }
        res.status(404).json({ message: "Item not found" });
        return;
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.post("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const item = insertInventoryItemSchema.parse(req.body);
      const newItem = await storage.createInventoryItem(item);
      res.status(201).json(newItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create inventory item" });
      }
    }
  });

  app.patch("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const updates = req.body;
      const updatedItem = await storage.updateInventoryItem(req.params.id, updates);
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  // Archive inventory item
  app.patch("/api/inventory/:id/archive", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const archivedItem = await storage.archiveInventoryItem(id);
      res.json(archivedItem);
    } catch (error) {
      console.error("Error archiving inventory item:", error);
      res.status(500).json({ message: "Failed to archive inventory item" });
    }
  });

  // Restore inventory item
  app.patch("/api/inventory/:id/restore", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const restoredItem = await storage.restoreInventoryItem(id);
      res.json(restoredItem);
    } catch (error) {
      console.error("Error restoring inventory item:", error);
      res.status(500).json({ message: "Failed to restore inventory item" });
    }
  });

  app.post("/api/inventory/:id/add-stock", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { quantity, reason, notes } = req.body;
      
      // Get user ID - either from claims (OpenID) or direct user object (our auth)
      const userId = req.user?.claims?.sub || req.user?.id;
      
      if (!quantity || quantity <= 0) {
        return res.status(400).json({ message: "Quantity must be a positive number" });
      }
      
      const updatedItem = await storage.addStockToItem(id, Number(quantity), reason || "restock", notes || "", userId);
      res.json(updatedItem);
    } catch (error) {
      console.error("Error adding stock:", error);
      res.status(500).json({ message: "Failed to add stock" });
    }
  });

  app.get("/api/inventory/:id/transactions", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const transactions = await storage.getInventoryTransactions(id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/inventory/:id/adjust", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { quantity, reason, notes } = req.body;
      
      // Get user ID - either from claims (OpenID) or direct user object (our auth)
      const userId = req.user?.claims?.sub || req.user?.id;
      
      if (!quantity || quantity <= 0) {
        return res.status(400).json({ message: "Quantity must be a positive number" });
      }
      
      const updatedItem = await storage.adjustInventory(id, Number(quantity), reason || "adjustment", notes || "", userId);
      res.json(updatedItem);
    } catch (error) {
      console.error("Error adjusting inventory:", error);
      res.status(500).json({ message: "Failed to adjust inventory" });
    }
  });

  // Sales
  app.get("/api/sales", isAuthenticated, async (req, res) => {
    try {
      const salesData = await storage.getSales();
      res.json(salesData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.get("/api/sales/order/:orderNumber", isAuthenticated, async (req, res) => {
    try {
      const { orderNumber } = req.params;
      const orderSales = await storage.getSalesByOrderNumber(orderNumber);
      if (orderSales.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(orderSales);
    } catch (error) {
      console.error("Error fetching order sales:", error);
      res.status(500).json({ message: "Failed to fetch order details" });
    }
  });

  app.post("/api/sales", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating sale with data:", JSON.stringify(req.body, null, 2));
      const sale = insertSaleSchema.parse(req.body);
      console.log("Parsed sale data:", JSON.stringify(sale, null, 2));
      const newSale = await storage.createSale(sale);
      res.status(201).json(newSale);
    } catch (error) {
      console.error("Sales creation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Storage error:", error);
        res.status(500).json({ message: "Failed to create sale", error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  });

  // Categories (Admin Only)
  app.get("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:type", isAuthenticated, async (req, res) => {
    try {
      const { type } = req.params;
      const categories = await storage.getCategoriesByType(type);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories by type" });
    }
  });

  app.post("/api/categories", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const category = insertCategorySchema.parse(req.body);
      const newCategory = await storage.createCategory(category);
      res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });

  app.put("/api/categories/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedCategory = await storage.updateCategory(id, updates);
      res.json(updatedCategory);
    } catch (error) {
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCategory(id);
      if (deleted) {
        res.json({ message: "Category deleted successfully" });
      } else {
        res.status(404).json({ message: "Category not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  app.post("/api/categories/reorder", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { type, categoryIds } = req.body;
      if (!type || !Array.isArray(categoryIds)) {
        return res.status(400).json({ message: "Type and categoryIds array required" });
      }
      await storage.reorderCategories(type, categoryIds);
      res.json({ message: "Categories reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder categories" });
    }
  });

  // Test endpoint for debugging
  app.get("/api/categories/test", isAuthenticated, async (req, res) => {
    try {
      console.log("=== TESTING CATEGORIES ===");
      const categories = await storage.getCategories();
      console.log(`Found ${categories.length} categories`);
      console.log("First 3:", categories.slice(0, 3));
      res.json({ count: categories.length, categories: categories.slice(0, 5) });
    } catch (error) {
      console.error("Test error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // CSV Export for all categories
  app.get("/api/categories/export", isAuthenticated, async (req, res) => {
    try {
      console.log("=== CSV EXPORT START ===");
      const categories = await storage.getCategories();
      console.log(`Found ${categories.length} categories for export`);
      
      if (categories.length === 0) {
        console.log("No categories found, sending empty CSV");
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="all_categories.csv"`);
        res.send("Type,Value,Display Order\n");
        return;
      }
      
      // Create CSV content
      const csvHeader = "Type,Value,Display Order\n";
      const csvRows = categories.map(cat => 
        `"${cat.type}","${cat.value}","${cat.displayOrder}"`
      ).join("\n");
      const csvContent = csvHeader + csvRows;
      
      console.log("CSV content preview:", csvContent.substring(0, 200));
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="all_categories.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("CSV export error:", error);
      res.status(500).json({ message: "Failed to export categories" });
    }
  });

  // CSV Import for all categories
  app.post("/api/categories/import", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { csvData } = req.body;
      
      if (!csvData) {
        return res.status(400).json({ message: "CSV data is required" });
      }

      // Parse CSV data
      const lines = csvData.trim().split('\n');
      if (lines.length <= 1) {
        return res.status(400).json({ message: "CSV must contain header and at least one data row" });
      }

      // Skip header line and parse data
      const categories = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV parsing (handles quoted fields)
        const matches = line.match(/("([^"]*)"|[^,]*)(,("([^"]*)"|[^,]*))*/)
        const parts = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            parts.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        parts.push(current.trim().replace(/^"|"$/g, ''));
        
        if (parts.length >= 4) {
          const categoryType = parts[0];
          const categoryValue = parts[1];
          if (categoryType && categoryValue) {
            categories.push({
              type: categoryType,
              value: categoryValue,
              displayOrder: parseInt(parts[2]) || 0,
              isActive: parts[3] !== 'false'
            });
          }
        }
      }

      if (categories.length === 0) {
        return res.status(400).json({ message: "No valid categories found in CSV" });
      }

      // Create categories in database
      const results = [];
      for (const categoryData of categories) {
        try {
          const category = insertCategorySchema.parse(categoryData);
          const newCategory = await storage.createCategory(category);
          results.push({ success: true, category: newCategory });
        } catch (error) {
          console.warn(`Failed to create category ${categoryData.value}:`, error);
          results.push({ 
            success: false, 
            type: categoryData.type,
            value: categoryData.value, 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        message: `Import completed: ${successful} successful, ${failed} failed`,
        successful,
        failed,
        results
      });
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ message: "Failed to import categories" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
