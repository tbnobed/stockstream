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
import { generateAbbreviation } from "@shared/categories";
import { z } from "zod";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";
import * as XLSX from "xlsx";
// Object storage removed - using local file storage only
import path from "path";
import fs from "fs";
import { emailService } from "./emailService";
import crypto from "crypto";

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

  // Configure multer for media file uploads (images)
  const mediaUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/svg+xml'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PNG, JPG, JPEG, GIF, SVG files are allowed'));
      }
    }
  });

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configuration endpoint (before auth middleware)
  app.get('/api/config', async (req, res) => {
    try {
      const config = {
        venmoUsername: process.env.VENMO_USERNAME || 'AxemenMCAZ',
        paypalUsername: process.env.PAYPAL_USERNAME || 'AxemenMCAZ',
      };
      res.json(config);
    } catch (error) {
      console.error('Config endpoint error:', error);
      res.status(500).json({ message: 'Failed to fetch configuration' });
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

  // Email service routes
  app.get('/api/email/status', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const isConfigured = emailService.isConfigured();
      
      if (!isConfigured) {
        return res.json({
          configured: false,
          message: 'Email service is not configured. Please set SMTP environment variables.'
        });
      }

      const connectionTest = await emailService.testConnection();
      
      res.json({
        configured: true,
        connectionActive: connectionTest,
        message: connectionTest 
          ? 'Email service is configured and working' 
          : 'Email service is configured but connection failed'
      });
    } catch (error) {
      console.error('Email status check failed:', error);
      res.status(500).json({
        configured: emailService.isConfigured(),
        connectionActive: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/email/test', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { recipientEmail } = req.body;
      
      if (!recipientEmail) {
        return res.status(400).json({ message: 'Recipient email is required' });
      }

      if (!emailService.isConfigured()) {
        return res.status(400).json({ 
          message: 'Email service is not configured. Please set SMTP environment variables.' 
        });
      }

      const success = await emailService.sendEmail({
        to: recipientEmail,
        subject: 'InventoryPro Email Test',
        text: 'This is a test email from InventoryPro. If you received this, email is working correctly!',
        html: `
          <h2>InventoryPro Email Test</h2>
          <p>This is a test email from InventoryPro.</p>
          <p><strong>If you received this, email is working correctly!</strong></p>
          <p>Sent at: ${new Date().toISOString()}</p>
        `
      });

      if (success) {
        res.json({ 
          success: true, 
          message: `Test email sent successfully to ${recipientEmail}` 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send test email. Check server logs for details.' 
        });
      }
    } catch (error) {
      console.error('Test email failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/email/receipt', isAuthenticated, async (req, res) => {
    try {
      const { receiptToken, customerEmail, customerName } = req.body;
      
      if (!receiptToken || !customerEmail) {
        return res.status(400).json({ message: 'Receipt token and customer email are required' });
      }

      if (!emailService.isConfigured()) {
        return res.status(400).json({ 
          message: 'Email service is not configured. Please set SMTP environment variables.' 
        });
      }

      // Get receipt data to find the order number
      const receipt = await storage.getReceiptByToken(receiptToken);
      if (!receipt) {
        return res.status(404).json({ message: 'Receipt not found or expired' });
      }

      const receiptUrl = `${req.protocol}://${req.get('host')}/receipt/${receiptToken}`;
      
      const success = await emailService.sendReceiptEmail(
        customerEmail,
        receipt.orderNumber,
        receiptUrl,
        customerName
      );

      if (success) {
        res.json({ 
          success: true, 
          message: `Receipt email sent successfully to ${customerEmail}` 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send receipt email. Check server logs for details.' 
        });
      }
    } catch (error) {
      console.error('Receipt email failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/email/low-stock-alert', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { adminEmail } = req.body;
      
      if (!adminEmail) {
        return res.status(400).json({ message: 'Admin email is required' });
      }

      if (!emailService.isConfigured()) {
        return res.status(400).json({ 
          message: 'Email service is not configured. Please set SMTP environment variables.' 
        });
      }

      const lowStockItems = await storage.getLowStockItems();
      
      if (lowStockItems.length === 0) {
        return res.json({ 
          success: true, 
          message: 'No low stock items to report' 
        });
      }

      const formattedItems = lowStockItems.map(item => ({
        name: item.name,
        sku: item.sku,
        stock: item.quantity,
        lowStockThreshold: item.minStockLevel ?? 0
      }));

      const success = await emailService.sendLowStockAlert(adminEmail, formattedItems);

      if (success) {
        res.json({ 
          success: true, 
          message: `Low stock alert sent successfully to ${adminEmail}`,
          itemCount: lowStockItems.length
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send low stock alert. Check server logs for details.' 
        });
      }
    } catch (error) {
      console.error('Low stock alert email failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Volunteer authentication system
  app.post('/api/volunteer/auth', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email address required' });
      }

      // Generate secure session token
      const sessionToken = crypto.randomBytes(64).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

      // Clean up expired sessions first
      await storage.cleanupExpiredVolunteerSessions();

      // Create new session
      const session = await storage.createVolunteerSession({
        email: email.toLowerCase().trim(),
        sessionToken,
        expiresAt
      });

      res.json({
        success: true,
        sessionToken,
        expiresAt: session.expiresAt,
        email: session.email
      });

    } catch (error) {
      console.error('Volunteer auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // Volunteer session validation middleware
  const validateVolunteerSession = async (req: any, res: any, next: any) => {
    try {
      const sessionToken = req.headers['x-volunteer-session'];
      
      if (!sessionToken) {
        return res.status(401).json({ error: 'Session token required' });
      }

      const session = await storage.getVolunteerSession(sessionToken);
      
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      // Add session info to request
      req.volunteerSession = session;
      next();

    } catch (error) {
      console.error('Session validation error:', error);
      res.status(500).json({ error: 'Session validation failed' });
    }
  };

  // Volunteer session check endpoint
  app.get('/api/volunteer/session', validateVolunteerSession, async (req: any, res) => {
    res.json({
      valid: true,
      email: req.volunteerSession.email,
      expiresAt: req.volunteerSession.expiresAt
    });
  });

  // Setup authentication routes
  await setupAuth(app);

  // Volunteer routes - limited permissions
  // Volunteers can view inventory (read-only)
  app.get("/api/volunteer/inventory", validateVolunteerSession, async (req, res) => {
    try {
      const items = await storage.getInventoryItems(); // Active items only
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  // Volunteers can search inventory by SKU/name
  app.get("/api/volunteer/inventory/search/:term", validateVolunteerSession, async (req, res) => {
    try {
      const searchTerm = req.params.term.trim();
      const items = await storage.searchInventoryItems(searchTerm);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to search inventory" });
    }
  });

  // Volunteers can create sales but with their email instead of associate ID
  app.post("/api/volunteer/sales", validateVolunteerSession, async (req: any, res) => {
    try {
      const { items, paymentMethod, customerName, customerEmail } = req.body;
      const volunteerEmail = req.volunteerSession.email;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Items array is required" });
      }
      
      // Generate order number using the same pattern as frontend
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      
      // Generate receipt token and expiration (90 days from now)  
      const receiptToken = `RCT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const receiptExpiresAt = new Date();
      receiptExpiresAt.setDate(receiptExpiresAt.getDate() + 90);
      
      // Process each item in the cart as individual sale records with same order number
      const salesPromises = items.map(async (item: any) => {
        const saleData = {
          itemId: item.inventoryItemId, // Map from frontend format
          quantity: item.quantity,
          unitPrice: item.priceAtSale,
          totalAmount: (item.priceAtSale * item.quantity).toString(),
          paymentMethod: paymentMethod,
          orderNumber: orderNumber,
          salesAssociateId: null, // No associate ID for volunteers
          volunteerEmail: volunteerEmail, // Track volunteer sales by email
          receiptToken: receiptToken,
          receiptExpiresAt: receiptExpiresAt,
          customerName: customerName?.trim() || undefined,
          customerEmail: customerEmail?.trim() || undefined,
        };
        
        return await storage.createSale(saleData);
      });
      
      const completedSales = await Promise.all(salesPromises);
      const firstSale = completedSales[0];
      
      // Return sale data with QR code URL for the receipt
      const receiptUrl = `${req.protocol}://${req.get('host')}/receipt/${receiptToken}`;
      
      // Optional: Send receipt email if customer email is provided in the request
      if (customerEmail && emailService.isConfigured()) {
        try {
          await emailService.sendReceiptEmail(
            customerEmail,
            orderNumber,
            receiptUrl,
            customerName
          );
          console.log(`📧 Receipt email sent to ${customerEmail} for volunteer order ${orderNumber}`);
        } catch (emailError) {
          console.error(`📧 Failed to send receipt email to ${customerEmail}:`, emailError);
          // Don't fail the sale if email fails
        }
      }
      
      res.status(201).json({
        ...firstSale,
        receiptUrl,
        qrCodeData: receiptUrl, // Frontend can use this to generate QR code
        orderNumber: orderNumber,
        receiptToken: receiptToken,
        totalItems: completedSales.length
      });
    } catch (error) {
      console.error("Volunteer sale creation error:", error);
      res.status(500).json({ message: "Failed to create sale" });
    }
  });

  // Volunteers can view existing sales (for reference)
  app.get("/api/volunteer/sales", validateVolunteerSession, async (req, res) => {
    try {
      const salesData = await storage.getSales();
      res.json(salesData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.get("/api/volunteer/sales/:orderNumber", validateVolunteerSession, async (req, res) => {
    try {
      const { orderNumber } = req.params;
      const orderSales = await storage.getSalesByOrderNumber(orderNumber);
      if (orderSales.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(orderSales);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order details" });
    }
  });
  
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

  app.post("/api/inventory", isAuthenticated, requireAdmin, async (req, res) => {
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

  // Delete inventory item permanently
  app.delete("/api/inventory/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.deleteInventoryItem(id);
      if (result.success) {
        res.json({ message: "Inventory item deleted successfully" });
      } else {
        res.status(400).json({ message: result.error || "Failed to delete inventory item" });
      }
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
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
      
      // Generate receipt token and expiration (90 days from now)
      const receiptToken = `RCT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const receiptExpiresAt = new Date();
      receiptExpiresAt.setDate(receiptExpiresAt.getDate() + 90);
      
      // Add receipt fields to sale data
      const saleWithReceipt = {
        ...sale,
        receiptToken,
        receiptExpiresAt,
      };
      
      const newSale = await storage.createSale(saleWithReceipt);
      
      // Return sale data with QR code URL for the receipt
      const receiptUrl = `${req.protocol}://${req.get('host')}/receipt/${receiptToken}`;
      
      // Optional: Send receipt email if customer email is provided in the request
      const { customerEmail, customerName } = req.body;
      if (customerEmail && emailService.isConfigured()) {
        try {
          await emailService.sendReceiptEmail(
            customerEmail,
            newSale.orderNumber,
            receiptUrl,
            customerName
          );
          console.log(`📧 Receipt email sent to ${customerEmail} for order ${newSale.orderNumber}`);
        } catch (emailError) {
          console.error(`📧 Failed to send receipt email to ${customerEmail}:`, emailError);
          // Don't fail the sale if email fails
        }
      }
      
      res.status(201).json({
        ...newSale,
        receiptUrl,
        qrCodeData: receiptUrl, // Frontend can use this to generate QR code
      });
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

  // Returns
  app.get("/api/returns", isAuthenticated, async (req, res) => {
    try {
      const returns = await storage.getReturns();
      res.json(returns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch returns" });
    }
  });

  app.get("/api/returns/sale/:saleId", isAuthenticated, async (req, res) => {
    try {
      const { saleId } = req.params;
      const returns = await storage.getReturnsBySaleId(saleId);
      res.json(returns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch returns for sale" });
    }
  });

  app.post("/api/returns", isAuthenticated, async (req: any, res) => {
    try {
      const { saleId, quantityReturned, refundAmount, reason, notes } = req.body;
      
      const returnData = {
        saleId,
        quantityReturned,
        refundAmount,
        reason,
        notes: notes || null,
        processedBy: req.user?.id || null,
        volunteerEmail: null,
      };
      
      const newReturn = await storage.createReturn(returnData);
      res.status(201).json(newReturn);
    } catch (error) {
      console.error("Return creation error:", error);
      res.status(500).json({ message: "Failed to process return", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/volunteer/returns", validateVolunteerSession, async (req: any, res) => {
    try {
      const { saleId, quantityReturned, refundAmount, reason, notes } = req.body;
      const volunteerEmail = req.volunteerSession.email;
      
      const returnData = {
        saleId,
        quantityReturned,
        refundAmount,
        reason,
        notes: notes || null,
        processedBy: null,
        volunteerEmail,
      };
      
      const newReturn = await storage.createReturn(returnData);
      res.status(201).json(newReturn);
    } catch (error) {
      console.error("Volunteer return creation error:", error);
      res.status(500).json({ message: "Failed to process return", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Receipt Endpoint (Public - no authentication required)
  app.get("/api/receipts/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const receipt = await storage.getReceiptByToken(token);
      
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      
      // Check if receipt is expired
      const now = new Date();
      const isExpired = receipt.receiptExpiresAt && now > new Date(receipt.receiptExpiresAt);
      
      if (isExpired) {
        return res.json({ ...receipt, isExpired: true });
      }
      
      res.json({ ...receipt, isExpired: false });
    } catch (error) {
      console.error("Error fetching receipt:", error);
      res.status(500).json({ message: "Failed to fetch receipt" });
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
      
      // Auto-generate abbreviation if not provided
      if (!category.abbreviation || category.abbreviation.trim() === '') {
        category.abbreviation = generateAbbreviation(category.value, category.type);
      }
      
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
      
      // Handle parentCategory explicitly - empty string means no parent (null)
      if ('parentCategory' in updates) {
        if (updates.parentCategory === "" || !updates.parentCategory) {
          updates.parentCategory = null;
        }
      }
      
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

  // Media Files Routes (Local Storage Only)

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

  // Get upload URL for media file (local storage only)
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

      // Validate file type
      const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg'];
      if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
        return res.status(400).json({ message: "Invalid file type. Allowed: PNG, JPG, JPEG, GIF, SVG" });
      }

      // Generate unique filename for local storage
      const { randomUUID } = await import("crypto");
      const fileId = randomUUID();
      const localFileName = `${fileId}.${fileExtension}`;
      
      res.json({ 
        method: "PUT",
        url: `/api/media/local-upload/${localFileName}`,
        uploadURL: `/api/media/local-upload/${localFileName}`,
        localFileName,
        useObjectStorage: false 
      });
    } catch (error) {
      console.error("Failed to get upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // File upload endpoint
  app.put("/api/media/local-upload/:fileName", isAuthenticated, mediaUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileName = req.params.fileName;
      const filePath = path.join(uploadsDir, fileName);
      
      // Write file to disk
      fs.writeFileSync(filePath, req.file.buffer);
      
      res.json({ 
        message: "File uploaded successfully",
        fileName,
        localPath: `/uploads/${fileName}`
      });
    } catch (error) {
      console.error("Local file upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Serve uploaded files
  app.get("/uploads/:fileName", async (req, res) => {
    try {
      const fileName = req.params.fileName;
      const filePath = path.join(uploadsDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Set appropriate headers
      const ext = path.extname(fileName).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
      };
      
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error serving local file:", error);
      res.status(500).json({ error: "Error serving file" });
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
      
      // Local storage path only
      const objectPath = uploadURL; // Direct path like /uploads/filename.ext
      
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

  // Note: Media files are served via /uploads/:fileName endpoint above

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
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      // Disable caching for dynamic template data
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const templates = await storage.getLabelTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching label templates:", error);
      res.status(500).json({ message: "Failed to fetch label templates" });
    }
  });

  app.get("/api/label-templates/default", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      // Disable caching for dynamic template data
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const template = await storage.getDefaultLabelTemplate(userId);
      res.json(template || null);
    } catch (error) {
      console.error("Error fetching default label template:", error);
      res.status(500).json({ message: "Failed to fetch default label template" });
    }
  });

  app.post("/api/label-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      // Clean up the template data - convert empty string inventory IDs to null
      const templateData = { 
        ...req.body, 
        userId,
        selectedInventoryId: req.body.selectedInventoryId || null 
      };
      const template = await storage.createLabelTemplate(templateData);
      res.json(template);
    } catch (error) {
      console.error("Error creating label template:", error);
      res.status(500).json({ message: "Failed to create label template" });
    }
  });

  app.put("/api/label-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { id } = req.params;
      // Clean up the updates - convert empty string inventory IDs to null
      const updates = { 
        ...req.body,
        selectedInventoryId: req.body.selectedInventoryId || null 
      };
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
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
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
