import { db } from "../server/db";
import { categories } from "@shared/schema";
import { eq } from "drizzle-orm";

// Client-specified category data with abbreviations for SKU generation
const CATEGORY_DATA = {
  // Category (was "type") - Main product categories
  category: [
    { value: "Hat", abbreviation: "H", parentCategory: null },
    { value: "Coin", abbreviation: "C", parentCategory: null },
    { value: "Shirt", abbreviation: "SH", parentCategory: null },
    { value: "Pants", abbreviation: "P", parentCategory: null },
    { value: "Jacket", abbreviation: "J", parentCategory: null },
    { value: "Shoes", abbreviation: "SH", parentCategory: null },
    { value: "Bag", abbreviation: "B", parentCategory: null },
    { value: "Accessory", abbreviation: "A", parentCategory: null },
    { value: "Other", abbreviation: "O", parentCategory: null }
  ],

  // Design - Specific designs/patterns
  design: [
    { value: "Arizona", abbreviation: "AZ", parentCategory: null },
    { value: "Lipstick", abbreviation: "LP", parentCategory: null },
    { value: "Cancer", abbreviation: "CA", parentCategory: null },
    { value: "Event-Specific", abbreviation: "ES", parentCategory: null },
    { value: "Holiday", abbreviation: "HL", parentCategory: null },
    { value: "Seasonal", abbreviation: "SE", parentCategory: null },
    { value: "Logo", abbreviation: "LO", parentCategory: null },
    { value: "Plain", abbreviation: "PL", parentCategory: null },
    { value: "Graphic", abbreviation: "GR", parentCategory: null },
    { value: "Text", abbreviation: "TX", parentCategory: null },
    { value: "Pattern", abbreviation: "PT", parentCategory: null },
    { value: "Floral", abbreviation: "FL", parentCategory: null },
    { value: "Stripe", abbreviation: "ST", parentCategory: null },
    { value: "Solid", abbreviation: "SO", parentCategory: null }
  ],

  // Group (was "groupType") - Target audience groups
  group: [
    { value: "Supporter", abbreviation: "S", parentCategory: null },
    { value: "Ladies", abbreviation: "L", parentCategory: null },
    { value: "Member", abbreviation: "M", parentCategory: null }, // Shortened from "Member-Only"
    { value: "Kids", abbreviation: "K", parentCategory: null },
    { value: "Youth", abbreviation: "Y", parentCategory: null },
    { value: "Adult", abbreviation: "A", parentCategory: null },
    { value: "Senior", abbreviation: "SR", parentCategory: null },
    { value: "VIP", abbreviation: "V", parentCategory: null },
    { value: "Staff", abbreviation: "ST", parentCategory: null },
    { value: "Volunteer", abbreviation: "VO", parentCategory: null },
    { value: "General", abbreviation: "G", parentCategory: null }
  ],

  // Style (was "styleGroup") - Specific style variants 
  // Note: These depend on category selection (hierarchical)
  style: [
    // Hat styles
    { value: "Flex Fit", abbreviation: "FF", parentCategory: "Hat" },
    { value: "Snap Back", abbreviation: "SB", parentCategory: "Hat" },
    { value: "Trucker", abbreviation: "TR", parentCategory: "Hat" },
    { value: "Beanie", abbreviation: "BE", parentCategory: "Hat" },
    { value: "Cap", abbreviation: "CP", parentCategory: "Hat" },

    // Shirt styles
    { value: "T-Shirt", abbreviation: "TS", parentCategory: "Shirt" },
    { value: "V-Neck", abbreviation: "VN", parentCategory: "Shirt" },
    { value: "Tank Top", abbreviation: "TT", parentCategory: "Shirt" },
    { value: "Long Sleeve", abbreviation: "LS", parentCategory: "Shirt" },
    { value: "Polo", abbreviation: "PO", parentCategory: "Shirt" },
    { value: "Button-Up", abbreviation: "BU", parentCategory: "Shirt" },

    // Pants styles
    { value: "Jeans", abbreviation: "JE", parentCategory: "Pants" },
    { value: "Shorts", abbreviation: "SH", parentCategory: "Pants" },

    // Jacket styles
    { value: "Hoodie", abbreviation: "HO", parentCategory: "Jacket" },
    { value: "Sweatshirt", abbreviation: "SW", parentCategory: "Jacket" },

    // Shoe styles
    { value: "Sneakers", abbreviation: "SN", parentCategory: "Shoes" },
    { value: "Boots", abbreviation: "BO", parentCategory: "Shoes" },
    { value: "Sandals", abbreviation: "SA", parentCategory: "Shoes" },

    // Generic styles for other categories
    { value: "Other", abbreviation: "OT", parentCategory: null }
  ],

  // Color - Standard colors
  color: [
    { value: "Black", abbreviation: "BK", parentCategory: null },
    { value: "White", abbreviation: "WH", parentCategory: null },
    { value: "Red", abbreviation: "RD", parentCategory: null },
    { value: "Blue", abbreviation: "BL", parentCategory: null },
    { value: "Green", abbreviation: "GR", parentCategory: null },
    { value: "Yellow", abbreviation: "YL", parentCategory: null },
    { value: "Orange", abbreviation: "OR", parentCategory: null },
    { value: "Purple", abbreviation: "PU", parentCategory: null },
    { value: "Pink", abbreviation: "PK", parentCategory: null },
    { value: "Gray", abbreviation: "GY", parentCategory: null },
    { value: "Brown", abbreviation: "BR", parentCategory: null },
    { value: "Navy", abbreviation: "NV", parentCategory: null },
    { value: "Maroon", abbreviation: "MR", parentCategory: null },
    { value: "Teal", abbreviation: "TL", parentCategory: null },
    { value: "Multi-Color", abbreviation: "MC", parentCategory: null }
  ],

  // Size - Standard sizes
  // Note: These depend on category selection (hierarchical)  
  size: [
    // Clothing sizes
    { value: "XS", abbreviation: "XS", parentCategory: "Shirt" },
    { value: "S", abbreviation: "S", parentCategory: "Shirt" },
    { value: "M", abbreviation: "M", parentCategory: "Shirt" },
    { value: "L", abbreviation: "L", parentCategory: "Shirt" },
    { value: "XL", abbreviation: "XL", parentCategory: "Shirt" },
    { value: "XXL", abbreviation: "XXL", parentCategory: "Shirt" },
    { value: "XXXL", abbreviation: "XXXL", parentCategory: "Shirt" },

    // Hat sizes (often combined)
    { value: "S/M", abbreviation: "S/M", parentCategory: "Hat" },
    { value: "L/XL", abbreviation: "L/XL", parentCategory: "Hat" },
    { value: "OSFA", abbreviation: "OSFA", parentCategory: "Hat" }, // One Size Fits All

    // Shoe sizes
    { value: "6", abbreviation: "6", parentCategory: "Shoes" },
    { value: "7", abbreviation: "7", parentCategory: "Shoes" },
    { value: "8", abbreviation: "8", parentCategory: "Shoes" },
    { value: "9", abbreviation: "9", parentCategory: "Shoes" },
    { value: "10", abbreviation: "10", parentCategory: "Shoes" },
    { value: "11", abbreviation: "11", parentCategory: "Shoes" },
    { value: "12", abbreviation: "12", parentCategory: "Shoes" },
    { value: "13", abbreviation: "13", parentCategory: "Shoes" },
    { value: "14", abbreviation: "14", parentCategory: "Shoes" },

    // Generic sizes
    { value: "One Size", abbreviation: "OS", parentCategory: null },
    { value: "N/A", abbreviation: "N/A", parentCategory: null }
  ]
};

