import { db } from "../server/db";
import { categories } from "../shared/schema";
import { eq, isNull, or } from "drizzle-orm";
import { generateAbbreviation } from "../shared/categories";

/**
 * Migration script to backfill missing abbreviations for existing categories
 * This script can be safely run in production to populate abbreviations
 * without affecting existing inventory items or SKUs.
 */

async function backfillCategoryAbbreviations() {
  console.log("🔄 Starting category abbreviation backfill...");

  try {
    // Find all categories that are missing abbreviations
    const categoriesWithoutAbbrev = await db
      .select()
      .from(categories)
      .where(
        or(
          isNull(categories.abbreviation),
          eq(categories.abbreviation, "")
        )
      );

    console.log(`📊 Found ${categoriesWithoutAbbrev.length} categories missing abbreviations`);

    if (categoriesWithoutAbbrev.length === 0) {
      console.log("✅ All categories already have abbreviations!");
      return;
    }

    // Process each category
    let updatedCount = 0;
    const abbreviationMap = new Map<string, string[]>(); // Track abbreviations by type to avoid duplicates

    for (const category of categoriesWithoutAbbrev) {
      try {
        // Generate abbreviation
        const abbreviation = generateAbbreviation(category.value, category.type);
        
        // Track abbreviations for this type to ensure uniqueness
        const typeKey = `${category.type}:${category.parentCategory || ''}`;
        if (!abbreviationMap.has(typeKey)) {
          abbreviationMap.set(typeKey, []);
        }
        
        const existingAbbrevs = abbreviationMap.get(typeKey)!;
        let finalAbbreviation = abbreviation;
        let counter = 1;
        
        // Ensure uniqueness within type/parent combination
        while (existingAbbrevs.includes(finalAbbreviation)) {
          finalAbbreviation = `${abbreviation}${counter}`;
          counter++;
        }
        
        existingAbbrevs.push(finalAbbreviation);

        // Update the category
        await db
          .update(categories)
          .set({ 
            abbreviation: finalAbbreviation,
            updatedAt: new Date()
          })
          .where(eq(categories.id, category.id));

        console.log(`✅ Updated ${category.type}:"${category.value}" → "${finalAbbreviation}"`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Failed to update category ${category.id} (${category.value}):`, error);
      }
    }

    console.log(`🎉 Successfully updated ${updatedCount} categories with abbreviations`);
    
    // Show summary
    console.log("\n📋 Summary of updates:");
    const updatedCategories = await db
      .select()
      .from(categories);
    
    const byType = updatedCategories.reduce((acc, cat) => {
      if (cat.abbreviation) {
        if (!acc[cat.type]) acc[cat.type] = [];
        acc[cat.type].push(`${cat.value} → ${cat.abbreviation}`);
      }
      return acc;
    }, {} as Record<string, string[]>);

    Object.entries(byType).forEach(([type, items]) => {
      console.log(`\n${type.toUpperCase()}:`);
      items.forEach((item: string) => console.log(`  • ${item}`));
    });

  } catch (error) {
    console.error("💥 Error during abbreviation backfill:", error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  backfillCategoryAbbreviations()
    .then(() => {
      console.log("\n✅ Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Migration failed:", error);
      process.exit(1);
    });
}

export { backfillCategoryAbbreviations };