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
    ssl: {
      rejectUnauthorized: false
    },
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

  const tables = ['fixed_transactions', 'adhoc_transactions'];
  const columns = ['CustomerID', 'ProjectID', 'VendorID'];

  for (const table of tables) {
    for (const column of columns) {
      const colInfo = await q(
        `SELECT IS_NULLABLE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [dbName, table, column]
      );

      if (colInfo.length === 0) {
        console.log(`Table ${table} or Column ${column} not found; skipping.`);
        continue;
      }

      if (colInfo[0].IS_NULLABLE === 'YES') {
        console.log(`${table}.${column} is already NULLable.`);
      } else {
        console.log(`Altering ${table}.${column} to be NULLable...`);
        // We use INT to be safe, or whatever the original type was
        await q(`ALTER TABLE ${table} MODIFY COLUMN ${column} ${colInfo[0].COLUMN_TYPE} NULL`);
        console.log('Done.');
      }
    }
  }

  await pool.end();
  console.log('Migration completed successfully.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
