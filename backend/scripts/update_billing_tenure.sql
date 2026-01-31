-- Migration script to update billing table from BillingPeriodStart/BillingPeriodEnd to BillingTenure
-- Run this script to update the database schema

-- Step 1: Add the new BillingTenure column
ALTER TABLE Billing ADD BillingTenure VARCHAR(50) NOT NULL DEFAULT '1st to 31st';

-- Step 2: Migrate existing data (if any) from date fields to tenure format
-- This will convert existing date ranges to a simple tenure format
UPDATE Billing
SET BillingTenure = CONCAT(
  DATE_FORMAT(BillingPeriodStart, '%e'),
  CASE
    WHEN DATE_FORMAT(BillingPeriodStart, '%e') IN ('1','21','31') THEN 'st'
    WHEN DATE_FORMAT(BillingPeriodStart, '%e') IN ('2','22') THEN 'nd'
    WHEN DATE_FORMAT(BillingPeriodStart, '%e') IN ('3','23') THEN 'rd'
    ELSE 'th'
  END,
  ' to ',
  DATE_FORMAT(BillingPeriodEnd, '%e'),
  CASE
    WHEN DATE_FORMAT(BillingPeriodEnd, '%e') IN ('1','21','31') THEN 'st'
    WHEN DATE_FORMAT(BillingPeriodEnd, '%e') IN ('2','22') THEN 'nd'
    WHEN DATE_FORMAT(BillingPeriodEnd, '%e') IN ('3','23') THEN 'rd'
    ELSE 'th'
  END
)
WHERE BillingPeriodStart IS NOT NULL AND BillingPeriodEnd IS NOT NULL;

-- Step 3: Drop the old columns
ALTER TABLE Billing DROP COLUMN BillingPeriodStart;
ALTER TABLE Billing DROP COLUMN BillingPeriodEnd;

-- Note: This migration assumes you have existing billing records with date ranges.
-- If you don't have existing data, you can skip the UPDATE statement.
-- The script will work for both scenarios.
