const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });

async function linkAdhocVendors() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'tmsdatabase.mysql.database.azure.com',
    user: process.env.DB_USER || 'tmsdkg',
    password: process.env.DB_PASSWORD || 'Test@123',
    database: process.env.DB_NAME || 'tmsdatabase',
    ssl: { rejectUnauthorized: false }
  });

  console.log('🔌 Connected to DB. Linking VendorID and vendor_commercial_id in adhoc_transactions...');

  try {
    const [rows] = await conn.execute(
      'SELECT TransactionID, CustomerID, ProjectID, ProjectName, VendorName, VendorNumber, VendorCode, VehicleType, VFreightFix, VFreightVariable FROM adhoc_transactions'
    );

    console.log(`📋 Found ${rows.length} rows in adhoc_transactions to process.`);

    for (const row of rows) {
      let vId = null;
      let vcId = null;

      const vName = row.VendorName ? row.VendorName.trim() : null;
      const vNum = row.VendorNumber ? row.VendorNumber.trim() : null;

      if (vName || vNum) {
        // 1. Find existing vendor in vendor table
        const [vMatch] = await conn.execute(
          'SELECT VendorID FROM vendor WHERE (VendorName = ? OR CompanyName = ?) OR (VendorMobileNo = ? AND VendorMobileNo IS NOT NULL) LIMIT 1',
          [vName, vName, vNum]
        );

        if (vMatch.length > 0) {
          vId = vMatch[0].VendorID;
        } else if (vName) {
          // Auto-create minimal vendor record if not found
          console.log(`➕ Auto-registering vendor: "${vName}"...`);
          const vCode = 'VEND-ADHOC-' + Math.floor(1000 + Math.random() * 9000);
          const [vIns] = await conn.execute(
            `INSERT INTO vendor (VendorName, VendorCode, VendorMobileNo, VendorAddress, TypeOfCompany, customer_id, project_id) 
             VALUES (?, ?, ?, 'Adhoc Vendor', 'Individual', ?, ?)`,
            [vName, vCode, vNum || '0000000000', row.CustomerID || null, row.ProjectID || null]
          );
          vId = vIns.insertId;
        }
      }

      // 2. Find or create vendor_commercial record
      if (vId || vName) {
        const [vcMatch] = await conn.execute(
          `SELECT id FROM vendor_commercial 
           WHERE (vendor_id = ? OR vendor_name = ?) AND (project_id = ? OR project = ?) 
           ORDER BY id DESC LIMIT 1`,
          [vId || 0, vName || '', row.ProjectID || 0, row.ProjectName || '']
        );

        if (vcMatch.length > 0) {
          vcId = vcMatch[0].id;
        } else {
          // Auto-create commercial rate card record for adhoc vendor
          console.log(`➕ Auto-creating vendor_commercial rate card for "${vName || vId}"...`);
          
          let custName = null;
          if (row.CustomerID) {
            const [cMatch] = await conn.execute('SELECT MasterCustomerName, Name FROM customer WHERE CustomerID = ?', [row.CustomerID]);
            if (cMatch.length > 0) custName = cMatch[0].MasterCustomerName || cMatch[0].Name;
          }

          const [vcIns] = await conn.execute(
            `INSERT INTO vendor_commercial (
              vendor_name, vendor_id, master_customer, customer_id, project, project_id, 
              type_of_vehicle_placement, type_of_vehicle, fixed_rate, additional_rate_per_km, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'Adhoc', ?, ?, ?, NOW(), NOW())`,
            [
              vName || 'Adhoc Vendor',
              vId || null,
              custName || 'Default Customer',
              row.CustomerID || null,
              row.ProjectName || 'Default Project',
              row.ProjectID || null,
              row.VehicleType || 'Tata Ace',
              parseFloat(row.VFreightFix) || 0,
              parseFloat(row.VFreightVariable) || 0
            ]
          );
          vcId = vcIns.insertId;
        }
      }

      // Update adhoc_transactions with resolved IDs
      await conn.execute(
        'UPDATE adhoc_transactions SET VendorID = ?, vendor_commercial_id = ? WHERE TransactionID = ?',
        [vId, vcId, row.TransactionID]
      );
    }

    console.log('🎉 Successfully linked VendorID and vendor_commercial_id for all adhoc_transactions!');
  } catch (err) {
    console.error('❌ Error linking adhoc vendors:', err);
  } finally {
    await conn.end();
  }
}

linkAdhocVendors();
