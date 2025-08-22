import {
  users,
  salesAssociates,
  suppliers,
  inventoryItems,
  inventoryTransactions,
  sales,
  categories,
  mediaFiles,
  labelTemplates,
  type User,
  type InsertUser,
  type SalesAssociate,
  type InsertSalesAssociate,
  type Supplier,
  type InsertSupplier,
  type InventoryItem,
  type InsertInventoryItem,
  type InventoryTransaction,
  type InsertInventoryTransaction,
  type InventoryItemWithSupplier,
  type Sale,
  type InsertSale,
  type SaleWithDetails,
  type Category,
  type InsertCategory,
  type MediaFile,
  type InsertMediaFile,
  type LabelTemplate,
  type InsertLabelTemplate,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, lt, and, like, or, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAssociateCode(associateCode: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  // Associates (users with associate role)
  getAssociates(): Promise<any[]>;
  // Sales Associates (legacy table)
  getSalesAssociates(): Promise<SalesAssociate[]>;
  getSalesAssociate(id: string): Promise<SalesAssociate | undefined>;
  createSalesAssociate(associate: InsertSalesAssociate): Promise<SalesAssociate>;
  
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: InsertSupplier): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<boolean>;
  
  // Inventory Items
  getInventoryItems(includeArchived?: boolean): Promise<InventoryItemWithSupplier[]>;
  getInventoryItem(id: string): Promise<InventoryItemWithSupplier | undefined>;
  getInventoryItemBySku(sku: string): Promise<InventoryItemWithSupplier | undefined>;
  searchInventoryItems(searchTerm: string, includeArchived?: boolean): Promise<InventoryItemWithSupplier[]>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InventoryItem>): Promise<InventoryItem>;
  archiveInventoryItem(id: string): Promise<InventoryItem>;
  restoreInventoryItem(id: string): Promise<InventoryItem>;
  addStockToItem(itemId: string, quantity: number, reason: string, notes: string, userId: string): Promise<InventoryItem>;
  getLowStockItems(): Promise<InventoryItemWithSupplier[]>;
  
  // Inventory Transactions
  getInventoryTransactions(itemId?: string): Promise<InventoryTransaction[]>;
  createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction>;
  
  // Sales
  getSales(): Promise<SaleWithDetails[]>;
  getSale(id: string): Promise<SaleWithDetails | undefined>;
  getSalesByOrderNumber(orderNumber: string): Promise<SaleWithDetails[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  
  // Dashboard Stats
  getDashboardStats(): Promise<{
    totalRevenue: number;
    totalItems: number;
    salesToday: number;
    lowStockCount: number;
  }>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategoriesByType(type: string): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<boolean>;
  reorderCategories(type: string, categoryIds: string[]): Promise<void>;

  // Media Files
  getMediaFiles(category?: string): Promise<MediaFile[]>;
  getMediaFile(id: string): Promise<MediaFile | undefined>;
  createMediaFile(mediaFile: InsertMediaFile): Promise<MediaFile>;
  deleteMediaFile(id: string): Promise<boolean>;
  
  // Label Templates
  getLabelTemplates(userId: string): Promise<LabelTemplate[]>;
  getLabelTemplate(id: string, userId: string): Promise<LabelTemplate | undefined>;
  getDefaultLabelTemplate(userId: string): Promise<LabelTemplate | undefined>;
  createLabelTemplate(templateData: InsertLabelTemplate): Promise<LabelTemplate>;
  updateLabelTemplate(id: string, userId: string, updates: Partial<LabelTemplate>): Promise<LabelTemplate | undefined>;
  deleteLabelTemplate(id: string, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByAssociateCode(associateCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.associateCode, associateCode));
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    if (!updatedUser) {
      throw new Error('User not found');
    }
    return updatedUser;
  }

  async getAssociates(): Promise<any[]> {
    const userList = await db.select().from(users).where(eq(users.role, 'associate'));
    return userList.map((user: User) => ({
      ...user,
      name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.lastName || 'Unknown Associate'
    }));
  }

  async getSalesAssociates(): Promise<SalesAssociate[]> {
    return db.select().from(salesAssociates).where(eq(salesAssociates.isActive, true));
  }

  async getSalesAssociate(id: string): Promise<SalesAssociate | undefined> {
    const [associate] = await db.select().from(salesAssociates).where(eq(salesAssociates.id, id));
    return associate || undefined;
  }

  async createSalesAssociate(associate: InsertSalesAssociate): Promise<SalesAssociate> {
    const [newAssociate] = await db
      .insert(salesAssociates)
      .values(associate)
      .returning();
    return newAssociate;
  }

  async getSuppliers(): Promise<Supplier[]> {
    return db.select().from(suppliers);
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db
      .insert(suppliers)
      .values(supplier)
      .returning();
    return newSupplier;
  }

  async updateSupplier(id: string, supplier: InsertSupplier): Promise<Supplier | undefined> {
    const [updatedSupplier] = await db
      .update(suppliers)
      .set(supplier)
      .where(eq(suppliers.id, id))
      .returning();
    return updatedSupplier || undefined;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    const result = await db
      .delete(suppliers)
      .where(eq(suppliers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getInventoryItems(includeArchived: boolean = false): Promise<InventoryItemWithSupplier[]> {
    const query = db
      .select()
      .from(inventoryItems)
      .leftJoin(suppliers, eq(inventoryItems.supplierId, suppliers.id))
      .orderBy(inventoryItems.sku);
    
    if (!includeArchived) {
      query.where(eq(inventoryItems.isActive, true));
    }
    
    return query.then(rows => 
      rows.map(row => ({
        ...row.inventory_items,
        supplier: row.suppliers
      }))
    );
  }

  async getInventoryItem(id: string): Promise<InventoryItemWithSupplier | undefined> {
    const [result] = await db
      .select()
      .from(inventoryItems)
      .leftJoin(suppliers, eq(inventoryItems.supplierId, suppliers.id))
      .where(eq(inventoryItems.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.inventory_items,
      supplier: result.suppliers
    };
  }

  async getInventoryItemBySku(sku: string): Promise<InventoryItemWithSupplier | undefined> {
    const [result] = await db
      .select()
      .from(inventoryItems)
      .leftJoin(suppliers, eq(inventoryItems.supplierId, suppliers.id))
      .where(eq(inventoryItems.sku, sku));
    
    if (!result) return undefined;
    
    return {
      ...result.inventory_items,
      supplier: result.suppliers
    };
  }

  async searchInventoryItems(searchTerm: string, includeArchived: boolean = false): Promise<InventoryItemWithSupplier[]> {
    const whereConditions = [
      or(
        ilike(inventoryItems.sku, `%${searchTerm}%`),
        ilike(inventoryItems.name, `%${searchTerm}%`),
        ilike(inventoryItems.description, `%${searchTerm}%`),
        ilike(inventoryItems.type, `%${searchTerm}%`),
        ilike(inventoryItems.color, `%${searchTerm}%`),
        ilike(inventoryItems.design, `%${searchTerm}%`),
        ilike(inventoryItems.groupType, `%${searchTerm}%`),
        ilike(inventoryItems.styleGroup, `%${searchTerm}%`)
      )
    ];

    if (!includeArchived) {
      whereConditions.push(eq(inventoryItems.isActive, true));
    }

    const results = await db
      .select()
      .from(inventoryItems)
      .leftJoin(suppliers, eq(inventoryItems.supplierId, suppliers.id))
      .where(and(...whereConditions))
      .orderBy(inventoryItems.sku)
      .limit(10);
    
    return results.map(result => ({
      ...result.inventory_items,
      supplier: result.suppliers
    }));
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db
      .insert(inventoryItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateInventoryItem(id: string, item: Partial<InventoryItem>): Promise<InventoryItem> {
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return updatedItem;
  }

  async archiveInventoryItem(id: string): Promise<InventoryItem> {
    const [archivedItem] = await db
      .update(inventoryItems)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return archivedItem;
  }

  async restoreInventoryItem(id: string): Promise<InventoryItem> {
    const [restoredItem] = await db
      .update(inventoryItems)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return restoredItem;
  }

  async getLowStockItems(): Promise<InventoryItemWithSupplier[]> {
    return db
      .select()
      .from(inventoryItems)
      .leftJoin(suppliers, eq(inventoryItems.supplierId, suppliers.id))
      .where(and(
        sql`${inventoryItems.quantity} <= ${inventoryItems.minStockLevel}`,
        eq(inventoryItems.isActive, true)
      ))
      .orderBy(inventoryItems.sku)
      .then(rows => 
        rows.map(row => ({
          ...row.inventory_items,
          supplier: row.suppliers
        }))
      );
  }

  async getSales(): Promise<SaleWithDetails[]> {
    return db
      .select()
      .from(sales)
      .innerJoin(inventoryItems, eq(sales.itemId, inventoryItems.id))
      .innerJoin(salesAssociates, eq(sales.salesAssociateId, salesAssociates.id))
      .orderBy(desc(sales.saleDate))
      .then(rows => 
        rows.map(row => ({
          ...row.sales,
          item: row.inventory_items,
          salesAssociate: row.sales_associates
        }))
      );
  }

  async getSalesByOrderNumber(orderNumber: string): Promise<SaleWithDetails[]> {
    return db
      .select()
      .from(sales)
      .innerJoin(inventoryItems, eq(sales.itemId, inventoryItems.id))
      .innerJoin(salesAssociates, eq(sales.salesAssociateId, salesAssociates.id))
      .where(eq(sales.orderNumber, orderNumber))
      .orderBy(sales.saleDate)
      .then(rows => 
        rows.map(row => ({
          ...row.sales,
          item: row.inventory_items,
          salesAssociate: row.sales_associates
        }))
      );
  }

  async getSale(id: string): Promise<SaleWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(sales)
      .innerJoin(inventoryItems, eq(sales.itemId, inventoryItems.id))
      .innerJoin(salesAssociates, eq(sales.salesAssociateId, salesAssociates.id))
      .where(eq(sales.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.sales,
      item: result.inventory_items,
      salesAssociate: result.sales_associates
    };
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const [newSale] = await db
      .insert(sales)
      .values(sale)
      .returning();
    
    // Update inventory quantity
    await db
      .update(inventoryItems)
      .set({ 
        quantity: sql`${inventoryItems.quantity} - ${sale.quantity}`,
        updatedAt: new Date()
      })
      .where(eq(inventoryItems.id, sale.itemId));
    
    // Record the transaction
    await this.createInventoryTransaction({
      itemId: sale.itemId,
      transactionType: "sale",
      quantity: -sale.quantity,
      reason: "sale",
      notes: `Sale ${sale.orderNumber}`,
      userId: sale.salesAssociateId,
    });
    
    return newSale;
  }

  async addStockToItem(itemId: string, quantity: number, reason: string, notes: string, userId: string): Promise<InventoryItem> {
    // Update inventory quantity
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({ 
        quantity: sql`${inventoryItems.quantity} + ${quantity}`,
        updatedAt: new Date()
      })
      .where(eq(inventoryItems.id, itemId))
      .returning();
    
    // Record the transaction
    await this.createInventoryTransaction({
      itemId,
      transactionType: "addition",
      quantity,
      reason,
      notes,
      userId,
    });
    
    return updatedItem;
  }

  async adjustInventory(itemId: string, quantity: number, reason: string, notes: string, userId: string): Promise<InventoryItem> {
    // Update inventory quantity (subtract the adjustment)
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({ 
        quantity: sql`${inventoryItems.quantity} - ${quantity}`,
        updatedAt: new Date()
      })
      .where(eq(inventoryItems.id, itemId))
      .returning();
    
    // Record the transaction (negative quantity for deduction)
    await this.createInventoryTransaction({
      itemId,
      transactionType: "adjustment",
      quantity: -quantity,
      reason,
      notes,
      userId,
    });
    
    return updatedItem;
  }

  async getInventoryTransactions(itemId?: string): Promise<InventoryTransaction[]> {
    const query = db.select().from(inventoryTransactions);
    
    if (itemId) {
      return query.where(eq(inventoryTransactions.itemId, itemId)).orderBy(desc(inventoryTransactions.createdAt));
    }
    
    return query.orderBy(desc(inventoryTransactions.createdAt));
  }

  async createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction> {
    const [newTransaction] = await db
      .insert(inventoryTransactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async getDashboardStats(): Promise<{
    totalRevenue: number;
    totalProfit: number;
    totalItems: number;
    salesToday: number;
    lowStockCount: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISOString = today.toISOString();
      
      // Calculate total revenue (convert string to number)
      const [revenueResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(CAST(${sales.totalAmount} AS NUMERIC)), 0)::text` })
        .from(sales);
      
      // Calculate total profit by joining sales with inventory items to get cost data
      const [profitResult] = await db
        .select({ 
          totalProfit: sql<string>`COALESCE(SUM(CAST(${sales.totalAmount} AS NUMERIC) - (${sales.quantity} * COALESCE(CAST(${inventoryItems.cost} AS NUMERIC), 0))), 0)::text` 
        })
        .from(sales)
        .leftJoin(inventoryItems, eq(sales.itemId, inventoryItems.id));
      
      const [itemsResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${inventoryItems.quantity}), 0)` })
        .from(inventoryItems);
      
      const [salesTodayResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(sales)
        .where(sql`${sales.saleDate} >= ${todayISOString}`);
      
      const [lowStockResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(inventoryItems)
        .where(sql`${inventoryItems.quantity} <= ${inventoryItems.minStockLevel}`);
      
      return {
        totalRevenue: Number(revenueResult.total) || 0,
        totalProfit: Number(profitResult.totalProfit) || 0,
        totalItems: Number(itemsResult.total) || 0,
        salesToday: Number(salesTodayResult.count) || 0,
        lowStockCount: Number(lowStockResult.count) || 0,
      };
    } catch (error) {
      console.error('Dashboard stats calculation error:', error);
      
      // Return safe defaults if calculation fails
      return {
        totalRevenue: 0,
        totalProfit: 0,
        totalItems: 0,
        salesToday: 0,
        lowStockCount: 0,
      };
    }
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.type, categories.displayOrder, categories.value);
  }

  async getCategoriesByType(type: string): Promise<Category[]> {
    return db.select().from(categories).where(and(eq(categories.type, type), eq(categories.isActive, true))).orderBy(categories.displayOrder, categories.value);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    // Get the highest display order for this category type
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`max(${categories.displayOrder})` })
      .from(categories)
      .where(and(eq(categories.type, category.type), eq(categories.isActive, true)));
    
    const nextDisplayOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
    
    const [newCategory] = await db
      .insert(categories)
      .values({
        ...category,
        displayOrder: nextDisplayOrder
      })
      .returning();
    return newCategory;
  }

  async updateCategory(id: string, categoryUpdate: Partial<Category>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set({ ...categoryUpdate, updatedAt: sql`NOW()` })
      .where(eq(categories.id, id))
      .returning();
    if (!updatedCategory) {
      throw new Error('Category not found');
    }
    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<boolean> {
    // Get the category being deleted to know its type
    const [categoryToDelete] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    
    if (!categoryToDelete) {
      return false;
    }
    
    // Mark the category as inactive
    const result = await db
      .update(categories)
      .set({ isActive: false, updatedAt: sql`NOW()` })
      .where(eq(categories.id, id));
    
    if (result.rowCount !== null && result.rowCount > 0) {
      // Reorder remaining categories to fill the gap
      const remainingCategories = await db
        .select()
        .from(categories)
        .where(and(eq(categories.type, categoryToDelete.type), eq(categories.isActive, true)))
        .orderBy(categories.displayOrder);
      
      // Update display orders to be sequential
      for (let i = 0; i < remainingCategories.length; i++) {
        await db
          .update(categories)
          .set({ displayOrder: i, updatedAt: sql`NOW()` })
          .where(eq(categories.id, remainingCategories[i].id));
      }
      
      return true;
    }
    
    return false;
  }

  async reorderCategories(type: string, categoryIds: string[]): Promise<void> {
    // Update display order for each category
    for (let i = 0; i < categoryIds.length; i++) {
      await db
        .update(categories)
        .set({ displayOrder: i, updatedAt: sql`NOW()` })
        .where(and(eq(categories.id, categoryIds[i]), eq(categories.type, type)));
    }
  }

  // Media Files
  async getMediaFiles(category?: string): Promise<MediaFile[]> {
    let query = db.select().from(mediaFiles).where(eq(mediaFiles.isActive, true));
    
    if (category) {
      query = query.where(eq(mediaFiles.category, category));
    }
    
    return await query.orderBy(desc(mediaFiles.createdAt));
  }

  async getMediaFile(id: string): Promise<MediaFile | undefined> {
    const [mediaFile] = await db
      .select()
      .from(mediaFiles)
      .where(and(eq(mediaFiles.id, id), eq(mediaFiles.isActive, true)));
    return mediaFile || undefined;
  }

  async createMediaFile(mediaFileData: InsertMediaFile): Promise<MediaFile> {
    const [mediaFile] = await db
      .insert(mediaFiles)
      .values(mediaFileData)
      .returning();
    return mediaFile;
  }

  async deleteMediaFile(id: string): Promise<boolean> {
    // Get the media file details first to delete from cloud storage
    const [mediaFile] = await db
      .select()
      .from(mediaFiles)
      .where(and(eq(mediaFiles.id, id), eq(mediaFiles.isActive, true)));
    
    if (!mediaFile) {
      return false;
    }

    // Delete from cloud storage
    try {
      if (mediaFile.objectPath) {
        const { ObjectStorageService } = await import("./objectStorage");
        const objectStorageService = new ObjectStorageService();
        const file = await objectStorageService.getMediaFile(mediaFile.objectPath);
        await file.delete();
      }
    } catch (error) {
      console.warn("Failed to delete file from cloud storage:", error);
      // Continue with database deletion even if cloud storage deletion fails
    }

    // Hard delete from database
    const result = await db
      .delete(mediaFiles)
      .where(eq(mediaFiles.id, id));
    
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Label Templates
  async getLabelTemplates(userId: string): Promise<LabelTemplate[]> {
    const templates = await db
      .select()
      .from(labelTemplates)
      .where(eq(labelTemplates.userId, userId))
      .orderBy(desc(labelTemplates.isDefault), desc(labelTemplates.updatedAt));
    return templates;
  }

  async getLabelTemplate(id: string, userId: string): Promise<LabelTemplate | undefined> {
    const [template] = await db
      .select()
      .from(labelTemplates)
      .where(and(eq(labelTemplates.id, id), eq(labelTemplates.userId, userId)));
    return template || undefined;
  }

  async getDefaultLabelTemplate(userId: string): Promise<LabelTemplate | undefined> {
    const [template] = await db
      .select()
      .from(labelTemplates)
      .where(and(eq(labelTemplates.userId, userId), eq(labelTemplates.isDefault, true)));
    return template || undefined;
  }

  async createLabelTemplate(templateData: InsertLabelTemplate): Promise<LabelTemplate> {
    const [template] = await db
      .insert(labelTemplates)
      .values(templateData)
      .returning();
    return template;
  }

  async updateLabelTemplate(id: string, userId: string, updates: Partial<LabelTemplate>): Promise<LabelTemplate | undefined> {
    const [updatedTemplate] = await db
      .update(labelTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(labelTemplates.id, id), eq(labelTemplates.userId, userId)))
      .returning();
    return updatedTemplate || undefined;
  }

  async deleteLabelTemplate(id: string, userId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(labelTemplates)
        .where(and(eq(labelTemplates.id, id), eq(labelTemplates.userId, userId)));
      return true;
    } catch (error) {
      console.error('Error deleting label template:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();
