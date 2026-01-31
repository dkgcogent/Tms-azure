const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadsManager = require('../utils/uploadsManager');

// Configure multer for file uploads using external directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use external uploads directory for vehicles
    const uploadPath = uploadsManager.ensureEntityDirectory('vehicles');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit (increased for large PDF documents)
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs only
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      // Set a user-friendly error message on the request object
      req.fileValidationError = `File "${file.originalname}" has an unsupported format. Please upload images (JPG, PNG, GIF, WEBP) or PDF documents only.`;
      cb(null, false); // Reject the file but don't throw an error
    }
  }
});

const validateDateSequence = (vehicleData) => {
  const errors = [];

  const checkDates = (issueDateField, expiryDateField, errorMsg) => {
    const issueDate = vehicleData[issueDateField];
    const expiryDate = vehicleData[expiryDateField];

    if (issueDate && expiryDate && new Date(expiryDate) < new Date(issueDate)) {
      errors.push(errorMsg);
    }
  };

  checkDates('VehicleInsuranceDate', 'VehicleInsuranceExpiry', 'Vehicle Insurance Expiry Date cannot be before Issue Date');
  checkDates('VehicleFitnessCertificateIssue', 'VehicleFitnessCertificateExpiry', 'Vehicle Fitness Certificate Expiry Date cannot be before Issue Date');
  checkDates('VehiclePollutionDate', 'VehiclePollutionExpiry', 'Vehicle Pollution Expiry Date cannot be before Issue Date');
  checkDates('StateTaxIssue', 'StateTaxExpiry', 'State Tax Expiry Date cannot be before Issue Date');
  checkDates('NoEntryPassStartDate', 'NoEntryPassExpiry', 'No Entry Pass Expiry Date cannot be before Start Date');

  return errors;
};

// This file defines API routes for managing comprehensive vehicle data in the Transport Management System.
// It supports all fields from the Vehicle Master form including customer, vendor, driver, and Cogent info.

