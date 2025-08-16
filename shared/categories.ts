// Master category lists for inventory dropdowns
// These lists define all available options for each category field

export const ITEM_TYPES = [
  "Shirt",
  "Pants", 
  "Shoes",
  "Hat",
  "Jacket",
  "Accessory",
  "Bag",
  "Other"
] as const;

export const ITEM_COLORS = [
  "Red",
  "Blue", 
  "Black",
  "White",
  "Green",
  "Yellow",
  "Orange",
  "Purple",
  "Pink",
  "Gray",
  "Brown",
  "Navy",
  "Maroon",
  "Teal",
  "Multi-Color"
] as const;

export const ITEM_SIZES = [
  // Clothing sizes
  "XS",
  "S", 
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  // Numeric sizes (shoes, etc)
  "6",
  "7",
  "8", 
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  // Other
  "One Size",
  "N/A"
] as const;

export const ITEM_DESIGNS = [
  "Lipstick",
  "Cancer",
  "Event-Specific",
  "Holiday",
  "Seasonal",
  "Logo",
  "Plain",
  "Graphic",
  "Text",
  "Pattern",
  "Floral",
  "Stripe",
  "Solid"
] as const;

export const GROUP_TYPES = [
  "Supporter",
  "Ladies",
  "Member-Only",
  "Kids",
  "Youth",
  "Adult",
  "Senior",
  "VIP",
  "Staff",
  "Volunteer",
  "General"
] as const;

export const STYLE_GROUPS = [
  "T-Shirt",
  "V-Neck", 
  "Tank Top",
  "Long Sleeve",
  "Polo",
  "Button-Up",
  "Hoodie",
  "Sweatshirt",
  "Dress",
  "Skirt",
  "Jeans",
  "Shorts",
  "Sneakers",
  "Boots",
  "Sandals",
  "Cap",
  "Beanie",
  "Other"
] as const;

// Type definitions for TypeScript
export type ItemType = typeof ITEM_TYPES[number];
export type ItemColor = typeof ITEM_COLORS[number];
export type ItemSize = typeof ITEM_SIZES[number];
export type ItemDesign = typeof ITEM_DESIGNS[number];
export type GroupType = typeof GROUP_TYPES[number];
export type StyleGroup = typeof STYLE_GROUPS[number];

// Helper function to generate item name from selections
export function generateItemName(selections: {
  type?: string;
  color?: string;
  size?: string;
  design?: string;
  groupType?: string;
  styleGroup?: string;
}): string {
  const parts: string[] = [];
  
  // Build name based on available selections
  if (selections.groupType && selections.groupType !== "General") {
    parts.push(selections.groupType);
  }
  
  if (selections.design && selections.design !== "Plain" && selections.design !== "Solid") {
    parts.push(selections.design);
  }
  
  if (selections.color) {
    parts.push(selections.color);
  }
  
  // Use style group if available, otherwise use type
  if (selections.styleGroup && selections.styleGroup !== "Other") {
    parts.push(selections.styleGroup);
  } else if (selections.type) {
    parts.push(selections.type);
  }
  
  if (selections.size && selections.size !== "N/A") {
    parts.push(`(${selections.size})`);
  }
  
  return parts.length > 0 ? parts.join(" ") : "New Item";
}

// Helper function to generate SKU from selections
export function generateSKU(selections: {
  type?: string;
  color?: string;
  size?: string;
  design?: string;
  groupType?: string;
  styleGroup?: string;
}): string {
  // Generate 3-letter codes for each category
  const typeCode = selections.type ? selections.type.substring(0, 3).toUpperCase() : "ITM";
  const colorCode = selections.color ? selections.color.substring(0, 3).toUpperCase() : "COL";
  const sizeCode = selections.size ? selections.size.substring(0, 2).toUpperCase() : "SZ";
  
  // Generate random 3-digit number for uniqueness
  const randomNum = Math.floor(Math.random() * 900) + 100;
  
  return `${typeCode}-${colorCode}-${sizeCode}-${randomNum}`;
}