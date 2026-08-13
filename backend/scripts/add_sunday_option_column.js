const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function run() {
  const isAzure = process.env.DB_HOST && process.env.DB_HOST.includes('azure.com');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_password || '',
    database: process.env.DB_NAME || 'transportation_management',
    ssl: isAzure ? { rejectUnauthorized: false } : false,
  });

  try {
    await pool.query(`ALTER TABLE vendor_commercial ADD COLUMN sunday_option VARCHAR(50) DEFAULT 'Sunday Including'`);
    console.log('✅ Added column sunday_option to vendor_commercial');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ Column sunday_option already exists in vendor_commercial');
    } else {
      console.error('❌ Error adding sunday_option:', e.message);
    }
  }

  process.exit(0);
}

run();
