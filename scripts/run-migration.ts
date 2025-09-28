#!/usr/bin/env tsx

/**
 * Simple script runner for the category abbreviation backfill
 * 
 * Usage in production:
 *   npx tsx scripts/run-migration.ts
 * 
 * Or if you have tsx installed globally:
 *   tsx scripts/run-migration.ts
 */

import { backfillCategoryAbbreviations } from './backfill-category-abbreviations';

console.log("🚀 Running category abbreviation backfill migration...");
console.log("⚠️  This script will populate missing abbreviations for existing categories");
console.log("✅ This is safe to run and will not affect existing inventory or SKUs\n");

backfillCategoryAbbreviations()
  .then(() => {
    console.log("\n🎉 Migration completed successfully!");
    console.log("✅ All categories now have abbreviations");
    console.log("✅ Future category creation will auto-generate abbreviations");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration failed:", error);
    console.error("🔧 Please check your database connection and try again");
    process.exit(1);
  });