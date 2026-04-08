const mysql = require('mysql2/promise');

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Assuming default for now, I should check if there's a config file
    database: 'tms_database' // I need to find the actual database name
  });

  try {
    const [fixedSchema] = await connection.query('DESCRIBE fixed_transactions');
    console.log('--- fixed_transactions ---');
    console.table(fixedSchema);

    const [adhocSchema] = await connection.query('DESCRIBE adhoc_transactions');
    console.log('--- adhoc_transactions ---');
    console.table(adhocSchema);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkSchema();
