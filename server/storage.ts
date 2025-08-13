import {
  salesAssociates,
  suppliers,
  inventoryItems,
  sales,
  type SalesAssociate,
  type InsertSalesAssociate,
  type Supplier,
  type InsertSupplier,
  type InventoryItem,
  type InsertInventoryItem,
  type InventoryItemWithSupplier,
  type Sale,
  type InsertSale,
  type SaleWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, lt, and } from "drizzle-orm";

export interface IStorage {
  // Sales Associates
  getSalesAssociates(): Promise<SalesAssociate[]>;
  getSalesAssociate(id: string): Promise<SalesAssociate | undefined>;
  createSalesAssociate(associate: InsertSalesAssociate): Promise<SalesAssociate>;
  
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  
  // Inventory Items
  getInventoryItems(): Promise<InventoryItemWithSupplier[]>;
  getInventoryItem(id: string): Promise<InventoryItemWithSupplier | undefined>;
  getInventoryItemBySku(sku: string): Promise<InventoryItemWithSupplier | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InventoryItem>): Promise<InventoryItem>;
  getLowStockItems(): Promise<InventoryItemWithSupplier[]>;
  
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

  async getInventoryItems(): Promise<InventoryItemWithSupplier[]> {
    return db
      .select()
      .from(inventoryItems)
      .leftJoin(suppliers, eq(inventoryItems.supplierId, suppliers.id))
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
    
    return newSale;
  }

  async getDashboardStats(): Promise<{
    totalRevenue: number;
    totalItems: number;
    salesToday: number;
    lowStockCount: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [revenueResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)` })
      .from(sales);
    
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
      totalItems: Number(itemsResult.total) || 0,
      salesToday: Number(salesTodayResult.count) || 0,
      lowStockCount: Number(lowStockResult.count) || 0,
    };
  }
}

export const storage = new DatabaseStorage();
