// Database seeding script for initial production data
import { db } from '../server/db.js';
import { users, sessions, salesAssociates, suppliers, inventoryItems, sales } from '../shared/schema.js';

async function seedDatabase() {
  console.log('🌱 Seeding database with initial data...');

  try {
    // Create admin user (for authentication setup)
    console.log('👤 Creating admin user...');
    const adminUser = await db.insert(users).values({
      id: 'admin-user-id',
      email: 'admin@inventorypro.com',
      firstName: 'System',
      lastName: 'Administrator',
    }).returning();

    // Create default sales associate
    console.log('👥 Creating default sales associate...');
    const defaultAssociate = await db.insert(salesAssociates).values({
      name: 'System Administrator',
      code: 'ADMIN1',
      isAdmin: true,
      isActive: true,
    }).returning();

    console.log('✅ Database seeded successfully!');
    console.log('📋 Default credentials:');
    console.log('   Admin Code: ADMIN1');
    console.log('   ⚠️  Please create additional associates through the admin interface');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await seedDatabase();
  process.exit(0);
}

export { seedDatabase };