module.exports = (pool) => {
  // Helper function to add file URLs to vehicle data
  const addFileUrls = (vehicle) => {
    const baseUrl = 'http://localhost:3004/api/vehicles/files/';

    // Helper to normalize file paths for URLs
    const normalizeFilePath = (filePath) => {
      if (!filePath) return null;
      // Extract just the filename from the path
      const filename = filePath.split(/[\\/]/).pop();
      return filename;
    };

    // Vehicle file fields mapping (database field -> URL field)
    const fileFieldMappings = {
      // Main vehicle documents
      'RCUpload': 'RCUpload_url',
      'VehicleKMSPhoto': 'VehicleKMSPhoto_url',
      'VehiclePhoto': 'VehiclePhoto_url',

      // Vehicle photos from all angles
      'VehiclePhotoFront': 'VehiclePhotoFront_url',
      'VehiclePhotoBack': 'VehiclePhotoBack_url',
      'VehiclePhotoLeftSide': 'VehiclePhotoLeftSide_url',
      'VehiclePhotoRightSide': 'VehiclePhotoRightSide_url',
      'VehiclePhotoInterior': 'VehiclePhotoInterior_url',
      'VehiclePhotoEngine': 'VehiclePhotoEngine_url',
      'VehiclePhotoRoof': 'VehiclePhotoRoof_url',
      'VehiclePhotoDoor': 'VehiclePhotoDoor_url',

      // Service and maintenance documents
      'ServiceBillPhoto': 'ServiceBillPhoto_url',
      'InsuranceCopy': 'InsuranceCopy_url',
      'FitnessCertificateUpload': 'FitnessCertificateUpload_url',
      'PollutionPhoto': 'PollutionPhoto_url',
      'StateTaxPhoto': 'StateTaxPhoto_url',
      'NoEntryPassCopy': 'NoEntryPassCopy_url'
    };

    // Generate URLs for all file fields
    Object.entries(fileFieldMappings).forEach(([dbField, urlField]) => {
      if (vehicle[dbField]) {
        const filename = normalizeFilePath(vehicle[dbField]);
        if (filename) {
          vehicle[urlField] = baseUrl + filename;
        }
      }
    });

    return vehicle;
  };

  // Get all vehicles with complete information and optional date filtering
  // This route retrieves all vehicle records with joined vendor and driver data for vehicle project linking
  // Supports date filtering via fromDate and toDate query parameters.
  router.get('/', async (req, res) => {
    try {
      const { fromDate, toDate } = req.query;

      // Build date filter conditions
      let dateFilter = '';
      let dateParams = [];

      if (fromDate && toDate) {
        dateFilter = 'AND DATE(v.CreatedAt) BETWEEN ? AND ?';
        dateParams = [fromDate, toDate];
        console.log('🗓️ Backend: Applying vehicle CreatedAt date filter from', fromDate, 'to', toDate);
      } else if (fromDate) {
        dateFilter = 'AND DATE(v.CreatedAt) >= ?';
        dateParams = [fromDate];
        console.log('🗓️ Backend: Applying vehicle CreatedAt date filter from', fromDate);
      } else if (toDate) {
        dateFilter = 'AND DATE(v.CreatedAt) <= ?';
        dateParams = [toDate];
        console.log('🗓️ Backend: Applying vehicle CreatedAt date filter to', toDate);
      }

      // Get vehicles with joined vendor and driver data
      // First try the capitalized table names, then fall back to lowercase
      let rows;
      try {
        [rows] = await pool.query(`
          SELECT
            v.VehicleID,
            v.VehicleRegistrationNo,
            v.VehicleCode,
            v.VehicleChasisNo,
            v.VehicleModel,
            v.TypeOfBody,
            v.VehicleType,
            v.VehicleRegistrationDate,
            v.VehicleAge,
            v.VehicleKMS,
            v.VendorID,
            v.DriverID,
            v.GPS,
            v.GPSCompany,
            v.NoEntryPass,
            v.NoEntryPassStartDate,
            v.NoEntryPassExpiry,
            v.LastServicing,
            v.VehicleLoadingCapacity,
            v.Status,
            v.CreatedAt,
            v.UpdatedAt,
            vn.VendorName,
            vn.VendorCode,
            d.DriverName,
            d.DriverID as DriverCode,
            v.RCUpload,
            v.VehicleKMSPhoto,
            v.VehiclePhoto,
            v.VehiclePhotoFront,
            v.VehiclePhotoBack,
            v.VehiclePhotoLeftSide,
            v.VehiclePhotoRightSide,
            v.VehiclePhotoInterior,
            v.VehiclePhotoEngine,
            v.VehiclePhotoRoof,
            v.VehiclePhotoDoor,
            v.ServiceBillPhoto,
            v.InsuranceCopy,
            v.FitnessCertificateUpload,
            v.PollutionPhoto,
            v.StateTaxPhoto,
            v.NoEntryPassCopy,
            v.InsuranceInfo,
            v.VehicleInsuranceCompany,
            v.VehicleInsuranceDate,
            v.InsuranceExpiry,
            v.VehicleFitnessCertificateIssue,
            v.FitnessExpiry,
            v.VehiclePollutionDate,
            v.PollutionExpiry,
            v.StateTaxIssue,
            v.StateTaxExpiry,
            vf.FixRate,
            vf.FuelRate,
            vf.HandlingCharges
          FROM Vehicle v
          LEFT JOIN Vendor vn ON v.VendorID = vn.VendorID
          LEFT JOIN driver d ON v.DriverID = d.DriverID
          LEFT JOIN vehicle_freight vf ON v.VehicleID = vf.VehicleID
          WHERE v.Status IN ('Active', 'Maintenance', 'Inactive') ${dateFilter}
          ORDER BY v.VehicleID DESC
        `, dateParams);

        // Apply URL generation to each vehicle
        const vehiclesWithUrls = rows.map(vehicle => addFileUrls(vehicle));
        console.log('🔍 Backend: Found', rows.length, 'vehicles with date filter');

        return res.json({ success: true, data: vehiclesWithUrls });

      } catch (capitalizedError) {
        // Try with lowercase table names
        try {
          [rows] = await pool.query(`
            SELECT 
              v.vehicle_id as vehicle_id,
              v.vehicle_number as vehicle_number,
              v.vehicle_code as vehicle_code,
              v.chassis_number as chassis_number,
              v.model as model,
              COALESCE(v.make, SUBSTRING_INDEX(v.model, ' ', 1)) as make,
              v.body_type as body_type,
              v.vendor_id as vendor_id,
              v.status as status,
              v.created_at as created_at,
              v.updated_at as updated_at,
              vn.vendor_name as vendor_name,
              vn.vendor_code as vendor_code,
              d.driver_name as driver_name,
              d.driver_id as driver_id,
              d.driver_phone as driver_mobile,
              NULL as current_project_id,
              'available' as assignment_status
            FROM vehicles v
            LEFT JOIN vendors vn ON v.vendor_id = vn.vendor_id
            LEFT JOIN (
              SELECT * FROM (
                SELECT *,
                  ROW_NUMBER() OVER (PARTITION BY vendor_id ORDER BY created_at DESC) as rn
                FROM drivers
                WHERE status = 'active'
              ) AS ranked_drivers
              WHERE rn = 1
            ) d ON d.vendor_id = v.vendor_id
            WHERE v.status = 'active'
            ORDER BY v.vehicle_id DESC
          `);
        } catch (lowercaseError) {
          throw capitalizedError; // Throw the original error
        }
      }
      
      // Format the response to match frontend expectations
      const formattedRows = rows.map(row => ({
        ...row,
        success: true,
        // Add any missing fields with defaults
        make: row.make || 'Unknown',
        model: row.model || 'Unknown',
        driver_name: row.driver_name || 'Not Assigned',
        vendor_name: row.vendor_name || 'Unknown Vendor'
      }));

      // Add file URLs to each vehicle
      const vehiclesWithFileUrls = formattedRows.map(vehicle => addFileUrls(vehicle));

      res.json({ success: true, data: vehiclesWithFileUrls });
    } catch (error) {
      console.error('Error fetching vehicles from Vehicle table:', error);
      // Fallback to simplified response
      try {
        const [basicRows] = await pool.query(`
          SELECT 
            VehicleID as vehicle_id,
            VehicleRegistrationNo as vehicle_number,
            VehicleModel as model,
            'Unknown' as make,
            'Not Assigned' as driver_name,
            'Unknown Vendor' as vendor_name,
            Status as status
          FROM Vehicle
          WHERE Status = 'Active'
          ORDER BY VehicleID DESC
        `);
        // Add file URLs to basic rows too
        const basicRowsWithFileUrls = basicRows.map(vehicle => addFileUrls(vehicle));
        res.json({ success: true, data: basicRowsWithFileUrls });
      } catch (fallbackError) {
        console.error('Error in fallback query:', fallbackError);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Get a single vehicle by ID with complete information
  // This route retrieves a specific vehicle record with all related data
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      // Try capitalized table first (Vehicle), then fallback to lowercase (vehicle)
      let rows;
      try {
        [rows] = await pool.query(`
          SELECT
            v.*,
            vn.VendorName,
            vn.VendorCode,
            vn.VendorMobileNo,
            d.DriverName,
            d.DriverID as DriverCode,
            vf.FixRate,
            vf.FuelRate,
            vf.HandlingCharges
          FROM Vehicle v
          LEFT JOIN Vendor vn ON v.VendorID = vn.VendorID
          LEFT JOIN driver d ON v.DriverID = d.DriverID
          LEFT JOIN vehicle_freight vf ON v.VehicleID = vf.VehicleID
          WHERE v.VehicleID = ?
        `, [id]);
      } catch (error) {
        // Fallback to lowercase table names
        [rows] = await pool.query(`
          SELECT
            v.*,
            vn.VendorName,
            vn.VendorCode,
            vn.VendorMobileNo,
            d.DriverName,
            d.DriverID as DriverCode,
            vf.FixRate,
            vf.FuelRate,
            vf.HandlingCharges
          FROM vehicle v
          LEFT JOIN vendor vn ON v.VendorID = vn.VendorID
          LEFT JOIN driver d ON v.DriverID = d.DriverID
          LEFT JOIN vehicle_freight vf ON v.VehicleID = vf.VehicleID
          WHERE v.VehicleID = ?
        `, [id]);
      }
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      
      console.log('🚛 VEHICLE BY ID - Found vehicle:', {
        id: id,
        VehicleID: rows[0].VehicleID,
        VehicleRegistrationNo: rows[0].VehicleRegistrationNo,
        VendorID: rows[0].VendorID,
        VendorName: rows[0].VendorName,
        GPS: rows[0].GPS,
        InsuranceExpiry: rows[0].InsuranceExpiry,
        PollutionExpiry: rows[0].PollutionExpiry,
        totalFields: Object.keys(rows[0]).length
      });
      
      // Add file URLs to the vehicle data
      const vehicleWithFileUrls = addFileUrls(rows[0]);
      res.json(vehicleWithFileUrls);
    } catch (error) {
      console.error('Error fetching vehicle by ID:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:id/details', async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await pool.query(`
        SELECT
          v.*,
          c.Name as CustomerName,
          c.CustomerCode,
          p.ProjectName,
          p.ProjectCode,
          l.LocationName,
          d.DriverName,
          d.DriverLicenceNo
        FROM Vehicle v
        LEFT JOIN vendor vn ON v.VendorID = vn.VendorID
        LEFT JOIN customer c ON vn.customer_id = c.CustomerID
        LEFT JOIN project p ON vn.project_id = p.ProjectID
        LEFT JOIN location l ON p.LocationID = l.LocationID
        LEFT JOIN driver d ON v.VehicleID = d.VehicleID
        WHERE v.VehicleID = ?
      `, [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      const vehicleWithFileUrls = addFileUrls(rows[0]);
      res.json(vehicleWithFileUrls);
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get upcoming expirations
  router.get('/expirations/:days', async (req, res) => {
    const { days } = req.params;
    try {
      const [rows] = await pool.query('CALL GetUpcomingExpirations(?)', [days]);
      res.json(rows[0] || []);
    } catch (error) {
      console.error('Error fetching upcoming expirations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create a new comprehensive vehicle record (handles both JSON and FormData)
  router.post('/', (req, res, next) => {
    // Only use multer for multipart/form-data requests
    const contentType = req.get('Content-Type') || '';
    if (contentType.includes('multipart/form-data')) {
      // Use multer for file uploads
      return upload.fields([
        // Standard fields
        { name: 'vehicle_front_photo', maxCount: 1 },
        { name: 'vehicle_side_photo', maxCount: 1 },
        { name: 'vehicle_back_photo', maxCount: 1 },
        { name: 'vehicle_interior_photo', maxCount: 1 },
        { name: 'rc_copy', maxCount: 1 },
        { name: 'insurance_copy', maxCount: 1 },
        { name: 'fitness_copy', maxCount: 1 },
        { name: 'permit_copy', maxCount: 1 },
        { name: 'pollution_copy', maxCount: 1 },
        { name: 'tax_receipt', maxCount: 1 },
        // Frontend form fields
        { name: 'RCUpload', maxCount: 1 },
        { name: 'VehicleKMSPhoto', maxCount: 1 },
        { name: 'VehiclePhoto', maxCount: 1 },
        { name: 'ServiceBillPhoto', maxCount: 1 },
        { name: 'InsuranceCopy', maxCount: 1 },
        { name: 'FitnessCertificateUpload', maxCount: 1 },
        { name: 'PollutionPhoto', maxCount: 1 },
        { name: 'StateTaxPhoto', maxCount: 1 },
        { name: 'NoEntryPassCopy', maxCount: 1 },
        // New Multiple Vehicle Photos
        { name: 'VehiclePhotoFront', maxCount: 1 },
        { name: 'VehiclePhotoBack', maxCount: 1 },
        { name: 'VehiclePhotoLeftSide', maxCount: 1 },
        { name: 'VehiclePhotoRightSide', maxCount: 1 },
        { name: 'VehiclePhotoInterior', maxCount: 1 },
        { name: 'VehiclePhotoEngine', maxCount: 1 },
        { name: 'VehiclePhotoRoof', maxCount: 1 },
        { name: 'VehiclePhotoDoor', maxCount: 1 }
      ])(req, res, next);
    } else {
      // Skip multer for JSON requests
      next();
    }
  }, (req, res, next) => {
    // Handle multer errors with user-friendly messages
    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        message: 'File Upload Error',
        error: req.fileValidationError,
        details: 'Please check that your file is in a supported format (Images: JPG, PNG, GIF, WEBP | Documents: PDF) and under 5MB in size.'
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
      } else if (error.message && error.message.includes('Only image and PDF files are allowed')) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported File Type',
          error: error.message,
          details: 'Please upload images (JPG, PNG, GIF, WEBP) or PDF documents only.'
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
    console.log('=== POST /vehicles DEBUG ===');
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Raw req.body:', JSON.stringify(req.body, null, 2));
    console.log('req.files:', req.files);
    
    try {
      // Handle both direct object data and FormData from frontend
      let vehicle = {};
      
      if (req.body.vehicleData) {
        // If vehicleData is sent as JSON string (for comprehensive form)
        vehicle = JSON.parse(req.body.vehicleData || '{}');
      } else {
        // If form data is sent directly (from VehicleForm.jsx)
        vehicle = req.body;
      }

      // For the existing Vehicle table, we need to preserve PascalCase field names
      // and only convert specific fields that need mapping
      const mappedVehicle = {};
      Object.keys(vehicle).forEach(key => {
        let mappedKey = key;
        let value = vehicle[key];

        // Handle special conversions for database compatibility
        if (key === 'GPS') {
          // GPS: tinyint(1) - expects 0 or 1
          value = value === 'Yes' || value === 1 || value === '1' || value === true ? 1 : 0;
        }
        if (key === 'NoEntryPass') {
          // NoEntryPass: enum('Yes','No') - expects 'Yes' or 'No' string
          value = value === 'Yes' || value === 1 || value === '1' || value === true ? 'Yes' : 'No';
        }
        if (key === 'TypeOfBody') {
          // TypeOfBody: enum('Open','CBD','Container') - expects exact case match
          // DO NOT convert to lowercase - database expects 'Open', 'CBD', 'Container'
          // Ensure value is one of the valid enum values
          const validBodyTypes = ['Open', 'CBD', 'Container'];
          if (value && !validBodyTypes.includes(value)) {
            // Try to match case-insensitively
            const matchedType = validBodyTypes.find(type => type.toLowerCase() === value.toLowerCase());
            value = matchedType || 'Open'; // Default to 'Open' if no match
          }
        }
        if (key === 'VehicleAge' || key === 'VehicleKMS' || key === 'VehicleLoadingCapacity') {
          // Numeric fields - convert string to number if needed
          if (value !== null && value !== undefined && value !== '') {
            const numValue = parseFloat(value);
            value = isNaN(numValue) ? null : numValue;
          }
        }
        if (key === 'FixRate' || key === 'FuelRate' || key === 'HandlingCharges') {
          // Decimal fields - convert string to number if needed
          if (value !== null && value !== undefined && value !== '') {
            const numValue = parseFloat(value);
            value = isNaN(numValue) ? null : numValue;
          }
        }
        if (key === 'VendorID') {
          mappedKey = 'VendorID';
          value = parseInt(value) || null;
        }

        mappedVehicle[mappedKey] = value;
      });

      // Set required fields with defaults
      mappedVehicle.VehicleType = mappedVehicle.VehicleType || 'Truck';
      mappedVehicle.TypeOfBody = mappedVehicle.TypeOfBody || 'Open';

      vehicle = mappedVehicle;
      console.log('Mapped vehicle data:', vehicle);

      const files = req.files || {};

      // Validate required fields
      console.log('Checking VehicleRegistrationNo:', vehicle.VehicleRegistrationNo);
      if (!vehicle.VehicleRegistrationNo) {
        return res.status(400).json({
          error: 'Vehicle registration number is required'
        });
      }

      // Check if customer exists (if provided)
      if (vehicle.customer_id) {
        const [customerCheck] = await pool.query(
          'SELECT customer_id FROM customers WHERE customer_id = ?',
          [vehicle.customer_id]
        );
        if (customerCheck.length === 0) {
          return res.status(400).json({ error: 'Customer not found' });
        }
      }

      // Check if vendor exists (if provided)
      const vendorId = vehicle.VendorID || vehicle.vendor_id;
      console.log('🚛 VEHICLE CREATE - VendorID check:', {
        'vehicle.VendorID': vehicle.VendorID,
        'vehicle.vendor_id': vehicle.vendor_id,
        'final vendorId': vendorId
      });

      if (vendorId) {
        const [vendorCheck] = await pool.query(
          'SELECT VendorID FROM vendor WHERE VendorID = ?',
          [vendorId]
        );
        console.log('🚛 VEHICLE CREATE - Vendor validation result:', vendorCheck.length > 0 ? 'FOUND' : 'NOT FOUND');
        if (vendorCheck.length === 0) {
          return res.status(400).json({ error: 'Vendor not found' });
        }
      }

      // Check if drivers exist (if provided)
      if (vehicle.primary_driver_id) {
        const [driverCheck] = await pool.query(
          'SELECT driver_id FROM drivers WHERE driver_id = ?',
          [vehicle.primary_driver_id]
        );
        if (driverCheck.length === 0) {
          return res.status(400).json({ error: 'Primary driver not found' });
        }
      }

      if (vehicle.secondary_driver_id) {
        const [driverCheck] = await pool.query(
          'SELECT driver_id FROM drivers WHERE driver_id = ?',
          [vehicle.secondary_driver_id]
        );
        if (driverCheck.length === 0) {
          return res.status(400).json({ error: 'Secondary driver not found' });
        }
      }

      // Handle file paths
      const filePaths = {};
      Object.keys(files).forEach(fieldname => {
        if (files[fieldname] && files[fieldname][0]) {
          filePaths[fieldname] = files[fieldname][0].path;
        }
      });

      // Build INSERT query compatible with existing Vehicle table schema
      // First try the comprehensive vehicles table, then fall back to existing Vehicle table
      let result;
      
      try {
        // First try inserting into comprehensive vehicles table (lowercase)
        const insertQuery = `
          INSERT INTO vehicles (
            customer_id, customer_code, project_name,
            vehicle_number, vehicle_code, chassis_number, engine_number,
            vehicle_type, body_type, make, model, variant, manufacturing_year,
            color, seating_capacity, capacity_tons, capacity_cubic_meter,
            fuel_type, emission_standard,
            vehicle_front_photo, vehicle_side_photo, vehicle_back_photo, vehicle_interior_photo,
            registration_date, registration_expiry, insurance_company, insurance_policy_number, insurance_expiry,
            fitness_certificate_number, fitness_expiry, permit_number, permit_type, permit_expiry,
            pollution_certificate_number, pollution_expiry, tax_paid_upto,
            rc_copy, insurance_copy, fitness_copy, permit_copy, pollution_copy, tax_receipt,
            gps_enabled, gps_device_id, tracking_enabled,
            vendor_id, vendor_code, owner_type, vendor_agreement_date, vendor_agreement_expiry,
            primary_driver_id, primary_driver_name, primary_driver_phone, primary_driver_license, primary_driver_experience,
            secondary_driver_id, secondary_driver_name, secondary_driver_phone, secondary_driver_license, secondary_driver_experience,
            cogent_enabled, cdsl_id, cogent_device_id, cogent_sim_number, cogent_activation_date, cogent_expiry_date, cogent_monthly_charges,
            real_time_tracking, route_deviation_alert, speed_monitoring, geofencing, panic_button, driver_behaviour_monitoring,
            purchase_date, purchase_amount, loan_amount, emi_amount, lease_start_date, lease_end_date, lease_monthly_rent,
            rate_per_km, rate_per_day, rate_per_hour, rate_per_trip, fuel_rate_per_km,
            last_service_date, last_service_km, next_service_due_km, next_service_due_date, maintenance_cost_per_km,
            current_km_reading, fuel_tank_capacity, current_location,
            status, remarks, special_notes
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )`;

        const values = [
          vehicle.customer_id || null, vehicle.customer_code || null, vehicle.project_name || null,
          vehicle.vehicle_number, vehicle.vehicle_code || null, vehicle.chassis_number || null, vehicle.engine_number || null,
          vehicle.vehicle_type, vehicle.body_type || null, vehicle.make || null, vehicle.model || null, vehicle.variant || null, vehicle.manufacturing_year || null,
          vehicle.color || null, vehicle.seating_capacity || null, vehicle.capacity_tons || null, vehicle.capacity_cubic_meter || null,
          vehicle.fuel_type || 'diesel', vehicle.emission_standard || null,
          filePaths.vehicle_front_photo || null, filePaths.vehicle_side_photo || null, filePaths.vehicle_back_photo || null, filePaths.vehicle_interior_photo || null,
          vehicle.registration_date || null, vehicle.registration_expiry || null, vehicle.insurance_company || null, vehicle.insurance_policy_number || null, vehicle.insurance_expiry || null,
          vehicle.fitness_certificate_number || null, vehicle.fitness_expiry || null, vehicle.permit_number || null, vehicle.permit_type || null, vehicle.permit_expiry || null,
          vehicle.pollution_certificate_number || null, vehicle.pollution_expiry || null, vehicle.tax_paid_upto || null,
          filePaths.rc_copy || null, filePaths.insurance_copy || null, filePaths.fitness_copy || null, filePaths.permit_copy || null, filePaths.pollution_copy || null, filePaths.tax_receipt || null,
          vehicle.gps_enabled ? 1 : 0, vehicle.gps_device_id || null, vehicle.tracking_enabled ? 1 : 0,
          vehicle.vendor_id || null, vehicle.vendor_code || null, vehicle.owner_type || 'vendor', vehicle.vendor_agreement_date || null, vehicle.vendor_agreement_expiry || null,
          vehicle.primary_driver_id || null, vehicle.primary_driver_name || null, vehicle.primary_driver_phone || null, vehicle.primary_driver_license || null, vehicle.primary_driver_experience || null,
          vehicle.secondary_driver_id || null, vehicle.secondary_driver_name || null, vehicle.secondary_driver_phone || null, vehicle.secondary_driver_license || null, vehicle.secondary_driver_experience || null,
          vehicle.cogent_enabled ? 1 : 0, vehicle.cdsl_id || null, vehicle.cogent_device_id || null, vehicle.cogent_sim_number || null, vehicle.cogent_activation_date || null, vehicle.cogent_expiry_date || null, vehicle.cogent_monthly_charges || null,
          vehicle.real_time_tracking ? 1 : 0, vehicle.route_deviation_alert ? 1 : 0, vehicle.speed_monitoring ? 1 : 0, vehicle.geofencing ? 1 : 0, vehicle.panic_button ? 1 : 0, vehicle.driver_behaviour_monitoring ? 1 : 0,
          vehicle.purchase_date || null, vehicle.purchase_amount || null, vehicle.loan_amount || null, vehicle.emi_amount || null, vehicle.lease_start_date || null, vehicle.lease_end_date || null, vehicle.lease_monthly_rent || null,
          vehicle.rate_per_km || null, vehicle.rate_per_day || null, vehicle.rate_per_hour || null, vehicle.rate_per_trip || null, vehicle.fuel_rate_per_km || null,
          vehicle.last_service_date || null, vehicle.last_service_km || null, vehicle.next_service_due_km || null, vehicle.next_service_due_date || null, vehicle.maintenance_cost_per_km || null,
          vehicle.current_km_reading || null, vehicle.fuel_tank_capacity || null, vehicle.current_location || null,
          vehicle.status || 'active', vehicle.remarks || null, vehicle.special_notes || null
        ];

        [result] = await pool.query(insertQuery, values);
        
      } catch (comprehensiveError) {
        console.log('Comprehensive vehicles table not available, using existing Vehicle table:', comprehensiveError.message);
        
        // Use existing Vehicle table schema with all available fields
        const fallbackQuery = `
          INSERT INTO vehicle (
            VehicleRegistrationNo, VehicleCode, VehicleChasisNo, VehicleModel, TypeOfBody, VehicleType,
            VehicleRegistrationDate, VehicleAge, VehicleKMS, VehicleInsuranceCompany, VehicleInsuranceDate, InsuranceExpiry,
            VehicleFitnessCertificateIssue, FitnessExpiry, VehiclePollutionDate, PollutionExpiry,
            StateTaxIssue, StateTaxExpiry, VehicleLoadingCapacity, LastServicing, VendorID, DriverID, GPS, GPSCompany, NoEntryPass, NoEntryPassStartDate, NoEntryPassExpiry,
            InsuranceInfo,
            RCUpload, VehicleKMSPhoto, VehiclePhoto,
            VehiclePhotoFront, VehiclePhotoBack, VehiclePhotoLeftSide, VehiclePhotoRightSide,
            VehiclePhotoInterior, VehiclePhotoEngine, VehiclePhotoRoof, VehiclePhotoDoor,
            ServiceBillPhoto, InsuranceCopy, FitnessCertificateUpload, PollutionPhoto, StateTaxPhoto, NoEntryPassCopy, Status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const fallbackValues = [
          vehicle.VehicleRegistrationNo,
          vehicle.VehicleCode || null,
          vehicle.VehicleChasisNo || null,
          vehicle.VehicleModel || null,
          vehicle.TypeOfBody || 'Open',
          vehicle.VehicleType || null,
          vehicle.VehicleRegistrationDate || null,
          vehicle.VehicleAge || null,
          vehicle.VehicleKMS || null,
          vehicle.VehicleInsuranceCompany || null,
          vehicle.VehicleInsuranceDate || null,
          vehicle.VehicleInsuranceExpiry || vehicle.InsuranceExpiry || null,
          vehicle.VehicleFitnessCertificateIssue || null,
          vehicle.VehicleFitnessCertificateExpiry || vehicle.FitnessExpiry || null,
          vehicle.VehiclePollutionDate || null,
          vehicle.VehiclePollutionExpiry || vehicle.PollutionExpiry || null,
          vehicle.StateTaxIssue || null,
          vehicle.StateTaxExpiry || null,
          vehicle.VehicleLoadingCapacity || null,
          vehicle.LastServicing || null,
          (() => {
            const vendorIdValue = vehicle.VendorID || vehicle.vendor_id || null;
            console.log('🚛 VEHICLE CREATE - VendorID value being inserted:', vendorIdValue);
            return vendorIdValue;
          })(),
          (() => {
            const driverIdValue = vehicle.DriverID || vehicle.driver_id || null;
            console.log('🚛 VEHICLE CREATE - DriverID value being inserted:', driverIdValue);
            return driverIdValue;
          })(),
          vehicle.GPS === 'Yes' || vehicle.GPS === 1 || vehicle.GPS === '1' ? 1 : 0,
          vehicle.GPSCompany || null,
          vehicle.NoEntryPass === 'Yes' || vehicle.NoEntryPass === 1 || vehicle.NoEntryPass === '1' ? 'Yes' : 'No',
          vehicle.NoEntryPassStartDate || null,
          vehicle.NoEntryPassExpiry || null,
          vehicle.InsuranceInfo || null,
          filePaths.RCUpload || null,
          filePaths.VehicleKMSPhoto || null,
          filePaths.VehiclePhoto || null,
          filePaths.VehiclePhotoFront || null,
          filePaths.VehiclePhotoBack || null,
          filePaths.VehiclePhotoLeftSide || null,
          filePaths.VehiclePhotoRightSide || null,
          filePaths.VehiclePhotoInterior || null,
          filePaths.VehiclePhotoEngine || null,
          filePaths.VehiclePhotoRoof || null,
          filePaths.VehiclePhotoDoor || null,
          filePaths.ServiceBillPhoto || null,
          filePaths.InsuranceCopy || null,
          filePaths.FitnessCertificateUpload || null,
          filePaths.PollutionPhoto || null,
          filePaths.StateTaxPhoto || null,
          filePaths.NoEntryPassCopy || null,
          vehicle.Status || 'Active'
        ];

        [result] = await pool.query(fallbackQuery, fallbackValues);

        const vehicleId = result.insertId;

        if (vehicle.FixRate || vehicle.FuelRate || vehicle.HandlingCharges) {
            const freightQuery = 'INSERT INTO vehicle_freight (VehicleID, FixRate, FuelRate, HandlingCharges) VALUES (?, ?, ?, ?)';
            await pool.query(freightQuery, [vehicleId, vehicle.FixRate, vehicle.FuelRate, vehicle.HandlingCharges]);
        }
      }

      // Try to fetch the created vehicle with all related information
      let newVehicle;
      try {
        [newVehicle] = await pool.query(
          'SELECT * FROM vehicle_master_view WHERE vehicle_id = ?',
          [result.insertId]
        );
        if (newVehicle && newVehicle[0]) {
          res.status(201).json(newVehicle[0]);
        } else {
          throw new Error('Vehicle master view not available');
        }
      } catch (viewError) {
        // Fallback response without view
        res.status(201).json({
          success: true,
          message: 'Vehicle created successfully',
          vehicle_id: result.insertId,
          vehicle_number: vehicle.vehicle_number,
          status: 'active'
        });
      }
    } catch (error) {
      console.error('Error creating vehicle:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Update a comprehensive vehicle record
  // This route updates an existing vehicle with all Vehicle Master form fields
  router.put('/:id', upload.fields([
    // Standard fields
    { name: 'vehicle_front_photo', maxCount: 1 },
    { name: 'vehicle_side_photo', maxCount: 1 },
    { name: 'vehicle_back_photo', maxCount: 1 },
    { name: 'vehicle_interior_photo', maxCount: 1 },
    { name: 'rc_copy', maxCount: 1 },
    { name: 'insurance_copy', maxCount: 1 },
    { name: 'fitness_copy', maxCount: 1 },
    { name: 'permit_copy', maxCount: 1 },
    { name: 'pollution_copy', maxCount: 1 },
    { name: 'tax_receipt', maxCount: 1 },
    // Frontend form fields
    { name: 'RCUpload', maxCount: 1 },
    { name: 'VehicleKMSPhoto', maxCount: 1 },
    { name: 'VehiclePhoto', maxCount: 1 },
    { name: 'ServiceBillPhoto', maxCount: 1 },
    { name: 'InsuranceCopy', maxCount: 1 },
    { name: 'FitnessCertificateUpload', maxCount: 1 },
    { name: 'PollutionPhoto', maxCount: 1 },
    { name: 'StateTaxPhoto', maxCount: 1 },
    { name: 'NoEntryPassCopy', maxCount: 1 },
    // New Multiple Vehicle Photos
    { name: 'VehiclePhotoFront', maxCount: 1 },
    { name: 'VehiclePhotoBack', maxCount: 1 },
    { name: 'VehiclePhotoLeftSide', maxCount: 1 },
    { name: 'VehiclePhotoRightSide', maxCount: 1 },
    { name: 'VehiclePhotoInterior', maxCount: 1 },
    { name: 'VehiclePhotoEngine', maxCount: 1 },
    { name: 'VehiclePhotoRoof', maxCount: 1 },
    { name: 'VehiclePhotoDoor', maxCount: 1 }
  ]), (req, res, next) => {
    // Handle multer errors with user-friendly messages
    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        message: 'File Upload Error',
        error: req.fileValidationError,
        details: 'Please check that your file is in a supported format (Images: JPG, PNG, GIF, WEBP | Documents: PDF) and under 5MB in size.'
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
      } else if (error.message && error.message.includes('Only image and PDF files are allowed')) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported File Type',
          error: error.message,
          details: 'Please upload images (JPG, PNG, GIF, WEBP) or PDF documents only.'
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



    // Handle both direct object data and FormData from frontend (same as POST route)
    let vehicle = {};
    
    if (req.body.vehicleData) {
      // If vehicleData is sent as JSON string (for comprehensive form)
      vehicle = JSON.parse(req.body.vehicleData || '{}');
    } else {
      // If form data is sent directly (from VehicleForm.jsx)
      vehicle = req.body;
      
      // Map frontend field names to backend field names
      const fieldMapping = {
        'VehicleRegistrationNo': 'vehicle_number',
        'VehicleChasisNo': 'chassis_number',
        'VehicleModel': 'model',
        'TypeOfBody': 'body_type',
        'VehicleRegistrationDate': 'registration_date',
        'VehicleAge': 'vehicle_age',
        'VehicleKMS': 'current_km_reading',
        'VehicleInsuranceCompany': 'insurance_company',
        'VehicleInsuranceDate': 'insurance_date',
        'VehicleInsuranceExpiry': 'insurance_expiry',
        'VehicleFitnessCertificateIssue': 'fitness_certificate_issue',
        'VehicleFitnessCertificateExpiry': 'fitness_expiry',
        'VehiclePollutionDate': 'pollution_date',
        'VehiclePollutionExpiry': 'pollution_expiry',
        'StateTaxIssue': 'tax_issue_date',
        'StateTaxExpiry': 'tax_paid_upto',
        'VehicleLoadingCapacity': 'capacity_tons',
        'GPS': 'gps_enabled',
        'GPSCompany': 'gps_company',
        'NoEntryPass': 'no_entry_pass',
        'NoEntryPassStartDate': 'no_entry_pass_start_date',
        'NoEntryPassExpiry': 'no_entry_pass_expiry',
        'LastServicing': 'last_service_date'
      };
      
      // Create mapped vehicle object
      const mappedVehicle = {};
      Object.keys(vehicle).forEach(key => {
        const mappedKey = fieldMapping[key] || key.toLowerCase();
        let value = vehicle[key];
        
        // Handle special conversions for database compatibility
        if (key === 'GPS') {
          // GPS: tinyint(1) - expects 0 or 1
          value = value === 'Yes' || value === 1 || value === '1' || value === true ? 1 : 0;
        }
        if (key === 'NoEntryPass') {
          // NoEntryPass: enum('Yes','No') - expects 'Yes' or 'No' string
          value = value === 'Yes' || value === 1 || value === '1' || value === true ? 'Yes' : 'No';
        }
        if (key === 'TypeOfBody') {
          // TypeOfBody: enum('Open','CBD','Container') - expects exact case match
          // DO NOT convert to lowercase - database expects 'Open', 'CBD', 'Container'
          const validBodyTypes = ['Open', 'CBD', 'Container'];
          if (value && !validBodyTypes.includes(value)) {
            // Try to match case-insensitively
            const matchedType = validBodyTypes.find(type => type.toLowerCase() === value.toLowerCase());
            value = matchedType || 'Open'; // Default to 'Open' if no match
          }
        }
        if (key === 'VehicleAge' || key === 'VehicleKMS' || key === 'VehicleLoadingCapacity') {
          // Numeric fields - convert string to number if needed
          if (value !== null && value !== undefined && value !== '') {
            const numValue = parseFloat(value);
            value = isNaN(numValue) ? null : numValue;
          }
        }
        if (key === 'FixRate' || key === 'FuelRate' || key === 'HandlingCharges') {
          // Decimal fields - convert string to number if needed
          if (value !== null && value !== undefined && value !== '') {
            const numValue = parseFloat(value);
            value = isNaN(numValue) ? null : numValue;
          }
        }
        
        mappedVehicle[mappedKey] = value;
      });
      
      // Set required fields with defaults
      mappedVehicle.vehicle_type = mappedVehicle.vehicle_type || 'truck';
      mappedVehicle.body_type = mappedVehicle.body_type || 'open';
      
      vehicle = mappedVehicle;
    }

    const dateErrors = validateDateSequence(vehicle);
    if (dateErrors.length > 0) {
      return res.status(400).json({ errors: dateErrors });
    }

    try {
      


      // Validate required fields (same as POST route)
      if (!vehicle.vehicle_number) {
        return res.status(400).json({
          error: 'Vehicle registration number is required'
        });
      }

      // Check if vehicle exists - first try lowercase table, then capitalized
      let existingVehicle;
      try {
        [existingVehicle] = await pool.query('SELECT * FROM vehicles WHERE vehicle_id = ?', [id]);
        if (existingVehicle.length === 0) {
          // Try with capitalized table name
          [existingVehicle] = await pool.query('SELECT * FROM Vehicle WHERE VehicleID = ?', [id]);
        }
      } catch (error) {
        // Try with capitalized table name as fallback
        [existingVehicle] = await pool.query('SELECT * FROM Vehicle WHERE VehicleID = ?', [id]);
      }
      
      if (existingVehicle.length === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      // Handle file paths - keep existing files if new ones aren't provided
      const files = req.files || {};
      const fileFields = [
        'RCUpload', 'VehicleKMSPhoto', 'VehiclePhoto', 'VehiclePhotoFront',
        'VehiclePhotoBack', 'VehiclePhotoLeftSide', 'VehiclePhotoRightSide',
        'VehiclePhotoInterior', 'VehiclePhotoEngine', 'VehiclePhotoRoof',
        'VehiclePhotoDoor', 'ServiceBillPhoto', 'InsuranceCopy',
        'FitnessCertificateUpload', 'PollutionPhoto', 'StateTaxPhoto', 'NoEntryPassCopy'
      ];

      const filePaths = {};
      fileFields.forEach(fieldname => {
        if (files[fieldname] && files[fieldname][0]) {
          // New file uploaded - delete old file if exists
          if (existingVehicle[0][fieldname] && fs.existsSync(existingVehicle[0][fieldname])) {
            fs.unlinkSync(existingVehicle[0][fieldname]);
          }
          filePaths[fieldname] = files[fieldname][0].path;
        } else {
          // No new file - keep existing file path
          filePaths[fieldname] = existingVehicle[0][fieldname] || null;
        }
      });

      // Build comprehensive UPDATE query for capitalized Vehicle table
      const updateQuery = `
        UPDATE Vehicle SET
          VehicleRegistrationNo = ?,
          VehicleCode = ?,
          VehicleChasisNo = ?,
          VehicleModel = ?,
          TypeOfBody = ?,
          VehicleType = ?,
          VehicleRegistrationDate = ?,
          VehicleAge = ?,
          VehicleKMS = ?,
          VendorID = ?,
          DriverID = ?,
          GPS = ?,
          GPSCompany = ?,
          NoEntryPass = ?,
          NoEntryPassStartDate = ?,
          NoEntryPassExpiry = ?,
          LastServicing = ?,
          VehicleLoadingCapacity = ?,
          RCUpload = ?,
          VehicleKMSPhoto = ?,
          VehiclePhoto = ?,
          VehiclePhotoFront = ?,
          VehiclePhotoBack = ?,
          VehiclePhotoLeftSide = ?,
          VehiclePhotoRightSide = ?,
          VehiclePhotoInterior = ?,
          VehiclePhotoEngine = ?,
          VehiclePhotoRoof = ?,
          VehiclePhotoDoor = ?,
          ServiceBillPhoto = ?,
          InsuranceCopy = ?,
          FitnessCertificateUpload = ?,
          PollutionPhoto = ?,
          StateTaxPhoto = ?,
          NoEntryPassCopy = ?,
          InsuranceInfo = ?,
          VehicleInsuranceCompany = ?,
          VehicleInsuranceDate = ?,
          InsuranceExpiry = ?,
          VehicleFitnessCertificateIssue = ?,
          FitnessExpiry = ?,
          VehiclePollutionDate = ?,
          PollutionExpiry = ?,
          StateTaxIssue = ?,
          StateTaxExpiry = ?,
          Status = ?,
          UpdatedAt = CURRENT_TIMESTAMP
        WHERE VehicleID = ?`;

      // Map form data to database fields
      const vehicleData = req.body;

      // Convert GPS to integer (0 or 1) and NoEntryPass to string ('Yes' or 'No')
      const convertGPS = (value) => {
        if (value === 'Yes' || value === 'yes' || value === '1' || value === 1 || value === true) {
          return 1;
        }
        return 0;
      };

      const convertNoEntryPass = (value) => {
        if (value === 'Yes' || value === 'yes' || value === '1' || value === 1 || value === true) {
          return 'Yes';
        }
        return 'No';
      };

      const values = [
        vehicleData.VehicleRegistrationNo || null,
        vehicleData.VehicleCode || null,
        vehicleData.VehicleChasisNo || null,
        vehicleData.VehicleModel || null,
        vehicleData.TypeOfBody || null,
        vehicleData.VehicleType || null,
        vehicleData.VehicleRegistrationDate || null,
        vehicleData.VehicleAge || null,
        vehicleData.VehicleKMS || null,
        vehicleData.VendorID || vehicleData.vendor_id || null,
        vehicleData.DriverID || vehicleData.driver_id || null,
        convertGPS(vehicleData.GPS),
        vehicleData.GPSCompany || null,
        convertNoEntryPass(vehicleData.NoEntryPass),
        vehicleData.NoEntryPassStartDate || null,
        vehicleData.NoEntryPassExpiry || null,
        vehicleData.LastServicing || null,
        vehicleData.VehicleLoadingCapacity || null,
        filePaths.RCUpload,
        filePaths.VehicleKMSPhoto,
        filePaths.VehiclePhoto,
        filePaths.VehiclePhotoFront,
        filePaths.VehiclePhotoBack,
        filePaths.VehiclePhotoLeftSide,
        filePaths.VehiclePhotoRightSide,
        filePaths.VehiclePhotoInterior,
        filePaths.VehiclePhotoEngine,
        filePaths.VehiclePhotoRoof,
        filePaths.VehiclePhotoDoor,
        filePaths.ServiceBillPhoto,
        filePaths.InsuranceCopy,
        filePaths.FitnessCertificateUpload,
        filePaths.PollutionPhoto,
        filePaths.StateTaxPhoto,
        filePaths.NoEntryPassCopy,
        vehicleData.InsuranceInfo || null,
        vehicleData.VehicleInsuranceCompany || null,
        vehicleData.VehicleInsuranceDate || null,
        vehicleData.InsuranceExpiry || null,
        vehicleData.VehicleFitnessCertificateIssue || null,
        vehicleData.FitnessExpiry || null,
        vehicleData.VehiclePollutionDate || null,
        vehicleData.PollutionExpiry || null,
        vehicleData.StateTaxIssue || null,
        vehicleData.StateTaxExpiry || null,
        vehicleData.Status || 'Active',
        id
      ];

      const [result] = await pool.query(updateQuery, values);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      // Update vehicle freight details
      if (vehicleData.FixRate || vehicleData.FuelRate || vehicleData.HandlingCharges) {
        const [existingFreight] = await pool.query('SELECT * FROM vehicle_freight WHERE VehicleID = ?', [id]);
        if (existingFreight.length > 0) {
          const freightQuery = 'UPDATE vehicle_freight SET FixRate = ?, FuelRate = ?, HandlingCharges = ? WHERE VehicleID = ?';
          await pool.query(freightQuery, [vehicleData.FixRate, vehicleData.FuelRate, vehicleData.HandlingCharges, id]);
        } else {
          const freightQuery = 'INSERT INTO vehicle_freight (VehicleID, FixRate, FuelRate, HandlingCharges) VALUES (?, ?, ?, ?)';
          await pool.query(freightQuery, [id, vehicleData.FixRate, vehicleData.FuelRate, vehicleData.HandlingCharges]);
        }
      }

      // Fetch the updated vehicle with all related information
      const [updatedVehicle] = await pool.query(`
        SELECT
          v.VehicleID,
          v.VehicleRegistrationNo,
          v.VehicleCode,
          v.VehicleChasisNo,
          v.VehicleModel,
          v.TypeOfBody,
          v.VehicleType,
          v.VehicleRegistrationDate,
          v.VehicleAge,
          v.VehicleKMS,
          v.VendorID,
          v.DriverID,
          v.GPS,
          v.GPSCompany,
          v.NoEntryPass,
          v.NoEntryPassStartDate,
          v.NoEntryPassExpiry,
          v.LastServicing,
          v.VehicleLoadingCapacity,
          v.Status,
          v.CreatedAt,
          v.UpdatedAt,
          vn.VendorName,
          vn.VendorCode,
          d.DriverName,
          d.DriverID as DriverCode,
          vf.FixRate,
          vf.FuelRate,
          vf.HandlingCharges,
          v.RCUpload,
          v.VehicleKMSPhoto,
          v.VehiclePhoto,
          v.VehiclePhotoFront,
          v.VehiclePhotoBack,
          v.VehiclePhotoLeftSide,
          v.VehiclePhotoRightSide,
          v.VehiclePhotoInterior,
          v.VehiclePhotoEngine,
          v.VehiclePhotoRoof,
          v.VehiclePhotoDoor,
          v.ServiceBillPhoto,
          v.InsuranceCopy,
          v.FitnessCertificateUpload,
          v.PollutionPhoto,
          v.StateTaxPhoto,
          v.NoEntryPassCopy,
          v.InsuranceInfo,
          v.VehicleInsuranceCompany,
          v.VehicleInsuranceDate,
          v.InsuranceExpiry,
          v.VehicleFitnessCertificateIssue,
          v.FitnessExpiry,
          v.VehiclePollutionDate,
          v.PollutionExpiry,
          v.StateTaxIssue,
          v.StateTaxExpiry
        FROM Vehicle v
        LEFT JOIN Vendor vn ON v.VendorID = vn.VendorID
        LEFT JOIN driver d ON v.DriverID = d.DriverID
        LEFT JOIN vehicle_freight vf ON v.VehicleID = vf.VehicleID
        WHERE v.VehicleID = ?
      `, [id]);



      // Apply URL generation to the updated vehicle
      const vehicleWithUrls = updatedVehicle[0] ? addFileUrls(updatedVehicle[0]) : null;
      res.json(vehicleWithUrls);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Bulk delete vehicles and their associated files
  // This route deletes multiple vehicle records and cleans up associated uploaded files
  router.delete('/bulk', async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of vehicle IDs to delete' });
    }

    try {
      console.log(`🗑️ Bulk delete vehicles - IDs: ${ids.join(', ')}`);

      // Get vehicle data to delete associated files
      const placeholders = ids.map(() => '?').join(',');
      const [vehicles] = await pool.query(`SELECT * FROM vehicle WHERE VehicleID IN (${placeholders})`, ids);

      // Delete associated files for all vehicles
      const fileFields = [
        'VehicleFrontPhoto', 'VehicleSidePhoto', 'VehicleBackPhoto', 'VehicleInteriorPhoto',
        'RCCopy', 'InsuranceCopy', 'FitnessCopy', 'PermitCopy', 'PollutionCopy', 'TaxReceipt'
      ];

      vehicles.forEach(vehicle => {
        fileFields.forEach(field => {
          if (vehicle[field] && fs.existsSync(vehicle[field])) {
            try {
              fs.unlinkSync(vehicle[field]);
              console.log(`✅ Deleted file: ${vehicle[field]}`);
            } catch (err) {
              console.error(`❌ Error deleting file ${vehicle[field]}:`, err);
            }
          }
        });
      });

      // Delete the vehicle records
      const [result] = await pool.query(`DELETE FROM vehicle WHERE VehicleID IN (${placeholders})`, ids);

      const deletedCount = result.affectedRows;
      const notFoundCount = ids.length - deletedCount;

      console.log(`✅ Bulk delete completed - Deleted: ${deletedCount}, Not found: ${notFoundCount}`);

      res.json({
        message: `Successfully deleted ${deletedCount} vehicle(s) and their associated files`,
        deletedCount,
        notFoundCount,
        totalRequested: ids.length
      });
    } catch (error) {
      console.error('❌ Error bulk deleting vehicles:', error);

      // Handle specific database errors
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        res.status(400).json({ error: 'Cannot delete one or more vehicles because they are referenced by other records. Please remove related records first.' });
      } else {
        res.status(500).json({ error: 'Unable to delete vehicles. Please try again later.' });
      }
    }
  });

  // Delete a vehicle and its associated files
  // This route deletes a vehicle record and cleans up associated uploaded files
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      // Get vehicle data to delete associated files
      const [vehicle] = await pool.query('SELECT * FROM vehicle WHERE VehicleID = ?', [id]);
      if (vehicle.length === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      // Delete associated files
      const fileFields = [
        'VehicleFrontPhoto', 'VehicleSidePhoto', 'VehicleBackPhoto', 'VehicleInteriorPhoto',
        'RCCopy', 'InsuranceCopy', 'FitnessCopy', 'PermitCopy', 'PollutionCopy', 'TaxReceipt'
      ];

      fileFields.forEach(field => {
        if (vehicle[0][field] && fs.existsSync(vehicle[0][field])) {
          try {
            fs.unlinkSync(vehicle[0][field]);
          } catch (err) {
            console.error(`Error deleting file ${vehicle[0][field]}:`, err);
          }
        }
      });

      // Delete the vehicle record
      const [result] = await pool.query('DELETE FROM vehicle WHERE VehicleID = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      res.json({ message: 'Vehicle and associated files deleted successfully' });
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Test route to verify server reload
  router.get('/test-reload', (req, res) => {
    res.json({
      message: 'Server reloaded successfully!',
      timestamp: new Date().toISOString()
    });
  });
  
  // Simple route for vehicle-project assignment (temporary solution)
  router.post('/:id/assign-project', async (req, res) => {
    const { id } = req.params;
    const { project_id, assigned_by = 'System', assignment_notes = '' } = req.body;
    
    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required' 
      });
    }
    
    try {
      // Simple update to assign project to vehicle
      // Since ProjectID column doesn't exist, we'll just change the status for now
      // In production, you'd add a proper ProjectID column to the Vehicle table
      const [result] = await pool.query(
        'UPDATE Vehicle SET Status = ? WHERE VehicleID = ?',
        ['Assigned', id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found' 
        });
      }
      
      res.json({
        success: true,
        message: 'Vehicle successfully assigned to project',
        data: {
          vehicle_id: id,
          project_id: project_id,
          assigned_by: assigned_by,
          assignment_date: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error assigning vehicle to project:', error);
      res.status(500).json({
        success: false,
        message: 'Error assigning vehicle to project',
        error: error.message 
      });
    }
  });

  // Check vehicle code uniqueness
  router.get('/check-code/:vehicleCode', async (req, res) => {
    try {
      const { vehicleCode } = req.params;

      if (!vehicleCode) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle code is required'
        });
      }

      // Check in both possible table structures
      let isUnique = true;

      try {
        // Try lowercase table first
        const [rows1] = await pool.query(
          'SELECT vehicle_id FROM vehicles WHERE vehicle_code = ?',
          [vehicleCode]
        );
        isUnique = rows1.length === 0;
      } catch (error) {
        // Try capitalized table as fallback
        const [rows2] = await pool.query(
          'SELECT VehicleID FROM Vehicle WHERE VehicleCode = ?',
          [vehicleCode]
        );
        isUnique = rows2.length === 0;
      }

      res.json({
        success: true,
        isUnique,
        message: isUnique ? 'Vehicle code is available' : 'Vehicle code already exists'
      });

    } catch (error) {
      console.error('Error checking vehicle code uniqueness:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking vehicle code uniqueness',
        error: error.message
      });
    }
  });

  // Serve vehicle files from external directory
  router.get('/files/:filename', (req, res) => {
    const filename = req.params.filename;

    // Handle both old format (just filename) and new format (vehicles/filename)
    let relativePath = filename;
    if (!filename.includes('/')) {
      relativePath = `vehicles/${filename}`;
    }

    const filePath = uploadsManager.getFullPath(relativePath);
    console.log('📁 VEHICLE FILE REQUEST - Filename:', filename);
    console.log('📁 VEHICLE FILE REQUEST - Relative path:', relativePath);
    console.log('📁 VEHICLE FILE REQUEST - Full path:', filePath);

    // Check if file exists
    if (!uploadsManager.fileExists(relativePath)) {
      console.log('❌ VEHICLE FILE NOT FOUND:', filePath);
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers for inline viewing
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Send the file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('❌ Error serving vehicle file:', err);
        res.status(500).json({ error: 'Error serving file' });
      } else {
        console.log('✅ VEHICLE FILE SERVED:', filename);
      }
    });
  });

  // Delete specific file from vehicle
  router.delete('/:id/files/:fieldName', async (req, res) => {
    try {
      const { id, fieldName } = req.params;

      console.log(`🗑️ Deleting vehicle file - ID: ${id}, Field: ${fieldName}`);

      // Get current vehicle data to find the file path
      const [vehicles] = await pool.query('SELECT * FROM vehicle WHERE VehicleID = ?', [id]);

      if (vehicles.length === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      const vehicle = vehicles[0];
      const fileName = vehicle[fieldName];

      if (!fileName) {
        return res.status(404).json({ error: 'File not found in database' });
      }

      // Delete file from filesystem
      const filePath = path.join(__dirname, '../uploads/vehicles', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ File deleted from filesystem: ${filePath}`);
      }

      // Update database to remove file reference
      const updateQuery = `UPDATE vehicle SET ${fieldName} = NULL WHERE VehicleID = ?`;
      await pool.query(updateQuery, [id]);

      console.log(`✅ Vehicle file deleted successfully - ID: ${id}, Field: ${fieldName}`);
      res.json({
        success: true,
        message: 'File deleted successfully',
        fieldName,
        fileName
      });

    } catch (error) {
      console.error('❌ Error deleting vehicle file:', error);
      res.status(500).json({
        error: 'Failed to delete file',
        details: error.message
      });
    }
  });

  // Validate vehicle existence by registration number
  router.get('/validate/by-reg-no/:regNo', async (req, res) => {
    const { regNo } = req.params;
    try {
      const [rows] = await pool.query(
        'SELECT VehicleID FROM vehicle WHERE VehicleRegistrationNo = ?',
        [regNo]
      );

      if (rows.length > 0) {
        res.json({ exists: true, vehicleId: rows[0].VehicleID });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      console.error('Error validating vehicle by registration number:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};