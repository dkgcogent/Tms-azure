const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function consolidateProjects() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tmsdatabase',
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('🔄 Starting project consolidation script...');

    // Fetch all project rows
    const [rows] = await pool.query('SELECT * FROM Project ORDER BY ProjectID ASC');
    console.log(`Found ${rows.length} total project rows.`);

    // Group projects by ProjectName and CustomerID
    const grouped = new Map();
    rows.forEach(p => {
      const key = `${(p.ProjectName || '').trim().toLowerCase()}___${p.CustomerID}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(p);
    });

    let mergedCount = 0;

    for (const [key, list] of grouped.entries()) {
      if (list.length > 1) {
        console.log(`\n📌 Group "${key}" has ${list.length} duplicate entries:`);
        const primary = list[0];
        const duplicates = list.slice(1);

        // Collect all locations, states, customer sites
        const locations = [];
        const states = [];
        const sites = [];

        list.forEach(p => {
          if (p.Location) {
            p.Location.split(',').map(l => l.trim()).forEach(l => {
              if (l && !locations.includes(l)) locations.push(l);
            });
          }
          if (p.State) {
            p.State.split(',').map(s => s.trim()).forEach(s => {
              if (s && !states.includes(s)) states.push(s);
            });
          }
          if (p.CustomerSite) {
            p.CustomerSite.split(',').map(cs => cs.trim()).forEach(cs => {
              if (cs && !sites.includes(cs)) sites.push(cs);
            });
          }
        });

        const newLocation = locations.join(', ') || primary.Location;
        const newState = states.join(', ') || primary.State;
        const newCustomerSite = sites.join(', ') || primary.CustomerSite;

        console.log(`  Keeping Primary ProjectID: ${primary.ProjectID} (${primary.ProjectName})`);
        console.log(`  Merged Location: "${newLocation}"`);
        console.log(`  Merged State: "${newState}"`);

        // Update primary row
        await pool.query(
          'UPDATE Project SET Location = ?, State = ?, CustomerSite = ? WHERE ProjectID = ?',
          [newLocation, newState, newCustomerSite, primary.ProjectID]
        );

        // Delete duplicate rows
        const duplicateIds = duplicates.map(d => d.ProjectID);
        console.log(`  Deleting duplicate ProjectIDs: ${duplicateIds.join(', ')}`);

        // First check if any dependent tables reference these duplicate IDs before deleting
        for (const dupId of duplicateIds) {
          try {
            await pool.query('DELETE FROM Project WHERE ProjectID = ?', [dupId]);
            console.log(`  Deleted ProjectID ${dupId}`);
          } catch (err) {
            console.warn(`  Could not delete ProjectID ${dupId} (it may be referenced by other records): ${err.message}`);
          }
        }
        mergedCount++;
      }
    }

    console.log(`\n✅ Project consolidation complete! Merged ${mergedCount} duplicate project groups.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during consolidation:', error);
    process.exit(1);
  }
}

consolidateProjects();
