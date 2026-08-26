const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_HOST && process.env.DB_HOST.includes('azure.com') ? { rejectUnauthorized: false } : false
    });

    console.log('Connected to MySQL DB');

    const columnsToAdd = [
      { name: 'Rates', type: 'VARCHAR(255) NULL' },
      { name: 'RatesAnnexureFile', type: 'VARCHAR(500) NULL' },
      { name: 'YearlyEscalationClause', type: 'VARCHAR(10) DEFAULT "No"' },
      { name: 'GSTNo', type: 'VARCHAR(50) NULL' },
      { name: 'TypeOfBilling', type: 'VARCHAR(50) DEFAULT "RCM"' },
      { name: 'GSTRate', type: 'VARCHAR(50) DEFAULT "0"' },
      { name: 'BillingTenure', type: 'VARCHAR(50) NULL' },
      { name: 'BillingFromDate', type: 'DATE NULL' },
      { name: 'BillingToDate', type: 'DATE NULL' }
    ];

    const [existingCols] = await conn.execute('DESCRIBE Project');
    const existingColNames = existingCols.map(c => c.Field);

    for (const col of columnsToAdd) {
      if (!existingColNames.includes(col.name)) {
        console.log(`Adding column ${col.name} to Project table...`);
        await conn.execute(`ALTER TABLE Project ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Added ${col.name}`);
      } else {
        console.log(`Column ${col.name} already exists in Project table.`);
      }
    }

    console.log('All billing columns ensured in Project table!');
    await conn.end();
  } catch (error) {
    console.error('Error adding billing columns to Project:', error);
    process.exit(1);
  }
})();
