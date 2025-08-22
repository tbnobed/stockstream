import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireAdmin, generateAssociateCode } from "./replitAuth";
import { db } from "./db";
import { categories } from "../shared/schema";
import { eq } from "drizzle-orm";
import { 
  insertSalesAssociateSchema,
  insertSupplierSchema,
  insertInventoryItemSchema,
  insertSaleSchema,
  insertCategorySchema,
  insertMediaFileSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";
import * as XLSX from "xlsx";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') ||
          file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.originalname.endsWith('.xlsx')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV and Excel files are allowed'));
      }
    }
  });

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
      
      // Check if category exists and is active
      const [category] = await db.select().from(categories).where(eq(categories.id, id));
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (!category.isActive) {
        return res.status(409).json({ message: "Category already deleted" });
      }
      
      // Since category exists and is active, delete it
      await storage.deleteCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error(`Error deleting category ${req.params.id}:`, error);
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

  // Excel Export for Categories (with separate tabs)
  app.get("/api/categories/export/excel", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      
      // Group categories by type
      const categoryTypes = ['type', 'color', 'size', 'design', 'groupType', 'styleGroup'];
      const workbook = XLSX.utils.book_new();
      
      categoryTypes.forEach(categoryType => {
        const categoriesOfType = categories.filter(cat => cat.type === categoryType);
        
        // Create worksheet data
        const worksheetData = [
          ['Value', 'Display Order', 'Is Active'] // Headers
        ];
        
        categoriesOfType.forEach(cat => {
          worksheetData.push([
            cat.value,
            (cat.displayOrder ?? 0).toString(),
            cat.isActive ? 'Yes' : 'No'
          ]);
        });
        
        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // Add worksheet to workbook with tab name
        const tabName = categoryType.charAt(0).toUpperCase() + categoryType.slice(1);
        XLSX.utils.book_append_sheet(workbook, worksheet, tabName);
      });
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      
      // Set headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="categories.xlsx"');
      
      res.send(excelBuffer);
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).json({ message: "Failed to export categories" });
    }
  });

  // Excel/CSV Import for Categories
  app.post("/api/categories/import/file", isAuthenticated, requireAdmin, upload.single('categoryFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      let allRows: any[] = [];
      const isExcel = req.file.originalname.endsWith('.xlsx') || 
                     req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      if (isExcel) {
        // Handle Excel file with multiple worksheets
        try {
          const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
          
          // Map sheet names to actual category types
          const sheetToTypeMap = {
            'Type': 'type',
            'Color': 'color', 
            'Size': 'size',
            'Design': 'design',
            'GroupType': 'groupType',
            'StyleGroup': 'styleGroup'
          };
          
          Object.entries(sheetToTypeMap).forEach(([sheetName, categoryType]) => {
            if (workbook.SheetNames.includes(sheetName)) {
              const worksheet = workbook.Sheets[sheetName];
              const sheetData = XLSX.utils.sheet_to_json(worksheet);
              
              // Add type information to each row based on sheet name
              const typedData = sheetData.map((row: any) => ({
                ...row,
                type: categoryType, // Use the correct camelCase type
                value: row['Value'] || row.value,
                displayOrder: row['Display Order'] || row.displayOrder || 0,
                isActive: (row['Is Active'] || row.isActive) === 'Yes' || (row['Is Active'] || row.isActive) === true
              }));
              
              allRows.push(...typedData);
            }
          });
        } catch (error) {
          return res.status(400).json({ message: "Failed to parse Excel file" });
        }
      } else {
        // Handle CSV file
        return new Promise((resolve) => {
          const csvData: any[] = [];
          const stream = Readable.from(req.file!.buffer.toString());
          
          stream
            .pipe(csvParser())
            .on('data', (data) => {
              csvData.push(data);
            })
            .on('end', async () => {
              allRows = csvData;
              processImportData();
            })
            .on('error', (error) => {
              console.error("CSV parsing error:", error);
              res.status(500).json({ message: "Failed to parse CSV file" });
            });
        });
      }

      // Process the imported data
      const processImportData = async () => {
        try {
          let successCount = 0;
          let skippedCount = 0;
          let errorCount = 0;
          const errors: string[] = [];

          for (const row of allRows) {
            try {
              // Validate required fields
              if (!row.type || !row.value) {
                errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
                errorCount++;
                continue;
              }

              // Parse and validate data
              const categoryData = {
                type: row.type.toString().trim(), // Keep original camelCase (don't lowercase!)
                value: row.value.toString().trim(),
                displayOrder: parseInt(row.displayOrder) || parseInt(row['Display Order']) || 0,
                isActive: row.isActive === 'Yes' || row.isActive === true || row.isActive === 'true' ||
                         row['Is Active'] === 'Yes' || row['Is Active'] === true || row['Is Active'] === 'true',
              };

              // Validate category schema
              const validatedData = insertCategorySchema.parse(categoryData);
              
              // Check if category already exists
              const existingCategories = await storage.getCategoriesByType(validatedData.type);
              const exists = existingCategories.find(cat => 
                cat.value.toLowerCase() === validatedData.value.toLowerCase()
              );

              if (exists) {
                // Skip existing categories without counting as errors
                skippedCount++;
                continue;
              }

              // Create the category
              await storage.createCategory(validatedData);
              successCount++;
            } catch (error) {
              errors.push(`Failed to import row ${JSON.stringify(row)}: ${error instanceof Error ? error.message : String(error)}`);
              errorCount++;
            }
          }

          res.json({
            message: "Import completed",
            successCount,
            skippedCount,
            errorCount,
            errors: errors.slice(0, 10), // Limit errors to first 10
            totalErrors: errors.length
          });
        } catch (error) {
          console.error("Import processing error:", error);
          res.status(500).json({ message: "Failed to process import data" });
        }
      };

      if (isExcel) {
        await processImportData();
      }
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import categories" });
    }
  });

  // Debug endpoint for Excel testing
  app.post("/api/debug/excel", isAuthenticated, requireAdmin, upload.single('testFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const isExcel = req.file.originalname.endsWith('.xlsx') || 
                     req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      if (!isExcel) {
        return res.status(400).json({ message: "Not an Excel file" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      
      const result = {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        sheetNames: workbook.SheetNames,
        sheets: {} as any
      };

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet);
        result.sheets[sheetName] = {
          rowCount: sheetData.length,
          sampleData: sheetData.slice(0, 3) // First 3 rows
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Excel debug error:", error);
      res.status(500).json({ message: "Failed to process Excel file", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Media Files Routes
  const objectStorageService = new ObjectStorageService();

  // Get media files (logos)
  app.get("/api/media", isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string || "logo";
      const mediaFiles = await storage.getMediaFiles(category);
      res.json(mediaFiles);
    } catch (error) {
      console.error("Failed to fetch media files:", error);
      res.status(500).json({ message: "Failed to fetch media files" });
    }
  });

  // Get upload URL for media file
  app.post("/api/media/upload", isAuthenticated, async (req, res) => {
    try {
      const { fileName, fileType } = req.body;
      
      if (!fileName || !fileType) {
        return res.status(400).json({ message: "fileName and fileType are required" });
      }

      // Extract file extension from filename
      const fileExtension = fileName.split('.').pop();
      if (!fileExtension) {
        return res.status(400).json({ message: "Invalid filename" });
      }

      const uploadURL = await objectStorageService.getMediaUploadURL(`.${fileExtension}`);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Failed to get upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Save media file metadata after upload
  app.post("/api/media", isAuthenticated, async (req, res) => {
    try {
      const { fileName, originalName, fileType, fileSize, uploadURL } = req.body;
      
      if (!fileName || !originalName || !fileType || !fileSize || !uploadURL) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Get user ID from session
      const userId = (req as any).user?.claims?.sub;
      
      // Normalize the object path from the upload URL
      const objectPath = objectStorageService.normalizeMediaPath(uploadURL);
      
      const mediaFileData = {
        fileName,
        originalName,
        fileType,
        fileSize,
        objectPath,
        category: "logo",
        uploadedBy: userId,
      };

      const mediaFile = await storage.createMediaFile(mediaFileData);
      res.json(mediaFile);
    } catch (error) {
      console.error("Failed to save media file:", error);
      res.status(500).json({ message: "Failed to save media file" });
    }
  });

  // Serve media files
  app.get("/media/:mediaPath(*)", async (req, res) => {
    try {
      // Correctly construct the media path with /media/ prefix
      const mediaPath = `/media/${req.params.mediaPath}`;
      
      const file = await objectStorageService.getMediaFile(mediaPath);
      await objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error serving media file:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Media file not found" });
      }
      return res.status(500).json({ error: "Error serving media file" });
    }
  });

  // Delete media file
  app.delete("/api/media/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteMediaFile(id);
      
      if (success) {
        res.json({ message: "Media file deleted successfully" });
      } else {
        res.status(404).json({ message: "Media file not found" });
      }
    } catch (error) {
      console.error("Failed to delete media file:", error);
      res.status(500).json({ message: "Failed to delete media file" });
    }
  });

  // Label Template endpoints
  app.get("/api/label-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await storage.getLabelTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching label templates:", error);
      res.status(500).json({ message: "Failed to fetch label templates" });
    }
  });

  app.get("/api/label-templates/default", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const template = await storage.getDefaultLabelTemplate(userId);
      res.json(template || null);
    } catch (error) {
      console.error("Error fetching default label template:", error);
      res.status(500).json({ message: "Failed to fetch default label template" });
    }
  });

  app.post("/api/label-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateData = { ...req.body, userId };
      const template = await storage.createLabelTemplate(templateData);
      res.json(template);
    } catch (error) {
      console.error("Error creating label template:", error);
      res.status(500).json({ message: "Failed to create label template" });
    }
  });

  app.put("/api/label-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const updates = req.body;
      const template = await storage.updateLabelTemplate(id, userId, updates);
      if (!template) {
        return res.status(404).json({ message: "Label template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating label template:", error);
      res.status(500).json({ message: "Failed to update label template" });
    }
  });

  app.delete("/api/label-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const success = await storage.deleteLabelTemplate(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Label template not found" });
      }
      res.json({ message: "Label template deleted successfully" });
    } catch (error) {
      console.error("Error deleting label template:", error);
      res.status(500).json({ message: "Failed to delete label template" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
