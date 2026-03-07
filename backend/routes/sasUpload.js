/**
 * SAS Upload Route
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a short-lived Azure Blob Storage SAS (Shared Access Signature)
 * upload URL so the browser can PUT files directly into Azure Blob Storage
 * without routing the file body through the Vercel serverless function.
 *
 * This bypasses the ~4.5 MB Vercel request-body limit because the file never
 * touches the serverless function — only the tiny JSON response (the SAS URL)
 * does.
 *
 * Endpoint
 *   POST /api/sas-upload/generate
 *
 * Request Body (JSON)
 *   {
 *     "fileName"  : "invoice.pdf",           // original file name
 *     "fileType"  : "application/pdf",        // MIME type
 *     "entityType": "vehicles"                // blob folder (customers/vendors/…)
 *   }
 *
 * Response
 *   {
 *     "success"    : true,
 *     "sasUrl"     : "https://tmsstorage.blob.core.windows.net/tmsfiles/vehicles/1234-invoice.pdf?sv=…",
 *     "blobUrl"    : "https://tmsstorage.blob.core.windows.net/tmsfiles/vehicles/1234-invoice.pdf",
 *     "blobName"   : "vehicles/1234-invoice.pdf"
 *   }
 *
 * The client should:
 *   1. Call this endpoint to get a SAS URL.
 *   2. PUT the file directly to sasUrl with header x-ms-blob-type: BlockBlob.
 *   3. Store blobUrl in the database field (pass it back in the main form POST).
 */

const express = require('express');
const router = express.Router();
const {
    StorageSharedKeyCredential,
    BlobSASPermissions,
    generateBlobSASQueryParameters,
    BlobServiceClient,
} = require('@azure/storage-blob');

// ─── Allowed MIME types (mirrors the frontend FileFilter) ──────────────────
const ALLOWED_TYPES = new Set([
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
]);

// ─── Allowed entity / folder names ────────────────────────────────────────
const ALLOWED_ENTITIES = new Set([
    'customers', 'vendors', 'vehicles', 'drivers', 'projects',
    'daily-vehicle-transactions', 'misc',
]);

module.exports = () => {
    /**
     * POST /api/sas-upload/generate
     * Returns a time-limited SAS URL the browser can use to PUT a blob.
     */
    router.post('/generate', async (req, res) => {
        try {
            const { fileName, fileType, entityType = 'misc' } = req.body;

            // ── Validate inputs ──────────────────────────────────────────────────
            if (!fileName || typeof fileName !== 'string') {
                return res.status(400).json({ success: false, error: 'fileName is required' });
            }
            if (!fileType || !ALLOWED_TYPES.has(fileType)) {
                return res.status(400).json({
                    success: false,
                    error: `File type "${fileType}" is not allowed. Accepted: images, PDF, Word, Excel, CSV.`,
                });
            }
            if (!ALLOWED_ENTITIES.has(entityType)) {
                return res.status(400).json({
                    success: false,
                    error: `entityType "${entityType}" is not recognized.`,
                });
            }

            // ── Azure credentials ────────────────────────────────────────────────
            const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
            const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
            const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

            if (!accountName || !accountKey) {
                console.error('❌ SAS Upload: Missing Azure Storage credentials.');
                return res
                    .status(500)
                    .json({ success: false, error: 'Storage service is not configured.' });
            }

            // ── Build blob name ──────────────────────────────────────────────────
            // Sanitise the original file name so it's safe for Azure blob names.
            const sanitised = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const blobName = `${entityType}/${Date.now()}-${sanitised}`;

            // ── Ensure container exists (no-op if already created) ───────────────
            const sharedKeyCredential = new StorageSharedKeyCredential(
                accountName,
                accountKey
            );
            const blobServiceClient = new BlobServiceClient(
                `https://${accountName}.blob.core.windows.net`,
                sharedKeyCredential
            );
            const containerClient = blobServiceClient.getContainerClient(containerName);
            // Create with public access = 'blob' so stored URLs are publicly readable.
            await containerClient.createIfNotExists({ access: 'blob' }).catch(() => {
                // Ignore if it already exists or we lack list-containers permission.
            });

            // ── Generate SAS token (create + write, 1 hour) ──────────────────────
            const startsOn = new Date();
            const expiresOn = new Date(startsOn.getTime() + 60 * 60 * 1000); // +1 h

            const sasQueryParams = generateBlobSASQueryParameters(
                {
                    containerName,
                    blobName,
                    permissions: BlobSASPermissions.from({ create: true, write: true }),
                    startsOn,
                    expiresOn,
                    contentType: fileType,
                },
                sharedKeyCredential
            );

            const sasToken = sasQueryParams.toString();
            const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`;
            const sasUrl = `${blobUrl}?${sasToken}`;

            console.log(
                `✅ SAS URL generated for blob: ${blobName} (expires ${expiresOn.toISOString()})`
            );

            return res.json({
                success: true,
                sasUrl,          // Use this for the PUT request (includes SAS token)
                blobUrl,         // Store this in the database (public URL without token)
                blobName,
            });
        } catch (error) {
            console.error('❌ SAS Upload generate error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to generate upload URL. Please try again.',
                details: error.message,
            });
        }
    });

    return router;
};
