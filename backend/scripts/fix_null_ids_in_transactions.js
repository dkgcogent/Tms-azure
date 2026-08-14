const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });

async function fixNullIDs() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'tmsdatabase.mysql.database.azure.com',
    user: process.env.DB_USER || 'tmsdkg',
    password: process.env.DB_PASSWORD || 'Test@123',
    database: process.env.DB_NAME || 'tmsdatabase',
    ssl: { rejectUnauthorized: false }
  });

  console.log('🔌 Connected to DB. Resolving NULL CustomerID, ProjectID, and VendorID in transactions...');

  try {
    // Load Master Data
    const [customers] = await conn.execute('SELECT CustomerID, Name, MasterCustomerName, CustomerCode FROM customer');
    const [projects] = await conn.execute('SELECT ProjectID, ProjectName, CustomerID FROM project');
    const [vendors] = await conn.execute('SELECT VendorID, VendorName, CompanyName, VendorCode FROM vendor');
    const [vehicles] = await conn.execute('SELECT VehicleID, VehicleRegistrationNo, VendorID FROM vehicle');

    // Helper functions for matching
    const findCustomer = (name) => {
      if (!name) return null;
      const clean = String(name).trim().toLowerCase();
      const match = customers.find(c => 
        (c.MasterCustomerName && c.MasterCustomerName.trim().toLowerCase() === clean) ||
        (c.Name && c.Name.trim().toLowerCase() === clean) ||
        (c.CustomerCode && c.CustomerCode.trim().toLowerCase() === clean)
      );
      return match ? match.CustomerID : null;
    };

    const findProject = (name, customerId = null) => {
      if (!name) return null;
      const clean = String(name).trim().toLowerCase();
      const match = projects.find(p => 
        p.ProjectName && p.ProjectName.trim().toLowerCase() === clean &&
        (!customerId || p.CustomerID === customerId)
      ) || projects.find(p => p.ProjectName && p.ProjectName.trim().toLowerCase() === clean);
      return match ? match.ProjectID : null;
    };

    const findVendor = (name, vehicleId = null) => {
      if (vehicleId) {
        const v = vehicles.find(vh => vh.VehicleID === vehicleId);
        if (v && v.VendorID) return v.VendorID;
      }
      if (!name) return null;
      const clean = String(name).trim().toLowerCase();
      const match = vendors.find(v => 
        (v.VendorName && v.VendorName.trim().toLowerCase() === clean) ||
        (v.CompanyName && v.CompanyName.trim().toLowerCase() === clean) ||
        (v.VendorCode && v.VendorCode.trim().toLowerCase() === clean)
      );
      return match ? match.VendorID : null;
    };

    // 1. Process fixed_transactions
    console.log('\n🔍 Processing fixed_transactions...');
    const [fixedRows] = await conn.execute(
      'SELECT TransactionID, CustomerID, customer, CompanyName, ProjectID, ProjectName, VendorID, VendorName, VehicleIDs FROM fixed_transactions'
    );

    let fixedUpdated = 0;
    for (const row of fixedRows) {
      let cId = row.CustomerID;
      let pId = row.ProjectID;
      let vId = row.VendorID;

      // Extract primary VehicleID if present
      let vehicleId = null;
      if (row.VehicleIDs) {
        try {
          const parsed = typeof row.VehicleIDs === 'string' ? JSON.parse(row.VehicleIDs) : row.VehicleIDs;
          if (Array.isArray(parsed) && parsed.length > 0) vehicleId = parseInt(parsed[0]);
        } catch (e) {}
      }

      if (!cId) {
        cId = findCustomer(row.customer) || findCustomer(row.CompanyName);
      }

      if (!pId) {
        pId = findProject(row.ProjectName, cId);
        if (pId && !cId) {
          const proj = projects.find(p => p.ProjectID === pId);
          if (proj) cId = proj.CustomerID;
        }
      }

      if (!vId) {
        vId = findVendor(row.VendorName, vehicleId);
      }

      if (cId !== row.CustomerID || pId !== row.ProjectID || vId !== row.VendorID) {
        await conn.execute(
          'UPDATE fixed_transactions SET CustomerID = COALESCE(CustomerID, ?), ProjectID = COALESCE(ProjectID, ?), VendorID = COALESCE(VendorID, ?) WHERE TransactionID = ?',
          [cId, pId, vId, row.TransactionID]
        );
        fixedUpdated++;
      }
    }
    console.log(`✅ Fixed IDs in ${fixedUpdated}/${fixedRows.length} fixed_transactions rows.`);

    // 2. Process adhoc_transactions
    console.log('\n🔍 Processing adhoc_transactions...');
    const [adhocRows] = await conn.execute(
      'SELECT TransactionID, CustomerID, CompanyName, ProjectID, ProjectName, VendorName, VehicleNumber FROM adhoc_transactions'
    );

    let adhocUpdated = 0;
    for (const row of adhocRows) {
      let cId = row.CustomerID;
      let pId = row.ProjectID;
      let vId = null;

      if (!cId) {
        cId = findCustomer(row.CompanyName);
      }

      if (!pId) {
        pId = findProject(row.ProjectName, cId);
        if (pId && !cId) {
          const proj = projects.find(p => p.ProjectID === pId);
          if (proj) cId = proj.CustomerID;
        }
      }

      if (row.VendorName) {
        vId = findVendor(row.VendorName);
      }

      if (cId !== row.CustomerID || pId !== row.ProjectID) {
        await conn.execute(
          'UPDATE adhoc_transactions SET CustomerID = COALESCE(CustomerID, ?), ProjectID = COALESCE(ProjectID, ?) WHERE TransactionID = ?',
          [cId, pId, row.TransactionID]
        );
        adhocUpdated++;
      }
    }
    console.log(`✅ Fixed IDs in ${adhocUpdated}/${adhocRows.length} adhoc_transactions rows.`);

    // 3. Re-run commercial rate card linking for all rows with newly resolved IDs
    console.log('\n🔄 Linking customer_commercial_id and vendor_commercial_id for resolved transactions...');

    const [allFixed] = await conn.execute('SELECT TransactionID, CustomerID, ProjectID, VendorID FROM fixed_transactions');
    for (const row of allFixed) {
      let ccId = null;
      let vcId = null;

      if (row.CustomerID && row.ProjectID) {
        const [ccMatch] = await conn.execute(
          'SELECT id FROM customer_commercial WHERE customer_id = ? AND project_id = ? ORDER BY id DESC LIMIT 1',
          [row.CustomerID, row.ProjectID]
        );
        if (ccMatch.length > 0) ccId = ccMatch[0].id;
      }
      if (row.VendorID && row.ProjectID) {
        const [vcMatch] = await conn.execute(
          'SELECT id FROM vendor_commercial WHERE vendor_id = ? AND project_id = ? ORDER BY id DESC LIMIT 1',
          [row.VendorID, row.ProjectID]
        );
        if (vcMatch.length > 0) vcId = vcMatch[0].id;
      }

      if (ccId || vcId) {
        await conn.execute(
          'UPDATE fixed_transactions SET customer_commercial_id = COALESCE(customer_commercial_id, ?), vendor_commercial_id = COALESCE(vendor_commercial_id, ?) WHERE TransactionID = ?',
          [ccId, vcId, row.TransactionID]
        );
      }
    }

    const [allAdhoc] = await conn.execute('SELECT TransactionID, CustomerID, ProjectID, VendorName FROM adhoc_transactions');
    for (const row of allAdhoc) {
      let ccId = null;
      let vcId = null;

      if (row.CustomerID && row.ProjectID) {
        const [ccMatch] = await conn.execute(
          'SELECT id FROM customer_commercial WHERE customer_id = ? AND project_id = ? ORDER BY id DESC LIMIT 1',
          [row.CustomerID, row.ProjectID]
        );
        if (ccMatch.length > 0) ccId = ccMatch[0].id;
      }
      if (row.VendorName && row.ProjectID) {
        const [vcMatch] = await conn.execute(
          'SELECT id FROM vendor_commercial WHERE vendor_name = ? AND project_id = ? ORDER BY id DESC LIMIT 1',
          [row.VendorName, row.ProjectID]
        );
        if (vcMatch.length > 0) vcId = vcMatch[0].id;
      }

      if (ccId || vcId) {
        await conn.execute(
          'UPDATE adhoc_transactions SET customer_commercial_id = COALESCE(customer_commercial_id, ?), vendor_commercial_id = COALESCE(vendor_commercial_id, ?) WHERE TransactionID = ?',
          [ccId, vcId, row.TransactionID]
        );
      }
    }

    console.log('\n🎉 Fix and Auto-Resolution script completed successfully!');
  } catch (err) {
    console.error('❌ Migration Error:', err);
  } finally {
    await conn.end();
  }
}

fixNullIDs();
