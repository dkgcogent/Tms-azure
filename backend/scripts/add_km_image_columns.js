// Database migration script: Add OpeningKMImage and ClosingKMImage columns to transaction tables
// Usage: node backend/scripts/add_km_image_columns.js

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function addKMImageColumns() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tms'
    });

    console.log('🔗 Connected to database');

    // Check if columns already exist in fixed_transactions
    console.log('🔍 Checking fixed_transactions table...');
    const [fixedColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'fixed_transactions' 
      AND COLUMN_NAME IN ('OpeningKMImage', 'ClosingKMImage')
    `, [process.env.DB_NAME || 'tms']);

    const fixedHasOpeningKM = fixedColumns.some(col => col.COLUMN_NAME === 'OpeningKMImage');
    const fixedHasClosingKM = fixedColumns.some(col => col.COLUMN_NAME === 'ClosingKMImage');

    // Add missing columns to fixed_transactions
    if (!fixedHasOpeningKM) {
      console.log('➕ Adding OpeningKMImage column to fixed_transactions...');
      await connection.execute(`
        ALTER TABLE fixed_transactions 
        ADD COLUMN OpeningKMImage varchar(255) DEFAULT NULL 
        AFTER ParkingChargesDoc
      `);
      console.log('✅ Added OpeningKMImage to fixed_transactions');
    } else {
      console.log('✅ OpeningKMImage already exists in fixed_transactions');
    }

    if (!fixedHasClosingKM) {
      console.log('➕ Adding ClosingKMImage column to fixed_transactions...');
      await connection.execute(`
        ALTER TABLE fixed_transactions 
        ADD COLUMN ClosingKMImage varchar(255) DEFAULT NULL 
        AFTER OpeningKMImage
      `);
      console.log('✅ Added ClosingKMImage to fixed_transactions');
    } else {
      console.log('✅ ClosingKMImage already exists in fixed_transactions');
    }

    // Check if columns already exist in adhoc_transactions
    console.log('🔍 Checking adhoc_transactions table...');
    const [adhocColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'adhoc_transactions' 
      AND COLUMN_NAME IN ('OpeningKMImage', 'ClosingKMImage')
    `, [process.env.DB_NAME || 'tms']);

    const adhocHasOpeningKM = adhocColumns.some(col => col.COLUMN_NAME === 'OpeningKMImage');
    const adhocHasClosingKM = adhocColumns.some(col => col.COLUMN_NAME === 'ClosingKMImage');

    // Add missing columns to adhoc_transactions
    if (!adhocHasOpeningKM) {
      console.log('➕ Adding OpeningKMImage column to adhoc_transactions...');
      await connection.execute(`
        ALTER TABLE adhoc_transactions 
        ADD COLUMN OpeningKMImage varchar(255) DEFAULT NULL 
        AFTER ParkingChargesDoc
      `);
      console.log('✅ Added OpeningKMImage to adhoc_transactions');
    } else {
      console.log('✅ OpeningKMImage already exists in adhoc_transactions');
    }

    if (!adhocHasClosingKM) {
      console.log('➕ Adding ClosingKMImage column to adhoc_transactions...');
      await connection.execute(`
        ALTER TABLE adhoc_transactions 
        ADD COLUMN ClosingKMImage varchar(255) DEFAULT NULL 
        AFTER OpeningKMImage
      `);
      console.log('✅ Added ClosingKMImage to adhoc_transactions');
    } else {
      console.log('✅ ClosingKMImage already exists in adhoc_transactions');
    }

    console.log('🎉 Migration completed successfully!');
    console.log('📝 Summary:');
    console.log(`   - fixed_transactions: OpeningKMImage ${fixedHasOpeningKM ? 'existed' : 'added'}, ClosingKMImage ${fixedHasClosingKM ? 'existed' : 'added'}`);
    console.log(`   - adhoc_transactions: OpeningKMImage ${adhocHasOpeningKM ? 'existed' : 'added'}, ClosingKMImage ${adhocHasClosingKM ? 'existed' : 'added'}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  addKMImageColumns();
}

module.exports = addKMImageColumns;
