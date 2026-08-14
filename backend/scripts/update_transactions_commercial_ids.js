const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'tmsdatabase.mysql.database.azure.com',
    user: process.env.DB_USER || 'tmsdkg',
    password: process.env.DB_PASSWORD || 'Test@123',
    database: process.env.DB_NAME || 'tmsdatabase',
    ssl: { rejectUnauthorized: false }
  });

  console.log('🔌 Connected to DB. Updating fixed_transactions and adhoc_transactions schemas...');

  const tables = ['fixed_transactions', 'adhoc_transactions'];

  try {
    for (const table of tables) {
      console.log(`\n🔍 Checking table: ${table}...`);
      const [cols] = await conn.execute(`DESCRIBE ${table}`);
      const colNames = cols.map(c => c.Field);

      if (!colNames.includes('customer_commercial_id')) {
        console.log(`➕ Adding customer_commercial_id to ${table}...`);
        await conn.execute(`ALTER TABLE ${table} ADD COLUMN customer_commercial_id INT DEFAULT NULL`);
        await conn.execute(`ALTER TABLE ${table} ADD KEY idx_cust_comm_id (customer_commercial_id)`);
      } else {
        console.log(`✅ customer_commercial_id already exists in ${table}`);
      }

      if (!colNames.includes('vendor_commercial_id')) {
        console.log(`➕ Adding vendor_commercial_id to ${table}...`);
        await conn.execute(`ALTER TABLE ${table} ADD COLUMN vendor_commercial_id INT DEFAULT NULL`);
        await conn.execute(`ALTER TABLE ${table} ADD KEY idx_vend_comm_id (vendor_commercial_id)`);
      } else {
        console.log(`✅ vendor_commercial_id already exists in ${table}`);
      }
    }

    // Backfilling existing rows in fixed_transactions
    console.log('\n🔄 Backfilling commercial rate IDs for fixed_transactions...');
    const [fixedRows] = await conn.execute(
      'SELECT TransactionID, CustomerID, ProjectID, VendorID, VehicleType, TripType FROM fixed_transactions'
    );
    let fixedUpdated = 0;

    for (const row of fixedRows) {
      let ccId = null;
      let vcId = null;

      // Find matching customer_commercial
      if (row.CustomerID || row.ProjectID) {
        const [ccMatch] = await conn.execute(
          `SELECT id FROM customer_commercial 
           WHERE (customer_id = ? OR ? IS NULL) AND (project_id = ? OR ? IS NULL)
           ORDER BY id DESC LIMIT 1`,
          [row.CustomerID || null, row.CustomerID || null, row.ProjectID || null, row.ProjectID || null]
        );
        if (ccMatch.length > 0) ccId = ccMatch[0].id;
      }

      // Find matching vendor_commercial
      if (row.VendorID || row.ProjectID) {
        const [vcMatch] = await conn.execute(
          `SELECT id FROM vendor_commercial 
           WHERE (vendor_id = ? OR ? IS NULL) AND (project_id = ? OR ? IS NULL)
           ORDER BY id DESC LIMIT 1`,
          [row.VendorID || null, row.VendorID || null, row.ProjectID || null, row.ProjectID || null]
        );
        if (vcMatch.length > 0) vcId = vcMatch[0].id;
      }

      if (ccId || vcId) {
        await conn.execute(
          'UPDATE fixed_transactions SET customer_commercial_id = ?, vendor_commercial_id = ? WHERE TransactionID = ?',
          [ccId, vcId, row.TransactionID]
        );
        fixedUpdated++;
      }
    }
    console.log(`✅ Backfilled ${fixedUpdated}/${fixedRows.length} rows in fixed_transactions.`);

    // Backfilling existing rows in adhoc_transactions
    console.log('\n🔄 Backfilling commercial rate IDs for adhoc_transactions...');
    const [adhocRows] = await conn.execute(
      'SELECT TransactionID, CustomerID, ProjectID, VendorName, VehicleType FROM adhoc_transactions'
    );
    let adhocUpdated = 0;

    for (const row of adhocRows) {
      let ccId = null;
      let vcId = null;

      // Find matching customer_commercial
      if (row.CustomerID || row.ProjectID) {
        const [ccMatch] = await conn.execute(
          `SELECT id FROM customer_commercial 
           WHERE (customer_id = ? OR ? IS NULL) AND (project_id = ? OR ? IS NULL)
           ORDER BY id DESC LIMIT 1`,
          [row.CustomerID || null, row.CustomerID || null, row.ProjectID || null, row.ProjectID || null]
        );
        if (ccMatch.length > 0) ccId = ccMatch[0].id;
      }

      // Find matching vendor_commercial by vendor_name / project_id
      if (row.VendorName || row.ProjectID) {
        const [vcMatch] = await conn.execute(
          `SELECT id FROM vendor_commercial 
           WHERE (vendor_name = ? OR ? IS NULL) AND (project_id = ? OR ? IS NULL)
           ORDER BY id DESC LIMIT 1`,
          [row.VendorName || null, row.VendorName || null, row.ProjectID || null, row.ProjectID || null]
        );
        if (vcMatch.length > 0) vcId = vcMatch[0].id;
      }

      if (ccId || vcId) {
        await conn.execute(
          'UPDATE adhoc_transactions SET customer_commercial_id = ?, vendor_commercial_id = ? WHERE TransactionID = ?',
          [ccId, vcId, row.TransactionID]
        );
        adhocUpdated++;
      }
    }
    console.log(`✅ Backfilled ${adhocUpdated}/${adhocRows.length} rows in adhoc_transactions.`);

    console.log('\n🎉 Migration & Backfill finished successfully!');
  } catch (err) {
    console.error('❌ Migration Error:', err);
  } finally {
    await conn.end();
  }
}

migrate();
