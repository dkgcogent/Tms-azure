const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function getStructure() {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false }
        });

        const [columns] = await conn.execute('DESCRIBE Customer');
        const result = columns.map(c => `${c.Field} | ${c.Type} | ${c.Null}`).join('\n');
        fs.writeFileSync('customer_structure.txt', result);
        console.log('Structure saved to customer_structure.txt');

        await conn.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

getStructure();
