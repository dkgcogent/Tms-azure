const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host: 'tmsdatabase.mysql.database.azure.com', user: 'tmsdkg', password: 'Test@123', database: 'tmsdatabase', ssl: {rejectUnauthorized: false}});
  const [rows] = await conn.query('SELECT id, master_customer, project FROM customer_commercial WHERE customer_id IS NULL OR project_id IS NULL');
  
  for (const row of rows) {
    let custId = null;
    let projId = null;
    if (row.master_customer) {
      const parts = row.master_customer.split('/');
      if (parts.length > 1) custId = parseInt(parts[parts.length - 1].trim(), 10);
    }
    if (row.project) {
      const parts = row.project.split('/');
      if (parts.length > 1) projId = parseInt(parts[parts.length - 1].trim(), 10);
    }
    
    if (custId || projId) {
      await conn.query('UPDATE customer_commercial SET customer_id = ?, project_id = ? WHERE id = ?', [custId, projId, row.id]);
      console.log(`Updated row ${row.id}: customer_id=${custId}, project_id=${projId}`);
    }
  }
  console.log('Done backfilling!');
  conn.end();
}
run();
