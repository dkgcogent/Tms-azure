const mysql = require('mysql2/promise');
const { BlobServiceClient } = require("@azure/storage-blob");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testConnections() {
    console.log('--- Testing Azure Connections ---');

    // 1. Test Database
    console.log('\nTesting Database Connection...');
    const isAzure = process.env.DB_HOST && process.env.DB_HOST.includes('azure.com');
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: isAzure ? { rejectUnauthorized: false } : false
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Database Connection Successful!', isAzure ? '(SSL Enabled)' : '(Local/No SSL)');

        // Check Customer table
        try {
            const [columns] = await connection.execute("SHOW COLUMNS FROM Customer");
            console.log('✅ Customer table exists. Column count:', columns.length);
            const colNames = columns.map(c => c.Field);
            // Check for specific columns used in INSERT
            const required = ['MasterCustomerName', 'AgreementFile', 'AgreementFileUrl']; // Check if Url columns exist?
            // Wait, current code does NOT use Url columns in INSERT for Customer table?
            // customer.js INSERT (lines 448-449) does NOT list AgreementFileUrl, BGFileUrl etc.
            // It lists AgreementFile, BGFile...
            // But `addFileUrls` helper ADDS *Url properties to the OBJECT returned to API.
            // The DB table probably only has `AgreementFile` (string path).
            // Let's check if AgreementFile exists.
            console.log('   Checking AgreementFile:', colNames.includes('AgreementFile') ? 'OK' : 'MISSING');
        } catch (e) {
            console.error('❌ Error checking Customer table:', e.message);
        }

        await connection.end();
    } catch (err) {
        console.error('❌ Database Connection Failed:', err.message);
        if (isAzure && err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('Hint: For Azure Single Server, try username format: user@servername');
        }
    }

    // 2. Test Blob Storage
    console.log('\nTesting Azure Blob Storage...');
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_CONTAINER_NAME || process.env.container_name;

    if (!connStr) {
        console.error('❌ No AZURE_STORAGE_CONNECTION_STRING in env');
        return;
    }

    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        console.log(`Checking container '${containerName}'...`);
        const exists = await containerClient.exists();
        if (exists) {
            console.log('✅ Container exists!');
        } else {
            console.log('⚠️ Container does not exist. Attempting to create...');
            await containerClient.create({ access: "container" });
            console.log('✅ Container created successfully!');
        }

        // Try uploading a dummy file
        const content = "Hello Azure";
        const blobName = `test-connection-${Date.now()}.txt`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.upload(content, content.length);
        console.log(`✅ Upload test successful! Blob: ${blobName}`);
        console.log(`   URL: ${blockBlobClient.url}`);

        // Clean up
        await blockBlobClient.delete();
        console.log('✅ Cleanup successful!');

    } catch (err) {
        console.error('❌ Azure Blob Storage Failed:', err.message);
    }
}

testConnections();
