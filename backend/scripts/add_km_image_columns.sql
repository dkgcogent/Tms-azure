-- Database migration: Add OpeningKMImage and ClosingKMImage columns to transaction tables
-- This script adds the missing KM image columns that are referenced in the application code
-- but were missing from the actual database tables.

-- Add columns to fixed_transactions table
ALTER TABLE fixed_transactions 
ADD COLUMN IF NOT EXISTS OpeningKMImage varchar(255) DEFAULT NULL 
AFTER ParkingChargesDoc;

ALTER TABLE fixed_transactions 
ADD COLUMN IF NOT EXISTS ClosingKMImage varchar(255) DEFAULT NULL 
AFTER OpeningKMImage;

-- Add columns to adhoc_transactions table  
ALTER TABLE adhoc_transactions 
ADD COLUMN IF NOT EXISTS OpeningKMImage varchar(255) DEFAULT NULL 
AFTER ParkingChargesDoc;

ALTER TABLE adhoc_transactions 
ADD COLUMN IF NOT EXISTS ClosingKMImage varchar(255) DEFAULT NULL 
AFTER OpeningKMImage;

-- Verify the columns were added
SELECT 'fixed_transactions' as table_name, COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'fixed_transactions' 
AND COLUMN_NAME IN ('OpeningKMImage', 'ClosingKMImage')

UNION ALL

SELECT 'adhoc_transactions' as table_name, COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'adhoc_transactions' 
AND COLUMN_NAME IN ('OpeningKMImage', 'ClosingKMImage');
