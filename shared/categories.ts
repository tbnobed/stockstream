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

// Helper function to generate abbreviations for categories
export function generateAbbreviation(value: string, type: string): string {
  if (!value || !type) return "";
  
  const cleanValue = value.trim().toUpperCase();
  
  switch (type.toLowerCase()) {
    case 'color':
      // Curated color mappings for common colors
      const colorMap: Record<string, string> = {
        'BLACK': 'BK',
        'WHITE': 'WH', 
        'RED': 'RD',
        'BLUE': 'BL',
        'GREEN': 'GR',
        'YELLOW': 'YL',
        'ORANGE': 'OR',
        'PURPLE': 'PU',
        'PINK': 'PK',
        'GRAY': 'GY',
        'GREY': 'GY',
        'BROWN': 'BR',
        'NAVY': 'NV',
        'MAROON': 'MR',
        'TEAL': 'TL',
        'TURQUOISE': 'TQ',
        'LIME': 'LM',
        'GOLD': 'GD',
        'SILVER': 'SL',
        'MULTI-COLOR': 'MC',
        'MULTI': 'MC'
      };
      
      if (colorMap[cleanValue]) {
        return colorMap[cleanValue];
      }
      
      // Fallback: first consonant + first vowel, or first 2 letters
      const consonants = cleanValue.match(/[BCDFGHJKLMNPQRSTVWXYZ]/g) || [];
      const vowels = cleanValue.match(/[AEIOU]/g) || [];
      
      if (consonants.length > 0 && vowels.length > 0) {
        return (consonants[0] || '') + (vowels[0] || '');
      }
      return cleanValue.substring(0, 2);
      
    case 'size':
      // Normalize common size abbreviations
      const sizeMap: Record<string, string> = {
        'EXTRA SMALL': 'XS',
        'SMALL': 'S',
        'MEDIUM': 'M', 
        'LARGE': 'L',
        'XLARGE': 'XL',
        'EXTRA LARGE': 'XL',
        'XXLARGE': 'XXL',
        'XX LARGE': 'XXL',
        '2XL': 'XXL',
        '3XL': '3XL',
        '4XL': '4XL',
        'ONE SIZE': 'OS',
        'OSFA': 'OS',
        'HUGE': 'HG'
      };
      
      if (sizeMap[cleanValue]) {
        return sizeMap[cleanValue];
      }
      
      // For numeric sizes, keep as-is
      if (/^\d+$/.test(cleanValue)) {
        return cleanValue;
      }
      
      return cleanValue.substring(0, 3);
      
    case 'category':
    case 'design':
    case 'group':
    case 'style':
      // Generate acronym from words
      const words = cleanValue.split(/\s+/).filter(word => word.length > 0);
      
      if (words.length === 1) {
        // Single word: first 2-3 letters
        return cleanValue.substring(0, Math.min(3, cleanValue.length));
      } else {
        // Multiple words: first letter of each word, max 4 letters
        const acronym = words.map(word => word[0]).join('').substring(0, 4);
        return acronym;
      }
      
    default:
      // Default: first 2-3 letters
      return cleanValue.substring(0, Math.min(3, cleanValue.length));
  }
}