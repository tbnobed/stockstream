import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, uuid, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User authentication table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  associateCode: varchar("associate_code").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"), // Optional email
  role: varchar("role").default("associate"), // "admin" or "associate"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const salesAssociates = pgTable("sales_associates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").unique(),
  userId: uuid("user_id").references(() => users.id), // Link to authenticated user
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contactInfo: text("contact_info"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // "type", "color", "size", "design", "groupType", "styleGroup"
  value: varchar("value").notNull(),
  displayOrder: integer("display_order").default(0), // For custom ordering
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // e.g., "shirt", "pants", "shoes"
  size: text("size"), // e.g., "S", "M", "L", "XL", "9", "10"
  color: text("color"), // e.g., "red", "blue", "black"
  design: text("design"), // e.g., "Lipstick", "Cancer", "Event-Specific"
  groupType: text("group_type"), // e.g., "Supporter", "Ladies", "Member-Only"
  styleGroup: text("style_group"), // e.g., "T-Shirt", "V-Neck", "Tank Top"
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Selling price
  cost: decimal("cost", { precision: 10, scale: 2 }), // Landed cost (what you paid)
  quantity: integer("quantity").notNull().default(0),
  minStockLevel: integer("min_stock_level").default(10),
  supplierId: uuid("supplier_id").references(() => suppliers.id),
  isActive: boolean("is_active").default(true), // For archiving items
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: uuid("item_id").notNull().references(() => inventoryItems.id),
  transactionType: text("transaction_type").notNull(), // "addition", "sale", "adjustment"
  quantity: integer("quantity").notNull(), // positive for additions, negative for sales
  reason: text("reason"), // e.g., "restock", "sale", "damaged", "lost"
  notes: text("notes"),
  userId: uuid("user_id").references(() => users.id), // Who performed the transaction
  createdAt: timestamp("created_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number", { length: 20 }).notNull(),
  itemId: uuid("item_id").notNull().references(() => inventoryItems.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // "cash" or "venmo"
  salesAssociateId: uuid("sales_associate_id").notNull().references(() => salesAssociates.id),
  saleDate: timestamp("sale_date").defaultNow(),
});

export const mediaFiles = pgTable("media_files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(), // "image/png", "image/jpeg", etc.
  fileSize: integer("file_size").notNull(), // in bytes
  objectPath: text("object_path").notNull(), // path in object storage
  category: text("category").default("logo"), // "logo", "image", etc.
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const salesAssociatesRelations = relations(salesAssociates, ({ many }) => ({
  sales: many(sales),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  inventoryItems: many(inventoryItems),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [inventoryItems.supplierId],
    references: [suppliers.id],
  }),
  sales: many(sales),
  transactions: many(inventoryTransactions),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [inventoryTransactions.itemId],
    references: [inventoryItems.id],
  }),
  user: one(users, {
    fields: [inventoryTransactions.userId],
    references: [users.id],
  }),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [sales.itemId],
    references: [inventoryItems.id],
  }),
  salesAssociate: one(salesAssociates, {
    fields: [sales.salesAssociateId],
    references: [salesAssociates.id],
  }),
}));

export const mediaFilesRelations = relations(mediaFiles, ({ one }) => ({
  uploadedBy: one(users, {
    fields: [mediaFiles.uploadedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertSalesAssociateSchema = createInsertSchema(salesAssociates).omit({
  id: true,
  createdAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  saleDate: true,
});

export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMediaFileSchema = createInsertSchema(mediaFiles).omit({
  id: true,
  createdAt: true,
});

// User insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  associateCode: z.string().min(4),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type SalesAssociate = typeof salesAssociates.$inferSelect;
export type InsertSalesAssociate = z.infer<typeof insertSalesAssociateSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type MediaFile = typeof mediaFiles.$inferSelect;
export type InsertMediaFile = z.infer<typeof insertMediaFileSchema>;

// Extended types with relations
export type InventoryItemWithSupplier = InventoryItem & {
  supplier: Supplier | null;
};

export type SaleWithDetails = Sale & {
  item: InventoryItem;
  salesAssociate: SalesAssociate;
};

export type MediaFileWithUploader = MediaFile & {
  uploadedBy: User | null;
};
