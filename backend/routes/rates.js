const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const XLSX = require('xlsx');

// Configure multer for rates file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/rates');

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    const filename = `rates_${timestamp}_${basename}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit (increased for large files)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  }
});

// This file handles rates annexure import functionality
module.exports = (pool) => {
  // Get rates template
  router.get('/template', async (req, res) => {
    try {
      // Create a sample rates template
      const templateData = [
        {
          'Customer Code': 'CUST001',
          'Customer Name': 'Sample Customer',
          'Project Name': 'Sample Project',
          'Location': 'Mumbai',
          'Vehicle Type': 'Truck 10MT',
          'Base Rate': 1500,
          'Fuel Rate': 100,
          'Toll Rate': 200,
          'Loading Charges': 500,
          'Unloading Charges': 300,
          'Other Charges': 0,
          'Effective From': '2024-01-01',
          'Effective To': '2024-12-31',
          'Remarks': 'Sample rates'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rates Template');

      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Customer Code
        { wch: 20 }, // Customer Name
        { wch: 20 }, // Project Name
        { wch: 15 }, // Location
        { wch: 15 }, // Vehicle Type
        { wch: 10 }, // Base Rate
        { wch: 10 }, // Fuel Rate
        { wch: 10 }, // Toll Rate
        { wch: 15 }, // Loading Charges
        { wch: 17 }, // Unloading Charges
        { wch: 15 }, // Other Charges
        { wch: 15 }, // Effective From
        { wch: 15 }, // Effective To
        { wch: 20 }  // Remarks
      ];

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="rates_template.xlsx"');
      res.send(buffer);

    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({
        error: 'Failed to generate template',
        details: error.message
      });
    }
  });

  // Import rates from Excel/CSV
  router.post('/import', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      const { customerId, projectId, locationId } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log('📊 RATES IMPORT REQUEST RECEIVED:');
      console.log(`   File: ${file.originalname}`);
      console.log(`   Customer ID: ${customerId}`);
      console.log(`   Project ID: ${projectId}`);
      console.log(`   Location ID: ${locationId}`);

      // Parse the Excel/CSV file
      const workbook = XLSX.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        return res.status(400).json({ error: 'No data found in the uploaded file' });
      }

      console.log(`📊 Processing ${jsonData.length} rates records...`);

      // Validate and process the data
      const validationResults = await validateRatesData(jsonData, pool);
      const processedData = await processRatesData(jsonData, customerId, projectId, locationId, pool);

      // Save the rates data to database
      const saveResults = await saveRatesData(processedData, customerId, pool);

      // Save the uploaded file reference
      if (customerId) {
        await pool.query(
          'UPDATE Customer SET RatesAnnexureFile = ? WHERE CustomerID = ?',
          [file.filename, customerId]
        );
      }

      // Clean up uploaded file
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError);
      }

      res.json({
        message: 'Rates imported successfully',
        filename: file.originalname,
        recordsProcessed: jsonData.length,
        validationResults,
        saveResults
      });

    } catch (error) {
      console.error('Rates import error:', error);
      res.status(500).json({
        error: 'Failed to import rates',
        details: error.message
      });
    }
  });

  // Get rates for a customer/project/location
  router.get('/', async (req, res) => {
    try {
      const { customerId, projectId, locationId } = req.query;

      let query = `
        SELECT c.CustomerID, c.CustomerCode, c.Name as CustomerName,
               p.ProjectID, p.ProjectName, p.ProjectCode,
               l.LocationID, l.LocationName,
               c.Rates, c.RatesAnnexureFile
        FROM Customer c
        LEFT JOIN Project p ON c.CustomerID = p.CustomerID
        LEFT JOIN Location l ON c.CustomerID = l.CustomerID
        WHERE 1=1
      `;

      const params = [];

      if (customerId) {
        query += ' AND c.CustomerID = ?';
        params.push(customerId);
      }

      if (projectId) {
        query += ' AND p.ProjectID = ?';
        params.push(projectId);
      }

      if (locationId) {
        query += ' AND l.LocationID = ?';
        params.push(locationId);
      }

      const [results] = await pool.query(query, params);

      // Parse rates JSON data
      const ratesData = results.map(row => ({
        ...row,
        rates: row.Rates ? JSON.parse(row.Rates) : []
      }));

      res.json({
        rates: ratesData,
        totalRecords: ratesData.length
      });

    } catch (error) {
      console.error('Error fetching rates:', error);
      res.status(500).json({
        error: 'Failed to fetch rates',
        details: error.message
      });
    }
  });

  // Update rates for a customer
  router.put('/:customerId', async (req, res) => {
    try {
      const { customerId } = req.params;
      const { rates } = req.body;

      if (!rates || !Array.isArray(rates)) {
        return res.status(400).json({ error: 'Invalid rates data' });
      }

      // Validate rates data
      const validationErrors = validateRatesStructure(rates);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationErrors
        });
      }

      // Save rates as JSON
      const ratesJson = JSON.stringify(rates);
      await pool.query(
        'UPDATE Customer SET Rates = ? WHERE CustomerID = ?',
        [ratesJson, customerId]
      );

      res.json({
        message: 'Rates updated successfully',
        customerId,
        ratesCount: rates.length
      });

    } catch (error) {
      console.error('Error updating rates:', error);
      res.status(500).json({
        error: 'Failed to update rates',
        details: error.message
      });
    }
  });

  // Delete rates annexure file
  router.delete('/:customerId/file', async (req, res) => {
    try {
      const { customerId } = req.params;

      // Get current file reference
      const [customers] = await pool.query(
        'SELECT RatesAnnexureFile FROM Customer WHERE CustomerID = ?',
        [customerId]
      );

      if (customers.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const customer = customers[0];
      const filename = customer.RatesAnnexureFile;

      if (filename) {
        // Delete physical file
        const filePath = path.join(__dirname, '../uploads/rates', filename);
        try {
          await fs.unlink(filePath);
        } catch (fsError) {
          console.warn('Physical file deletion failed:', fsError);
        }

        // Remove file reference from database
        await pool.query(
          'UPDATE Customer SET RatesAnnexureFile = NULL WHERE CustomerID = ?',
          [customerId]
        );
      }

      res.json({ message: 'Rates annexure file deleted successfully' });

    } catch (error) {
      console.error('Error deleting rates file:', error);
      res.status(500).json({
        error: 'Failed to delete rates file',
        details: error.message
      });
    }
  });

  return router;
};

// Helper function to validate rates data
async function validateRatesData(jsonData, pool) {
  const results = {
    validRecords: 0,
    invalidRecords: 0,
    errors: []
  };

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowNumber = i + 2; // +2 because Excel rows start at 1 and we have headers

    try {
      // Check required fields
      const requiredFields = ['Customer Code', 'Vehicle Type', 'Base Rate'];
      const missingFields = requiredFields.filter(field => !row[field]);

      if (missingFields.length > 0) {
        results.errors.push({
          row: rowNumber,
          type: 'missing_fields',
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
        results.invalidRecords++;
        continue;
      }

      // Validate customer exists
      if (row['Customer Code']) {
        const [customers] = await pool.query(
          'SELECT CustomerID FROM Customer WHERE CustomerCode = ?',
          [row['Customer Code']]
        );

        if (customers.length === 0) {
          results.errors.push({
            row: rowNumber,
            type: 'invalid_customer',
            message: `Customer code '${row['Customer Code']}' not found`
          });
          results.invalidRecords++;
          continue;
        }
      }

      // Validate numeric fields
      const numericFields = ['Base Rate', 'Fuel Rate', 'Toll Rate', 'Loading Charges', 'Unloading Charges', 'Other Charges'];
      for (const field of numericFields) {
        if (row[field] && isNaN(parseFloat(row[field]))) {
          results.errors.push({
            row: rowNumber,
            type: 'invalid_number',
            message: `Invalid number format for '${field}': ${row[field]}`
          });
          results.invalidRecords++;
          continue;
        }
      }

      // Validate date fields
      const dateFields = ['Effective From', 'Effective To'];
      for (const field of dateFields) {
        if (row[field]) {
          const date = new Date(row[field]);
          if (isNaN(date.getTime())) {
            results.errors.push({
              row: rowNumber,
              type: 'invalid_date',
              message: `Invalid date format for '${field}': ${row[field]}`
            });
            results.invalidRecords++;
            continue;
          }
        }
      }

      results.validRecords++;

    } catch (error) {
      results.errors.push({
        row: rowNumber,
        type: 'processing_error',
        message: `Error processing row: ${error.message}`
      });
      results.invalidRecords++;
    }
  }

  return results;
}

// Helper function to process rates data
async function processRatesData(jsonData, customerId, projectId, locationId, pool) {
  const processedData = [];

  for (const row of jsonData) {
    try {
      // Get customer ID if not provided
      let targetCustomerId = customerId;
      if (!targetCustomerId && row['Customer Code']) {
        const [customers] = await pool.query(
          'SELECT CustomerID FROM Customer WHERE CustomerCode = ?',
          [row['Customer Code']]
        );
        if (customers.length > 0) {
          targetCustomerId = customers[0].CustomerID;
        }
      }

      // Get project ID if provided
      let targetProjectId = projectId;
      if (!targetProjectId && row['Project Name']) {
        const [projects] = await pool.query(
          'SELECT ProjectID FROM Project WHERE ProjectName = ? AND CustomerID = ?',
          [row['Project Name'], targetCustomerId]
        );
        if (projects.length > 0) {
          targetProjectId = projects[0].ProjectID;
        }
      }

      // Get location ID if provided
      let targetLocationId = locationId;
      if (!targetLocationId && row['Location']) {
        const [locations] = await pool.query(
          'SELECT LocationID FROM Location WHERE LocationName = ? AND CustomerID = ?',
          [row['Location'], targetCustomerId]
        );
        if (locations.length > 0) {
          targetLocationId = locations[0].LocationID;
        }
      }

      const processedRow = {
        customerId: targetCustomerId,
        projectId: targetProjectId,
        locationId: targetLocationId,
        vehicleType: row['Vehicle Type'] || '',
        baseRate: parseFloat(row['Base Rate']) || 0,
        fuelRate: parseFloat(row['Fuel Rate']) || 0,
        tollRate: parseFloat(row['Toll Rate']) || 0,
        loadingCharges: parseFloat(row['Loading Charges']) || 0,
        unloadingCharges: parseFloat(row['Unloading Charges']) || 0,
        otherCharges: parseFloat(row['Other Charges']) || 0,
        effectiveFrom: row['Effective From'] ? new Date(row['Effective From']) : null,
        effectiveTo: row['Effective To'] ? new Date(row['Effective To']) : null,
        remarks: row['Remarks'] || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      processedData.push(processedRow);

    } catch (error) {
      console.error('Error processing row:', error);
      // Continue processing other rows
    }
  }

  return processedData;
}

// Helper function to save rates data
async function saveRatesData(processedData, customerId, pool) {
  const results = {
    savedRecords: 0,
    failedRecords: 0,
    errors: []
  };

  try {
    // Group rates by customer
    const ratesByCustomer = {};
    processedData.forEach(rate => {
      const custId = rate.customerId || customerId;
      if (!ratesByCustomer[custId]) {
        ratesByCustomer[custId] = [];
      }
      ratesByCustomer[custId].push(rate);
    });

    // Save rates for each customer
    for (const [custId, rates] of Object.entries(ratesByCustomer)) {
      try {
        // Get existing rates
        const [customers] = await pool.query(
          'SELECT Rates FROM Customer WHERE CustomerID = ?',
          [custId]
        );

        let existingRates = [];
        if (customers.length > 0 && customers[0].Rates) {
          existingRates = JSON.parse(customers[0].Rates);
        }

        // Merge new rates with existing ones
        const mergedRates = [...existingRates, ...rates];

        // Save back to database
        const ratesJson = JSON.stringify(mergedRates);
        await pool.query(
          'UPDATE Customer SET Rates = ? WHERE CustomerID = ?',
          [ratesJson, custId]
        );

        results.savedRecords += rates.length;

      } catch (error) {
        console.error(`Error saving rates for customer ${custId}:`, error);
        results.errors.push({
          customerId: custId,
          error: error.message
        });
        results.failedRecords += rates.length;
      }
    }

  } catch (error) {
    console.error('Error in saveRatesData:', error);
    results.errors.push({
      type: 'general_error',
      error: error.message
    });
  }

  return results;
}

// Helper function to validate rates structure
function validateRatesStructure(rates) {
  const errors = [];

  if (!Array.isArray(rates)) {
    errors.push('Rates must be an array');
    return errors;
  }

  rates.forEach((rate, index) => {
    if (!rate.vehicleType) {
      errors.push(`Rate ${index + 1}: Vehicle type is required`);
    }

    if (typeof rate.baseRate !== 'number' || rate.baseRate < 0) {
      errors.push(`Rate ${index + 1}: Base rate must be a positive number`);
    }

    if (rate.effectiveFrom && isNaN(new Date(rate.effectiveFrom).getTime())) {
      errors.push(`Rate ${index + 1}: Invalid effective from date`);
    }

    if (rate.effectiveTo && isNaN(new Date(rate.effectiveTo).getTime())) {
      errors.push(`Rate ${index + 1}: Invalid effective to date`);
    }
  });

  return errors;
}
