const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadsManager = require('./uploadsManager');
// Import our custom Azure engine
// Note: We are reusing the file 'azureUploadsManager.js' as the engine module
const AzureStorageEngine = require('./azureUploadsManager');

/**
 * Factory function to create Multer middleware based on storage type
 * @param {string} entityType - The entity type (e.g., 'customers', 'drivers') to organize files
 * @returns {multer.Instance} Configured multer instance
 */
const createUploadMiddleware = (entityType) => {
    const storageType = process.env.STORAGE_TYPE || 'LOCAL';

    if (storageType === 'AZURE') {
        // Azure Storage Configuration
        return multer({
            storage: AzureStorageEngine({
                getDestination: (req, file, cb) => {
                    // We simplify: just pass the entity type as the folder name.
                    // In standard diskStorage, this was an absolute path. 
                    // In our Azure engine, we interpret this string as the "folder" prefix in the blob container.
                    cb(null, entityType);
                }
            }),
            limits: {
                fileSize: 20 * 1024 * 1024 // 20MB
            },
            fileFilter: getFileFilter()
        });
    } else {
        // Local Disk Storage Configuration
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadDir = uploadsManager.ensureEntityDirectory(entityType);
                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                // Preserve original extension
                const ext = path.extname(file.originalname);
                const namePart = path.basename(file.originalname, ext);
                cb(null, `${entityType}-${uniqueSuffix}${ext}`);
            }
        });

        return multer({
            storage: storage,
            limits: {
                fileSize: 20 * 1024 * 1024
            },
            fileFilter: getFileFilter()
        });
    }
};

// Reusable file filter
const getFileFilter = () => (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        req.fileValidationError = `File "${file.originalname}" has an unsupported format.`;
        cb(null, false);
    }
};

module.exports = { createUploadMiddleware };
