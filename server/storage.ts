import {
  users,
  salesAssociates,
  suppliers,
  inventoryItems,
  inventoryTransactions,
  sales,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, lt, and, like, or, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAssociateCode(associateCode: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
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
  getInventoryItems(): Promise<InventoryItemWithSupplier[]>;
  getInventoryItem(id: string): Promise<InventoryItemWithSupplier | undefined>;
  getInventoryItemBySku(sku: string): Promise<InventoryItemWithSupplier | undefined>;
  searchInventoryItems(searchTerm: string): Promise<InventoryItemWithSupplier[]>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InventoryItem>): Promise<InventoryItem>;
  addStockToItem(itemId: string, quantity: number, reason: string, notes: string, userId: string): Promise<InventoryItem>;
  getLowStockItems(): Promise<InventoryItemWithSupplier[]>;
  
  // Inventory Transactions
  getInventoryTransactions(itemId?: string): Promise<InventoryTransaction[]>;
  createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction>;
  
  // Sales
  getSales(): Promise<SaleWithDetails[]>;
  getSale(id: string): Promise<SaleWithDetails | undefined>;
  createSale(sale: InsertSale): Promise<Sale>;
  
  // Dashboard Stats
  getDashboardStats(): Promise<{
    totalRevenue: number;
    totalItems: number;
    salesToday: number;
    lowStockCount: number;
  }>;
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

  async getInventoryItems(): Promise<InventoryItemWithSupplier[]> {
    return db
      .select()
      .from(inventoryItems)
      .leftJoin(suppliers, eq(inventoryItems.supplierId, suppliers.id))
      .orderBy(inventoryItems.sku)
      .then(rows => 
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

  async searchInventoryItems(searchTerm: string): Promise<InventoryItemWithSupplier[]> {
    const results = await db
      .select()
      .from(inventoryItems)
      .leftJoin(suppliers, eq(inventoryItems.supplierId, suppliers.id))
      .where(
        or(
          ilike(inventoryItems.sku, `%${searchTerm}%`),
          ilike(inventoryItems.name, `%${searchTerm}%`),
          ilike(inventoryItems.description, `%${searchTerm}%`)
        )
      )
      .orderBy(inventoryItems.sku)
      .limit(10); // Limit results to avoid overwhelming the UI
    
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

  async getLowStockItems(): Promise<InventoryItemWithSupplier[]> {
    return db
      .select()
      .from(inventoryItems)
      .leftJoin(suppliers, eq(inventoryItems.supplierId, suppliers.id))
      .where(sql`${inventoryItems.quantity} <= ${inventoryItems.minStockLevel}`)
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
        .where(sql`${sales.saleDate} >= ${today}`);
      
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
}

export const storage = new DatabaseStorage();
