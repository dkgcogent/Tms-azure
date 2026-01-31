// DB migration script: make VehicleTransaction.VendorID nullable and relax Vehicle.VendorID linkage
// Usage: node backend/scripts/make_vendor_nullable.js

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function run() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'transportation_management',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    ssl: false,
    charset: 'utf8mb4',
    insecureAuth: true,
  };
  if (process.env.DB_PASSWORD) dbConfig.password = process.env.DB_PASSWORD;

  const pool = await mysql.createPool(dbConfig);
  const dbName = dbConfig.database;

  const q = async (sql, params = []) => {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.error('SQL Error running:', sql, params, err.message);
      throw err;
    }
  };

  console.log('Connected. Using DB:', dbName);

  // 1) Make VehicleTransaction.VendorID nullable if not already
  const vtCol = await q(
    `SELECT IS_NULLABLE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'VehicleTransaction' AND COLUMN_NAME = 'VendorID'`,
    [dbName]
  );
  if (vtCol.length === 0) {
    console.log('VehicleTransaction.VendorID column not found; skipping.');
  } else if (vtCol[0].IS_NULLABLE === 'YES') {
    console.log('VehicleTransaction.VendorID is already NULLable.');
  } else {
    console.log('Altering VehicleTransaction.VendorID to be NULLable...');
    await q(`ALTER TABLE VehicleTransaction MODIFY COLUMN VendorID INT NULL`);
    console.log('Done.');
  }

  // 2) Ensure Vehicle.VendorID is NULLable
  const vCol = await q(
    `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Vehicle' AND COLUMN_NAME = 'VendorID'`,
    [dbName]
  );
  if (vCol.length) {
    if (vCol[0].IS_NULLABLE !== 'YES') {
      console.log('Altering Vehicle.VendorID to be NULLable...');
      await q(`ALTER TABLE Vehicle MODIFY COLUMN VendorID INT NULL`);
      console.log('Done.');
    } else {
      console.log('Vehicle.VendorID is already NULLable.');
    }
  } else {
    console.log('Vehicle.VendorID column not found; skipping.');
  }

  // 3) Adjust FK on Vehicle.VendorID to ON DELETE SET NULL (if exists)
  const fkRows = await q(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Vehicle' AND COLUMN_NAME = 'VendorID' AND REFERENCED_TABLE_NAME = 'Vendor'`,
    [dbName]
  );
  if (fkRows.length) {
    const fkName = fkRows[0].CONSTRAINT_NAME;
    console.log('Found Vehicle.VendorID FK:', fkName, '- resetting to ON DELETE SET NULL');
    await q(`ALTER TABLE Vehicle DROP FOREIGN KEY \`${fkName}\``);
    await q(`ALTER TABLE Vehicle ADD CONSTRAINT fk_vehicle_vendor FOREIGN KEY (VendorID) REFERENCES Vendor(VendorID) ON UPDATE CASCADE ON DELETE SET NULL`);
    console.log('FK updated.');
  } else {
    console.log('No FK found on Vehicle.VendorID; skipping FK update.');
  }

  await pool.end();
  console.log('Migration completed successfully.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

