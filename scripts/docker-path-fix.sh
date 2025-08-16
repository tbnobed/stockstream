#!/bin/bash

echo "🔧 Applying Docker path fix..."

# Stop current containers
docker-compose down

# Create a patched version of the server build
echo "📝 Creating path-fixed server build..."
cat > temp-server-patch.js << 'EOF'
// Quick patch for import.meta.dirname issues in Docker
import fs from 'fs';

// Read the built server file
const serverCode = fs.readFileSync('dist/index.js', 'utf8');

// Replace problematic import.meta.dirname calls with working paths
const fixedCode = serverCode
  .replace(/import\.meta\.dirname/g, '"/app/server"')
  .replace(/path\.resolve\(.*?"public"\)/g, 'path.resolve("/app/server/public")')
  .replace(/path\.resolve\(.*?"client".*?"index\.html"\)/g, 'path.resolve("/app/client/index.html")');

// Write the fixed version
fs.writeFileSync('dist/index.js', fixedCode);
console.log('✅ Server paths fixed for Docker environment');
EOF

# Apply the patch in the builder stage
docker-compose build --no-cache
docker-compose up -d

echo "🚀 Docker deployment should now work correctly!"

# Cleanup
rm temp-server-patch.js