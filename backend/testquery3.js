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
    const [rows] = await conn.execute(
      "SELECT * FROM customer_commercial WHERE (project LIKE '%Flipkart%' OR master_customer LIKE '%Flipkart%' OR company_name LIKE '%Flipkart%') AND type_of_vehicle_placement = 'Fixed'"
    );
    console.log(rows.length);
    await conn.end();
  } catch(e) {
    console.error(e);
  }
}
run();
