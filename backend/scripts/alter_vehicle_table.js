const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const isAzure = process.env.DB_HOST && process.env.DB_HOST.includes('azure.com');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_password || '',
    database: process.env.DB_NAME || 'transportation_management',
    ssl: isAzure ? { rejectUnauthorized: false } : false,
  });
  
  const columns = ['CustomerCompanyName', 'Project', 'Location', 'CustomerSite', 'CogentEmployee'];
  
  for (const col of columns) {
    try {
      await pool.query(`ALTER TABLE Vehicle ADD COLUMN ${col} VARCHAR(255)`);
      console.log('Added column ' + col);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column ' + col + ' already exists');
      } else {
        console.error('Error adding ' + col + ':', e.message);
      }
    }
  }
  process.exit(0);
}

run();
