const mysql = require('mysql2/promise');
async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'tmsdatabase.mysql.database.azure.com',
      user: 'tmsdkg',
      password: 'Test@123',
      database: 'tmsdatabase',
      ssl: { rejectUnauthorized: false }
    });
    
    const query = `
      SELECT TransactionID, TransactionDate as date, ft.customer 
      FROM fixed_transactions ft 
      WHERE (ft.CustomerID = ? OR ft.customer = (SELECT COALESCE(MasterCustomerName, Name) FROM customer WHERE CustomerID = ? LIMIT 1)) 
        AND (ft.ProjectID = ? OR ft.ProjectName = (SELECT ProjectName FROM project WHERE ProjectID = ? LIMIT 1)) 
        AND ft.TransactionDate BETWEEN ? AND ?
    `;
    
    const [rows] = await conn.execute(query, [5, 5, 2, 2, '2024-07-31', '2026-08-30']);
    console.log('Transaction IDs:', rows.map(r => r.TransactionID).join(', '));
    await conn.end();
  } catch (e) {
    console.error(e);
  }
}
run();
