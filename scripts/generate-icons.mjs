import { Jimp } from 'jimp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateIcons() {
  console.log('Starting icon generation...');
  
  try {
    // Load the source image
    const sourceImagePath = join(__dirname, '../attached_assets/NewIcon_1759050957078.png');
    const image = await Jimp.read(sourceImagePath);
    
    console.log(`Source image loaded: ${image.bitmap.width}x${image.bitmap.height}`);

    // Define the icon sizes we need
    const iconSizes = [
      { size: 16, name: 'favicon-16x16.png' },
      { size: 32, name: 'favicon-32x32.png' },
      { size: 180, name: 'apple-touch-icon.png' },
      { size: 192, name: 'android-chrome-192x192.png' },
      { size: 512, name: 'android-chrome-512x512.png' }
    ];

    // Generate each icon size
    for (const icon of iconSizes) {
      console.log(`Generating ${icon.name} (${icon.size}x${icon.size})...`);
      
      const resizedImage = image.clone().resize({ w: icon.size, h: icon.size });
      const outputPath = join(__dirname, '../client/public', icon.name);
      
      await resizedImage.write(outputPath);
      console.log(`✓ Created ${icon.name}`);
    }

    console.log('✅ All icons generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

// Run the generation
generateIcons();