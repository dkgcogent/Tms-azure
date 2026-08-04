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
  const [rows] = await pool.query("SELECT VehicleID, VehicleRegistrationNo, Location, CustomerSite, CustomerCompanyName, Project FROM Vehicle WHERE VehicleRegistrationNo LIKE '%dl12cj0995%'");
  console.log('Result for dl12cj0995:', JSON.stringify(rows, null, 2));
  process.exit(0);
}
run();
