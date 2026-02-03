const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const logFile = path.join(__dirname, 'azure_test_debug.txt');
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

async function debugCustomerInsert() {
    fs.writeFileSync(logFile, '--- Debug Log ---\n');
    log('Checking Database Connection...');

    const isAzure = process.env.DB_HOST && process.env.DB_HOST.includes('azure.com');
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: isAzure ? { rejectUnauthorized: false } : false
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        log('✅ Database Connected');

        // 1. Show Columns
        const [cols] = await connection.execute("SHOW COLUMNS FROM Customer");
        log(`Customer Columns (${cols.length}):`);
        cols.forEach(c => log(` - ${c.Field} (${c.Type}) Null: ${c.Null}`));

        // 2. Try Dummy Insert (Minimal)
        const code = 'TEST' + Date.now().toString().slice(-4);
        log(`Attempting insert with code: ${code}`);

        const query = "INSERT INTO Customer (Name, CustomerCode) VALUES (?, ?)";
        await connection.execute(query, ['Test Customer', code]);
        log('✅ Minimal Insert Successful');

        // 3. Try to clean up
        await connection.execute("DELETE FROM Customer WHERE CustomerCode = ?", [code]);
        log('✅ Cleanup Successful');

    } catch (err) {
        log('❌ Error: ' + err.message);
        log('Stack: ' + err.stack);
    } finally {
        if (connection) await connection.end();
    }
}

debugCustomerInsert();
