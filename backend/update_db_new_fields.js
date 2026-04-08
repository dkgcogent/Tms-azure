const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDb() {
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
        console.log('✅ Connected to database');

        console.log('Updating fixed_transactions...');
        await connection.execute(`ALTER TABLE fixed_transactions ADD COLUMN ServiceDate DATE NULL AFTER TransactionDate`);
        await connection.execute(`ALTER TABLE fixed_transactions ADD COLUMN VehicleReturnDate DATE NULL AFTER ServiceDate`);

        // Add ProjectName column if not exists
        const [ftCols] = await connection.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fixed_transactions' AND COLUMN_NAME = 'ProjectName'`
        );
        if (ftCols.length === 0) {
            await connection.execute(`ALTER TABLE fixed_transactions ADD COLUMN ProjectName VARCHAR(255) NULL AFTER ProjectID`);
            console.log('✅ ProjectName column added to fixed_transactions');
        } else {
            console.log('✅ ProjectName already exists in fixed_transactions');
        }
        console.log('✅ fixed_transactions updated');

        console.log('Updating adhoc_transactions...');
        await connection.execute(`ALTER TABLE adhoc_transactions ADD COLUMN ServiceDate DATE NULL AFTER TransactionDate`);
        await connection.execute(`ALTER TABLE adhoc_transactions ADD COLUMN VehicleReturnDate DATE NULL AFTER ServiceDate`);
        console.log('✅ adhoc_transactions updated');

        await connection.end();
        console.log('Database update complete');
    } catch (err) {
        console.error('❌ Database update failed:', err.message);
        process.exit(1);
    }
}

updateDb();
