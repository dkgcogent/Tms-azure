const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function updateDb() {
    const isAzure = process.env.DB_HOST && process.env.DB_HOST.includes('azure.com');
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT) || 3306,
        ssl: isAzure ? { rejectUnauthorized: false } : false
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        const adhocColumns = [
            { name: 'CompanyName', type: 'VARCHAR(255) NULL', after: 'CustomerID' },
            { name: 'GSTNo', type: 'VARCHAR(20) NULL', after: 'CompanyName' },
            { name: 'Location', type: 'VARCHAR(255) NULL', after: 'GSTNo' },
            { name: 'CustomerSite', type: 'VARCHAR(255) NULL', after: 'Location' },
            { name: 'ProjectName', type: 'VARCHAR(255) NULL', after: 'ProjectID' }
        ];

        console.log('Updating adhoc_transactions table...');
        for (const col of adhocColumns) {
            const [cols] = await connection.execute(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'adhoc_transactions' AND COLUMN_NAME = ?`,
                [col.name]
            );
            if (cols.length === 0) {
                console.log(`Adding ${col.name} to adhoc_transactions...`);
                await connection.execute(`ALTER TABLE adhoc_transactions ADD COLUMN ${col.name} ${col.type} AFTER ${col.after}`);
                console.log(`✅ ${col.name} column added`);
            } else {
                console.log(`✅ ${col.name} already exists`);
            }
        }

        await connection.end();
        console.log('Database update complete');
    } catch (err) {
        console.error('❌ Database update failed:', err.message);
        process.exit(1);
    }
}

updateDb();
