#!/usr/bin/env node

// Database seeding script optimized for Docker deployment
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users, salesAssociates } from '../shared/schema.js';

async function seedDatabase() {
  console.log('🌱 Seeding database with initial data...');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  // Use postgres-js for direct connection (works better in Docker)
  const sql = postgres(process.env.DATABASE_URL);
  const db = drizzle(sql);

  try {
    // Check if admin already exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists, skipping seed');
      return;
    }

    // Create admin user
    console.log('👤 Creating admin user...');
    const [adminUser] = await db.insert(users).values({
      username: 'admin',
      associateCode: 'ADMIN1',
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@inventorypro.com',
      role: 'admin',
      isActive: true,
    }).returning();

    // Create corresponding sales associate entry
    console.log('👥 Creating admin sales associate...');
    await db.insert(salesAssociates).values({
      id: adminUser.id,
      name: 'System Administrator',
      email: 'admin@inventorypro.com',
      userId: adminUser.id,
      isActive: true,
    });

    console.log('✅ Database seeded successfully!');
    console.log('📋 Default admin credentials:');
    console.log('   Username: admin');
    console.log('   Password: ADMIN1');
    console.log('   Role: admin');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run seeding
await seedDatabase();