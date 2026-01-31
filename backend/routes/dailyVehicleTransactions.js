const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const uploadsManager = require('../utils/uploadsManager');

// Helper function to convert boolean values
const convertToBoolean = (value) => {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  if (typeof value === 'number') return value === 1;
  return false;
};

// Configure multer for file uploads using external directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use external uploads directory for transactions
    const uploadDir = uploadsManager.ensureEntityDirectory('transactions');
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit (increased for large PDF documents)
  },
  fileFilter: function (req, file, cb) {
    // Allow only specific file types
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      // Set a user-friendly error message on the request object
      req.fileValidationError = `File "${file.originalname}" has an unsupported format. Please upload images (JPG, PNG) or PDF documents only.`;
      cb(null, false); // Reject the file but don't throw an error
    }
  }
});

// This file defines API routes for managing daily vehicle transaction data in the Transport Management System.
// It handles the daily transaction entries with four main sections: master details, transaction details, 
// system calculations, and supervisor remarks.

module.exports = (pool) => {
  // Get all daily vehicle transactions with pagination and date filtering
  router.get('/', async (req, res) => {
    try {
      console.log('📊 GET /api/daily-vehicle-transactions called');

      const { page = 1, limit = 50, fromDate, toDate } = req.query;
      const offset = (page - 1) * limit;

      // Build date filter conditions
      let dateFilter = '';
      let dateParams = [];

      if (fromDate && toDate) {
        dateFilter = 'WHERE DATE(ft.TransactionDate) BETWEEN ? AND ?';
        dateParams = [fromDate, toDate];
        console.log('🗓️ Backend: Applying TransactionDate date filter from', fromDate, 'to', toDate);
      } else if (fromDate) {
        dateFilter = 'WHERE DATE(ft.TransactionDate) >= ?';
        dateParams = [fromDate];
        console.log('🗓️ Backend: Applying TransactionDate date filter from', fromDate);
      } else if (toDate) {
        dateFilter = 'WHERE DATE(ft.TransactionDate) <= ?';
        dateParams = [toDate];
        console.log('🗓️ Backend: Applying TransactionDate date filter to', toDate);
      }

      // Query both fixed_transactions and adhoc_transactions tables
      const fixedQuery = `
        SELECT
          ft.*,
          c.Name as CustomerName,
          c.GSTNo as CustomerGSTNo,
          v.VehicleRegistrationNo,
          v.VehicleType,
          d.DriverName,
          d.DriverMobileNo,
          vend.VendorName,
          p.ProjectName,
          rd.DriverName as ReplacementDriverName,
          -- Handle multiple vehicles display
          CASE
            WHEN ft.VehicleIDs IS NOT NULL THEN
              CONCAT(v.VehicleRegistrationNo, ' (+', JSON_LENGTH(ft.VehicleIDs) - 1, ' more)')
            ELSE v.VehicleRegistrationNo
          END as DisplayVehicle,
          -- Handle multiple drivers display
          CASE
            WHEN ft.DriverIDs IS NOT NULL THEN
              CONCAT(d.DriverName, ' (+', JSON_LENGTH(ft.DriverIDs) - 1, ' more)')
            ELSE d.DriverName
          END as DisplayDriver
        FROM fixed_transactions ft
        LEFT JOIN customer c ON ft.CustomerID = c.CustomerID
        LEFT JOIN vehicle v ON v.VehicleID = JSON_UNQUOTE(JSON_EXTRACT(ft.VehicleIDs, '$[0]'))
        LEFT JOIN driver d ON d.DriverID = JSON_UNQUOTE(JSON_EXTRACT(ft.DriverIDs, '$[0]'))
        LEFT JOIN vendor vend ON ft.VendorID = vend.VendorID
        LEFT JOIN project p ON ft.ProjectID = p.ProjectID
        LEFT JOIN driver rd ON ft.ReplacementDriverID = rd.DriverID
        ${dateFilter}
      `;

      const adhocQuery = `
        SELECT
          at.*,
          c.Name as CustomerName,
          c.GSTNo as CustomerGSTNo,
          p.ProjectName,
          at.VehicleNumber as VehicleRegistrationNo,
          at.VehicleType,
          at.DriverName,
          at.DriverNumber as DriverMobileNo,
          at.VendorName,
          NULL as ReplacementDriverName,
          -- Handle multiple vehicles display for adhoc
          CASE
            WHEN at.VehicleNumbers IS NOT NULL THEN
              CONCAT(at.VehicleNumber, ' (+', JSON_LENGTH(at.VehicleNumbers) - 1, ' more)')
            ELSE at.VehicleNumber
          END as DisplayVehicle,
          -- Handle multiple drivers display for adhoc
          CASE
            WHEN at.DriverNames IS NOT NULL THEN
              CONCAT(at.DriverName, ' (+', JSON_LENGTH(at.DriverNames) - 1, ' more)')
            ELSE at.DriverName
          END as DisplayDriver
        FROM adhoc_transactions at
        LEFT JOIN customer c ON at.CustomerID = c.CustomerID
        LEFT JOIN project p ON at.ProjectID = p.ProjectID
        ${dateFilter.replace('ft.TransactionDate', 'at.TransactionDate')}
      `;

      // Execute both queries with date parameters
      const [fixedRows] = await pool.query(fixedQuery, dateParams);
      const [adhocRows] = await pool.query(adhocQuery, dateParams);

      console.log('🔍 Backend: Fixed transactions found:', fixedRows.length);
      console.log('🔍 Backend: Adhoc transactions found:', adhocRows.length);
      console.log('🔍 Backend: Sample adhoc data:', adhocRows.slice(0, 2).map(r => ({
        ID: r.TransactionID,
        Type: r.TripType,
        Customer: r.CustomerName
      })));

      // Combine and sort results
      const allRows = [...fixedRows, ...adhocRows];
      console.log('🔍 Backend: Combined total rows:', allRows.length);
      console.log('🔍 Backend: Transaction type breakdown:',
        allRows.reduce((acc, r) => {
          acc[r.TripType] = (acc[r.TripType] || 0) + 1;
          return acc;
        }, {})
      );

      allRows.sort((a, b) => {
        // Sort by UpdatedAt DESC (latest edited first), then by TransactionDate DESC, then by TransactionID DESC
        const updatedA = new Date(a.UpdatedAt);
        const updatedB = new Date(b.UpdatedAt);
        if (updatedB - updatedA !== 0) return updatedB - updatedA; // Latest edited first

        const dateA = new Date(a.TransactionDate);
        const dateB = new Date(b.TransactionDate);
        if (dateB - dateA !== 0) return dateB - dateA; // Then by transaction date desc

        return b.TransactionID - a.TransactionID; // Finally by ID desc
      });

      // Keep original TransactionIDs and add sequence numbers for display
      const transformedRows = allRows.map((row, index) => ({
        ...row,
        // Keep original TransactionID intact
        SerialNumber: index + 1, // Add sequence number for display (1, 2, 3, ...)
        // Remove the ID remapping - use original TransactionID
      }));

      console.log('🔍 Backend: Keeping original TransactionIDs:', transformedRows.map(r => r.TransactionID));
      console.log('🔍 Backend: Transaction type breakdown:',
        transformedRows.reduce((acc, r) => {
          acc[r.TripType] = (acc[r.TripType] || 0) + 1;
          return acc;
        }, {})
      );

      // Apply pagination to transformed results
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      const rows = transformedRows.slice(startIndex, endIndex);

      // Get total count for pagination with date filter
      const fixedCountQuery = `SELECT COUNT(*) as count FROM fixed_transactions ${dateFilter.replace('ft.TransactionDate', 'TransactionDate')}`;
      const adhocCountQuery = `SELECT COUNT(*) as count FROM adhoc_transactions ${dateFilter.replace('ft.TransactionDate', 'TransactionDate')}`;

      const [fixedCount] = await pool.query(fixedCountQuery, dateParams);
      const [adhocCount] = await pool.query(adhocCountQuery, dateParams);
      const totalCount = fixedCount[0].count + adhocCount[0].count;

      console.log('✅ Query successful, found', rows.length, 'records');

      // Parse JSON fields for Fixed transactions and add file URLs
      const transactionsWithFiles = rows.map(transaction => {
        // Parse JSON fields for Fixed transactions
        if (transaction.TripType === 'Fixed') {
          try {
            if (transaction.VehicleIDs && typeof transaction.VehicleIDs === 'string') {
              transaction.VehicleIDs = JSON.parse(transaction.VehicleIDs);
            }
            if (transaction.DriverIDs && typeof transaction.DriverIDs === 'string') {
              transaction.DriverIDs = JSON.parse(transaction.DriverIDs);
            }
          } catch (e) {
            console.warn('Failed to parse JSON fields for transaction', transaction.TransactionID, ':', e);
          }
        }

        // Format date fields to avoid timezone issues (for both Fixed and Adhoc)
        if (transaction.AdvancePaidDate && transaction.AdvancePaidDate instanceof Date) {
          console.log('🔧 COMBINED API: Formatting AdvancePaidDate for transaction', transaction.TransactionID, 'from', transaction.AdvancePaidDate);
          const date = new Date(transaction.AdvancePaidDate);
          transaction.AdvancePaidDate = date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0');
          console.log('🔧 COMBINED API: Formatted AdvancePaidDate to', transaction.AdvancePaidDate);
        }
        if (transaction.BalancePaidDate && transaction.BalancePaidDate instanceof Date) {
          console.log('🔧 COMBINED API: Formatting BalancePaidDate for transaction', transaction.TransactionID, 'from', transaction.BalancePaidDate);
          const date = new Date(transaction.BalancePaidDate);
          transaction.BalancePaidDate = date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0');
          console.log('🔧 COMBINED API: Formatted BalancePaidDate to', transaction.BalancePaidDate);
        }
        if (transaction.TransactionDate && transaction.TransactionDate instanceof Date) {
          const date = new Date(transaction.TransactionDate);
          transaction.TransactionDate = date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0');
        }

        return addFileUrls(transaction);
      });

      res.json({
        success: true,
        data: transactionsWithFiles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('❌ Error fetching daily vehicle transactions:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  });

  // Get transactions summary/statistics
  router.get('/stats/summary', async (req, res) => {
    try {
      const { date_from, date_to, customer_id, vehicle_id } = req.query;
      
      let whereClause = '1=1';
      let queryParams = [];
      
      if (date_from) {
        whereClause += ' AND duty_start_date >= ?';
        queryParams.push(date_from);
      }
      
      if (date_to) {
        whereClause += ' AND duty_start_date <= ?';
        queryParams.push(date_to);
      }
      
      if (customer_id) {
        whereClause += ' AND customer_id = ?';
        queryParams.push(customer_id);
      }
      
      if (vehicle_id) {
        whereClause += ' AND vehicle_id = ?';
        queryParams.push(vehicle_id);
      }

      // Create mock statistics from existing data
      const query = `
        SELECT
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN v.Status = 'Active' THEN 1 END) as pending_trips,
          0 as in_progress_trips,
          0 as completed_trips,
          0 as cancelled_trips,
          0.00 as total_kilometers,
          0.00 as total_hours,
          0.00 as total_amount
        FROM Vehicle v
        LEFT JOIN Customer c ON v.CustomerID = c.CustomerID
        WHERE v.Status = 'Active'
      `;

      const [rows] = await pool.query(query, queryParams);
      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching transaction statistics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // =====================================================
  // NEW ENDPOINTS FOR DAILY VEHICLE TRANSACTION FORM
  // =====================================================

  // Test endpoint to debug database connectivity
  router.get('/test', async (req, res) => {
    try {
      const [result] = await pool.query('SELECT COUNT(*) as count FROM customer');
      res.json({
        success: true,
        message: 'Database connection working',
        customer_count: result[0].count
      });
    } catch (error) {
      console.error('Database test error:', error);
      res.status(500).json({ 
        error: 'Database connection failed',
        details: error.message 
      });
    }
  });

  // Get customers for dropdown with format "CustomerName (CustomerCode)"
  router.get('/form-data/customers', async (req, res) => {
    try {
      const query = `
        SELECT 
          CustomerID as customer_id,
          Name as customer_name,
          CustomerCode as customer_code,
          CONCAT(Name, ' (', CustomerCode, ')') as display_name,
          GSTNo as gst_number,
          Locations as location,
          CustomerSite as customer_site
        FROM customer
        WHERE Name IS NOT NULL AND CustomerCode IS NOT NULL
        ORDER BY Name
      `;
      
      const [customers] = await pool.query(query);
      res.json({
        success: true,
        data: customers
      });
    } catch (error) {
      console.error('Error fetching customers for dropdown:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get customer details by customer_id (GST, Location, Site)
  router.get('/form-data/customer/:customerId', async (req, res) => {
    try {
      const { customerId } = req.params;
      const query = `
        SELECT 
          CustomerID as customer_id,
          Name as customer_name,
          CustomerCode as customer_code,
          GSTNo as gst_number,
          Locations as location,
          CustomerSite as customer_site
        FROM customer
        WHERE CustomerID = ?
      `;
      
      const [customer] = await pool.query(query, [customerId]);
      if (customer.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json({
        success: true,
        data: customer[0]
      });
    } catch (error) {
      console.error('Error fetching customer details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get vehicles assigned to customer through vehicle linking master
  router.get('/form-data/customer/:customerId/vehicles', async (req, res) => {
    try {
      const { customerId } = req.params;
      
      // Get vehicles for customer through projects (simplified)
      const query = `
        SELECT DISTINCT
          v.VehicleID as vehicle_id,
          v.VehicleRegistrationNo as vehicle_number,
          v.VehicleCode as vehicle_code,
          v.VehicleType as vehicle_type,
          v.TypeOfBody as body_type,
          vn.VendorID as vendor_id,
          vn.VendorName as vendor_name,
          vn.VendorCode as vendor_code,
          p.ProjectID as project_id,
          p.ProjectName as project_name,
          p.ProjectCode as project_code,
          'Standard' as placement_type
        FROM Vehicle v
        LEFT JOIN Vendor vn ON v.VendorID = vn.VendorID
        LEFT JOIN Project p ON p.CustomerID = ?
        WHERE v.Status = 'Active'
          AND p.Status = 'Active'
        ORDER BY vn.VendorName, v.VehicleRegistrationNo
      `;
      
      const [vehicles] = await pool.query(query, [customerId]);
      res.json({
        success: true,
        data: vehicles
      });
    } catch (error) {
      console.error('Error fetching customer vehicles:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get vehicle details with vendor info and vehicle type
  router.get('/form-data/vehicle/:vehicleId/details', async (req, res) => {
    try {
      const { vehicleId } = req.params;
      
      const query = `
        SELECT 
          v.VehicleID as vehicle_id,
          v.VehicleRegistrationNo as vehicle_number,
          v.VehicleCode as vehicle_code,
          v.VehicleType as vehicle_type,
          v.TypeOfBody as body_type,
          v.VehicleModel as vehicle_model,
          vn.VendorID as vendor_id,
          vn.VendorName as vendor_name,
          vn.VendorCode as vendor_code
        FROM Vehicle v
        LEFT JOIN Vendor vn ON v.VendorID = vn.VendorID
        WHERE v.VehicleID = ?
      `;
      
      const [vehicle] = await pool.query(query, [vehicleId]);
      if (vehicle.length === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      
      res.json({
        success: true,
        data: vehicle[0]
      });
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get project details and placement type for a vehicle assignment
  router.get('/form-data/vehicle/:vehicleId/project-details', async (req, res) => {
    try {
      const { vehicleId } = req.params;
      const { customerId } = req.query;
      
      const query = `
        SELECT 
          p.ProjectID as project_id,
          p.ProjectName as project_name,
          p.ProjectCode as project_code,
          p.ProjectDescription as project_description,
          vpa.placement_type,
          vpa.assigned_date,
          vpa.assignment_notes
        FROM vehicle_project_assignments vpa
        JOIN Project p ON vpa.project_id = p.ProjectID
        WHERE vpa.vehicle_id = ? 
          AND vpa.status = 'active'
          ${customerId ? 'AND vpa.customer_id = ?' : ''}
        ORDER BY vpa.assigned_date DESC
        LIMIT 1
      `;
      
      const params = customerId ? [vehicleId, customerId] : [vehicleId];
      const [project] = await pool.query(query, params);
      
      if (project.length === 0) {
        return res.status(404).json({ error: 'No active project assignment found for this vehicle' });
      }
      
      res.json({
        success: true,
        data: project[0]
      });
    } catch (error) {
      console.error('Error fetching vehicle project details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get drivers for vehicle (based on vendor)
  router.get('/form-data/vehicle/:vehicleId/drivers', async (req, res) => {
    try {
      const { vehicleId } = req.params;
      
      const query = `
        SELECT 
          d.DriverID as driver_id,
          d.DriverName as driver_name,
          d.DriverLicenceNo as license_number,
          d.DriverMobileNo as phone,
          d.DriverAddress as address
        FROM Driver d
        JOIN Vehicle v ON d.VendorID = v.VendorID
        WHERE v.VehicleID = ? 
          AND d.Status = 'Active'
        ORDER BY d.DriverName
      `;
      
      const [drivers] = await pool.query(query, [vehicleId]);
      res.json({
        success: true,
        data: drivers
      });
    } catch (error) {
      console.error('Error fetching drivers for vehicle:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get a single daily vehicle transaction by ID
  // Note: Due to separate tables having independent auto-increment IDs, we need to check both tables
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const { type } = req.query; // Optional type parameter to specify which table to check

    try {
      let transactions = [];

      // If type is specified, only check that table
      if (type === 'Fixed') {
        const fixedQuery = `
          SELECT
            ft.*,
            COALESCE(c.Name, c.MasterCustomerName, 'Unknown Customer') as CustomerName,
            COALESCE(c.GSTNo, 'N/A') as CustomerGSTNo,
            COALESCE(p.ProjectName, 'Unknown Project') as ProjectName,
            p.Location as ProjectLocation
          FROM fixed_transactions ft
          LEFT JOIN customer c ON ft.CustomerID = c.CustomerID
          LEFT JOIN project p ON ft.ProjectID = p.ProjectID
          WHERE ft.TransactionID = ?
        `;

        const [fixedRows] = await pool.query(fixedQuery, [id]);
        if (fixedRows.length > 0) {
          transactions.push(fixedRows[0]);
          console.log('✅ Found Fixed transaction:', fixedRows[0].TransactionID);
        }
      } else if (type === 'Adhoc' || type === 'Replacement') {
        const adhocQuery = `
          SELECT
            at.*,
            c.Name as CustomerName,
            c.GSTNo as CustomerGSTNo,
            p.ProjectName,
            p.Location as ProjectLocation
          FROM adhoc_transactions at
          LEFT JOIN customer c ON at.CustomerID = c.CustomerID
          LEFT JOIN project p ON at.ProjectID = p.ProjectID
          WHERE at.TransactionID = ?
        `;

        const [adhocRows] = await pool.query(adhocQuery, [id]);
        if (adhocRows.length > 0) {
          transactions.push(adhocRows[0]);
          console.log('✅ Found Adhoc/Replacement transaction:', adhocRows[0].TransactionID);
        }
      } else {
        // No type specified, check both tables (return most recent by CreatedAt)
        const fixedQuery = `
          SELECT
            ft.*,
            c.Name as CustomerName,
            c.GSTNo as CustomerGSTNo,
            p.ProjectName,
            p.Location as ProjectLocation
          FROM fixed_transactions ft
          LEFT JOIN customer c ON ft.CustomerID = c.CustomerID
          LEFT JOIN project p ON ft.ProjectID = p.ProjectID
          WHERE ft.TransactionID = ?
        `;

        const adhocQuery = `
          SELECT
            at.*,
            c.Name as CustomerName,
            c.GSTNo as CustomerGSTNo,
            p.ProjectName,
            p.Location as ProjectLocation
          FROM adhoc_transactions at
          LEFT JOIN customer c ON at.CustomerID = c.CustomerID
          LEFT JOIN project p ON at.ProjectID = p.ProjectID
          WHERE at.TransactionID = ?
        `;

        const [fixedRows] = await pool.query(fixedQuery, [id]);
        const [adhocRows] = await pool.query(adhocQuery, [id]);

        if (fixedRows.length > 0) {
          transactions.push(fixedRows[0]);
          console.log('✅ Found Fixed transaction:', fixedRows[0].TransactionID);
        }
        if (adhocRows.length > 0) {
          transactions.push(adhocRows[0]);
          console.log('✅ Found Adhoc/Replacement transaction:', adhocRows[0].TransactionID);
        }

        // If both exist, return the most recent one
        if (transactions.length > 1) {
          transactions.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
          console.log('⚠️ Multiple transactions found with same ID, returning most recent:', transactions[0].TripType);
        }
      }

      if (transactions.length === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Parse JSON fields for Fixed transactions
      let selectedTransaction = transactions[0];
      if (selectedTransaction.TripType === 'Fixed') {
        try {
          if (selectedTransaction.VehicleIDs && typeof selectedTransaction.VehicleIDs === 'string') {
            // Handle "N/A" case
            if (selectedTransaction.VehicleIDs === '"N/A"' || selectedTransaction.VehicleIDs === 'N/A') {
              selectedTransaction.VehicleIDs = [];
            } else {
              selectedTransaction.VehicleIDs = JSON.parse(selectedTransaction.VehicleIDs);
            }
            console.log('🔧 Parsed VehicleIDs:', selectedTransaction.VehicleIDs);
          }
          if (selectedTransaction.DriverIDs && typeof selectedTransaction.DriverIDs === 'string') {
            // Handle "N/A" case
            if (selectedTransaction.DriverIDs === '"N/A"' || selectedTransaction.DriverIDs === 'N/A') {
              selectedTransaction.DriverIDs = [];
            } else {
              selectedTransaction.DriverIDs = JSON.parse(selectedTransaction.DriverIDs);
            }
            console.log('🔧 Parsed DriverIDs:', selectedTransaction.DriverIDs);
          }
        } catch (e) {
          console.warn('Failed to parse JSON fields:', e);
        }
      }

      // Add file URLs to the transaction
      const transactionWithFiles = addFileUrls(selectedTransaction);
      res.json(transactionWithFiles);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create a new daily vehicle transaction with file upload support
  router.post('/', upload.fields([
    { name: 'DriverAadharDoc', maxCount: 1 },
    { name: 'DriverLicenceDoc', maxCount: 1 },
    { name: 'TollExpensesDoc', maxCount: 1 },
    { name: 'ParkingChargesDoc', maxCount: 1 },
    { name: 'OpeningKMImage', maxCount: 1 },
    { name: 'ClosingKMImage', maxCount: 1 },
    { name: 'OpeningKMImageAdhoc', maxCount: 1 },
    { name: 'ClosingKMImageAdhoc', maxCount: 1 }
  ]), (req, res, next) => {
    // Handle multer errors with user-friendly messages
    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        message: 'File Upload Error',
        error: req.fileValidationError,
        details: 'Please check that your file is in a supported format (Images: JPG, PNG | Documents: PDF) and under 20MB in size.'
      });
    }
    next();
  }, (error, req, res, next) => {
    // Handle other multer errors (file size, etc.)
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File Too Large',
          error: 'The uploaded file exceeds the maximum size limit of 20MB.',
          details: 'Please compress your file or choose a smaller file and try again.'
        });
      } else if (error.message && error.message.includes('Only .png, .jpg, .jpeg and .pdf files are allowed!')) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported File Type',
          error: error.message,
          details: 'Please upload images (JPG, PNG) or PDF documents only.'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'File Upload Error',
          error: error.message || 'Unknown file upload error',
          details: 'Please check your file and try again.'
        });
      }
    }
    next();
  }, async (req, res) => {
    try {
      const {
        // Master Details (IDs only - names are fetched from related tables)
        CustomerID,
        ProjectID,
        VehicleIDs, // JSON array of vehicle IDs (for both single and multiple)
        DriverIDs,  // JSON array of driver IDs (for both single and multiple)
        VendorID,
        ReplacementDriverID,

        // Daily Transaction Details
        TransactionDate,
        ArrivalTimeAtHub,
        InTimeByCust,
        OutTimeFromHub,
        ReturnReportingTime,

        // New 6 Time Fields (Mandatory - Chronological Order)
        VehicleReportingAtHub,
        VehicleEntryInHub,
        VehicleOutFromHubForDelivery,
        VehicleReturnAtHub,
        VehicleEnteredAtHubReturn,
        VehicleOutFromHubFinal,

        OpeningKM,
        ClosingKM,
        TotalDeliveries,
        TotalDeliveriesAttempted,
        TotalDeliveriesDone,
        TotalDutyHours,

        // Adhoc/Replacement specific fields
        TripNo,
        VehicleNumber,
        VehicleType,
        VendorName,
        VendorNumber,
        DriverName,
        DriverNumber,
        DriverAadharNumber,
        DriverLicenceNumber,
        TotalShipmentsForDeliveries,
        TotalShipmentDeliveriesAttempted,
        TotalShipmentDeliveriesDone,
        VFreightFix,
        FixKm,
        VFreightVariable,
        TollExpenses,
        ParkingCharges,
        LoadingCharges,
        UnloadingCharges,
        OtherCharges,
        OtherChargesRemarks,
        OutTimeFrom,
        HandlingCharges,
        AdvanceRequestNo,
        AdvanceToPaid,
        AdvanceApprovedAmount,
        AdvanceApprovedBy,
        AdvancePaidAmount,
        AdvancePaidMode,
        AdvancePaidDate,
        AdvancePaidBy,
        EmployeeDetailsAdvance,
        BalancePaidAmount,
        BalancePaidDate,
        BalancePaidBy,
        EmployeeDetailsBalance,
        ReplacementDriverName,
        ReplacementDriverNo,
        TripClose,

        // Master data fields
        CompanyName,
        GSTNo,
        Location,
        CustomerSite,

        // Additional fields
        TripType = 'Fixed',
        Shift,
        Remarks,
        Status = 'Pending'
      } = req.body;

      // Handle file uploads - store relative paths for database
      const files = req.files || {};
      const DriverAadharDoc = files.DriverAadharDoc ? uploadsManager.getRelativePath('transactions', files.DriverAadharDoc[0].filename) : null;
      const DriverLicenceDoc = files.DriverLicenceDoc ? uploadsManager.getRelativePath('transactions', files.DriverLicenceDoc[0].filename) : null;
      const TollExpensesDoc = files.TollExpensesDoc ? uploadsManager.getRelativePath('transactions', files.TollExpensesDoc[0].filename) : null;
      const ParkingChargesDoc = files.ParkingChargesDoc ? uploadsManager.getRelativePath('transactions', files.ParkingChargesDoc[0].filename) : null;

      // Handle KM image uploads
      const OpeningKMImage = files.OpeningKMImage ? uploadsManager.getRelativePath('transactions', files.OpeningKMImage[0].filename) : null;
      const ClosingKMImage = files.ClosingKMImage ? uploadsManager.getRelativePath('transactions', files.ClosingKMImage[0].filename) : null;
      const OpeningKMImageAdhoc = files.OpeningKMImageAdhoc ? uploadsManager.getRelativePath('transactions', files.OpeningKMImageAdhoc[0].filename) : null;
      const ClosingKMImageAdhoc = files.ClosingKMImageAdhoc ? uploadsManager.getRelativePath('transactions', files.ClosingKMImageAdhoc[0].filename) : null;

      // Verify uploaded files exist and are accessible
      const uploadedFiles = [DriverAadharDoc, DriverLicenceDoc, TollExpensesDoc, ParkingChargesDoc, OpeningKMImage, ClosingKMImage, OpeningKMImageAdhoc, ClosingKMImageAdhoc].filter(Boolean);
      for (const filePath of uploadedFiles) {
        const fullPath = uploadsManager.getFullPath(filePath);
        if (!fs.existsSync(fullPath)) {
          console.error('❌ Uploaded file not found:', fullPath);
          return res.status(500).json({ error: 'File upload failed - file not accessible' });
        }
        console.log('✅ Verified uploaded file:', filePath);
        // This check is good for debugging but can be removed for production
        // as multer guarantees the file was written.
      }

      // Handle empty string values that should be null for integer fields
      const cleanCustomerID = CustomerID && CustomerID !== '' ? CustomerID : null;
      const cleanProjectID = ProjectID && ProjectID !== '' ? ProjectID : null;
      const cleanVendorID = VendorID && VendorID !== '' ? VendorID : null;

      // Validate required fields based on transaction type
      if (TripType === 'Fixed') {
        console.log('🔍 VALIDATION DEBUG - Fixed transaction required fields:');
        console.log('🔍 CustomerID:', CustomerID, '-> cleaned:', cleanCustomerID, 'Type:', typeof CustomerID, 'Truthy:', !!CustomerID);
        console.log('🔍 VehicleIDs:', VehicleIDs, 'Type:', typeof VehicleIDs, 'Truthy:', !!VehicleIDs);
        console.log('🔍 DriverIDs:', DriverIDs, 'Type:', typeof DriverIDs, 'Truthy:', !!DriverIDs);
        console.log('🔍 TransactionDate:', TransactionDate, 'Type:', typeof TransactionDate, 'Truthy:', !!TransactionDate);
        console.log('🔍 OpeningKM:', OpeningKM, 'Type:', typeof OpeningKM, 'Truthy:', !!OpeningKM);

        // For updates, we don't require CustomerID to be present (it might already exist in DB)
        // Only validate the fields that are actually being updated
        if (!VehicleIDs || !DriverIDs || !TransactionDate || OpeningKM === null || OpeningKM === undefined) {
          const missingFields = [];
          if (!VehicleIDs) missingFields.push('VehicleIDs');
          if (!DriverIDs) missingFields.push('DriverIDs');
          if (!TransactionDate) missingFields.push('TransactionDate');
          if (OpeningKM === null || OpeningKM === undefined) missingFields.push('OpeningKM');

          return res.status(400).json({
            error: `Required fields for Fixed missing: ${missingFields.join(', ')}`,
            details: { CustomerID: cleanCustomerID, VehicleIDs, DriverIDs, TransactionDate, OpeningKM }
          });
        }
      } else if (TripType === 'Adhoc' || TripType === 'Replacement') {
        if (!CustomerID || !TransactionDate || !OpeningKM || !TripNo || !VehicleNumber || !VendorName || !DriverName || !DriverNumber) {
          return res.status(400).json({
            error: 'Required fields for Adhoc/Replacement: CustomerID, TransactionDate, OpeningKM, TripNo, VehicleNumber, VendorName, DriverName, DriverNumber'
          });
        }

        // Validate mobile number format
        if (DriverNumber && !/^\d{10}$/.test(DriverNumber)) {
          return res.status(400).json({ error: 'Driver Number must be exactly 10 digits' });
        }

        if (VendorNumber && !/^\d{10}$/.test(VendorNumber)) {
          return res.status(400).json({ error: 'Vendor Number must be exactly 10 digits' });
        }

        if (DriverAadharNumber && !/^\d{12}$/.test(DriverAadharNumber)) {
          return res.status(400).json({ error: 'Driver Aadhar Number must be exactly 12 digits' });
        }
      }

      // Check if customer exists
      const [customerCheck] = await pool.query('SELECT CustomerID FROM customer WHERE CustomerID = ?', [CustomerID]);
      if (customerCheck.length === 0) {
        return res.status(400).json({ error: 'Customer not found' });
      }

      // Handle vehicles and drivers from frontend (always as JSON arrays)
      let vehicleIds = [];
      let driverIds = [];
      let primaryVehicleId = null;
      let primaryDriverId = null;

      // Process VehicleIDs (always expect JSON string from frontend)
      if (VehicleIDs) {
        try {
          vehicleIds = typeof VehicleIDs === 'string' ? JSON.parse(VehicleIDs) : VehicleIDs;
          if (!Array.isArray(vehicleIds)) {
            vehicleIds = [vehicleIds]; // Convert single ID to array
          }
          primaryVehicleId = vehicleIds[0]; // Use first vehicle as primary
          console.log('🚛 VehicleIDs processed:', vehicleIds);

          // Validate all vehicles exist
          for (const vehicleId of vehicleIds) {
            console.log('🔍 Validating vehicle ID:', vehicleId);
            const [vehicleCheck] = await pool.query('SELECT VehicleID FROM vehicle WHERE VehicleID = ?', [vehicleId]);
            if (vehicleCheck.length === 0) {
              return res.status(400).json({ error: `Vehicle with ID ${vehicleId} not found` });
            }
          }
        } catch (e) {
          return res.status(400).json({ error: 'Invalid VehicleIDs format' });
        }
      }

      // Process DriverIDs (always expect JSON string from frontend)
      if (DriverIDs) {
        try {
          driverIds = typeof DriverIDs === 'string' ? JSON.parse(DriverIDs) : DriverIDs;
          if (!Array.isArray(driverIds)) {
            driverIds = [driverIds]; // Convert single ID to array
          }
          primaryDriverId = driverIds[0]; // Use first driver as primary
          console.log('👨‍💼 DriverIDs processed:', driverIds);

          // Validate all drivers exist
          for (const driverId of driverIds) {
            const [driverCheck] = await pool.query('SELECT DriverID FROM driver WHERE DriverID = ?', [driverId]);
            if (driverCheck.length === 0) {
              return res.status(400).json({ error: `Driver with ID ${driverId} not found` });
            }
          }
        } catch (e) {
          return res.status(400).json({ error: 'Invalid DriverIDs format' });
        }
      }

      // Validation based on transaction type
      if (TripType === 'Fixed') {
        if (!primaryVehicleId || vehicleIds.length === 0) {
          return res.status(400).json({ error: 'At least one vehicle must be selected for Fixed transactions' });
        }
        if (!primaryDriverId || driverIds.length === 0) {
          return res.status(400).json({ error: 'At least one driver must be selected for Fixed transactions' });
        }
      } else if (TripType === 'Adhoc' || TripType === 'Replacement') {
        // For Adhoc/Replacement, validate manual entry fields
        if (!VehicleNumber) {
          return res.status(400).json({ error: 'Vehicle Number is required for Adhoc/Replacement transactions' });
        }
        if (!VendorName) {
          return res.status(400).json({ error: 'Vendor Name is required for Adhoc/Replacement transactions' });
        }
        if (!DriverName) {
          return res.status(400).json({ error: 'Driver Name is required for Adhoc/Replacement transactions' });
        }
        if (!DriverNumber) {
          return res.status(400).json({ error: 'Driver Number is required for Adhoc/Replacement transactions' });
        }
      }



      // Route to correct table based on TripType and store multiple vehicles/drivers in single row
      let insertQuery, values;

      if (TripType === 'Fixed') {
        // Insert into fixed_transactions table - include all vehicle, driver, and vendor details
        insertQuery = `
          INSERT INTO fixed_transactions (
            TripType, TransactionDate, TripNo, Shift, VehicleIDs, DriverIDs, VendorID, CustomerID, ProjectID, LocationID,
            ReplacementDriverID, ReplacementDriverName, ReplacementDriverNo,
            ArrivalTimeAtHub, InTimeByCust, OutTimeFromHub, ReturnReportingTime, OutTimeFrom,
            VehicleReportingAtHub, VehicleEntryInHub, VehicleOutFromHubForDelivery, VehicleReturnAtHub, VehicleEnteredAtHubReturn, VehicleOutFromHubFinal,
            OpeningKM, ClosingKM, TotalDeliveries, TotalDeliveriesAttempted, TotalDeliveriesDone,
            TotalDutyHours, Remarks, Status, TripClose,
            VFreightFix, FixKm, VFreightVariable, TotalFreight, TollExpenses, ParkingCharges, LoadingCharges, UnloadingCharges, OtherCharges, OtherChargesRemarks, HandlingCharges,
            VehicleNumber, VehicleType, VendorName, VendorNumber, DriverName, DriverNumber, DriverAadharNumber, DriverLicenceNumber,
            CompanyName, GSTNo, Location, CustomerSite,
            DriverAadharDoc, DriverLicenceDoc, TollExpensesDoc, ParkingChargesDoc,
            OpeningKMImage, ClosingKMImage
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Calculate TotalFreight if freight values are provided
        const vFreightFix = parseFloat(VFreightFix) || 0;
        const vFreightVariable = parseFloat(VFreightVariable) || 0;
        const totalFreight = vFreightFix + vFreightVariable;

        values = [
          TripType, TransactionDate, TripNo || null, Shift || null, JSON.stringify(vehicleIds), JSON.stringify(driverIds), VendorID || null,
          CustomerID, ProjectID || null, null, ReplacementDriverID || null, ReplacementDriverName || null,
          ReplacementDriverNo || null, ArrivalTimeAtHub || null, InTimeByCust || null, OutTimeFromHub || null,
          ReturnReportingTime || null, OutTimeFrom || null,
          VehicleReportingAtHub || null, VehicleEntryInHub || null, VehicleOutFromHubForDelivery || null,
          VehicleReturnAtHub || null, VehicleEnteredAtHubReturn || null, VehicleOutFromHubFinal || null,
          OpeningKM, ClosingKM || null, TotalDeliveries || null,
          TotalDeliveriesAttempted || null, TotalDeliveriesDone || null, TotalDutyHours || null,
          Remarks || null, Status, convertToBoolean(TripClose),
          vFreightFix || null, FixKm || null, vFreightVariable || null, totalFreight || null, TollExpenses || null, ParkingCharges || null, LoadingCharges || null, UnloadingCharges || null, OtherCharges || null, OtherChargesRemarks || null, HandlingCharges || null,
          VehicleNumber || null, VehicleType || null, VendorName || null, VendorNumber || null, DriverName || null, DriverNumber || null, DriverAadharNumber || null, DriverLicenceNumber || null,
          CompanyName || null, GSTNo || null, Location || null, CustomerSite || null,
          DriverAadharDoc, DriverLicenceDoc, TollExpensesDoc, ParkingChargesDoc,
          OpeningKMImage, ClosingKMImage
        ];

      } else if (TripType === 'Adhoc' || TripType === 'Replacement') {
        // Insert into adhoc_transactions table with multiple vehicles and drivers support
        insertQuery = `
          INSERT INTO adhoc_transactions (
            TripType, TransactionDate, TripNo, CustomerID, ProjectID,
            VehicleNumber, VehicleNumbers, VehicleType, VehicleTypes,
            VendorName, VendorNames, VendorNumber, VendorNumbers,
            DriverName, DriverNames, DriverNumber, DriverNumbers, DriverAadharNumber, DriverLicenceNumber,
            DriverAadharDoc, DriverLicenceDoc, TollExpensesDoc, ParkingChargesDoc,
            OpeningKMImage, ClosingKMImage,
            ArrivalTimeAtHub, InTimeByCust, OutTimeFromHub, ReturnReportingTime, OutTimeFrom,
            VehicleReportingAtHub, VehicleEntryInHub, VehicleOutFromHubForDelivery, VehicleReturnAtHub, VehicleEnteredAtHubReturn, VehicleOutFromHubFinal,
            OpeningKM, ClosingKM, TotalShipmentsForDeliveries, TotalShipmentDeliveriesAttempted, TotalShipmentDeliveriesDone,
            VFreightFix, FixKm, VFreightVariable, TotalFreight,
            TollExpenses, ParkingCharges, LoadingCharges, UnloadingCharges, OtherCharges, OtherChargesRemarks,
            TotalDutyHours, AdvanceRequestNo, AdvanceToPaid, AdvanceApprovedAmount, AdvanceApprovedBy,
            AdvancePaidAmount, AdvancePaidMode, AdvancePaidDate, AdvancePaidBy, EmployeeDetailsAdvance,
            BalanceToBePaid, BalancePaidAmount, Variance, BalancePaidDate, BalancePaidBy, EmployeeDetailsBalance,
            Revenue, Margin, MarginPercentage, Status, TripClose, Remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Calculate TotalFreight if freight values are provided
        const vFreightFix = parseFloat(VFreightFix) || 0;
        const vFreightVariable = parseFloat(VFreightVariable) || 0;
        const totalFreight = vFreightFix + vFreightVariable;

        // For adhoc, we'll store multiple vehicle/driver info in JSON fields if arrays are provided
        const vehicleNumbersJson = Array.isArray(VehicleNumber) ? JSON.stringify(VehicleNumber) : null;
        const vehicleTypesJson = Array.isArray(VehicleType) ? JSON.stringify(VehicleType) : null;
        const vendorNamesJson = Array.isArray(VendorName) ? JSON.stringify(VendorName) : null;
        const vendorNumbersJson = Array.isArray(VendorNumber) ? JSON.stringify(VendorNumber) : null;
        const driverNamesJson = Array.isArray(DriverName) ? JSON.stringify(DriverName) : null;
        const driverNumbersJson = Array.isArray(DriverNumber) ? JSON.stringify(DriverNumber) : null;

        values = [
          TripType, TransactionDate, TripNo || null, CustomerID || null, ProjectID || null,
          Array.isArray(VehicleNumber) ? VehicleNumber[0] : VehicleNumber, vehicleNumbersJson,
          Array.isArray(VehicleType) ? VehicleType[0] : VehicleType, vehicleTypesJson,
          Array.isArray(VendorName) ? VendorName[0] : VendorName, vendorNamesJson,
          Array.isArray(VendorNumber) ? VendorNumber[0] : VendorNumber, vendorNumbersJson,
          Array.isArray(DriverName) ? DriverName[0] : DriverName, driverNamesJson,
          Array.isArray(DriverNumber) ? DriverNumber[0] : DriverNumber, driverNumbersJson,
          DriverAadharNumber || null, DriverLicenceNumber || null,
          DriverAadharDoc || null, DriverLicenceDoc || null, TollExpensesDoc || null, ParkingChargesDoc || null,
          OpeningKMImageAdhoc || null, ClosingKMImageAdhoc || null,
          ArrivalTimeAtHub || null, InTimeByCust || null, OutTimeFromHub || null, ReturnReportingTime || null, OutTimeFrom || null,
          VehicleReportingAtHub || null, VehicleEntryInHub || null, VehicleOutFromHubForDelivery || null,
          VehicleReturnAtHub || null, VehicleEnteredAtHubReturn || null, VehicleOutFromHubFinal || null,
          OpeningKM, ClosingKM || null, TotalShipmentsForDeliveries || null, TotalShipmentDeliveriesAttempted || null, TotalShipmentDeliveriesDone || null,
          VFreightFix || null, FixKm || null, VFreightVariable || null, totalFreight > 0 ? totalFreight : null,
          TollExpenses || null, ParkingCharges || null, LoadingCharges || null, UnloadingCharges || null, OtherCharges || null, OtherChargesRemarks || null,
          TotalDutyHours || null, AdvanceRequestNo || null, AdvanceToPaid || null, AdvanceApprovedAmount || null, AdvanceApprovedBy || null,
          AdvancePaidAmount || null, AdvancePaidMode || null, AdvancePaidDate || null, AdvancePaidBy || null, EmployeeDetailsAdvance || null,
          null, BalancePaidAmount || null, null, BalancePaidDate || null, BalancePaidBy || null, EmployeeDetailsBalance || null,
          null, null, null, Status, convertToBoolean(TripClose), Remarks || null
        ];

      } else {
        return res.status(400).json({ error: 'Invalid TripType. Must be Fixed, Adhoc, or Replacement' });
      }

      // Execute the insert
      try {
        console.log('📝 Executing INSERT query for', TripType, 'transaction');
        console.log('📊 Number of columns:', insertQuery.match(/\?/g).length);
        console.log('📊 Number of values:', values.length);

        // Log key field values for debugging
        if (TripType === 'Fixed') {
          console.log('🔍 Fixed Transaction Key Fields:');
          console.log('   - VehicleIDs:', JSON.stringify(vehicleIds));
          console.log('   - DriverIDs:', JSON.stringify(driverIds));
          console.log('   - VendorID:', VendorID);
          console.log('   - VehicleNumber:', VehicleNumber);
          console.log('   - VendorName:', VendorName);
          console.log('   - DriverName:', DriverName);
          console.log('   - FixKm:', FixKm);
          console.log('   - VFreightVariable:', VFreightVariable);
        }

        if (insertQuery.match(/\?/g).length !== values.length) {
          console.error('❌ CRITICAL: Placeholder count mismatch!');
          console.error('   Placeholders:', insertQuery.match(/\?/g).length);
          console.error('   Values:', values.length);
          return res.status(500).json({
            error: 'Database query configuration error',
            details: `Placeholder count (${insertQuery.match(/\?/g).length}) does not match values count (${values.length})`
          });
        }

        const [result] = await pool.query(insertQuery, values);
        console.log('✅ Transaction inserted successfully with ID:', result.insertId);

        // Fetch the created transaction with related data from the correct table
        let newTransaction;

        if (TripType === 'Fixed') {
          const [fixedTransaction] = await pool.query(`
            SELECT
              ft.*,
              c.Name as CustomerName,
              c.GSTNo as CustomerGSTNo,
              v.VehicleRegistrationNo,
              v.VehicleType,
              d.DriverName,
              d.DriverMobileNo,
              vend.VendorName,
              p.ProjectName,
              rd.DriverName as ReplacementDriverName
            FROM fixed_transactions ft
            LEFT JOIN customer c ON ft.CustomerID = c.CustomerID
            LEFT JOIN vehicle v ON v.VehicleID = JSON_UNQUOTE(JSON_EXTRACT(ft.VehicleIDs, '$[0]'))
            LEFT JOIN driver d ON d.DriverID = JSON_UNQUOTE(JSON_EXTRACT(ft.DriverIDs, '$[0]'))
            LEFT JOIN vendor vend ON ft.VendorID = vend.VendorID
            LEFT JOIN project p ON ft.ProjectID = p.ProjectID
            LEFT JOIN driver rd ON ft.ReplacementDriverID = rd.DriverID
            WHERE ft.TransactionID = ?
          `, [result.insertId]);
          newTransaction = fixedTransaction;
        } else {
          const [adhocTransaction] = await pool.query(`
            SELECT
              at.*,
              c.Name as CustomerName,
              c.GSTNo as CustomerGSTNo,
              p.ProjectName
            FROM adhoc_transactions at
            LEFT JOIN customer c ON at.CustomerID = c.CustomerID
            LEFT JOIN project p ON at.ProjectID = p.ProjectID
            WHERE at.TransactionID = ?
          `, [result.insertId]);
          newTransaction = adhocTransaction;
        }

        // Add file URLs to the new transaction for both Fixed and Adhoc transactions
        const transactionWithFiles = addFileUrls(newTransaction[0]);

        // Add a small delay to ensure file system operations are complete
        setTimeout(() => {
          res.status(201).json(transactionWithFiles);
        }, 100);
      } catch (dbError) {
        console.error('❌ Database error creating transaction:', dbError);
        console.error('   Error code:', dbError.code);
        console.error('   Error message:', dbError.message);
        console.error('   SQL State:', dbError.sqlState);
        res.status(500).json({
          error: 'Database error',
          details: dbError.message,
          code: dbError.code
        });
      }
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      console.error('   Error type:', error.constructor.name);
      console.error('   Error message:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message,
        type: error.constructor.name
      });
    }
  });

  // Update an existing daily vehicle transaction
  router.put('/:id', upload.fields([
    { name: 'DriverAadharDoc', maxCount: 1 },
    { name: 'DriverLicenceDoc', maxCount: 1 },
    { name: 'TollExpensesDoc', maxCount: 1 },
    { name: 'ParkingChargesDoc', maxCount: 1 },
    { name: 'OpeningKMImage', maxCount: 1 },
    { name: 'ClosingKMImage', maxCount: 1 },
    { name: 'OpeningKMImageAdhoc', maxCount: 1 },
    { name: 'ClosingKMImageAdhoc', maxCount: 1 }
  ]), (req, res, next) => {
    // Handle multer errors with user-friendly messages
    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        message: 'File Upload Error',
        error: req.fileValidationError,
        details: 'Please check that your file is in a supported format (Images: JPG, PNG | Documents: PDF) and under 20MB in size.'
      });
    }
    next();
  }, (error, req, res, next) => {
    // Handle other multer errors (file size, etc.)
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File Too Large',
          error: 'The uploaded file exceeds the maximum size limit of 20MB.',
          details: 'Please compress your file or choose a smaller file and try again.'
        });
      } else if (error.message && error.message.includes('Only .png, .jpg, .jpeg and .pdf files are allowed!')) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported File Type',
          error: error.message,
          details: 'Please upload images (JPG, PNG) or PDF documents only.'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'File Upload Error',
          error: error.message || 'Unknown file upload error',
          details: 'Please check your file and try again.'
        });
      }
    }
    next();
  }, async (req, res) => {
    const { id } = req.params;
    try {
      console.log('🔧 PUT request received for transaction ID:', id);
      console.log('🔧 Request body:', req.body);

      // Extract fields from request body (same as POST endpoint)
      const {
        // Master Details (IDs only - names are fetched from related tables)
        CustomerID,
        ProjectID,
        VehicleIDs, // JSON array of vehicle IDs (for both single and multiple)
        DriverIDs,  // JSON array of driver IDs (for both single and multiple)
        VendorID,

        // Daily Transaction Details
        TransactionDate,
        TripNo,
        ArrivalTimeAtHub,
        InTimeByCust,
        OutTimeFromHub,
        ReturnReportingTime,

        // New 6 Time Fields (Mandatory - Chronological Order)
        VehicleReportingAtHub,
        VehicleEntryInHub,
        VehicleOutFromHubForDelivery,
        VehicleReturnAtHub,
        VehicleEnteredAtHubReturn,
        VehicleOutFromHubFinal,

        OpeningKM,
        ClosingKM,
        TotalDeliveries,
        TotalDeliveriesAttempted,
        TotalDeliveriesDone,
        TotalDutyHours,

        // Additional fields
        TripType = 'Fixed',
        Shift,
        Remarks,
        Status = 'Pending',

        // Financial fields
        VFreightFix,
        TollExpenses,
        ParkingCharges,
        HandlingCharges,
        OutTimeFrom,

        // Master data fields
        VehicleType,
        CompanyName,
        GSTNo,
        Location,
        CustomerSite,

        // Replacement driver fields
        ReplacementDriverName,
        ReplacementDriverNo,

        // Trip close
        TripClose
      } = req.body;

      // Handle empty string values that should be null for integer fields
      // Also handle non-numeric values (like company names) that should be null
      // For updates, if CustomerID is null/invalid, we should preserve the existing value (don't update it)
      const cleanCustomerID = CustomerID && CustomerID !== '' && !isNaN(CustomerID) ? parseInt(CustomerID) : null;
      const cleanProjectID = ProjectID && ProjectID !== '' && !isNaN(ProjectID) ? parseInt(ProjectID) : null;
      const cleanVendorID = VendorID && VendorID !== '' && !isNaN(VendorID) ? parseInt(VendorID) : null;

      console.log('🔧 Cleaning CustomerID:', CustomerID, '→', cleanCustomerID);
      console.log('🔧 Cleaning ProjectID:', ProjectID, '→', cleanProjectID);
      console.log('🔧 Cleaning VendorID:', VendorID, '→', cleanVendorID);

      // For updates, if CustomerID is null, we need to preserve the existing value
      // Let's fetch the current CustomerID from the database
      let preservedCustomerID = cleanCustomerID;
      if (cleanCustomerID === null) {
        console.log('🔧 CustomerID is null, fetching existing value from database');
        try {
          const [existingRows] = await pool.query('SELECT CustomerID FROM fixed_transactions WHERE TransactionID = ?', [originalTransactionID]);
          if (existingRows.length > 0) {
            preservedCustomerID = existingRows[0].CustomerID;
            console.log('🔧 Preserved existing CustomerID:', preservedCustomerID);
          }
        } catch (error) {
          console.error('🔧 Error fetching existing CustomerID:', error);
        }
        // The UPDATE query will handle preserving the existing CustomerID if the new one is null.
      }

      // Since GET endpoint now uses original TransactionIDs, we use the ID directly
      const originalTransactionID = parseInt(id);

      // First check if it exists in fixed_transactions
      const [fixedCheck] = await pool.query(`
        SELECT TransactionID, TripType FROM fixed_transactions WHERE TransactionID = ?
      `, [originalTransactionID]);

      // Then check adhoc_transactions
      const [adhocCheck] = await pool.query(`
        SELECT TransactionID, TripType FROM adhoc_transactions WHERE TransactionID = ?
      `, [originalTransactionID]);

      let transactionTable = null;
      let existingTransaction = null;

      if (fixedCheck.length > 0) {
        transactionTable = 'fixed_transactions';
        existingTransaction = fixedCheck[0];
        console.log('🔧 Found transaction in fixed_transactions:', originalTransactionID);
      } else if (adhocCheck.length > 0) {
        transactionTable = 'adhoc_transactions';
        existingTransaction = adhocCheck[0];
        console.log('🔧 Found transaction in adhoc_transactions:', originalTransactionID);
      } else {
        return res.status(404).json({ error: 'Transaction not found with ID: ' + id });
      }

      console.log('🔧 Using original TransactionID:', originalTransactionID, 'in table:', transactionTable);
      console.log('🔧 Transaction Type:', existingTransaction.TripType);

      // Handle file uploads - store relative paths for database
      const files = req.files || {};
      const DriverAadharDoc = files.DriverAadharDoc ? uploadsManager.getRelativePath('transactions', files.DriverAadharDoc[0].filename) : null;
      const DriverLicenceDoc = files.DriverLicenceDoc ? uploadsManager.getRelativePath('transactions', files.DriverLicenceDoc[0].filename) : null;
      const TollExpensesDoc = files.TollExpensesDoc ? uploadsManager.getRelativePath('transactions', files.TollExpensesDoc[0].filename) : null;
      const ParkingChargesDoc = files.ParkingChargesDoc ? uploadsManager.getRelativePath('transactions', files.ParkingChargesDoc[0].filename) : null;

      // Handle KM image uploads
      const OpeningKMImage = files.OpeningKMImage ? uploadsManager.getRelativePath('transactions', files.OpeningKMImage[0].filename) : null;
      const ClosingKMImage = files.ClosingKMImage ? uploadsManager.getRelativePath('transactions', files.ClosingKMImage[0].filename) : null;
      const OpeningKMImageAdhoc = files.OpeningKMImageAdhoc ? uploadsManager.getRelativePath('transactions', files.OpeningKMImageAdhoc[0].filename) : null;
      const ClosingKMImageAdhoc = files.ClosingKMImageAdhoc ? uploadsManager.getRelativePath('transactions', files.ClosingKMImageAdhoc[0].filename) : null;

      console.log('🔧 Document files:', { DriverAadharDoc, DriverLicenceDoc, TollExpensesDoc, ParkingChargesDoc });
      console.log('🔧 KM Image files:', { OpeningKMImage, ClosingKMImage, OpeningKMImageAdhoc, ClosingKMImageAdhoc });

      // Verify uploaded files exist and are accessible
      const uploadedFiles = [DriverAadharDoc, DriverLicenceDoc, TollExpensesDoc, ParkingChargesDoc, OpeningKMImage, ClosingKMImage, OpeningKMImageAdhoc, ClosingKMImageAdhoc].filter(Boolean);
      for (const filePath of uploadedFiles) {
        const fullPath = uploadsManager.getFullPath(filePath);
        if (!fs.existsSync(fullPath)) {
          console.error('❌ Uploaded file not found during update:', fullPath);
          return res.status(500).json({ error: 'File upload failed - file not accessible' });
        }
        console.log('✅ Verified uploaded file during update:', filePath);
        // This check is good for debugging but can be removed for production.
      }

      // Build update query based on table type
      let updateQuery = '';
      let values = [];

      if (transactionTable === 'fixed_transactions') {
        updateQuery = `
          UPDATE fixed_transactions SET
            TripType = ?, TransactionDate = ?, TripNo = ?, CustomerID = ?, ProjectID = ?, VehicleIDs = ?, DriverIDs = ?, VendorID = ?,
            ArrivalTimeAtHub = ?, InTimeByCust = ?, OutTimeFromHub = ?, ReturnReportingTime = ?,
            VehicleReportingAtHub = ?, VehicleEntryInHub = ?, VehicleOutFromHubForDelivery = ?, VehicleReturnAtHub = ?, VehicleEnteredAtHubReturn = ?, VehicleOutFromHubFinal = ?,
            OpeningKM = ?, ClosingKM = ?, TotalDeliveries = ?, TotalDeliveriesAttempted = ?, TotalDeliveriesDone = ?,
            TotalDutyHours = ?, ReplacementDriverName = ?, ReplacementDriverNo = ?, VFreightFix = ?, TollExpenses = ?, ParkingCharges = ?,
            HandlingCharges = ?, OutTimeFrom = ?, VehicleType = ?, CompanyName = ?, GSTNo = ?, Location = ?, CustomerSite = ?,
            DriverAadharDoc = COALESCE(?, DriverAadharDoc), DriverLicenceDoc = COALESCE(?, DriverLicenceDoc),
            TollExpensesDoc = COALESCE(?, TollExpensesDoc), ParkingChargesDoc = COALESCE(?, ParkingChargesDoc),
            OpeningKMImage = COALESCE(?, OpeningKMImage), ClosingKMImage = COALESCE(?, ClosingKMImage),
            Remarks = ?, TripClose = ?, Status = ?, UpdatedAt = CURRENT_TIMESTAMP
          WHERE TransactionID = ?
        `;

        values = [
          TripType || 'Fixed',
          TransactionDate,
          TripNo || null,
          preservedCustomerID, // Use preserved CustomerID (existing value if null)
          cleanProjectID, // Use cleaned ProjectID
          VehicleIDs,
          DriverIDs,
          cleanVendorID, // Use cleaned VendorID
          ArrivalTimeAtHub,
          InTimeByCust,
          OutTimeFromHub,
          ReturnReportingTime,
          VehicleReportingAtHub,
          VehicleEntryInHub,
          VehicleOutFromHubForDelivery,
          VehicleReturnAtHub,
          VehicleEnteredAtHubReturn,
          VehicleOutFromHubFinal,
          OpeningKM,
          ClosingKM,
          TotalDeliveries,
          TotalDeliveriesAttempted,
          TotalDeliveriesDone,
          TotalDutyHours,
          ReplacementDriverName,
          ReplacementDriverNo,
          VFreightFix,
          TollExpenses,
          ParkingCharges,
          HandlingCharges,
          OutTimeFrom,
          VehicleType,
          CompanyName,
          GSTNo,
          Location,
          CustomerSite,
          DriverAadharDoc,
          DriverLicenceDoc,
          TollExpensesDoc,
          ParkingChargesDoc,
          OpeningKMImage,
          ClosingKMImage,
          Remarks,
          convertToBoolean(TripClose) ? 1 : 0,
          Status || 'Pending',
          originalTransactionID
        ];
      } else if (transactionTable === 'adhoc_transactions') {
        // Update for adhoc_transactions - use manual entry fields (no IDs)
        updateQuery = `
          UPDATE adhoc_transactions SET
            TripType = ?, TransactionDate = ?, CustomerID = ?, ProjectID = ?, TripNo = ?,
            VehicleNumber = ?, VehicleType = ?, VendorName = ?, VendorNumber = ?,
            DriverName = ?, DriverNumber = ?, DriverAadharNumber = ?, DriverLicenceNumber = ?,
            ArrivalTimeAtHub = ?, InTimeByCust = ?, OutTimeFromHub = ?, ReturnReportingTime = ?, OutTimeFrom = ?,
            VehicleReportingAtHub = ?, VehicleEntryInHub = ?, VehicleOutFromHubForDelivery = ?, VehicleReturnAtHub = ?, VehicleEnteredAtHubReturn = ?, VehicleOutFromHubFinal = ?,
            OpeningKM = ?, ClosingKM = ?, TotalShipmentsForDeliveries = ?, TotalShipmentDeliveriesAttempted = ?, TotalShipmentDeliveriesDone = ?,
            TotalDutyHours = ?, VFreightFix = ?, FixKm = ?, VFreightVariable = ?, TotalFreight = ?,
            TollExpenses = ?, ParkingCharges = ?, LoadingCharges = ?, UnloadingCharges = ?, OtherCharges = ?, OtherChargesRemarks = ?,
            DriverAadharDoc = COALESCE(?, DriverAadharDoc), DriverLicenceDoc = COALESCE(?, DriverLicenceDoc),
            TollExpensesDoc = COALESCE(?, TollExpensesDoc), ParkingChargesDoc = COALESCE(?, ParkingChargesDoc),
            OpeningKMImage = COALESCE(?, OpeningKMImage), ClosingKMImage = COALESCE(?, ClosingKMImage),
            Remarks = ?, TripClose = ?, Status = ?, UpdatedAt = CURRENT_TIMESTAMP
          WHERE TransactionID = ?
        `;

        // Calculate TotalFreight if freight values are provided
        const vFreightFix = parseFloat(req.body.VFreightFix) || 0;
        const vFreightVariable = parseFloat(req.body.VFreightVariable) || 0;
        const totalFreight = vFreightFix + vFreightVariable;

        values = [
          req.body.TripType || 'Adhoc',
          req.body.TransactionDate,
          req.body.CustomerID,
          req.body.ProjectID,
          req.body.TripNo,
          req.body.VehicleNumber,
          req.body.VehicleType,
          req.body.VendorName,
          req.body.VendorNumber,
          req.body.DriverName,
          req.body.DriverNumber,
          req.body.DriverAadharNumber,
          req.body.DriverLicenceNumber,
          req.body.ArrivalTimeAtHub,
          req.body.InTimeByCust,
          req.body.OutTimeFromHub,
          req.body.ReturnReportingTime,
          req.body.OutTimeFrom,
          req.body.VehicleReportingAtHub,
          req.body.VehicleEntryInHub,
          req.body.VehicleOutFromHubForDelivery,
          req.body.VehicleReturnAtHub,
          req.body.VehicleEnteredAtHubReturn,
          req.body.VehicleOutFromHubFinal,
          req.body.OpeningKM,
          req.body.ClosingKM,
          req.body.TotalShipmentsForDeliveries,
          req.body.TotalShipmentDeliveriesAttempted,
          req.body.TotalShipmentDeliveriesDone,
          req.body.TotalDutyHours,
          req.body.VFreightFix,
          req.body.FixKm,
          req.body.VFreightVariable,
          totalFreight > 0 ? totalFreight : null,
          req.body.TollExpenses,
          req.body.ParkingCharges,
          req.body.LoadingCharges,
          req.body.UnloadingCharges,
          req.body.OtherCharges,
          req.body.OtherChargesRemarks,
          DriverAadharDoc,
          DriverLicenceDoc,
          TollExpensesDoc,
          ParkingChargesDoc,
          OpeningKMImageAdhoc,
          ClosingKMImageAdhoc,
          req.body.Remarks,
          convertToBoolean(req.body.TripClose) ? 1 : 0,
          req.body.Status || 'Pending',
          originalTransactionID
        ];
      }

      console.log('🔧 Executing update query:', updateQuery);
      console.log('🔧 With values:', values);

      const [result] = await pool.query(updateQuery, values);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Transaction not found or no changes made' });
      }

      console.log('🔧 Update successful, affected rows:', result.affectedRows);

      // Add a small delay to ensure file system operations are complete before responding
      setTimeout(() => {
        // Return success response
        res.json({
          success: true,
          message: 'Transaction updated successfully',
          TransactionID: id,
          affectedRows: result.affectedRows
        });
      }, 100);
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Bulk delete daily vehicle transactions
  router.delete('/bulk', async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of transaction IDs to delete' });
    }

    try {
      console.log(`🗑️ Bulk delete transactions - IDs: ${ids.join(', ')}`);

      let deletedCount = 0;
      let notFoundCount = 0;
      const results = [];

      // Process each ID to determine which table it belongs to
      for (const id of ids) {
        let transactionTable = null;
        let result = null;

        // Check fixed_transactions
        const [fixedCheck] = await pool.query('SELECT TransactionID FROM fixed_transactions WHERE TransactionID = ?', [id]);
        if (fixedCheck.length > 0) {
          transactionTable = 'fixed_transactions';
          [result] = await pool.query('DELETE FROM fixed_transactions WHERE TransactionID = ?', [id]);
        } else {
          // Check adhoc_transactions
          const [adhocCheck] = await pool.query('SELECT TransactionID FROM adhoc_transactions WHERE TransactionID = ?', [id]);
          if (adhocCheck.length > 0) {
            transactionTable = 'adhoc_transactions';
            [result] = await pool.query('DELETE FROM adhoc_transactions WHERE TransactionID = ?', [id]);
          }
        }

        if (result && result.affectedRows > 0) {
          deletedCount++;
          results.push({ id, table: transactionTable, status: 'deleted' });
        } else {
          notFoundCount++;
          results.push({ id, table: null, status: 'not_found' });
        }
      }

      console.log(`✅ Bulk delete completed - Deleted: ${deletedCount}, Not found: ${notFoundCount}`);

      res.json({
        message: `Successfully deleted ${deletedCount} transaction(s)`,
        deletedCount,
        notFoundCount,
        totalRequested: ids.length,
        results
      });
    } catch (error) {
      console.error('❌ Error bulk deleting transactions:', error);
      res.status(500).json({ error: 'Unable to delete transactions. Please try again later.' });
    }
  });

  // Delete a daily vehicle transaction
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      console.log('🗑️ DELETE request received for transaction ID:', id);

      // First, determine which table the transaction is in
      let transactionTable = null;
      let result = null;

      // Check fixed_transactions
      const [fixedCheck] = await pool.query('SELECT TransactionID FROM fixed_transactions WHERE TransactionID = ?', [id]);
      if (fixedCheck.length > 0) {
        transactionTable = 'fixed_transactions';
        [result] = await pool.query('DELETE FROM fixed_transactions WHERE TransactionID = ?', [id]);
      } else {
        // Check adhoc_transactions
        const [adhocCheck] = await pool.query('SELECT TransactionID FROM adhoc_transactions WHERE TransactionID = ?', [id]);
        if (adhocCheck.length > 0) {
          transactionTable = 'adhoc_transactions';
          [result] = await pool.query('DELETE FROM adhoc_transactions WHERE TransactionID = ?', [id]);
        }
      }

      if (!result || result.affectedRows === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      console.log('🗑️ Deleted transaction from table:', transactionTable, 'Affected rows:', result.affectedRows);
      res.json({
        success: true,
        message: 'Transaction deleted successfully',
        TransactionID: id,
        table: transactionTable,
        affectedRows: result.affectedRows
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Serve uploaded files from external directory
  router.get('/files/:filename', (req, res) => {
    const filename = req.params.filename;

    // Handle both old format (just filename) and new format (transactions/filename)
    let relativePath = filename;
    if (!filename.includes('/')) {
      relativePath = `transactions/${filename}`;
    }

    const filePath = uploadsManager.getFullPath(relativePath);
    console.log('🔍 Serving file:', { filename, relativePath, filePath });

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found:', filePath);
      return res.status(404).json({ error: 'File not found' });
    }

    // Set cache headers to prevent caching issues with newly uploaded files
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Set content disposition for inline viewing
    res.setHeader('Content-Disposition', 'inline');

    // Send file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('❌ Error serving file:', err);
        res.status(500).json({ error: 'Error serving file' });
      }
    });
  });

  // Test endpoint to debug database connectivity
  router.get('/test', async (req, res) => {
    res.json({
      success: true,
      message: 'Daily vehicle transactions API is working!',
      timestamp: new Date().toISOString()
    });
  });

  // Database test endpoint
  router.get('/test-db', async (req, res) => {
    try {
      const [result] = await pool.query('SELECT COUNT(*) as count FROM Customer');
      res.json({
        success: true,
        message: 'Database connection working',
        customer_count: result[0].count
      });
    } catch (error) {
      console.error('Database test error:', error);
      res.status(500).json({ 
        error: 'Database connection failed',
        details: error.message 
      });
    }
  });



  // Helper function to add file URLs to transaction data
  const addFileUrls = (transaction) => {
    const baseUrl = '/api/daily-vehicle-transactions/files/';

    if (transaction.DriverAadharDoc) {
      // Extract filename from relative path (transactions/filename.pdf -> filename.pdf)
      const filename = transaction.DriverAadharDoc.includes('/')
        ? transaction.DriverAadharDoc.split('/').pop()
        : transaction.DriverAadharDoc;
      transaction.DriverAadharDoc_url = baseUrl + filename;
    }
    if (transaction.DriverLicenceDoc) {
      const filename = transaction.DriverLicenceDoc.includes('/')
        ? transaction.DriverLicenceDoc.split('/').pop()
        : transaction.DriverLicenceDoc;
      transaction.DriverLicenceDoc_url = baseUrl + filename;
    }
    if (transaction.TollExpensesDoc) {
      const filename = transaction.TollExpensesDoc.includes('/')
        ? transaction.TollExpensesDoc.split('/').pop()
        : transaction.TollExpensesDoc;
      transaction.TollExpensesDoc_url = baseUrl + filename;
    }
    if (transaction.ParkingChargesDoc) {
      const filename = transaction.ParkingChargesDoc.includes('/')
        ? transaction.ParkingChargesDoc.split('/').pop()
        : transaction.ParkingChargesDoc;
      transaction.ParkingChargesDoc_url = baseUrl + filename;
    }

    // Add KM image URLs
    if (transaction.OpeningKMImage) {
      const filename = transaction.OpeningKMImage.includes('/')
        ? transaction.OpeningKMImage.split('/').pop()
        : transaction.OpeningKMImage;
      transaction.OpeningKMImage_url = baseUrl + filename;
    }
    if (transaction.ClosingKMImage) {
      const filename = transaction.ClosingKMImage.includes('/')
        ? transaction.ClosingKMImage.split('/').pop()
        : transaction.ClosingKMImage;
      transaction.ClosingKMImage_url = baseUrl + filename;
    }

    return transaction;
  };

  // =====================================================
  // EXPORT ENDPOINTS
  // =====================================================

  // Export Fixed Transactions Only
  router.get('/export/fixed', async (req, res) => {
    try {
      console.log('📊 GET /api/daily-vehicle-transactions/export/fixed called');

      // Get all Fixed transactions with proper JOINs
      const fixedQuery = `
        SELECT
          ft.*,
          'Fixed' as TripType,
          COALESCE(c.Name, c.MasterCustomerName, 'Unknown Customer') as CustomerName,
          COALESCE(ft.GSTNo, c.GSTNo, 'N/A') as GSTNo,
          COALESCE(p.ProjectName, 'N/A') as ProjectName,
          COALESCE(v.VendorName, ft.VendorName, 'N/A') as VendorName,
          COALESCE(v.VendorCode, 'N/A') as VendorCode,
          COALESCE(ft.Location, c.Locations, 'N/A') as Location,
          COALESCE(ft.CustomerSite, c.CustomerSite, 'N/A') as CustomerSite,
          COALESCE(ft.CompanyName, c.Name, 'N/A') as CompanyName
        FROM fixed_transactions ft
        LEFT JOIN customer c ON ft.CustomerID = c.CustomerID
        LEFT JOIN project p ON ft.ProjectID = p.ProjectID
        LEFT JOIN vendor v ON ft.VendorID = v.VendorID
        ORDER BY ft.TransactionDate DESC, ft.TransactionID DESC
      `;

      const [fixedRows] = await pool.query(fixedQuery);
      console.log('🔍 Export Fixed: Found', fixedRows.length, 'fixed transactions');

      if (fixedRows.length === 0) {
        return res.status(404).json({ error: 'No Fixed transactions found' });
      }

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Fixed Transactions');

      // Define columns for Fixed transactions (exact template order - 33 columns)
      worksheet.columns = [
        { header: 'Customer', key: 'CustomerName', width: 20 },
        { header: 'GST No', key: 'GSTNo', width: 18 },
        { header: 'Project', key: 'ProjectName', width: 20 },
        { header: 'Location', key: 'Location', width: 15 },
        { header: 'Cust Site', key: 'CustomerSite', width: 15 },
        { header: 'Type of Vehicle Placement', key: 'TripType', width: 25 },
        { header: 'Vehicle Type', key: 'VehicleType', width: 15 },
        { header: 'Vehicle No.', key: 'VehicleNo', width: 20 },
        { header: 'Vendor Name', key: 'VendorName', width: 20 },
        { header: 'Vendor Code', key: 'VendorCode', width: 15 },
        { header: 'Driver Name', key: 'DriverName', width: 20 },
        { header: 'Driver No.', key: 'DriverNo', width: 15 },
        { header: 'Replacement Driver Name', key: 'ReplacementDriverName', width: 25 },
        { header: 'Replacement Driver No.', key: 'ReplacementDriverNo', width: 20 },
        { header: 'Date', key: 'TransactionDate', width: 15 },
        { header: 'Arrival Time at Hub', key: 'ArrivalTimeAtHub', width: 20 },
        { header: 'In Time by Cust', key: 'InTimeByCust', width: 18 },
        { header: 'Opening KM', key: 'OpeningKM', width: 12 },
        { header: 'Out Time from Hub', key: 'OutTimeFromHub', width: 18 },
        { header: 'Total Deliveries', key: 'TotalDeliveries', width: 18 },
        { header: 'Total Deliveries Attempted', key: 'TotalDeliveriesAttempted', width: 25 },
        { header: 'Total Deliveries Done', key: 'TotalDeliveriesDone', width: 22 },
        { header: 'Return Reporting Time', key: 'ReturnReportingTime', width: 22 },
        { header: 'Closing KM', key: 'ClosingKM', width: 12 },
        { header: 'TOTAL KM', key: 'TotalKM', width: 12 },
        { header: 'V. FREIGHT (FIX)', key: 'VFreightFix', width: 18 },
        { header: 'Toll Expenses', key: 'TollExpenses', width: 15 },
        { header: 'Parking Charges', key: 'ParkingCharges', width: 18 },
        { header: 'Handling Charges', key: 'HandlingCharges', width: 18 },
        { header: 'Out Time From HUB', key: 'OutTimeFromHUB', width: 20 },
        { header: 'Total Duty Hours', key: 'TotalDutyHours', width: 18 },
        { header: 'Remarks', key: 'Remarks', width: 30 },
        { header: 'Trip Close', key: 'TripClose', width: 12 }
      ];

      // Process data to resolve vehicle and driver information
      const processedRows = [];

      for (const row of fixedRows) {
        // Resolve vehicle information from VehicleIDs JSON
        let vehicleNos = 'None';
        let vehicleTypes = row.VehicleType || 'None';

        if (row.VehicleIDs) {
          try {
            let vehicleIds;
            if (typeof row.VehicleIDs === 'string') {
              vehicleIds = JSON.parse(row.VehicleIDs);
            } else {
              vehicleIds = row.VehicleIDs;
            }

            if (Array.isArray(vehicleIds) && vehicleIds.length > 0) {
              // Convert string IDs to numbers
              const numericIds = vehicleIds.map(id => parseInt(id)).filter(id => !isNaN(id));

              if (numericIds.length > 0) {
                // Query vehicles to get registration numbers and vendor info
                const vehicleQuery = `
                  SELECT
                    v.VehicleRegistrationNo,
                    v.VehicleType,
                    vend.VendorName,
                    vend.VendorCode
                  FROM vehicle v
                  LEFT JOIN vendor vend ON v.VendorID = vend.VendorID
                  WHERE v.VehicleID IN (${numericIds.map(() => '?').join(',')})
                `;
                const [vehicles] = await pool.query(vehicleQuery, numericIds);

                if (vehicles.length > 0) {
                  vehicleNos = vehicles.map(v => v.VehicleRegistrationNo).filter(v => v).join(', ') || 'None';
                  const types = vehicles.map(v => v.VehicleType).filter(v => v);
                  if (types.length > 0) {
                    vehicleTypes = [...new Set(types)].join(', ');
                  }

                  // Get vendor information from vehicles
                  const vendorNames = vehicles.map(v => v.VendorName).filter(v => v);
                  const vendorCodes = vehicles.map(v => v.VendorCode).filter(v => v);

                  if (vendorNames.length > 0) {
                    row.VendorName = [...new Set(vendorNames)].join(', ');
                  }
                  if (vendorCodes.length > 0) {
                    row.VendorCode = [...new Set(vendorCodes)].join(', ');
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error parsing VehicleIDs:', e);
          }
        }

        // Resolve driver information from DriverIDs JSON
        let driverNames = 'None';
        let driverNos = 'None';

        if (row.DriverIDs) {
          try {
            let driverIds;
            if (typeof row.DriverIDs === 'string') {
              driverIds = JSON.parse(row.DriverIDs);
            } else {
              driverIds = row.DriverIDs;
            }

            if (Array.isArray(driverIds) && driverIds.length > 0) {
              // Convert string IDs to numbers
              const numericIds = driverIds.map(id => parseInt(id)).filter(id => !isNaN(id));

              if (numericIds.length > 0) {
                // Query drivers to get names and mobile numbers
                const driverQuery = `SELECT DriverName, DriverMobileNo FROM driver WHERE DriverID IN (${numericIds.map(() => '?').join(',')})`;
                const [drivers] = await pool.query(driverQuery, numericIds);

                if (drivers.length > 0) {
                  driverNames = drivers.map(d => d.DriverName).filter(d => d).join(', ') || 'None';
                  driverNos = drivers.map(d => d.DriverMobileNo).filter(d => d).join(', ') || 'None';
                }
              }
            }
          } catch (e) {
            console.error('Error parsing DriverIDs:', e);
          }
        }

        // Calculate total KM
        const totalKM = (row.ClosingKM && row.OpeningKM) ? (row.ClosingKM - row.OpeningKM) : null;

        processedRows.push({
          CustomerName: row.CustomerName || 'None',
          GSTNo: row.GSTNo || 'None',
          ProjectName: row.ProjectName || 'None',
          Location: row.Location || 'None',
          CustomerSite: row.CustomerSite || 'None',
          TripType: 'Fix', // Fixed transactions show as "Fix"
          VehicleType: vehicleTypes,
          VehicleNo: vehicleNos,
          VendorName: row.VendorName || 'None', // This will be set from vehicle query above
          VendorCode: row.VendorCode || 'None', // This will be set from vehicle query above
          DriverName: driverNames,
          DriverNo: driverNos,
          ReplacementDriverName: row.ReplacementDriverName || 'None',
          ReplacementDriverNo: row.ReplacementDriverNo || 'None',
          TransactionDate: row.TransactionDate ? new Date(row.TransactionDate).toLocaleDateString() : '',
          ArrivalTimeAtHub: row.ArrivalTimeAtHub || '',
          InTimeByCust: row.InTimeByCust || '',
          OpeningKM: row.OpeningKM || '',
          OutTimeFromHub: row.OutTimeFromHub || '',
          TotalDeliveries: row.TotalDeliveries || '',
          TotalDeliveriesAttempted: row.TotalDeliveriesAttempted || '',
          TotalDeliveriesDone: row.TotalDeliveriesDone || '',
          ReturnReportingTime: row.ReturnReportingTime || '',
          ClosingKM: row.ClosingKM || '',
          TotalKM: totalKM,
          VFreightFix: row.VFreightFix || '',
          TollExpenses: row.TollExpenses || '',
          ParkingCharges: row.ParkingCharges || '',
          HandlingCharges: row.HandlingCharges || '',
          OutTimeFromHUB: row.OutTimeFrom || row.OutTimeFromHUB || '',
          TotalDutyHours: row.TotalDutyHours || '',
          Remarks: row.Remarks || 'None',
          TripClose: row.TripClose ? 'Yes' : 'None'
        });
      }

      // Add processed data to worksheet
      processedRows.forEach(row => {
        worksheet.addRow(row);
      });

      // Set response headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=fixed-transactions.xlsx');

      // Write workbook to response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error exporting Fixed transactions:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Export Adhoc/Replacement Transactions Only
  router.get('/export/adhoc', async (req, res) => {
    try {
      console.log('📊 GET /api/daily-vehicle-transactions/export/adhoc called');

      // Get all Adhoc/Replacement transactions with proper JOINs
      const adhocQuery = `
        SELECT
          at.*,
          at.TripType,
          COALESCE(c.Name, c.MasterCustomerName, 'Unknown Customer') as CustomerName,
          COALESCE(c.GSTNo, 'N/A') as GSTNo,
          COALESCE(p.ProjectName, 'N/A') as ProjectName,
          COALESCE(c.Locations, 'N/A') as Location,
          COALESCE(c.CustomerSite, 'N/A') as CustomerSite,
          COALESCE(c.Name, 'N/A') as CompanyName,
          'N/A' as VendorCode
        FROM adhoc_transactions at
        LEFT JOIN customer c ON at.CustomerID = c.CustomerID
        LEFT JOIN project p ON at.ProjectID = p.ProjectID
        WHERE at.TripType IN ('Adhoc', 'Replacement')
        ORDER BY at.TransactionDate DESC, at.TransactionID DESC
      `;

      const [adhocRows] = await pool.query(adhocQuery);
      console.log('🔍 Export Adhoc: Found', adhocRows.length, 'adhoc/replacement transactions');

      if (adhocRows.length === 0) {
        return res.status(404).json({ error: 'No Adhoc/Replacement transactions found' });
      }

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Adhoc Transactions');

      // Define columns in exact order from your Excel template
      worksheet.columns = [
        { header: 'Customer', key: 'CustomerName', width: 20 },
        { header: 'Company Name', key: 'CompanyName', width: 20 },
        { header: 'GST No', key: 'GSTNo', width: 18 },
        { header: 'Project', key: 'ProjectName', width: 20 },
        { header: 'Location', key: 'Location', width: 15 },
        { header: 'Cust Site', key: 'CustomerSite', width: 15 },
        { header: 'Type of Vehicle Placement', key: 'TripType', width: 20 },
        { header: 'Fix Vehicle No.', key: 'FixVehicleNo', width: 15 },
        { header: 'Vehicle Type', key: 'VehicleType', width: 15 },
        { header: 'Date', key: 'TransactionDate', width: 15 },
        { header: 'Trip No.', key: 'TripNo', width: 15 },
        { header: 'Vehicle No.', key: 'VehicleNumber', width: 15 },
        { header: 'Vendor Name', key: 'VendorName', width: 20 },
        { header: 'Vendor Contact No.', key: 'VendorNumber', width: 15 },
        { header: 'Vendor Code', key: 'VendorCode', width: 15 },
        { header: 'Driver Name', key: 'DriverName', width: 20 },
        { header: 'Driver No.', key: 'DriverNumber', width: 15 },
        { header: 'Driver Aadhar No.', key: 'DriverAadharNumber', width: 18 },
        { header: 'Driver Licence No.', key: 'DriverLicenceNumber', width: 18 },
        { header: 'Arrival Time at Hub', key: 'ArrivalTimeAtHub', width: 18 },
        { header: 'In Time by Cust', key: 'InTimeByCust', width: 15 },
        { header: 'Opening KM', key: 'OpeningKM', width: 12 },
        { header: 'Out Time from Hub', key: 'OutTimeFromHub', width: 18 },
        { header: 'Total Shipments for Deliveries', key: 'TotalShipmentsForDeliveries', width: 25 },
        { header: 'Total Shipment Deliveries Attempted', key: 'TotalShipmentDeliveriesAttempted', width: 30 },
        { header: 'Total Shipment Deliveries Done', key: 'TotalShipmentDeliveriesDone', width: 28 },
        { header: 'Return Reporting Time', key: 'ReturnReportingTime', width: 20 },
        { header: 'Closing KM', key: 'ClosingKM', width: 12 },
        { header: 'TOTAL KM', key: 'TotalKM', width: 12 },
        { header: 'V. FREIGHT (FIX)', key: 'VFreightFix', width: 15 },
        { header: 'Fix KM, If Any', key: 'FixKm', width: 15 },
        { header: 'V. Freight (Variable - Per KM)', key: 'VFreightVariable', width: 25 },
        { header: 'Toll Expenses', key: 'TollExpenses', width: 15 },
        { header: 'Parking Charges', key: 'ParkingCharges', width: 15 },
        { header: 'Loading Charges', key: 'LoadingCharges', width: 15 },
        { header: 'Unloading Charges', key: 'UnloadingCharges', width: 18 },
        { header: 'Other Charges, If any', key: 'OtherCharges', width: 20 },
        { header: 'Other Charges Remarks', key: 'OtherChargesRemarks', width: 20 },
        { header: 'Out Time From HUB', key: 'OutTimeFrom', width: 18 },
        { header: 'Total Duty Hours', key: 'TotalDutyHours', width: 15 },
        { header: 'Total Freight', key: 'TotalFreight', width: 15 },
        { header: 'Advance request No.', key: 'AdvanceRequestNo', width: 20 },
        { header: 'Advance To be paid', key: 'AdvanceToPaid', width: 18 },
        { header: 'Advance Approved Amount', key: 'AdvanceApprovedAmount', width: 22 },
        { header: 'Advance Approved by', key: 'AdvanceApprovedBy', width: 20 },
        { header: 'Advance paid', key: 'AdvancePaidAmount', width: 15 },
        { header: 'Advance Paid Mode (UPI/ Bank Transfer)', key: 'AdvancePaidMode', width: 35 },
        { header: 'Advance Paid Date', key: 'AdvancePaidDate', width: 18 },
        { header: 'Advance paid by', key: 'AdvancePaidBy', width: 18 },
        { header: 'Employee Details, if Advance paid by Employee', key: 'EmployeeDetailsAdvance', width: 40 },
        { header: 'Balance to be paid', key: 'BalanceToBePaid', width: 18 },
        { header: 'Balance Paid Amt', key: 'BalancePaidAmount', width: 18 },
        { header: 'Variance, if any', key: 'Variance', width: 15 },
        { header: 'Balance Paid Date', key: 'BalancePaidDate', width: 18 },
        { header: 'Balance paid by', key: 'BalancePaidBy', width: 18 },
        { header: 'Employee Details, if Balance paid by Employee', key: 'EmployeeDetailsBalance', width: 40 },
        { header: 'Remarks', key: 'Remarks', width: 30 },
        { header: 'Revenue', key: 'Revenue', width: 15 },
        { header: 'Margin', key: 'Margin', width: 15 },
        { header: 'Margin %Age', key: 'MarginPercentage', width: 15 },
        { header: 'Trip Close', key: 'TripClose', width: 12 }
      ];

      // Add data to worksheet with proper formatting
      adhocRows.forEach(row => {
        // Calculate derived fields
        const totalKM = (row.ClosingKM && row.OpeningKM) ? (row.ClosingKM - row.OpeningKM) : null;
        const totalFreight = calculateTotalFreight(row, totalKM);
        const balanceToBePaid = (row.TotalFreight || totalFreight || 0) - (row.AdvancePaidAmount || 0);
        const variance = (row.BalancePaidAmount || 0) - balanceToBePaid;
        const revenue = row.Revenue || totalFreight || 0;
        const margin = revenue - (totalFreight || 0);
        const marginPercentage = revenue > 0 ? (margin / revenue) : 0;

        worksheet.addRow({
          CustomerName: row.CustomerName || 'None',
          CompanyName: row.CompanyName || 'None',
          GSTNo: row.GSTNo || 'None',
          ProjectName: row.ProjectName || 'None',
          Location: row.Location || 'None',
          CustomerSite: row.CustomerSite || 'None',
          TripType: row.TripType || 'Adhoc',
          FixVehicleNo: 'None', // Adhoc transactions don't have fixed vehicles
          VehicleType: row.VehicleType || 'None',
          TransactionDate: row.TransactionDate ? new Date(row.TransactionDate).toLocaleDateString() : '',
          TripNo: row.TripNo || 'None',
          VehicleNumber: row.VehicleNumber || 'None',
          VendorName: row.VendorName || 'None',
          VendorNumber: row.VendorNumber || 'None',
          VendorCode: row.VendorCode || 'None',
          DriverName: row.DriverName || 'None',
          DriverNumber: row.DriverNumber || 'None',
          DriverAadharNumber: row.DriverAadharNumber || 'None',
          DriverLicenceNumber: row.DriverLicenceNumber || 'None',
          ArrivalTimeAtHub: row.ArrivalTimeAtHub || '',
          InTimeByCust: row.InTimeByCust || '',
          OpeningKM: row.OpeningKM || '',
          OutTimeFromHub: row.OutTimeFromHub || '',
          TotalShipmentsForDeliveries: row.TotalShipmentsForDeliveries || '',
          TotalShipmentDeliveriesAttempted: row.TotalShipmentDeliveriesAttempted || '',
          TotalShipmentDeliveriesDone: row.TotalShipmentDeliveriesDone || '',
          ReturnReportingTime: row.ReturnReportingTime || '',
          ClosingKM: row.ClosingKM || '',
          TotalKM: totalKM,
          VFreightFix: row.VFreightFix || '',
          FixKm: row.FixKm || 'None',
          VFreightVariable: row.VFreightVariable || '',
          TollExpenses: row.TollExpenses || '',
          ParkingCharges: row.ParkingCharges || '',
          LoadingCharges: row.LoadingCharges || '',
          UnloadingCharges: row.UnloadingCharges || '',
          OtherCharges: row.OtherCharges || '',
          OtherChargesRemarks: row.OtherChargesRemarks || 'None',
          OutTimeFrom: row.OutTimeFrom || '',
          TotalDutyHours: row.TotalDutyHours || '',
          TotalFreight: totalFreight,
          AdvanceRequestNo: row.AdvanceRequestNo || 'None',
          AdvanceToPaid: row.AdvanceToPaid || '',
          AdvanceApprovedAmount: row.AdvanceApprovedAmount || '',
          AdvanceApprovedBy: row.AdvanceApprovedBy || 'None',
          AdvancePaidAmount: row.AdvancePaidAmount || '',
          AdvancePaidMode: row.AdvancePaidMode || 'None',
          AdvancePaidDate: row.AdvancePaidDate ? new Date(row.AdvancePaidDate).toLocaleDateString() : '',
          AdvancePaidBy: row.AdvancePaidBy || 'None',
          EmployeeDetailsAdvance: row.EmployeeDetailsAdvance || 'None',
          BalanceToBePaid: balanceToBePaid,
          BalancePaidAmount: row.BalancePaidAmount || '',
          Variance: variance,
          BalancePaidDate: row.BalancePaidDate ? new Date(row.BalancePaidDate).toLocaleDateString() : '',
          BalancePaidBy: row.BalancePaidBy || 'None',
          EmployeeDetailsBalance: row.EmployeeDetailsBalance || 'None',
          Remarks: row.Remarks || 'None',
          Revenue: revenue,
          Margin: margin,
          MarginPercentage: marginPercentage,
          TripClose: row.TripClose ? 'Yes' : 'None'
        });
      });

      // Set response headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=adhoc-replacement-transactions.xlsx');

      // Write workbook to response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error exporting Adhoc transactions:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Export All Transactions (Fixed + Adhoc + Replacement) in a single Excel file with 3 sheets
  router.get('/export/all', async (req, res) => {
    try {
      console.log('📊 GET /api/daily-vehicle-transactions/export/all called');

      // Get all Fixed transactions
      const fixedQuery = `
        SELECT
          ft.*,
          COALESCE(c.Name, c.MasterCustomerName, 'Unknown Customer') as CustomerName,
          COALESCE(p.ProjectName, 'N/A') as ProjectName
        FROM fixed_transactions ft
        LEFT JOIN Customer c ON ft.CustomerID = c.CustomerID
        LEFT JOIN Project p ON ft.ProjectID = p.ProjectID
        WHERE ft.TripType = 'Fixed'
        ORDER BY ft.UpdatedAt DESC, ft.TransactionDate DESC, ft.TransactionID DESC
      `;

      // Get all Adhoc transactions
      const adhocQuery = `
        SELECT
          at.*,
          COALESCE(c.Name, c.MasterCustomerName, 'Unknown Customer') as CustomerName,
          COALESCE(p.ProjectName, 'N/A') as ProjectName
        FROM adhoc_transactions at
        LEFT JOIN Customer c ON at.CustomerID = c.CustomerID
        LEFT JOIN Project p ON at.ProjectID = p.ProjectID
        WHERE at.TripType = 'Adhoc'
        ORDER BY at.UpdatedAt DESC, at.TransactionDate DESC, at.TransactionID DESC
      `;

      // Get all Replacement transactions
      const replacementQuery = `
        SELECT
          at.*,
          COALESCE(c.Name, c.MasterCustomerName, 'Unknown Customer') as CustomerName,
          COALESCE(p.ProjectName, 'N/A') as ProjectName
        FROM adhoc_transactions at
        LEFT JOIN Customer c ON at.CustomerID = c.CustomerID
        LEFT JOIN Project p ON at.ProjectID = p.ProjectID
        WHERE at.TripType = 'Replacement'
        ORDER BY at.UpdatedAt DESC, at.TransactionDate DESC, at.TransactionID DESC
      `;

      const [fixedRows] = await pool.query(fixedQuery);
      const [adhocRows] = await pool.query(adhocQuery);
      const [replacementRows] = await pool.query(replacementQuery);

      console.log('🔍 Export All: Found', fixedRows.length, 'fixed,', adhocRows.length, 'adhoc, and', replacementRows.length, 'replacement transactions');

      if (fixedRows.length === 0 && adhocRows.length === 0 && replacementRows.length === 0) {
        return res.status(404).json({ error: 'No transactions found' });
      }

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();

      // Create Fixed Transactions sheet if there are fixed transactions
      if (fixedRows.length > 0) {
        const fixedSheet = workbook.addWorksheet('Fixed Transactions');

        // Define ALL columns for Fixed transactions in logical form sequence (Shift column REMOVED)
        fixedSheet.columns = [
          // Basic Transaction Info
          { header: 'Transaction ID', key: 'TransactionID', width: 15 },
          { header: 'Trip Type', key: 'TripType', width: 12 },
          { header: 'Transaction Date', key: 'TransactionDate', width: 15 },
          { header: 'Trip No', key: 'TripNo', width: 15 },
          { header: 'Status', key: 'Status', width: 12 },
          { header: 'Trip Close', key: 'TripClose', width: 12 },

          // Company/Customer Details (Master Data Section)
          { header: 'Company Name', key: 'CompanyName', width: 25 },
          { header: 'GST No', key: 'GSTNo', width: 18 },
          { header: 'Customer Name', key: 'CustomerName', width: 25 },
          { header: 'Project Name', key: 'ProjectName', width: 25 },
          { header: 'Location', key: 'Location', width: 25 },
          { header: 'Customer Site', key: 'CustomerSite', width: 25 },

          // Vehicle Details
          { header: 'Vehicle Number', key: 'VehicleNumber', width: 15 },
          { header: 'Vehicle Type', key: 'VehicleType', width: 15 },

          // Vendor Details
          { header: 'Vendor Name', key: 'VendorName', width: 25 },
          { header: 'Vendor Number', key: 'VendorNumber', width: 15 },

          // Driver Details
          { header: 'Driver Name', key: 'DriverName', width: 20 },
          { header: 'Driver Number', key: 'DriverNumber', width: 15 },
          { header: 'Driver Aadhar Number', key: 'DriverAadharNumber', width: 18 },
          { header: 'Driver Licence Number', key: 'DriverLicenceNumber', width: 20 },

          // Replacement Driver Details
          { header: 'Replacement Driver ID', key: 'ReplacementDriverID', width: 20 },
          { header: 'Replacement Driver Name', key: 'ReplacementDriverName', width: 25 },
          { header: 'Replacement Driver No', key: 'ReplacementDriverNo', width: 18 },

          // Time Tracking Fields (6 mandatory - in chronological order)
          { header: 'Vehicle Reporting At Hub', key: 'VehicleReportingAtHub', width: 25 },
          { header: 'Vehicle Entry In Hub', key: 'VehicleEntryInHub', width: 25 },
          { header: 'Vehicle Out From Hub For Delivery', key: 'VehicleOutFromHubForDelivery', width: 32 },
          { header: 'Vehicle Return At Hub', key: 'VehicleReturnAtHub', width: 25 },
          { header: 'Vehicle Entered At Hub Return', key: 'VehicleEnteredAtHubReturn', width: 30 },
          { header: 'Vehicle Out From Hub Final', key: 'VehicleOutFromHubFinal', width: 28 },

          // KM & Delivery Details
          { header: 'Opening KM', key: 'OpeningKM', width: 12 },
          { header: 'Closing KM', key: 'ClosingKM', width: 12 },
          { header: 'Total Deliveries', key: 'TotalDeliveries', width: 15 },
          { header: 'Total Deliveries Attempted', key: 'TotalDeliveriesAttempted', width: 25 },
          { header: 'Total Deliveries Done', key: 'TotalDeliveriesDone', width: 20 },
          { header: 'Total Duty Hours', key: 'TotalDutyHours', width: 15 },

          // Freight & Charges (Financial Section)
          { header: 'V.Freight (Fix)', key: 'VFreightFix', width: 15 },
          { header: 'Fix KM', key: 'FixKm', width: 12 },
          { header: 'V.Freight (Variable)', key: 'VFreightVariable', width: 18 },
          { header: 'Total Freight', key: 'TotalFreight', width: 15 },
          { header: 'Toll Expenses', key: 'TollExpenses', width: 15 },
          { header: 'Parking Charges', key: 'ParkingCharges', width: 15 },
          { header: 'Loading Charges', key: 'LoadingCharges', width: 15 },
          { header: 'Unloading Charges', key: 'UnloadingCharges', width: 18 },
          { header: 'Handling Charges', key: 'HandlingCharges', width: 15 },
          { header: 'Other Charges', key: 'OtherCharges', width: 15 },
          { header: 'Other Charges Remarks', key: 'OtherChargesRemarks', width: 25 },

          // Advance Payment Details
          { header: 'Advance Request No', key: 'AdvanceRequestNo', width: 18 },
          { header: 'Advance To Paid', key: 'AdvanceToPaid', width: 15 },
          { header: 'Advance Approved Amount', key: 'AdvanceApprovedAmount', width: 22 },
          { header: 'Advance Approved By', key: 'AdvanceApprovedBy', width: 20 },
          { header: 'Advance Paid Amount', key: 'AdvancePaidAmount', width: 18 },
          { header: 'Advance Paid Mode', key: 'AdvancePaidMode', width: 18 },
          { header: 'Advance Paid Date', key: 'AdvancePaidDate', width: 15 },
          { header: 'Advance Paid By', key: 'AdvancePaidBy', width: 18 },
          { header: 'Employee Details (Advance)', key: 'EmployeeDetailsAdvance', width: 25 },

          // Balance Payment Details
          { header: 'Balance To Be Paid', key: 'BalanceToBePaid', width: 18 },
          { header: 'Balance Paid Amount', key: 'BalancePaidAmount', width: 18 },
          { header: 'Variance', key: 'Variance', width: 12 },
          { header: 'Balance Paid Date', key: 'BalancePaidDate', width: 15 },
          { header: 'Balance Paid By', key: 'BalancePaidBy', width: 18 },
          { header: 'Employee Details (Balance)', key: 'EmployeeDetailsBalance', width: 25 },

          // Financial Tracking (Supervisor Section)
          { header: 'Revenue', key: 'Revenue', width: 12 },
          { header: 'Margin', key: 'Margin', width: 12 },
          { header: 'Margin %', key: 'MarginPercentage', width: 12 },

          // Document References
          { header: 'Driver Aadhar Doc', key: 'DriverAadharDoc', width: 30 },
          { header: 'Driver Licence Doc', key: 'DriverLicenceDoc', width: 30 },
          { header: 'Toll Expenses Doc', key: 'TollExpensesDoc', width: 30 },
          { header: 'Parking Charges Doc', key: 'ParkingChargesDoc', width: 30 },
          { header: 'Opening KM Image', key: 'OpeningKMImage', width: 30 },
          { header: 'Closing KM Image', key: 'ClosingKMImage', width: 30 },

          // Additional/Remarks
          { header: 'Remarks', key: 'Remarks', width: 35 },

          // System Fields
          { header: 'Created At', key: 'CreatedAt', width: 20 },
          { header: 'Updated At', key: 'UpdatedAt', width: 20 }
        ];

        // Add data rows for Fixed transactions with ALL columns (Shift removed, reordered to match form)
        fixedRows.forEach(row => {
          fixedSheet.addRow({
            // Basic Transaction Info
            TransactionID: row.TransactionID || '',
            TripType: row.TripType || '',
            TransactionDate: row.TransactionDate ? new Date(row.TransactionDate).toISOString().split('T')[0] : '',
            TripNo: row.TripNo || '',
            Status: row.Status || '',
            TripClose: row.TripClose ? 'Yes' : 'No',

            // Company/Customer Details
            CompanyName: row.CompanyName || '',
            GSTNo: row.GSTNo || '',
            CustomerName: row.CustomerName || '',
            ProjectName: row.ProjectName || '',
            Location: row.Location || '',
            CustomerSite: row.CustomerSite || '',

            // Vehicle Details
            VehicleNumber: row.VehicleNumber || '',
            VehicleType: row.VehicleType || '',

            // Vendor Details
            VendorName: row.VendorName || '',
            VendorNumber: row.VendorNumber || '',

            // Driver Details
            DriverName: row.DriverName || '',
            DriverNumber: row.DriverNumber || '',
            DriverAadharNumber: row.DriverAadharNumber || '',
            DriverLicenceNumber: row.DriverLicenceNumber || '',

            // Replacement Driver Details
            ReplacementDriverID: row.ReplacementDriverID || '',
            ReplacementDriverName: row.ReplacementDriverName || '',
            ReplacementDriverNo: row.ReplacementDriverNo || '',

            // Time Tracking (6 mandatory fields in chronological order)
            VehicleReportingAtHub: row.VehicleReportingAtHub || '',
            VehicleEntryInHub: row.VehicleEntryInHub || '',
            VehicleOutFromHubForDelivery: row.VehicleOutFromHubForDelivery || '',
            VehicleReturnAtHub: row.VehicleReturnAtHub || '',
            VehicleEnteredAtHubReturn: row.VehicleEnteredAtHubReturn || '',
            VehicleOutFromHubFinal: row.VehicleOutFromHubFinal || '',

            // KM & Delivery Details
            OpeningKM: row.OpeningKM !== null && row.OpeningKM !== undefined ? row.OpeningKM : '',
            ClosingKM: row.ClosingKM !== null && row.ClosingKM !== undefined ? row.ClosingKM : '',
            TotalDeliveries: row.TotalDeliveries !== null && row.TotalDeliveries !== undefined ? row.TotalDeliveries : '',
            TotalDeliveriesAttempted: row.TotalDeliveriesAttempted !== null && row.TotalDeliveriesAttempted !== undefined ? row.TotalDeliveriesAttempted : '',
            TotalDeliveriesDone: row.TotalDeliveriesDone !== null && row.TotalDeliveriesDone !== undefined ? row.TotalDeliveriesDone : '',
            TotalDutyHours: row.TotalDutyHours !== null && row.TotalDutyHours !== undefined ? row.TotalDutyHours : '',

            // Freight & Charges
            VFreightFix: row.VFreightFix !== null && row.VFreightFix !== undefined ? row.VFreightFix : '',
            FixKm: row.FixKm !== null && row.FixKm !== undefined ? row.FixKm : '',
            VFreightVariable: row.VFreightVariable !== null && row.VFreightVariable !== undefined ? row.VFreightVariable : '',
            TotalFreight: row.TotalFreight !== null && row.TotalFreight !== undefined ? row.TotalFreight : '',
            TollExpenses: row.TollExpenses !== null && row.TollExpenses !== undefined ? row.TollExpenses : '',
            ParkingCharges: row.ParkingCharges !== null && row.ParkingCharges !== undefined ? row.ParkingCharges : '',
            LoadingCharges: row.LoadingCharges !== null && row.LoadingCharges !== undefined ? row.LoadingCharges : '',
            UnloadingCharges: row.UnloadingCharges !== null && row.UnloadingCharges !== undefined ? row.UnloadingCharges : '',
            HandlingCharges: row.HandlingCharges !== null && row.HandlingCharges !== undefined ? row.HandlingCharges : '',
            OtherCharges: row.OtherCharges !== null && row.OtherCharges !== undefined ? row.OtherCharges : '',
            OtherChargesRemarks: row.OtherChargesRemarks || '',

            // Advance Payment Details
            AdvanceRequestNo: row.AdvanceRequestNo || '',
            AdvanceToPaid: row.AdvanceToPaid !== null && row.AdvanceToPaid !== undefined ? row.AdvanceToPaid : '',
            AdvanceApprovedAmount: row.AdvanceApprovedAmount !== null && row.AdvanceApprovedAmount !== undefined ? row.AdvanceApprovedAmount : '',
            AdvanceApprovedBy: row.AdvanceApprovedBy || '',
            AdvancePaidAmount: row.AdvancePaidAmount !== null && row.AdvancePaidAmount !== undefined ? row.AdvancePaidAmount : '',
            AdvancePaidMode: row.AdvancePaidMode || '',
            AdvancePaidDate: row.AdvancePaidDate ? new Date(row.AdvancePaidDate).toISOString().split('T')[0] : '',
            AdvancePaidBy: row.AdvancePaidBy || '',
            EmployeeDetailsAdvance: row.EmployeeDetailsAdvance || '',

            // Balance Payment Details
            BalanceToBePaid: row.BalanceToBePaid !== null && row.BalanceToBePaid !== undefined ? row.BalanceToBePaid : '',
            BalancePaidAmount: row.BalancePaidAmount !== null && row.BalancePaidAmount !== undefined ? row.BalancePaidAmount : '',
            Variance: row.Variance !== null && row.Variance !== undefined ? row.Variance : '',
            BalancePaidDate: row.BalancePaidDate ? new Date(row.BalancePaidDate).toISOString().split('T')[0] : '',
            BalancePaidBy: row.BalancePaidBy || '',
            EmployeeDetailsBalance: row.EmployeeDetailsBalance || '',

            // Financial Tracking
            Revenue: row.Revenue !== null && row.Revenue !== undefined ? row.Revenue : '',
            Margin: row.Margin !== null && row.Margin !== undefined ? row.Margin : '',
            MarginPercentage: row.MarginPercentage !== null && row.MarginPercentage !== undefined ? row.MarginPercentage : '',

            // Document References
            DriverAadharDoc: row.DriverAadharDoc || '',
            DriverLicenceDoc: row.DriverLicenceDoc || '',
            TollExpensesDoc: row.TollExpensesDoc || '',
            ParkingChargesDoc: row.ParkingChargesDoc || '',
            OpeningKMImage: row.OpeningKMImage || '',
            ClosingKMImage: row.ClosingKMImage || '',

            // Additional/Remarks
            Remarks: row.Remarks || '',

            // System Fields
            CreatedAt: row.CreatedAt ? new Date(row.CreatedAt).toISOString() : '',
            UpdatedAt: row.UpdatedAt ? new Date(row.UpdatedAt).toISOString() : ''
          });
        });

        // Style the header row
        fixedSheet.getRow(1).font = { bold: true };
        fixedSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F3FF' }
        };
      }

      // Create Adhoc Transactions sheet if there are adhoc transactions
      if (adhocRows.length > 0) {
        const adhocSheet = workbook.addWorksheet('Adhoc Transactions');

        // Define ALL columns for Adhoc transactions in logical form sequence (UI fields only)
        adhocSheet.columns = [
          // Basic Transaction Info
          { header: 'Transaction ID', key: 'TransactionID', width: 15 },
          { header: 'Trip Type', key: 'TripType', width: 12 },
          { header: 'Transaction Date', key: 'TransactionDate', width: 15 },
          { header: 'Trip No', key: 'TripNo', width: 15 },
          { header: 'Status', key: 'Status', width: 12 },
          { header: 'Trip Close', key: 'TripClose', width: 12 },

          // Company/Customer Details (from form)
          { header: 'Company Name', key: 'CustomerName', width: 25 },
          { header: 'Project Name', key: 'ProjectName', width: 25 },

          // Vehicle Details
          { header: 'Vehicle Number', key: 'VehicleNumber', width: 15 },
          { header: 'Vehicle Type', key: 'VehicleType', width: 15 },

          // Vendor Details
          { header: 'Vendor Name', key: 'VendorName', width: 25 },
          { header: 'Vendor Number', key: 'VendorNumber', width: 15 },

          // Driver Details
          { header: 'Driver Name', key: 'DriverName', width: 20 },
          { header: 'Driver Number', key: 'DriverNumber', width: 15 },
          { header: 'Driver Aadhar Number', key: 'DriverAadharNumber', width: 18 },
          { header: 'Driver Licence Number', key: 'DriverLicenceNumber', width: 20 },

          // Time Tracking Fields (6 mandatory - in chronological order)
          { header: 'Vehicle Reporting At Hub', key: 'VehicleReportingAtHub', width: 25 },
          { header: 'Vehicle Entry In Hub', key: 'VehicleEntryInHub', width: 25 },
          { header: 'Vehicle Out From Hub For Delivery', key: 'VehicleOutFromHubForDelivery', width: 32 },
          { header: 'Vehicle Return At Hub', key: 'VehicleReturnAtHub', width: 25 },
          { header: 'Vehicle Entered At Hub Return', key: 'VehicleEnteredAtHubReturn', width: 30 },
          { header: 'Vehicle Out From Hub Final', key: 'VehicleOutFromHubFinal', width: 28 },

          // KM & Delivery Details
          { header: 'Opening KM', key: 'OpeningKM', width: 12 },
          { header: 'Closing KM', key: 'ClosingKM', width: 12 },
          { header: 'Total Shipments For Deliveries', key: 'TotalShipmentsForDeliveries', width: 28 },
          { header: 'Total Shipment Deliveries Attempted', key: 'TotalShipmentDeliveriesAttempted', width: 35 },
          { header: 'Total Shipment Deliveries Done', key: 'TotalShipmentDeliveriesDone', width: 30 },
          { header: 'Total Duty Hours', key: 'TotalDutyHours', width: 15 },

          // Freight & Charges (Financial Section)
          { header: 'V.Freight (Fix)', key: 'VFreightFix', width: 15 },
          { header: 'Fix KM', key: 'FixKm', width: 12 },
          { header: 'V.Freight (Variable)', key: 'VFreightVariable', width: 18 },
          { header: 'Total Freight', key: 'TotalFreight', width: 15 },
          { header: 'Toll Expenses', key: 'TollExpenses', width: 15 },
          { header: 'Parking Charges', key: 'ParkingCharges', width: 15 },
          { header: 'Loading Charges', key: 'LoadingCharges', width: 15 },
          { header: 'Unloading Charges', key: 'UnloadingCharges', width: 18 },
          { header: 'Other Charges', key: 'OtherCharges', width: 15 },
          { header: 'Other Charges Remarks', key: 'OtherChargesRemarks', width: 25 },

          // Advance Payment Details
          { header: 'Advance Request No', key: 'AdvanceRequestNo', width: 18 },
          { header: 'Advance To Paid', key: 'AdvanceToPaid', width: 15 },
          { header: 'Advance Approved Amount', key: 'AdvanceApprovedAmount', width: 22 },
          { header: 'Advance Approved By', key: 'AdvanceApprovedBy', width: 20 },
          { header: 'Advance Paid Amount', key: 'AdvancePaidAmount', width: 18 },
          { header: 'Advance Paid Mode', key: 'AdvancePaidMode', width: 18 },
          { header: 'Advance Paid Date', key: 'AdvancePaidDate', width: 15 },
          { header: 'Advance Paid By', key: 'AdvancePaidBy', width: 18 },
          { header: 'Employee Details (Advance)', key: 'EmployeeDetailsAdvance', width: 25 },

          // Balance Payment Details
          { header: 'Balance To Be Paid', key: 'BalanceToBePaid', width: 18 },
          { header: 'Balance Paid Amount', key: 'BalancePaidAmount', width: 18 },
          { header: 'Variance', key: 'Variance', width: 12 },
          { header: 'Balance Paid Date', key: 'BalancePaidDate', width: 15 },
          { header: 'Balance Paid By', key: 'BalancePaidBy', width: 18 },
          { header: 'Employee Details (Balance)', key: 'EmployeeDetailsBalance', width: 25 },

          // Financial Tracking (Supervisor Section)
          { header: 'Revenue', key: 'Revenue', width: 12 },
          { header: 'Margin', key: 'Margin', width: 12 },
          { header: 'Margin %', key: 'MarginPercentage', width: 12 },

          // Document References
          { header: 'Driver Aadhar Doc', key: 'DriverAadharDoc', width: 30 },
          { header: 'Driver Licence Doc', key: 'DriverLicenceDoc', width: 30 },
          { header: 'Toll Expenses Doc', key: 'TollExpensesDoc', width: 30 },
          { header: 'Parking Charges Doc', key: 'ParkingChargesDoc', width: 30 },
          { header: 'Opening KM Image', key: 'OpeningKMImage', width: 30 },
          { header: 'Closing KM Image', key: 'ClosingKMImage', width: 30 },

          // Additional/Remarks
          { header: 'Remarks', key: 'Remarks', width: 35 },

          // System Fields
          { header: 'Created At', key: 'CreatedAt', width: 20 },
          { header: 'Updated At', key: 'UpdatedAt', width: 20 }
        ];

        // Add data rows for Adhoc transactions (UI fields only)
        adhocRows.forEach(row => {
          adhocSheet.addRow({
            // Basic Transaction Info
            TransactionID: row.TransactionID || '',
            TripType: row.TripType || '',
            TransactionDate: row.TransactionDate ? new Date(row.TransactionDate).toISOString().split('T')[0] : '',
            TripNo: row.TripNo || '',
            Status: row.Status || '',
            TripClose: row.TripClose ? 'Yes' : 'No',

            // Company/Customer Details (from form - labeled as "Company Name" in UI)
            CustomerName: row.CustomerName || '',
            ProjectName: row.ProjectName || '',

            // Vehicle Details
            VehicleNumber: row.VehicleNumber || '',
            VehicleType: row.VehicleType || '',

            // Vendor Details
            VendorName: row.VendorName || '',
            VendorNumber: row.VendorNumber || '',

            // Driver Details
            DriverName: row.DriverName || '',
            DriverNumber: row.DriverNumber || '',
            DriverAadharNumber: row.DriverAadharNumber || '',
            DriverLicenceNumber: row.DriverLicenceNumber || '',

            // Time Tracking (6 mandatory fields in chronological order)
            VehicleReportingAtHub: row.VehicleReportingAtHub || '',
            VehicleEntryInHub: row.VehicleEntryInHub || '',
            VehicleOutFromHubForDelivery: row.VehicleOutFromHubForDelivery || '',
            VehicleReturnAtHub: row.VehicleReturnAtHub || '',
            VehicleEnteredAtHubReturn: row.VehicleEnteredAtHubReturn || '',
            VehicleOutFromHubFinal: row.VehicleOutFromHubFinal || '',

            // KM & Delivery Details
            OpeningKM: row.OpeningKM !== null && row.OpeningKM !== undefined ? row.OpeningKM : '',
            ClosingKM: row.ClosingKM !== null && row.ClosingKM !== undefined ? row.ClosingKM : '',
            TotalShipmentsForDeliveries: row.TotalShipmentsForDeliveries !== null && row.TotalShipmentsForDeliveries !== undefined ? row.TotalShipmentsForDeliveries : '',
            TotalShipmentDeliveriesAttempted: row.TotalShipmentDeliveriesAttempted !== null && row.TotalShipmentDeliveriesAttempted !== undefined ? row.TotalShipmentDeliveriesAttempted : '',
            TotalShipmentDeliveriesDone: row.TotalShipmentDeliveriesDone !== null && row.TotalShipmentDeliveriesDone !== undefined ? row.TotalShipmentDeliveriesDone : '',
            TotalDutyHours: row.TotalDutyHours !== null && row.TotalDutyHours !== undefined ? row.TotalDutyHours : '',

            // Freight & Charges
            VFreightFix: row.VFreightFix !== null && row.VFreightFix !== undefined ? row.VFreightFix : '',
            FixKm: row.FixKm !== null && row.FixKm !== undefined ? row.FixKm : '',
            VFreightVariable: row.VFreightVariable !== null && row.VFreightVariable !== undefined ? row.VFreightVariable : '',
            TotalFreight: row.TotalFreight !== null && row.TotalFreight !== undefined ? row.TotalFreight : '',
            TollExpenses: row.TollExpenses !== null && row.TollExpenses !== undefined ? row.TollExpenses : '',
            ParkingCharges: row.ParkingCharges !== null && row.ParkingCharges !== undefined ? row.ParkingCharges : '',
            LoadingCharges: row.LoadingCharges !== null && row.LoadingCharges !== undefined ? row.LoadingCharges : '',
            UnloadingCharges: row.UnloadingCharges !== null && row.UnloadingCharges !== undefined ? row.UnloadingCharges : '',
            OtherCharges: row.OtherCharges !== null && row.OtherCharges !== undefined ? row.OtherCharges : '',
            OtherChargesRemarks: row.OtherChargesRemarks || '',

            // Advance Payment Details
            AdvanceRequestNo: row.AdvanceRequestNo || '',
            AdvanceToPaid: row.AdvanceToPaid !== null && row.AdvanceToPaid !== undefined ? row.AdvanceToPaid : '',
            AdvanceApprovedAmount: row.AdvanceApprovedAmount !== null && row.AdvanceApprovedAmount !== undefined ? row.AdvanceApprovedAmount : '',
            AdvanceApprovedBy: row.AdvanceApprovedBy || '',
            AdvancePaidAmount: row.AdvancePaidAmount !== null && row.AdvancePaidAmount !== undefined ? row.AdvancePaidAmount : '',
            AdvancePaidMode: row.AdvancePaidMode || '',
            AdvancePaidDate: row.AdvancePaidDate ? new Date(row.AdvancePaidDate).toISOString().split('T')[0] : '',
            AdvancePaidBy: row.AdvancePaidBy || '',
            EmployeeDetailsAdvance: row.EmployeeDetailsAdvance || '',

            // Balance Payment Details
            BalanceToBePaid: row.BalanceToBePaid !== null && row.BalanceToBePaid !== undefined ? row.BalanceToBePaid : '',
            BalancePaidAmount: row.BalancePaidAmount !== null && row.BalancePaidAmount !== undefined ? row.BalancePaidAmount : '',
            Variance: row.Variance !== null && row.Variance !== undefined ? row.Variance : '',
            BalancePaidDate: row.BalancePaidDate ? new Date(row.BalancePaidDate).toISOString().split('T')[0] : '',
            BalancePaidBy: row.BalancePaidBy || '',
            EmployeeDetailsBalance: row.EmployeeDetailsBalance || '',

            // Financial Tracking
            Revenue: row.Revenue !== null && row.Revenue !== undefined ? row.Revenue : '',
            Margin: row.Margin !== null && row.Margin !== undefined ? row.Margin : '',
            MarginPercentage: row.MarginPercentage !== null && row.MarginPercentage !== undefined ? row.MarginPercentage : '',

            // Document References
            DriverAadharDoc: row.DriverAadharDoc || '',
            DriverLicenceDoc: row.DriverLicenceDoc || '',
            TollExpensesDoc: row.TollExpensesDoc || '',
            ParkingChargesDoc: row.ParkingChargesDoc || '',
            OpeningKMImage: row.OpeningKMImage || '',
            ClosingKMImage: row.ClosingKMImage || '',

            // Additional/Remarks
            Remarks: row.Remarks || '',

            // System Fields
            CreatedAt: row.CreatedAt ? new Date(row.CreatedAt).toISOString() : '',
            UpdatedAt: row.UpdatedAt ? new Date(row.UpdatedAt).toISOString() : ''
          });
        });

        // Style the header row
        adhocSheet.getRow(1).font = { bold: true };
        adhocSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEAA7' }
        };
      }

      // Create Replacement Transactions sheet if there are replacement transactions
      if (replacementRows.length > 0) {
        const replacementSheet = workbook.addWorksheet('Replacement Transactions');

        // Define ALL columns for Replacement transactions in logical form sequence (UI fields only, same as Adhoc)
        replacementSheet.columns = [
          // Basic Transaction Info
          { header: 'Transaction ID', key: 'TransactionID', width: 15 },
          { header: 'Trip Type', key: 'TripType', width: 12 },
          { header: 'Transaction Date', key: 'TransactionDate', width: 15 },
          { header: 'Trip No', key: 'TripNo', width: 15 },
          { header: 'Status', key: 'Status', width: 12 },
          { header: 'Trip Close', key: 'TripClose', width: 12 },

          // Company/Customer Details (from form)
          { header: 'Company Name', key: 'CustomerName', width: 25 },
          { header: 'Project Name', key: 'ProjectName', width: 25 },

          // Vehicle Details
          { header: 'Vehicle Number', key: 'VehicleNumber', width: 15 },
          { header: 'Vehicle Type', key: 'VehicleType', width: 15 },

          // Vendor Details
          { header: 'Vendor Name', key: 'VendorName', width: 25 },
          { header: 'Vendor Number', key: 'VendorNumber', width: 15 },

          // Driver Details
          { header: 'Driver Name', key: 'DriverName', width: 20 },
          { header: 'Driver Number', key: 'DriverNumber', width: 15 },
          { header: 'Driver Aadhar Number', key: 'DriverAadharNumber', width: 18 },
          { header: 'Driver Licence Number', key: 'DriverLicenceNumber', width: 20 },

          // Time Tracking Fields (6 mandatory - in chronological order)
          { header: 'Vehicle Reporting At Hub', key: 'VehicleReportingAtHub', width: 25 },
          { header: 'Vehicle Entry In Hub', key: 'VehicleEntryInHub', width: 25 },
          { header: 'Vehicle Out From Hub For Delivery', key: 'VehicleOutFromHubForDelivery', width: 32 },
          { header: 'Vehicle Return At Hub', key: 'VehicleReturnAtHub', width: 25 },
          { header: 'Vehicle Entered At Hub Return', key: 'VehicleEnteredAtHubReturn', width: 30 },
          { header: 'Vehicle Out From Hub Final', key: 'VehicleOutFromHubFinal', width: 28 },

          // KM & Delivery Details
          { header: 'Opening KM', key: 'OpeningKM', width: 12 },
          { header: 'Closing KM', key: 'ClosingKM', width: 12 },
          { header: 'Total Shipments For Deliveries', key: 'TotalShipmentsForDeliveries', width: 28 },
          { header: 'Total Shipment Deliveries Attempted', key: 'TotalShipmentDeliveriesAttempted', width: 35 },
          { header: 'Total Shipment Deliveries Done', key: 'TotalShipmentDeliveriesDone', width: 30 },
          { header: 'Total Duty Hours', key: 'TotalDutyHours', width: 15 },

          // Freight & Charges (Financial Section)
          { header: 'V.Freight (Fix)', key: 'VFreightFix', width: 15 },
          { header: 'Fix KM', key: 'FixKm', width: 12 },
          { header: 'V.Freight (Variable)', key: 'VFreightVariable', width: 18 },
          { header: 'Total Freight', key: 'TotalFreight', width: 15 },
          { header: 'Toll Expenses', key: 'TollExpenses', width: 15 },
          { header: 'Parking Charges', key: 'ParkingCharges', width: 15 },
          { header: 'Loading Charges', key: 'LoadingCharges', width: 15 },
          { header: 'Unloading Charges', key: 'UnloadingCharges', width: 18 },
          { header: 'Other Charges', key: 'OtherCharges', width: 15 },
          { header: 'Other Charges Remarks', key: 'OtherChargesRemarks', width: 25 },

          // Advance Payment Details
          { header: 'Advance Request No', key: 'AdvanceRequestNo', width: 18 },
          { header: 'Advance To Paid', key: 'AdvanceToPaid', width: 15 },
          { header: 'Advance Approved Amount', key: 'AdvanceApprovedAmount', width: 22 },
          { header: 'Advance Approved By', key: 'AdvanceApprovedBy', width: 20 },
          { header: 'Advance Paid Amount', key: 'AdvancePaidAmount', width: 18 },
          { header: 'Advance Paid Mode', key: 'AdvancePaidMode', width: 18 },
          { header: 'Advance Paid Date', key: 'AdvancePaidDate', width: 15 },
          { header: 'Advance Paid By', key: 'AdvancePaidBy', width: 18 },
          { header: 'Employee Details (Advance)', key: 'EmployeeDetailsAdvance', width: 25 },

          // Balance Payment Details
          { header: 'Balance To Be Paid', key: 'BalanceToBePaid', width: 18 },
          { header: 'Balance Paid Amount', key: 'BalancePaidAmount', width: 18 },
          { header: 'Variance', key: 'Variance', width: 12 },
          { header: 'Balance Paid Date', key: 'BalancePaidDate', width: 15 },
          { header: 'Balance Paid By', key: 'BalancePaidBy', width: 18 },
          { header: 'Employee Details (Balance)', key: 'EmployeeDetailsBalance', width: 25 },

          // Financial Tracking (Supervisor Section)
          { header: 'Revenue', key: 'Revenue', width: 12 },
          { header: 'Margin', key: 'Margin', width: 12 },
          { header: 'Margin %', key: 'MarginPercentage', width: 12 },

          // Document References
          { header: 'Driver Aadhar Doc', key: 'DriverAadharDoc', width: 30 },
          { header: 'Driver Licence Doc', key: 'DriverLicenceDoc', width: 30 },
          { header: 'Toll Expenses Doc', key: 'TollExpensesDoc', width: 30 },
          { header: 'Parking Charges Doc', key: 'ParkingChargesDoc', width: 30 },
          { header: 'Opening KM Image', key: 'OpeningKMImage', width: 30 },
          { header: 'Closing KM Image', key: 'ClosingKMImage', width: 30 },

          // Additional/Remarks
          { header: 'Remarks', key: 'Remarks', width: 35 },

          // System Fields
          { header: 'Created At', key: 'CreatedAt', width: 20 },
          { header: 'Updated At', key: 'UpdatedAt', width: 20 }
        ];

        // Add data rows for Replacement transactions (UI fields only, same as Adhoc)
        replacementRows.forEach(row => {
          replacementSheet.addRow({
            // Basic Transaction Info
            TransactionID: row.TransactionID || '',
            TripType: row.TripType || '',
            TransactionDate: row.TransactionDate ? new Date(row.TransactionDate).toISOString().split('T')[0] : '',
            TripNo: row.TripNo || '',
            Status: row.Status || '',
            TripClose: row.TripClose ? 'Yes' : 'No',

            // Company/Customer Details (from form - labeled as "Company Name" in UI)
            CustomerName: row.CustomerName || '',
            ProjectName: row.ProjectName || '',

            // Vehicle Details
            VehicleNumber: row.VehicleNumber || '',
            VehicleType: row.VehicleType || '',

            // Vendor Details
            VendorName: row.VendorName || '',
            VendorNumber: row.VendorNumber || '',

            // Driver Details
            DriverName: row.DriverName || '',
            DriverNumber: row.DriverNumber || '',
            DriverAadharNumber: row.DriverAadharNumber || '',
            DriverLicenceNumber: row.DriverLicenceNumber || '',

            // Time Tracking (6 mandatory fields in chronological order)
            VehicleReportingAtHub: row.VehicleReportingAtHub || '',
            VehicleEntryInHub: row.VehicleEntryInHub || '',
            VehicleOutFromHubForDelivery: row.VehicleOutFromHubForDelivery || '',
            VehicleReturnAtHub: row.VehicleReturnAtHub || '',
            VehicleEnteredAtHubReturn: row.VehicleEnteredAtHubReturn || '',
            VehicleOutFromHubFinal: row.VehicleOutFromHubFinal || '',

            // KM & Delivery Details
            OpeningKM: row.OpeningKM !== null && row.OpeningKM !== undefined ? row.OpeningKM : '',
            ClosingKM: row.ClosingKM !== null && row.ClosingKM !== undefined ? row.ClosingKM : '',
            TotalShipmentsForDeliveries: row.TotalShipmentsForDeliveries !== null && row.TotalShipmentsForDeliveries !== undefined ? row.TotalShipmentsForDeliveries : '',
            TotalShipmentDeliveriesAttempted: row.TotalShipmentDeliveriesAttempted !== null && row.TotalShipmentDeliveriesAttempted !== undefined ? row.TotalShipmentDeliveriesAttempted : '',
            TotalShipmentDeliveriesDone: row.TotalShipmentDeliveriesDone !== null && row.TotalShipmentDeliveriesDone !== undefined ? row.TotalShipmentDeliveriesDone : '',
            TotalDutyHours: row.TotalDutyHours !== null && row.TotalDutyHours !== undefined ? row.TotalDutyHours : '',

            // Freight & Charges
            VFreightFix: row.VFreightFix !== null && row.VFreightFix !== undefined ? row.VFreightFix : '',
            FixKm: row.FixKm !== null && row.FixKm !== undefined ? row.FixKm : '',
            VFreightVariable: row.VFreightVariable !== null && row.VFreightVariable !== undefined ? row.VFreightVariable : '',
            TotalFreight: row.TotalFreight !== null && row.TotalFreight !== undefined ? row.TotalFreight : '',
            TollExpenses: row.TollExpenses !== null && row.TollExpenses !== undefined ? row.TollExpenses : '',
            ParkingCharges: row.ParkingCharges !== null && row.ParkingCharges !== undefined ? row.ParkingCharges : '',
            LoadingCharges: row.LoadingCharges !== null && row.LoadingCharges !== undefined ? row.LoadingCharges : '',
            UnloadingCharges: row.UnloadingCharges !== null && row.UnloadingCharges !== undefined ? row.UnloadingCharges : '',
            OtherCharges: row.OtherCharges !== null && row.OtherCharges !== undefined ? row.OtherCharges : '',
            OtherChargesRemarks: row.OtherChargesRemarks || '',

            // Advance Payment Details
            AdvanceRequestNo: row.AdvanceRequestNo || '',
            AdvanceToPaid: row.AdvanceToPaid !== null && row.AdvanceToPaid !== undefined ? row.AdvanceToPaid : '',
            AdvanceApprovedAmount: row.AdvanceApprovedAmount !== null && row.AdvanceApprovedAmount !== undefined ? row.AdvanceApprovedAmount : '',
            AdvanceApprovedBy: row.AdvanceApprovedBy || '',
            AdvancePaidAmount: row.AdvancePaidAmount !== null && row.AdvancePaidAmount !== undefined ? row.AdvancePaidAmount : '',
            AdvancePaidMode: row.AdvancePaidMode || '',
            AdvancePaidDate: row.AdvancePaidDate ? new Date(row.AdvancePaidDate).toISOString().split('T')[0] : '',
            AdvancePaidBy: row.AdvancePaidBy || '',
            EmployeeDetailsAdvance: row.EmployeeDetailsAdvance || '',

            // Balance Payment Details
            BalanceToBePaid: row.BalanceToBePaid !== null && row.BalanceToBePaid !== undefined ? row.BalanceToBePaid : '',
            BalancePaidAmount: row.BalancePaidAmount !== null && row.BalancePaidAmount !== undefined ? row.BalancePaidAmount : '',
            Variance: row.Variance !== null && row.Variance !== undefined ? row.Variance : '',
            BalancePaidDate: row.BalancePaidDate ? new Date(row.BalancePaidDate).toISOString().split('T')[0] : '',
            BalancePaidBy: row.BalancePaidBy || '',
            EmployeeDetailsBalance: row.EmployeeDetailsBalance || '',

            // Financial Tracking
            Revenue: row.Revenue !== null && row.Revenue !== undefined ? row.Revenue : '',
            Margin: row.Margin !== null && row.Margin !== undefined ? row.Margin : '',
            MarginPercentage: row.MarginPercentage !== null && row.MarginPercentage !== undefined ? row.MarginPercentage : '',

            // Document References
            DriverAadharDoc: row.DriverAadharDoc || '',
            DriverLicenceDoc: row.DriverLicenceDoc || '',
            TollExpensesDoc: row.TollExpensesDoc || '',
            ParkingChargesDoc: row.ParkingChargesDoc || '',
            OpeningKMImage: row.OpeningKMImage || '',
            ClosingKMImage: row.ClosingKMImage || '',

            // Additional/Remarks
            Remarks: row.Remarks || '',

            // System Fields
            CreatedAt: row.CreatedAt ? new Date(row.CreatedAt).toISOString() : '',
            UpdatedAt: row.UpdatedAt ? new Date(row.UpdatedAt).toISOString() : ''
          });
        });

        // Style the header row
        replacementSheet.getRow(1).font = { bold: true };
        replacementSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFD7A7' }
        };
      }

      // Set response headers for Excel download
      const filename = `Daily_Vehicle_Transactions_All_${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Write workbook to response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error exporting all transactions:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Helper function to calculate total freight
  function calculateTotalFreight(row, totalKM) {
    const vFreightFix = parseFloat(row.VFreightFix) || 0;
    const vFreightVariable = parseFloat(row.VFreightVariable) || 0;
    const tollExpenses = parseFloat(row.TollExpenses) || 0;
    const parkingCharges = parseFloat(row.ParkingCharges) || 0;
    const loadingCharges = parseFloat(row.LoadingCharges) || 0;
    const unloadingCharges = parseFloat(row.UnloadingCharges) || 0;
    const otherCharges = parseFloat(row.OtherCharges) || 0;

    const variableFreight = vFreightVariable * (totalKM || 0);
    const totalFreight = vFreightFix + variableFreight + tollExpenses + parkingCharges + loadingCharges + unloadingCharges + otherCharges;

    return totalFreight;
  }

  // Delete specific file from transaction
  router.delete('/:id/files/:fieldName', async (req, res) => {
    try {
      const { id, fieldName } = req.params;

      console.log(`🗑️ Deleting transaction file - ID: ${id}, Field: ${fieldName}`);

      // Check both fixed and adhoc transactions
      let transaction = null;
      let tableName = null;

      // Try fixed transactions first
      const [fixedTransactions] = await pool.query('SELECT * FROM fixed_transactions WHERE TransactionID = ?', [id]);
      if (fixedTransactions.length > 0) {
        transaction = fixedTransactions[0];
        tableName = 'fixed_transactions';
      } else {
        // Try adhoc transactions
        const [adhocTransactions] = await pool.query('SELECT * FROM adhoc_transactions WHERE TransactionID = ?', [id]);
        if (adhocTransactions.length > 0) {
          transaction = adhocTransactions[0];
          tableName = 'adhoc_transactions';
        }
      }

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      const fileName = transaction[fieldName];

      if (!fileName) {
        return res.status(404).json({ error: 'File not found in database' });
      }

      // Delete file from filesystem
      const filePath = path.join(__dirname, '../uploads/transactions', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ File deleted from filesystem: ${filePath}`);
      }

      // Update database to remove file reference
      const updateQuery = `UPDATE ${tableName} SET ${fieldName} = NULL WHERE TransactionID = ?`;
      await pool.query(updateQuery, [id]);

      console.log(`✅ Transaction file deleted successfully - ID: ${id}, Field: ${fieldName}, Table: ${tableName}`);
      res.json({
        success: true,
        message: 'File deleted successfully',
        fieldName,
        fileName,
        tableName
      });

    } catch (error) {
      console.error('❌ Error deleting transaction file:', error);
      res.status(500).json({
        error: 'Failed to delete file',
        details: error.message
      });
    }
  });

  return router;
};
