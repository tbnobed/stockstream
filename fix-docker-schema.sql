-- Fix missing columns in Docker deployment
-- Run this script on your Docker database if restart doesn't work

-- Add missing category columns
ALTER TABLE categories ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(10);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_category VARCHAR;

-- Add missing sales columns  
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Add missing inventory_items columns
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS design TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS "group" TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS style TEXT;

-- Verify all columns exist
SELECT 'categories' as table_name, column_name FROM information_schema.columns WHERE table_name = 'categories' AND table_schema = 'public'
UNION ALL
SELECT 'sales' as table_name, column_name FROM information_schema.columns WHERE table_name = 'sales' AND table_schema = 'public'  
UNION ALL
SELECT 'inventory_items' as table_name, column_name FROM information_schema.columns WHERE table_name = 'inventory_items' AND table_schema = 'public'
ORDER BY table_name, column_name;