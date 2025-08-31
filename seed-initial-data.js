#!/usr/bin/env node

// InventoryPro Initial Data Seeding Script
// Creates default admin user and essential data for fresh deployments

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

// Import schema
const schema = require('./dist/shared/schema.js');

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

const connection = postgres(process.env.DATABASE_URL);
const db = drizzle({ client: connection, schema });

async function seedInitialData() {
  try {
    console.log("🌱 Starting initial data seeding...");

    // 1. Create default admin user
    console.log("👤 Creating default admin user...");
    
    const adminUser = {
      username: 'admin',
      associateCode: 'ADMIN1',
      firstName: 'System',
      lastName: 'Administrator', 
      email: 'admin@inventorypro.com',
      role: 'admin',
      isActive: true,
    };

    const [createdUser] = await db
      .insert(schema.users)
      .values(adminUser)
      .onConflictDoNothing()
      .returning();

    if (createdUser) {
      console.log("✅ Default admin user created successfully");
      console.log(`   Username: ${adminUser.username}`);
      console.log(`   Associate Code: ${adminUser.associateCode}`);
    } else {
      console.log("ℹ️  Admin user already exists");
    }

    // 2. Create sales associate for the admin user
    console.log("🏪 Creating sales associate record...");
    
    // Get the admin user ID (whether newly created or existing)
    const [adminUserRecord] = await db
      .select()
      .from(schema.users)
      .where(schema.eq(schema.users.username, 'admin'));

    if (adminUserRecord) {
      const salesAssociate = {
        id: adminUserRecord.id,
        name: `${adminUserRecord.firstName} ${adminUserRecord.lastName}`,
        email: adminUserRecord.email,
        userId: adminUserRecord.id,
        isActive: true,
      };

      await db
        .insert(schema.salesAssociates)
        .values(salesAssociate)
        .onConflictDoNothing();

      console.log("✅ Sales associate record created");
    }

    // 3. Create sample supplier
    console.log("🚚 Creating sample supplier...");
    
    const supplier = {
      name: 'Default Supplier',
      contactInfo: 'supplier@example.com',
    };

    await db
      .insert(schema.suppliers)
      .values(supplier)
      .onConflictDoNothing();

    console.log("✅ Sample supplier created");

    console.log("");
    console.log("🎉 Initial data seeding completed successfully!");
    console.log("");
    console.log("📋 LOGIN CREDENTIALS:");
    console.log("   Associate Code: ADMIN1");
    console.log("   Role: Administrator");
    console.log("");
    console.log("🔗 You can now log in to your application!");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run the seeding
seedInitialData();