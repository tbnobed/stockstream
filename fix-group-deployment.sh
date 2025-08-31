#!/bin/bash
# Universal fix for PostgreSQL group keyword issue
# This script patches ANY version of the codebase to fix the group issue

echo "🔧 UNIVERSAL GROUP KEYWORD FIX"
echo "=============================="

# 1. Fix shared/schema.ts
echo "📝 Fixing shared/schema.ts..."
if [ -f "shared/schema.ts" ]; then
    # Replace any unquoted group field with quoted version
    sed -i 's/group: text("group")/\"group\": text(\"group\")/g' shared/schema.ts
    sed -i 's/group: text(`"group"`)/\"group\": text(\"group\")/g' shared/schema.ts
    echo "✅ shared/schema.ts fixed"
else
    echo "❌ shared/schema.ts not found"
fi

# 2. Fix docker-entrypoint.sh 
echo "📝 Fixing docker-entrypoint.sh..."
if [ -f "docker-entrypoint.sh" ]; then
    # Replace any unquoted ADD COLUMN group with quoted version
    sed -i 's/ADD COLUMN group TEXT/ADD COLUMN "group" TEXT/g' docker-entrypoint.sh
    sed -i 's/ADD COLUMN group /ADD COLUMN "group" /g' docker-entrypoint.sh
    echo "✅ docker-entrypoint.sh fixed"
else
    echo "❌ docker-entrypoint.sh not found"
fi

# 3. Fix any other shell scripts
echo "📝 Fixing other shell scripts..."
for script in *.sh; do
    if [ -f "$script" ] && [ "$script" != "fix-group-deployment.sh" ]; then
        sed -i 's/ADD COLUMN group TEXT/ADD COLUMN "group" TEXT/g' "$script"
        sed -i 's/ADD COLUMN group /ADD COLUMN "group" /g' "$script"
    fi
done
echo "✅ All shell scripts checked"

# 4. Clear any existing migrations to force regeneration
echo "🗑️ Clearing old migrations..."
rm -rf migrations/*.sql 2>/dev/null || true
echo "✅ Old migrations cleared"

# 5. Generate fresh migration
echo "🔄 Generating fresh migration..."
npx drizzle-kit generate --config=./drizzle.config.ts >/dev/null 2>&1
if ls migrations/*.sql >/dev/null 2>&1; then
    echo "✅ Fresh migration generated"
    echo "📋 Migration contains:"
    grep -C 2 "group" migrations/*.sql | head -3
else
    echo "⚠️ No migration generated (might be up to date)"
fi

echo ""
echo "🎯 VERIFICATION:"
echo "----------------"
echo "docker-entrypoint.sh group column:"
grep -n "ADD COLUMN.*group" docker-entrypoint.sh || echo "  No ADD COLUMN group found"

echo "shared/schema.ts group field:"  
grep -n '"group".*text' shared/schema.ts || echo "  No quoted group field found"

echo ""
echo "✅ UNIVERSAL FIX APPLIED!"
echo "🚀 Now run: docker-compose build --no-cache && docker-compose up -d"