-- URGENT FIX: Docker PostgreSQL Schema Update
-- Run this on your Docker database to fix the "group" keyword error

-- Add missing category columns
ALTER TABLE categories ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(10);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_category VARCHAR;

-- Add missing sales columns  
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS receipt_token VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS receipt_expires_at TIMESTAMP;

-- Add missing inventory_items columns (NOTE: "group" is quoted because it's a PostgreSQL reserved keyword)
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS design TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS "group" TEXT;  -- QUOTED!
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS style TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create missing tables
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    transaction_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    notes TEXT,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Verify all columns exist
SELECT 'VERIFICATION - All Columns:' as info;
SELECT table_name, column_name FROM information_schema.columns 
WHERE table_name IN ('categories', 'sales', 'inventory_items') 
AND table_schema = 'public'
ORDER BY table_name, column_name;