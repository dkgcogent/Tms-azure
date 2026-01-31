const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { entityType, category } = req.body;
    const uploadPath = path.join(__dirname, '../uploads', entityType, category);

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const { entityId } = req.body;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    const filename = `${entityId}_${category}_${timestamp}_${basename}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit (increased for large PDF documents)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// This file handles import functionality for documents and data
module.exports = (pool) => {
  // Upload files endpoint
  router.post('/upload', upload.array('files', 10), async (req, res) => {
    try {
      const { entityType, category, entityId } = req.body;
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      console.log(`📁 UPLOAD REQUEST RECEIVED:`);
      console.log(`   Entity Type: ${entityType}`);
      console.log(`   Category: ${category}`);
      console.log(`   Entity ID: ${entityId}`);
      console.log(`   Files: ${files.length}`);

      const results = {
        totalFiles: files.length,
        successfulUploads: 0,
        failedUploads: 0,
        files: []
      };

      // Process each uploaded file
      for (const file of files) {
        try {
          // Save file information to database
          const fileRecord = {
            entityType,
            entityId: parseInt(entityId),
            category,
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            uploadedAt: new Date()
          };

          // Insert into database based on entity type and category
          await saveFileRecord(pool, fileRecord);

          results.successfulUploads++;
          results.files.push({
            originalName: file.originalname,
            filename: file.filename,
            size: file.size,
            status: 'success'
          });

        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          results.failedUploads++;
          results.files.push({
            originalName: file.originalname,
            status: 'failed',
            error: error.message
          });
        }
      }

      console.log(`📁 UPLOAD COMPLETED: ${results.successfulUploads}/${results.totalFiles} files uploaded successfully`);

      res.json({
        message: 'Files uploaded successfully',
        ...results
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        error: 'Failed to upload files',
        details: error.message
      });
    }
  });

  // Get uploaded files for an entity
  router.get('/:entityType/:entityId/files', async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { category } = req.query;

      let query = `
        SELECT * FROM FileUploads
        WHERE entityType = ? AND entityId = ?
      `;
      const params = [entityType, entityId];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY uploadedAt DESC';

      const [files] = await pool.query(query, params);

      res.json({
        entityType,
        entityId,
        files: files.map(file => ({
          id: file.id,
          category: file.category,
          originalName: file.originalName,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          uploadedAt: file.uploadedAt,
          url: `/api/files/${file.filename}`
        }))
      });

    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({
        error: 'Failed to fetch files',
        details: error.message
      });
    }
  });

  // Delete uploaded file
  router.delete('/files/:filename', async (req, res) => {
    try {
      const { filename } = req.params;

      // Get file info from database
      const [files] = await pool.query(
        'SELECT * FROM FileUploads WHERE filename = ?',
        [filename]
      );

      if (files.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }

      const file = files[0];

      // Delete physical file
      try {
        await fs.unlink(file.path);
      } catch (fsError) {
        console.warn('Physical file deletion failed:', fsError);
      }

      // Delete database record
      await pool.query('DELETE FROM FileUploads WHERE id = ?', [file.id]);

      res.json({ message: 'File deleted successfully' });

    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({
        error: 'Failed to delete file',
        details: error.message
      });
    }
  });

  // Import commercial rates from Excel/CSV
  router.post('/commercial-rates', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Here you would implement the logic to parse Excel/CSV and import commercial rates
      // For now, just return success

      res.json({
        message: 'Commercial rates imported successfully',
        filename: file.originalname,
        recordsProcessed: 0 // This would be the actual count
      });

    } catch (error) {
      console.error('Commercial rates import error:', error);
      res.status(500).json({
        error: 'Failed to import commercial rates',
        details: error.message
      });
    }
  });

  return router;
};

// Helper function to save file record to appropriate table
async function saveFileRecord(pool, fileRecord) {
  const { entityType, entityId, category, originalName, filename, mimetype, size, path } = fileRecord;

  // First, ensure FileUploads table exists
  await ensureFileUploadsTable(pool);

  // Insert into FileUploads table
  await pool.query(`
    INSERT INTO FileUploads (
      entityType, entityId, category, originalName, filename,
      mimetype, size, path, uploadedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `, [entityType, entityId, category, originalName, filename, mimetype, size, path]);

  // Update the specific entity table with file reference
  const updateQueries = {
    customers: getCustomerUpdateQuery(category),
    vendors: getVendorUpdateQuery(category),
    vehicles: getVehicleUpdateQuery(category),
    drivers: getDriverUpdateQuery(category)
  };

  if (updateQueries[entityType]) {
    const query = updateQueries[entityType];
    if (query) {
      await pool.query(query, [filename, entityId]);
    }
  }
}

// Helper function to ensure FileUploads table exists
async function ensureFileUploadsTable(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS FileUploads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entityType VARCHAR(50) NOT NULL,
        entityId INT NOT NULL,
        category VARCHAR(100) NOT NULL,
        originalName VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        mimetype VARCHAR(100) NOT NULL,
        size INT NOT NULL,
        path VARCHAR(500) NOT NULL,
        uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_entity (entityType, entityId),
        INDEX idx_category (category)
      )
    `);
  } catch (error) {
    console.warn('FileUploads table creation failed:', error);
  }
}

// Helper functions for entity-specific updates
function getCustomerUpdateQuery(category) {
  const fieldMap = {
    agreement: 'AgreementFile',
    bg: 'BGFile',
    po: 'POFile',
    annexure: 'AnnexureFile',
    mis: 'MISFormat',
    kpi: 'KPISLA',
    performance: 'PerformanceReport'
  };

  const field = fieldMap[category];
  return field ? `UPDATE Customer SET ${field} = ? WHERE CustomerID = ?` : null;
}

function getVendorUpdateQuery(category) {
  const fieldMap = {
    aadhar: 'VendorAadharDoc',
    pan: 'VendorPANDoc',
    gst: 'VendorCompanyGSTDoc',
    company_pan: 'VendorCompanyPANDoc',
    udhyam: 'VendorCompanyUdhyamDoc',
    legal: 'CompanyLegalDocs',
    cheque: 'BankChequeUpload',
    photo: 'VendorPhoto'
  };

  const field = fieldMap[category];
  return field ? `UPDATE Vendor SET ${field} = ? WHERE VendorID = ?` : null;
}

function getVehicleUpdateQuery(category) {
  const fieldMap = {
    rc: 'RCUpload',
    insurance: 'InsuranceCopy',
    fitness: 'FitnessCertificateUpload',
    pollution: 'PollutionPhoto',
    tax: 'StateTaxPhoto',
    photo: 'VehiclePhoto',
    kms_photo: 'VehicleKMSPhoto',
    service_bill: 'ServiceBillPhoto'
  };

  const field = fieldMap[category];
  return field ? `UPDATE Vehicle SET ${field} = ? WHERE VehicleID = ?` : null;
}

function getDriverUpdateQuery(category) {
  const fieldMap = {
    license: 'DriverLicenceDoc',
    photo: 'DriverPhoto',
    medical: 'MedicalCertificate'
  };

  const field = fieldMap[category];
  return field ? `UPDATE Driver SET ${field} = ? WHERE DriverID = ?` : null;
}
