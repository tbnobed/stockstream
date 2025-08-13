export interface SKUOptions {
  type?: string;
  color?: string;
  size?: string;
  prefix?: string;
}

export function generateSKU(options: SKUOptions): string {
  const { type = "", color = "", size = "", prefix = "" } = options;
  
  // Convert to uppercase and take first 3 characters
  const typeCode = type.toUpperCase().substring(0, 3).padEnd(3, 'X');
  const colorCode = color.toUpperCase().substring(0, 3).padEnd(3, 'X');
  const sizeCode = size.toUpperCase().substring(0, 2).padEnd(2, 'X');
  
  // Generate a random number suffix
  const randomSuffix = Math.floor(Math.random() * 999) + 1;
  const formattedSuffix = randomSuffix.toString().padStart(3, '0');
  
  // Combine all parts
  const sku = `${prefix}${typeCode}-${colorCode}-${sizeCode}-${formattedSuffix}`;
  
  return sku;
}

export function parseSKU(sku: string): Partial<SKUOptions> & { suffix?: string } {
  // Remove any prefix and split by dashes
  const parts = sku.split('-');
  
  if (parts.length >= 4) {
    return {
      type: parts[0].replace(/X+$/, ''),
      color: parts[1].replace(/X+$/, ''),
      size: parts[2].replace(/X+$/, ''),
      suffix: parts[3],
    };
  }
  
  return {};
}
