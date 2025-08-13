export interface QRCodeOptions {
  size?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export function generateQRCode(
  text: string, 
  canvas: HTMLCanvasElement, 
  options: QRCodeOptions = {}
): void {
  const { size = 100, margin = 4, errorCorrectionLevel = 'M' } = options;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to get canvas context');
  }

  // Set canvas size
  canvas.width = size;
  canvas.height = size;

  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Generate a simple QR-like pattern
  // In a production app, you'd use a proper QR code library like 'qrcode'
  // For now, we'll create a deterministic pattern based on the input text
  const gridSize = Math.floor((size - 2 * margin) / 21); // Standard QR code is 21x21 modules
  const actualSize = gridSize * 21;
  const offsetX = (size - actualSize) / 2;
  const offsetY = (size - actualSize) / 2;

  // Create a simple hash from the text to generate a consistent pattern
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use the hash to create a deterministic random pattern
  const getRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  ctx.fillStyle = '#000000';

  // Draw QR code pattern
  for (let row = 0; row < 21; row++) {
    for (let col = 0; col < 21; col++) {
      // Create finder patterns (corner squares)
      const isFinderPattern = 
        (row < 7 && col < 7) || // Top-left
        (row < 7 && col >= 14) || // Top-right
        (row >= 14 && col < 7); // Bottom-left

      let shouldFill = false;

      if (isFinderPattern) {
        // Draw finder pattern border
        if (
          row === 0 || row === 6 || col === 0 || col === 6 ||
          (row >= 2 && row <= 4 && col >= 2 && col <= 4)
        ) {
          shouldFill = true;
        }
      } else {
        // For data area, use deterministic pattern based on hash and position
        const seed = hash + row * 21 + col;
        shouldFill = getRandom(seed) > 0.5;
      }

      if (shouldFill) {
        ctx.fillRect(
          offsetX + col * gridSize,
          offsetY + row * gridSize,
          gridSize,
          gridSize
        );
      }
    }
  }

  // Add timing patterns (alternating black and white modules)
  ctx.fillStyle = '#000000';
  for (let i = 8; i < 13; i++) {
    if (i % 2 === 0) {
      // Horizontal timing pattern
      ctx.fillRect(offsetX + i * gridSize, offsetY + 6 * gridSize, gridSize, gridSize);
      // Vertical timing pattern
      ctx.fillRect(offsetX + 6 * gridSize, offsetY + i * gridSize, gridSize, gridSize);
    }
  }
}

export function generateQRCodeDataURL(
  text: string, 
  options: QRCodeOptions = {}
): string {
  const canvas = document.createElement('canvas');
  generateQRCode(text, canvas, options);
  return canvas.toDataURL('image/png');
}

export function downloadQRCode(
  text: string, 
  filename: string = 'qrcode.png',
  options: QRCodeOptions = {}
): void {
  const dataUrl = generateQRCodeDataURL(text, options);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utility function to validate QR code content
export function validateQRContent(content: string): boolean {
  if (!content || content.length === 0) {
    return false;
  }
  
  // QR codes can handle up to ~4,296 alphanumeric characters
  if (content.length > 4000) {
    return false;
  }
  
  return true;
}

// Generate QR code content for inventory items
export function generateInventoryQRContent(item: {
  sku: string;
  name: string;
  price: string;
  id?: string;
}): string {
  // Create a JSON structure that can be easily parsed by scanners
  const qrData = {
    type: 'inventory',
    sku: item.sku,
    name: item.name,
    price: parseFloat(item.price),
    ...(item.id && { id: item.id }),
    timestamp: new Date().toISOString()
  };
  
  return JSON.stringify(qrData);
}

// Parse QR code content back to inventory data
export function parseInventoryQRContent(content: string): {
  sku?: string;
  name?: string;
  price?: number;
  id?: string;
} | null {
  try {
    const data = JSON.parse(content);
    if (data.type === 'inventory') {
      return {
        sku: data.sku,
        name: data.name,
        price: data.price,
        id: data.id
      };
    }
    
    // If it's just a simple SKU string
    if (typeof content === 'string' && content.length > 0) {
      return { sku: content };
    }
    
    return null;
  } catch {
    // If JSON parsing fails, treat it as a simple SKU
    if (typeof content === 'string' && content.length > 0) {
      return { sku: content };
    }
    return null;
  }
}
