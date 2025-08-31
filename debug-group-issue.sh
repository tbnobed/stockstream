#!/bin/bash
# Debug script to find the exact source of the group issue

echo "🔍 DEBUGGING GROUP ISSUE"
echo "======================="

echo ""
echo "1. 📋 Current docker-entrypoint.sh content around group:"
echo "--------------------------------------------------------"
grep -n -A 3 -B 3 "ADD COLUMN.*group" docker-entrypoint.sh

echo ""
echo "2. 🔍 All group references in docker-entrypoint.sh:"
echo "---------------------------------------------------"
grep -n "group" docker-entrypoint.sh | head -10

echo ""
echo "3. 📝 Current shared/schema.ts group definition:"
echo "------------------------------------------------"
grep -n -A 2 -B 2 '"group"' shared/schema.ts

echo ""
echo "4. 🧮 Line count verification:"
echo "------------------------------"
echo "docker-entrypoint.sh total lines: $(wc -l < docker-entrypoint.sh)"
echo "Line 208 content: '$(sed -n '208p' docker-entrypoint.sh)'"
echo "Line 381 content: '$(sed -n '381p' docker-entrypoint.sh)'"

echo ""
echo "5. 🔬 Generate fresh Drizzle migration to check SQL:"
echo "---------------------------------------------------"
rm -rf migrations/*
npx drizzle-kit generate --config=./drizzle.config.ts >/dev/null 2>&1
if ls migrations/*.sql >/dev/null 2>&1; then
    echo "Generated migration contains:"
    grep -A 2 -B 2 "group" migrations/*.sql | head -5
else
    echo "❌ No migration generated"
fi

echo ""
echo "6. 🎯 EXACT SEARCH for unquoted 'ADD COLUMN group TEXT':"
echo "--------------------------------------------------------"
if grep -r "ADD COLUMN group TEXT" . --include="*.sh" --include="*.sql" --include="*.ts"; then
    echo "^^ FOUND UNQUOTED INSTANCES ABOVE ^^"
else
    echo "✅ No unquoted 'ADD COLUMN group TEXT' found"
fi

echo ""
echo "7. 🔑 MD5 checksum of critical files:"
echo "------------------------------------"
echo "docker-entrypoint.sh: $(md5sum docker-entrypoint.sh)"
echo "shared/schema.ts: $(md5sum shared/schema.ts)"

echo ""
echo "🎯 CONCLUSION:"
echo "If all looks correct above, the issue might be:"
echo "  - Different deployment source (wrong git branch/repo)"
echo "  - Docker build context issues"
echo "  - File encoding problems"
echo "  - PostgreSQL line counting from concatenated SQL"