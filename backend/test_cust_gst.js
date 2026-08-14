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
    const [rows] = await conn.execute("SELECT CustomerID, CustomerCode, Name, CustomerSite, GSTNo FROM customer WHERE CustomerCode IN ('FIF001', 'RQS001')");
    console.log(rows);
    await conn.end();
  } catch(e) {
    console.error(e);
  }
}
run();