async function populateCategoryAbbreviations() {
  console.log("Populating category abbreviations...");

  try {
    // Clear existing categories
    await db.delete(categories);
    console.log("Cleared existing categories");

    // Insert new categories with abbreviations
    const categoriesToInsert = [];
    
    for (const [categoryType, items] of Object.entries(CATEGORY_DATA)) {
      items.forEach((item, index) => {
        categoriesToInsert.push({
          type: categoryType,
          value: item.value,
          abbreviation: item.abbreviation,
          parentCategory: item.parentCategory,
          displayOrder: index,
          isActive: true,
        });
      });
    }

    // Insert all categories
    await db.insert(categories).values(categoriesToInsert);
    
    console.log(`Successfully populated ${categoriesToInsert.length} categories with abbreviations!`);
    
    // Display summary
    Object.entries(CATEGORY_DATA).forEach(([type, items]) => {
      console.log(`- ${items.length} ${type} categories`);
    });
    
    // Show some examples of the data
    console.log("\nExample categories:");
    console.log("Category: Hat (H) -> Style: Flex Fit (FF) -> Size: S/M (S/M)");
    console.log("Color: Black (BK) -> Design: Arizona (AZ) -> Group: Supporter (S)");
    console.log("SKU Example: H-AZ-S-FF-BK-S/M");
    
  } catch (error) {
    console.error("Error populating category abbreviations:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  populateCategoryAbbreviations()
    .then(() => {
      console.log("Category abbreviation population complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Category abbreviation population failed:", error);
      process.exit(1);
    });
}

export { populateCategoryAbbreviations };