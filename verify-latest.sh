#!/bin/bash
# Verify you have the latest code version

echo "🔍 Verifying your code version..."

# Check if docker-entrypoint.sh has the correct quoted group
if grep -q 'ALTER TABLE inventory_items ADD COLUMN "group" TEXT;' docker-entrypoint.sh; then
    echo "✅ docker-entrypoint.sh: HAS CORRECT QUOTED GROUP"
else
    echo "❌ docker-entrypoint.sh: MISSING QUOTED GROUP - OLD VERSION!"
    echo "   Expected: ALTER TABLE inventory_items ADD COLUMN \"group\" TEXT;"
    echo "   Your version:"
    grep -n "ADD COLUMN.*group" docker-entrypoint.sh || echo "   No group column found"
fi

# Check if shared/schema.ts has the correct quoted group
if grep -q '"group": text("group")' shared/schema.ts; then
    echo "✅ shared/schema.ts: HAS CORRECT QUOTED GROUP"
else
    echo "❌ shared/schema.ts: MISSING QUOTED GROUP - OLD VERSION!"
    echo "   Expected: \"group\": text(\"group\"),"
    echo "   Your version:"
    grep -n "group.*text" shared/schema.ts || echo "   No group field found"
fi

echo ""
echo "📋 File checksums for verification:"
echo "docker-entrypoint.sh: $(md5sum docker-entrypoint.sh | cut -d' ' -f1)"
echo "shared/schema.ts: $(md5sum shared/schema.ts | cut -d' ' -f1)"

echo ""
if grep -q 'ALTER TABLE inventory_items ADD COLUMN "group" TEXT;' docker-entrypoint.sh && grep -q '"group": text("group")' shared/schema.ts; then
    echo "🎉 SUCCESS: You have the latest fixed version!"
    echo "   Run: ./force-update.sh to deploy with cache refresh"
else
    echo "⚠️  WARNING: You have an old version!"
    echo "   1. Pull latest code from your repository"
    echo "   2. Then run: ./force-update.sh"
fi