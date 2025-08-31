#!/bin/bash
# Comprehensive diagnostic to find the exact SQL causing the group issue

echo "🔍 COMPREHENSIVE SQL EXECUTION DIAGNOSIS"
echo "========================================"

echo ""
echo "1. 📋 Extract and analyze the complete DO block:"
echo "-----------------------------------------------"
sed -n '/DO \$\$/,/END \$\$/p' docker-entrypoint.sh > /tmp/do_block.sql
echo "DO block has $(wc -l < /tmp/do_block.sql) lines"

echo ""
echo "2. 🎯 Find EXACT line 208 in the DO block:"
echo "------------------------------------------"
sed -n '208p' /tmp/do_block.sql
echo "Line 208 content: '$(sed -n '208p' /tmp/do_block.sql)'"

echo ""
echo "3. 🔍 Context around line 208:"
echo "------------------------------"
sed -n '200,215p' /tmp/do_block.sql | nl -v200

echo ""
echo "4. 🚨 Search for ANY unquoted group patterns:"
echo "--------------------------------------------"
grep -n "group[^_\"'\)]" /tmp/do_block.sql || echo "No unquoted group found in DO block"

echo ""
echo "5. 📝 All inventory_items table references:"
echo "------------------------------------------"
grep -n -i "inventory_items.*group\|group.*inventory_items" /tmp/do_block.sql || echo "No inventory_items+group references found"

echo ""
echo "6. 🔧 All ALTER TABLE statements:"
echo "--------------------------------"
grep -n "ALTER TABLE.*ADD COLUMN" /tmp/do_block.sql || echo "No ALTER TABLE ADD COLUMN statements found"

echo ""
echo "7. 🏗️ All CREATE TABLE statements:"
echo "----------------------------------"
grep -n -A 10 "CREATE TABLE.*inventory_items" /tmp/do_block.sql || echo "No CREATE TABLE inventory_items statements found"

echo ""
echo "8. 🎭 Generate clean SQL and check for issues:"
echo "----------------------------------------------"
# Create a clean version without comments
sed 's/--.*$//' /tmp/do_block.sql | sed '/^[[:space:]]*$/d' > /tmp/clean_do_block.sql
grep -n "group[^_\"'\)]" /tmp/clean_do_block.sql | head -5 || echo "No unquoted group in clean SQL"

echo ""
echo "9. 🔬 BYTE-LEVEL inspection around 'group':"
echo "------------------------------------------"
grep -n "group" /tmp/do_block.sql | while read line; do
    echo "Line: $line"
    echo "Hex dump: $(echo "$line" | xxd -l 50)"
done | head -20

echo ""
echo "🎯 SUMMARY:"
echo "If no unquoted 'group' is found above, the issue might be:"
echo "1. Different version of docker-entrypoint.sh in the container"
echo "2. Another script being executed"
echo "3. Concatenated SQL from multiple sources"
echo "4. Character encoding issues"

rm -f /tmp/do_block.sql /tmp/clean_do_block.sql