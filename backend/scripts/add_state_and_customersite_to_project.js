const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function migrate() {
  const isAzure = process.env.DB_HOST && process.env.DB_HOST.includes('azure.com');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: isAzure ? { rejectUnauthorized: false } : false
  });

  try {
    const [cols] = await conn.execute("SHOW COLUMNS FROM Project LIKE 'State'");
    if (cols.length === 0) {
      await conn.execute("ALTER TABLE Project ADD COLUMN State VARCHAR(255) NULL AFTER Location");
      console.log('✅ State column added to Project');
    } else {
      console.log('ℹ️ State column already exists in Project');
    }

    const [siteCols] = await conn.execute("SHOW COLUMNS FROM Project LIKE 'CustomerSite'");
    if (siteCols.length === 0) {
      await conn.execute("ALTER TABLE Project ADD COLUMN CustomerSite TEXT NULL AFTER State");
      console.log('✅ CustomerSite column added to Project');
    } else {
      console.log('ℹ️ CustomerSite column already exists in Project');
    }
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await conn.end();
  }
}

migrate();
