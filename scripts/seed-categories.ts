import { db } from "../server/db";
import { categories } from "@shared/schema";
import { ITEM_TYPES, ITEM_COLORS, ITEM_SIZES, ITEM_DESIGNS, GROUP_TYPES, STYLE_GROUPS } from "@shared/categories";

async function seedCategories() {
  console.log("Seeding categories...");

  try {
    // Clear existing categories
    await db.delete(categories);

    const categoriesToInsert = [
      // Types
      ...ITEM_TYPES.map((type, index) => ({
        type: "type",
        value: type,
        displayOrder: index,
        isActive: true,
      })),

      // Colors
      ...ITEM_COLORS.map((color, index) => ({
        type: "color",
        value: color,
        displayOrder: index,
        isActive: true,
      })),
      
      // Sizes
      ...ITEM_SIZES.map((size, index) => ({
        type: "size", 
        value: size,
        displayOrder: index,
        isActive: true,
      })),
      
      // Designs
      ...ITEM_DESIGNS.map((design, index) => ({
        type: "design",
        value: design,
        displayOrder: index,
        isActive: true,
      })),
      
      // Group Types
      ...GROUP_TYPES.map((groupType, index) => ({
        type: "groupType",
        value: groupType,
        displayOrder: index,
        isActive: true,
      })),
      
      // Style Groups
      ...STYLE_GROUPS.map((styleGroup, index) => ({
        type: "styleGroup",
        value: styleGroup,
        displayOrder: index,
        isActive: true,
      })),
    ];

    // Insert all categories
    await db.insert(categories).values(categoriesToInsert);
    
    console.log(`Seeded ${categoriesToInsert.length} categories successfully!`);
    
    // Display summary
    const typeCount = ITEM_TYPES.length;
    const colorCount = ITEM_COLORS.length;
    const sizeCount = ITEM_SIZES.length;
    const designCount = ITEM_DESIGNS.length;
    const groupTypeCount = GROUP_TYPES.length;
    const styleGroupCount = STYLE_GROUPS.length;
    
    console.log(`- ${typeCount} types`);
    console.log(`- ${colorCount} colors`);
    console.log(`- ${sizeCount} sizes`);
    console.log(`- ${designCount} designs`);
    console.log(`- ${groupTypeCount} group types`);
    console.log(`- ${styleGroupCount} style groups`);
    
  } catch (error) {
    console.error("Error seeding categories:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCategories()
    .then(() => {
      console.log("Category seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Category seeding failed:", error);
      process.exit(1);
    });
}

export { seedCategories };