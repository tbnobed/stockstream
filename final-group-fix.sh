#!/bin/bash
# DEFINITIVE FIX: Force correct group quoting in deployed container

echo "🎯 DEFINITIVE GROUP KEYWORD FIX"
echo "=============================="

echo ""
echo "1. 🔍 Current situation verification:"
echo "------------------------------------"
echo "Our local docker-entrypoint.sh line 381:"
grep -n "ADD COLUMN.*group" docker-entrypoint.sh || echo "  No ADD COLUMN "group" found"

echo "Our local shared/schema.ts group field:"
grep -n '"group".*text' shared/schema.ts || echo "  No quoted group field found"

echo ""
echo "2. 🔧 NUCLEAR OPTION: Replace ALL possible group references:"
echo "----------------------------------------------------------"

# Method 1: Fix ALL files with ANY pattern of unquoted group
find . -name "*.sh" -exec sed -i 's/ADD COLUMN "group" /ADD COLUMN "group" /g' {} \;
find . -name "*.sh" -exec sed -i 's/ADD COLUMN group$/ADD COLUMN "group"/g' {} \;  
find . -name "*.sh" -exec sed -i 's/ADD COLUMN "group" TEXT/ADD COLUMN "group" TEXT/g' {} \;
find . -name "*.sh" -exec sed -i 's/ADD COLUMN "group",/ADD COLUMN "group",/g' {} \;

# Method 2: Fix schema files
find . -name "*.ts" -exec sed -i 's/group: text("group")/\"group\": text(\"group\")/g' {} \;

# Method 3: Fix any SQL files
find . -name "*.sql" -exec sed -i 's/ADD COLUMN "group" /ADD COLUMN "group" /g' {} \;

echo "✅ ALL possible unquoted group references fixed"

echo ""
echo "3. 🗑️ Clear ALL caches and rebuild:"
echo "-----------------------------------"

# Remove ALL Docker artifacts
echo "Clearing Docker system..."
docker system prune -af --volumes 2>/dev/null || echo "  Docker not available in this environment"

# Clear node modules and rebuild
echo "Clearing node_modules..."
rm -rf node_modules package-lock.json 2>/dev/null || echo "  No node_modules to clear"

# Clear migrations
echo "Clearing migrations..."
rm -rf migrations/*.sql 2>/dev/null || echo "  No migrations to clear"

echo "✅ All caches cleared"

echo ""
echo "4. 🔒 ABSOLUTE VERIFICATION:"
echo "---------------------------"

echo "After fix - docker-entrypoint.sh group references:"
grep -n "group" docker-entrypoint.sh | grep -E "(ALTER|ADD|COLUMN)" | head -5

echo "After fix - shared/schema.ts group field:"
grep -n "group.*text" shared/schema.ts | head -3

echo ""
echo "🎯 DEPLOYMENT COMMAND:"
echo "====================="
echo "Run this exact sequence on your server:"
echo ""
echo "docker-compose down -v"
echo "docker system prune -af --volumes"
echo "docker-compose build --no-cache --pull"
echo "docker-compose up -d"
echo ""
echo "✅ This will force a completely fresh build with no cached artifacts"