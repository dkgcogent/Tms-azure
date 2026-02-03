const mysql = require('mysql2/promise');
require('dotenv').config();

async function verify() {
    console.log('--- Database Connection Verification ---');
    console.log(`Targeting Host: ${process.env.DB_HOST}`);
    console.log(`Database Name: ${process.env.DB_NAME}`);

    const isAzure = process.env.DB_HOST && process.env.DB_HOST.includes('azure.com');
    const dbConfig = {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: isAzure ? { rejectUnauthorized: false } : false
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ TCP Connection: SUCCESS');

        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM customer');
        console.log(`✅ Data Retrieval: SUCCESS (Found ${rows[0].count} customers)`);

        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`✅ Tables found: ${tables.length}`);

        await connection.end();
        console.log('\nResult: Database is connected perfectly.');
    } catch (err) {
        console.error('\n❌ Connection Failed!');
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}

verify();
