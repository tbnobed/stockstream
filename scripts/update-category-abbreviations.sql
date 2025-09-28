-- Migration to add abbreviations to existing categories
-- This script safely updates categories that are missing abbreviations
-- Run this with: docker exec inventorypro-db psql -U postgres -d inventorypro -f /path/to/this/file.sql

BEGIN;

-- Update color categories with standard abbreviations
UPDATE categories SET abbreviation = 'BK', updated_at = NOW() WHERE type = 'color' AND value = 'black' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'WH', updated_at = NOW() WHERE type = 'color' AND value = 'white' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'RD', updated_at = NOW() WHERE type = 'color' AND value = 'red' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'BL', updated_at = NOW() WHERE type = 'color' AND value = 'blue' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'GR', updated_at = NOW() WHERE type = 'color' AND value = 'green' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'YL', updated_at = NOW() WHERE type = 'color' AND value = 'yellow' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'OR', updated_at = NOW() WHERE type = 'color' AND value = 'orange' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'PU', updated_at = NOW() WHERE type = 'color' AND value = 'purple' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'PK', updated_at = NOW() WHERE type = 'color' AND value = 'pink' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'GY', updated_at = NOW() WHERE type = 'color' AND value = 'gray' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'GY', updated_at = NOW() WHERE type = 'color' AND value = 'grey' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'BR', updated_at = NOW() WHERE type = 'color' AND value = 'brown' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'NV', updated_at = NOW() WHERE type = 'color' AND value = 'navy' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'MR', updated_at = NOW() WHERE type = 'color' AND value = 'maroon' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'TL', updated_at = NOW() WHERE type = 'color' AND value = 'teal' AND (abbreviation IS NULL OR abbreviation = '');

-- Update size categories with standard abbreviations
UPDATE categories SET abbreviation = 'XS', updated_at = NOW() WHERE type = 'size' AND value IN ('XS', 'Extra Small') AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'S', updated_at = NOW() WHERE type = 'size' AND value IN ('S', 'Small') AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'M', updated_at = NOW() WHERE type = 'size' AND value IN ('M', 'Medium') AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'L', updated_at = NOW() WHERE type = 'size' AND value IN ('L', 'Large') AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'XL', updated_at = NOW() WHERE type = 'size' AND value IN ('XL', 'XLarge', 'Extra Large') AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'XXL', updated_at = NOW() WHERE type = 'size' AND value IN ('XXL', 'XXLarge', '2XL') AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = '3XL', updated_at = NOW() WHERE type = 'size' AND value = '3XL' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = '4XL', updated_at = NOW() WHERE type = 'size' AND value = '4XL' AND (abbreviation IS NULL OR abbreviation = '');
UPDATE categories SET abbreviation = 'OS', updated_at = NOW() WHERE type = 'size' AND value IN ('One Size', 'OSFA') AND (abbreviation IS NULL OR abbreviation = '');

-- Update remaining categories with first 2-3 letters
UPDATE categories SET abbreviation = UPPER(LEFT(value, 3)), updated_at = NOW() 
WHERE type IN ('category', 'design', 'group', 'style') 
AND (abbreviation IS NULL OR abbreviation = '');

-- Handle any remaining colors or sizes with fallback
UPDATE categories SET abbreviation = UPPER(LEFT(value, 2)), updated_at = NOW() 
WHERE type = 'color' 
AND (abbreviation IS NULL OR abbreviation = '');

UPDATE categories SET abbreviation = UPPER(LEFT(value, 3)), updated_at = NOW() 
WHERE type = 'size' 
AND (abbreviation IS NULL OR abbreviation = '');

-- Show what was updated
SELECT 
    type,
    value,
    abbreviation,
    'UPDATED' as status
FROM categories 
WHERE updated_at >= NOW() - INTERVAL '1 minute'
ORDER BY type, value;

COMMIT;

-- Summary
SELECT 
    type,
    COUNT(*) as total_categories,
    COUNT(abbreviation) as with_abbreviations,
    COUNT(*) - COUNT(abbreviation) as missing_abbreviations
FROM categories
GROUP BY type
ORDER BY type;