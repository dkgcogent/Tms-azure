const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// This file provides universal Excel/CSV export functionality for all TMS entities
// It supports exporting data from any table/entity with proper column mapping

module.exports = (pool) => {
  // Helper function to get the primary key field for each entity
  const getEntityIdField = (entity) => {
    const idFields = {
      'customers': 'CustomerID',
      'vendors': 'VendorID',
      'drivers': 'DriverID',
      'vehicles': 'VehicleID',
      'projects': 'ProjectID',
      'transactions': 'TransactionID',
      'billing': 'BillingID'
    };
    return idFields[entity] || 'id';
  };

  // Helper function to validate date format (YYYY-MM-DD)
  const isValidDate = (dateString) => {
    if (!dateString) return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString === date.toISOString().split('T')[0];
  };

  // Helper function to sanitize filename
  const sanitizeFilename = (filename) => {
    return filename
      .replace(/[^a-zA-Z0-9\-_\.]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  };

  // Helper function to build WHERE clause and parameters
  const buildWhereClause = (baseQuery, filters) => {
    let query = baseQuery.trim();
    let params = [];
    let hasWhere = query.includes('WHERE');

    // Extract ORDER BY, GROUP BY, LIMIT clauses to append them at the end
    // Use more flexible regex patterns to handle multiline queries
    const orderByMatch = query.match(/\s+(ORDER\s+BY\s+[^;]+?)(\s*$|\s+(LIMIT|GROUP\s+BY))/is);
    const groupByMatch = query.match(/\s+(GROUP\s+BY\s+[^;]+?)(\s*$|\s+(ORDER\s+BY|LIMIT))/is);
    const limitMatch = query.match(/\s+(LIMIT\s+[^;]+?)\s*$/is);

    let orderByClause = '';
    let groupByClause = '';
    let limitClause = '';

    if (orderByMatch) {
      orderByClause = orderByMatch[1];
      query = query.replace(orderByMatch[0], '');
    }
    if (groupByMatch) {
      groupByClause = groupByMatch[1];
      query = query.replace(groupByMatch[0], '');
    }
    if (limitMatch) {
      limitClause = limitMatch[1];
      query = query.replace(limitMatch[0], '');
    }

    // Add ID filter
    if (filters.id) {
      const idField = getEntityIdField(filters.entity);
      if (hasWhere) {
        query += ` AND ${idField} = ?`;
      } else {
        query += ` WHERE ${idField} = ?`;
        hasWhere = true;
      }
      params.push(filters.id);
    }

    // Add date range filter
    if (filters.fromDate || filters.toDate) {
      const dateFields = {
        'transactions': 'vt.TransactionDate',
        'vehicles': 'v.CreatedAt',
        'vendors': 'v.CreatedAt',
        'drivers': 'd.CreatedAt',
        'customers': 'CreatedAt',
        'projects': 'p.CreatedAt',
        'billing': 'b.CreatedAt'
      };

      const dateField = dateFields[filters.entity] || 'CreatedAt';

      if (filters.fromDate && filters.toDate) {
        // Both dates provided - range filter
        if (hasWhere) {
          query += ` AND DATE(${dateField}) BETWEEN ? AND ?`;
        } else {
          query += ` WHERE DATE(${dateField}) BETWEEN ? AND ?`;
          hasWhere = true;
        }
        params.push(filters.fromDate, filters.toDate);
      } else if (filters.fromDate) {
        // Only from date provided
        if (hasWhere) {
          query += ` AND DATE(${dateField}) >= ?`;
        } else {
          query += ` WHERE DATE(${dateField}) >= ?`;
          hasWhere = true;
        }
        params.push(filters.fromDate);
      } else if (filters.toDate) {
        // Only to date provided
        if (hasWhere) {
          query += ` AND DATE(${dateField}) <= ?`;
        } else {
          query += ` WHERE DATE(${dateField}) <= ?`;
          hasWhere = true;
        }
        params.push(filters.toDate);
      }
    }

    // Add pagination if specified (but not if we already have a LIMIT clause)
    if (!limitClause && filters.limit && filters.offset) {
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(filters.limit), parseInt(filters.offset));
    } else if (!limitClause && filters.limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(filters.limit));
    }

    // Append extracted clauses back in the correct order
    if (groupByClause) {
      query += ` ${groupByClause}`;
    }
    if (orderByClause) {
      query += ` ${orderByClause}`;
    }
    if (limitClause) {
      query += ` ${limitClause}`;
    }

    return { query, params, hasWhere };
  };

  // Helper function to generate CSV content
  const generateCSV = (data, columns) => {
    if (!data.length) return '';

    const headers = Object.keys(columns);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const csvRow = headers.map(header => {
        const dbField = columns[header];
        let value = row[dbField] || '';

        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }

        return value;
      });
      csvRows.push(csvRow.join(','));
    });

    return csvRows.join('\n');
  };

  // Helper function to log export activity
  const logExportActivity = (req, entity, recordCount, filename, format) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      entity,
      recordCount,
      filename,
      format,
      userAgent: req.headers['user-agent'] || 'Unknown',
      ip: req.ip || req.connection.remoteAddress || 'Unknown',
      query: req.query
    };

    console.log('📊 EXPORT LOG:', JSON.stringify(logEntry, null, 2));
  };

  // Test endpoint to check vehicle columns
  router.get('/debug/vehicle-columns', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          IFNULL(v.VehicleID, 'N/A') as VehicleID,
          IFNULL(v.VehicleRegistrationNo, 'N/A') as VehicleRegistrationNo,
          IFNULL(v.VehicleCode, 'N/A') as VehicleCode,
          IFNULL(v.RCUpload, 'N/A') as RCUpload,
          IFNULL(v.VehicleChasisNo, 'N/A') as VehicleChasisNo,
          IFNULL(v.VehicleModel, 'N/A') as VehicleModel,
          IFNULL(v.TypeOfBody, 'N/A') as TypeOfBody,
          IFNULL(v.VehicleType, 'N/A') as VehicleType,
          IFNULL(DATE_FORMAT(v.VehicleRegistrationDate, '%Y-%m-%d'), 'N/A') as VehicleRegistrationDate,
          IFNULL(v.VehicleAge, 'N/A') as VehicleAge,
          IFNULL(v.VehicleKMS, 'N/A') as VehicleKMS,
          IFNULL(v.VehicleKMSPhoto, 'N/A') as VehicleKMSPhoto,
          IFNULL(v.VehiclePhoto, 'N/A') as VehiclePhoto,
          IFNULL(DATE_FORMAT(v.LastServicing, '%Y-%m-%d'), 'N/A') as LastServicing,
          IFNULL(v.ServiceBillPhoto, 'N/A') as ServiceBillPhoto,
          IFNULL(v.VehicleInsuranceCompany, 'N/A') as VehicleInsuranceCompany,
          IFNULL(DATE_FORMAT(v.VehicleInsuranceDate, '%Y-%m-%d'), 'N/A') as VehicleInsuranceDate,
          IFNULL(DATE_FORMAT(v.InsuranceExpiry, '%Y-%m-%d'), 'N/A') as VehicleInsuranceExpiry,
          IFNULL(v.InsuranceCopy, 'N/A') as InsuranceCopy,
          IFNULL(DATE_FORMAT(v.VehicleFitnessCertificateIssue, '%Y-%m-%d'), 'N/A') as VehicleFitnessCertificateIssue,
          IFNULL(DATE_FORMAT(v.FitnessExpiry, '%Y-%m-%d'), 'N/A') as VehicleFitnessCertificateExpiry,
          IFNULL(v.FitnessCertificateUpload, 'N/A') as FitnessCertificateUpload,
          IFNULL(DATE_FORMAT(v.VehiclePollutionDate, '%Y-%m-%d'), 'N/A') as VehiclePollutionDate,
          IFNULL(DATE_FORMAT(v.PollutionExpiry, '%Y-%m-%d'), 'N/A') as VehiclePollutionExpiry,
          IFNULL(v.PollutionPhoto, 'N/A') as PollutionPhoto,
          IFNULL(DATE_FORMAT(v.StateTaxIssue, '%Y-%m-%d'), 'N/A') as StateTaxIssue,
          IFNULL(DATE_FORMAT(v.StateTaxExpiry, '%Y-%m-%d'), 'N/A') as StateTaxExpiry,
          IFNULL(v.StateTaxPhoto, 'N/A') as StateTaxPhoto,
          IFNULL(v.VehicleLoadingCapacity, 'N/A') as VehicleLoadingCapacity,
          IFNULL(CASE WHEN v.GPS = 1 THEN 'Yes' ELSE 'No' END, 'N/A') as GPS,
          IFNULL(v.GPSCompany, 'N/A') as GPSCompany,
          IFNULL(v.NoEntryPass, 'N/A') as NoEntryPass,
          IFNULL(DATE_FORMAT(v.NoEntryPassExpiry, '%Y-%m-%d'), 'N/A') as NoEntryPassExpiry,
          IFNULL(v.NoEntryPassCopy, 'N/A') as NoEntryPassCopy,
          IFNULL(v.InsuranceInfo, 'N/A') as InsuranceInfo,
          IFNULL(v.Status, 'N/A') as Status,
          IFNULL(v.VendorID, 'N/A') as VendorID,
          IFNULL(vn.VendorName, 'N/A') as VendorName,
          IFNULL(vn.VendorCode, 'N/A') as VendorCode,
          IFNULL(vn.VendorMobileNo, 'N/A') as VendorMobileNo,
          IFNULL(vn.VendorAddress, 'N/A') as VendorAddress,
          IFNULL(vn.VendorAlternateNo, 'N/A') as VendorAlternateNo,
          IFNULL(vn.TypeOfCompany, 'N/A') as VendorTypeOfCompany,
          IFNULL(vn.CompanyName, 'N/A') as VendorCompanyName,
          IFNULL(vn.CompanyGST, 'N/A') as VendorCompanyGST,
          IFNULL(vn.VendorAadhar, 'N/A') as VendorAadhar,
          IFNULL(vn.VendorPAN, 'N/A') as VendorPAN,
          IFNULL(vn.BankDetails, 'N/A') as VendorBankDetails,
          IFNULL(DATE_FORMAT(v.CreatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as CreatedAt,
          IFNULL(DATE_FORMAT(v.UpdatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as UpdatedAt
        FROM vehicle v
        LEFT JOIN vendor vn ON v.VendorID = vn.VendorID
        LIMIT 1
      `);

      if (rows.length > 0) {
        const columnNames = Object.keys(rows[0]);
        res.json({
          message: 'Vehicle export columns test',
          totalColumns: columnNames.length,
          columns: columnNames,
          sampleData: rows[0]
        });
      } else {
        res.json({
          message: 'No vehicle data found',
          totalColumns: 0,
          columns: []
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Universal Excel/CSV export endpoint
  router.get('/:entity', async (req, res) => {
    const { entity } = req.params;
    const { format = 'xlsx', id = null, fromDate = null, toDate = null, limit = null, offset = null } = req.query;

    // Enhanced logging
    console.log(`📊 EXPORT REQUEST RECEIVED:`);
    console.log(`   Entity: ${entity}`);
    console.log(`   Format: ${format}`);
    console.log(`   ID: ${id}`);
    console.log(`   From Date: ${fromDate}`);
    console.log(`   To Date: ${toDate}`);
    console.log(`   Limit: ${limit}`);
    console.log(`   Offset: ${offset}`);

    try {
      // Validate format
      const supportedFormats = ['xlsx', 'csv'];
      if (!supportedFormats.includes(format.toLowerCase())) {
        return res.status(400).json({
          error: 'Invalid format',
          message: `Supported formats: ${supportedFormats.join(', ')}`,
          supportedFormats
        });
      }

      // Validate date format and range
      if (fromDate && !isValidDate(fromDate)) {
        return res.status(400).json({
          error: 'Invalid fromDate format',
          message: 'Date must be in YYYY-MM-DD format'
        });
      }

      if (toDate && !isValidDate(toDate)) {
        return res.status(400).json({
          error: 'Invalid toDate format',
          message: 'Date must be in YYYY-MM-DD format'
        });
      }

      if (fromDate && toDate && fromDate > toDate) {
        return res.status(400).json({
          error: 'Invalid date range',
          message: 'From Date cannot be later than To Date'
        });
      }

      // Validate limit and offset
      if (limit && (isNaN(limit) || parseInt(limit) <= 0 || parseInt(limit) > 10000)) {
        return res.status(400).json({
          error: 'Invalid limit',
          message: 'Limit must be a positive number between 1 and 10000'
        });
      }

      if (offset && (isNaN(offset) || parseInt(offset) < 0)) {
        return res.status(400).json({
          error: 'Invalid offset',
          message: 'Offset must be a non-negative number'
        });
      }
      let data = [];
      let columns = {};
      let filename = '';

      // Define entity configurations
      const entityConfigs = {
        // Vehicle Transactions
        transactions: {
          query: `
            SELECT
              IFNULL(vt.TransactionID, 'N/A') as TransactionID,
              IFNULL(vt.TripType, 'N/A') as TripType,
              IFNULL(DATE_FORMAT(vt.TransactionDate, '%Y-%m-%d'), 'N/A') as TransactionDate,
              IFNULL(vt.Shift, 'N/A') as Shift,
              IFNULL(vt.VehicleID, 'N/A') as VehicleID,
              IFNULL(v.VehicleRegistrationNo, 'N/A') as Vehicle,
              IFNULL(v.VehicleCode, 'N/A') as VehicleCode,
              IFNULL(v.VehicleChasisNo, 'N/A') as VehicleChasis,
              IFNULL(v.VehicleModel, 'N/A') as VehicleModel,
              IFNULL(v.TypeOfBody, 'N/A') as TypeOfBody,
              IFNULL(v.VehicleType, 'N/A') as VehicleType,
              IFNULL(vt.DriverID, 'N/A') as DriverID,
              IFNULL(d.DriverName, 'N/A') as Driver,
              IFNULL(d.DriverLicenceNo, 'N/A') as LicenseNo,
              IFNULL(d.DriverMobileNo, 'N/A') as DriverMobile,
              IFNULL(d.DriverAddress, 'N/A') as DriverAddress,
              IFNULL(vt.VendorID, 'N/A') as VendorID,
              IFNULL(vend.VendorName, 'N/A') as Vendor,
              IFNULL(vend.VendorCode, 'N/A') as VendorCode,
              IFNULL(vend.VendorMobileNo, 'N/A') as VendorMobile,
              IFNULL(vend.VendorAddress, 'N/A') as VendorAddress,
              IFNULL(vt.CustomerID, 'N/A') as CustomerID,
              IFNULL(c.Name, 'N/A') as Customer,
              IFNULL(c.CustomerCode, 'N/A') as CustomerCode,
              IFNULL(c.CustomerMobileNo, 'N/A') as CustomerMobile,
              IFNULL(c.Address, 'N/A') as CustomerAddress,
              IFNULL(vt.ProjectID, 'N/A') as ProjectID,
              IFNULL(p.ProjectName, 'N/A') as Project,
              IFNULL(p.ProjectCode, 'N/A') as ProjectCode,
              IFNULL(p.ProjectDescription, 'N/A') as ProjectDescription,
              IFNULL(vt.LocationID, 'N/A') as LocationID,
              IFNULL(l.LocationName, 'N/A') as Location,
              IFNULL(vt.OpeningKM, 'N/A') as OpeningKM,
              IFNULL(vt.ClosingKM, 'N/A') as ClosingKM,
              IFNULL(vt.TotalKM, 'N/A') as TotalKM,
              IFNULL(vt.FreightFix, 'N/A') as FreightFix,
              IFNULL(vt.DeliveriesDone, 'N/A') as DeliveriesDone,
              IFNULL(vt.TripNo, 'N/A') as TripNo,
              IFNULL(vt.FreightVariable, 'N/A') as FreightVariable,
              IFNULL(vt.AdvancePaid, 'N/A') as AdvancePaid,
              IFNULL(vt.BalancePaid, 'N/A') as BalancePaid,
              IFNULL(vt.LoadingPoint, 'N/A') as LoadingPoint,
              IFNULL(vt.UnloadingPoint, 'N/A') as UnloadingPoint,
              IFNULL(vt.MaterialType, 'N/A') as MaterialType,
              IFNULL(vt.Remarks, 'N/A') as Remarks,
              IFNULL(vt.TotalFreight, 'N/A') as TotalFreight,
              IFNULL(vt.Status, 'N/A') as Status,
              IFNULL(DATE_FORMAT(vt.CreatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as CreatedAt,
              IFNULL(DATE_FORMAT(vt.UpdatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as UpdatedAt
            FROM vehicletransaction vt
            LEFT JOIN customer c ON vt.CustomerID = c.CustomerID
            LEFT JOIN project p ON vt.ProjectID = p.ProjectID
            LEFT JOIN Location l ON vt.LocationID = l.LocationID
            LEFT JOIN Vehicle v ON vt.VehicleID = v.VehicleID
            LEFT JOIN Driver d ON vt.DriverID = d.DriverID
            LEFT JOIN Vendor vend ON vt.VendorID = vend.VendorID
            ORDER BY vt.TransactionDate DESC, vt.TransactionID DESC
          `,
          filename: 'Vehicle_Transactions',
          columns: {
            'Transaction ID': 'TransactionID',
            'Trip Type': 'TripType',
            'Date': 'TransactionDate',
            'Shift': 'Shift',
            'Vehicle ID': 'VehicleID',
            'Vehicle': 'Vehicle',
            'Vehicle Code': 'VehicleCode',
            'Vehicle Chassis': 'VehicleChasis',
            'Vehicle Model': 'VehicleModel',
            'Body Type': 'TypeOfBody',
            'Vehicle Type': 'VehicleType',
            'Driver ID': 'DriverID',
            'Driver': 'Driver',
            'License No': 'LicenseNo',
            'Driver Mobile': 'DriverMobile',
            'Driver Address': 'DriverAddress',
            'Vendor ID': 'VendorID',
            'Vendor': 'Vendor',
            'Vendor Code': 'VendorCode',
            'Vendor Mobile': 'VendorMobile',
            'Vendor Address': 'VendorAddress',
            'Customer ID': 'CustomerID',
            'Customer': 'Customer',
            'Customer Code': 'CustomerCode',
            'Customer Mobile': 'CustomerMobile',
            'Customer Address': 'CustomerAddress',
            'Project ID': 'ProjectID',
            'Project': 'Project',
            'Project Code': 'ProjectCode',
            'Project Description': 'ProjectDescription',
            'Location ID': 'LocationID',
            'Location': 'Location',
            'Opening KM': 'OpeningKM',
            'Closing KM': 'ClosingKM',
            'Total KM': 'TotalKM',
            'Freight Fix': 'FreightFix',
            'Deliveries Done': 'DeliveriesDone',
            'Trip No': 'TripNo',
            'Freight Variable': 'FreightVariable',
            'Advance Paid': 'AdvancePaid',
            'Balance Paid': 'BalancePaid',
            'Loading Point': 'LoadingPoint',
            'Unloading Point': 'UnloadingPoint',
            'Material Type': 'MaterialType',
            'Remarks': 'Remarks',
            'Total Freight': 'TotalFreight',
            'Status': 'Status',
            'Created At': 'CreatedAt',
            'Updated At': 'UpdatedAt'
          }
        },

        // Vehicles
        vehicles: {
          query: `
            SELECT
              IFNULL(v.VehicleID, 'N/A') as VehicleID,
              IFNULL(v.VehicleRegistrationNo, 'N/A') as VehicleRegistrationNo,
              IFNULL(v.VehicleCode, 'N/A') as VehicleCode,
              IFNULL(v.RCUpload, 'N/A') as RCUpload,
              IFNULL(v.VehicleChasisNo, 'N/A') as VehicleChasisNo,
              IFNULL(v.VehicleModel, 'N/A') as VehicleModel,
              IFNULL(v.TypeOfBody, 'N/A') as TypeOfBody,
              IFNULL(v.VehicleType, 'N/A') as VehicleType,
              IFNULL(DATE_FORMAT(v.VehicleRegistrationDate, '%Y-%m-%d'), 'N/A') as VehicleRegistrationDate,
              IFNULL(v.VehicleAge, 'N/A') as VehicleAge,
              IFNULL(v.VehicleKMS, 'N/A') as VehicleKMS,
              IFNULL(v.VehicleKMSPhoto, 'N/A') as VehicleKMSPhoto,
              IFNULL(v.VehiclePhoto, 'N/A') as VehiclePhoto,
              IFNULL(DATE_FORMAT(v.LastServicing, '%Y-%m-%d'), 'N/A') as LastServicing,
              IFNULL(v.ServiceBillPhoto, 'N/A') as ServiceBillPhoto,
              IFNULL(v.VehicleInsuranceCompany, 'N/A') as VehicleInsuranceCompany,
              IFNULL(DATE_FORMAT(v.VehicleInsuranceDate, '%Y-%m-%d'), 'N/A') as VehicleInsuranceDate,
              IFNULL(DATE_FORMAT(v.InsuranceExpiry, '%Y-%m-%d'), 'N/A') as VehicleInsuranceExpiry,
              IFNULL(v.InsuranceCopy, 'N/A') as InsuranceCopy,
              IFNULL(DATE_FORMAT(v.VehicleFitnessCertificateIssue, '%Y-%m-%d'), 'N/A') as VehicleFitnessCertificateIssue,
              IFNULL(DATE_FORMAT(v.FitnessExpiry, '%Y-%m-%d'), 'N/A') as VehicleFitnessCertificateExpiry,
              IFNULL(v.FitnessCertificateUpload, 'N/A') as FitnessCertificateUpload,
              IFNULL(DATE_FORMAT(v.VehiclePollutionDate, '%Y-%m-%d'), 'N/A') as VehiclePollutionDate,
              IFNULL(DATE_FORMAT(v.PollutionExpiry, '%Y-%m-%d'), 'N/A') as VehiclePollutionExpiry,
              IFNULL(v.PollutionPhoto, 'N/A') as PollutionPhoto,
              IFNULL(DATE_FORMAT(v.StateTaxIssue, '%Y-%m-%d'), 'N/A') as StateTaxIssue,
              IFNULL(DATE_FORMAT(v.StateTaxExpiry, '%Y-%m-%d'), 'N/A') as StateTaxExpiry,
              IFNULL(v.StateTaxPhoto, 'N/A') as StateTaxPhoto,
              IFNULL(v.VehicleLoadingCapacity, 'N/A') as VehicleLoadingCapacity,
              IFNULL(CASE WHEN v.GPS = 1 THEN 'Yes' ELSE 'No' END, 'N/A') as GPS,
              IFNULL(v.GPSCompany, 'N/A') as GPSCompany,
              IFNULL(v.NoEntryPass, 'N/A') as NoEntryPass,
              IFNULL(DATE_FORMAT(v.NoEntryPassExpiry, '%Y-%m-%d'), 'N/A') as NoEntryPassExpiry,
              IFNULL(v.NoEntryPassCopy, 'N/A') as NoEntryPassCopy,
              IFNULL(v.InsuranceInfo, 'N/A') as InsuranceInfo,
              IFNULL(v.Status, 'N/A') as Status,
              IFNULL(v.VendorID, 'N/A') as VendorID,
              IFNULL(vn.VendorName, 'N/A') as VendorName,
              IFNULL(vn.VendorCode, 'N/A') as VendorCode,
              IFNULL(vn.VendorMobileNo, 'N/A') as VendorMobileNo,
              IFNULL(vn.VendorAddress, 'N/A') as VendorAddress,
              IFNULL(vn.VendorAlternateNo, 'N/A') as VendorAlternateNo,
              IFNULL(vn.TypeOfCompany, 'N/A') as VendorTypeOfCompany,
              IFNULL(vn.CompanyName, 'N/A') as VendorCompanyName,
              IFNULL(vn.CompanyGST, 'N/A') as VendorCompanyGST,
              IFNULL(vn.VendorAadhar, 'N/A') as VendorAadhar,
              IFNULL(vn.VendorPAN, 'N/A') as VendorPAN,
              IFNULL(vn.BankDetails, 'N/A') as VendorBankDetails,
              IFNULL(DATE_FORMAT(v.CreatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as CreatedAt,
              IFNULL(DATE_FORMAT(v.UpdatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as UpdatedAt
            FROM vehicle v
            LEFT JOIN vendor vn ON v.VendorID = vn.VendorID
            ORDER BY v.VehicleID DESC
          `,
          filename: 'Vehicle_Master',
          columns: {
            'Vehicle ID': 'VehicleID',
            'Registration Number': 'VehicleRegistrationNo',
            'Vehicle Code': 'VehicleCode',
            'RC Upload': 'RCUpload',
            'Chassis Number': 'VehicleChasisNo',
            'Vehicle Model': 'VehicleModel',
            'Body Type': 'TypeOfBody',
            'Vehicle Type': 'VehicleType',
            'Registration Date': 'VehicleRegistrationDate',
            'Vehicle Age': 'VehicleAge',
            'Current KMS': 'VehicleKMS',
            'KMS Photo': 'VehicleKMSPhoto',
            'Vehicle Photo': 'VehiclePhoto',
            'Last Servicing': 'LastServicing',
            'Service Bill Photo': 'ServiceBillPhoto',
            'Insurance Company': 'VehicleInsuranceCompany',
            'Insurance Date': 'VehicleInsuranceDate',
            'Insurance Expiry': 'VehicleInsuranceExpiry',
            'Insurance Copy': 'InsuranceCopy',
            'Fitness Certificate Issue': 'VehicleFitnessCertificateIssue',
            'Fitness Certificate Expiry': 'VehicleFitnessCertificateExpiry',
            'Fitness Certificate Upload': 'FitnessCertificateUpload',
            'Pollution Date': 'VehiclePollutionDate',
            'Pollution Expiry': 'VehiclePollutionExpiry',
            'Pollution Photo': 'PollutionPhoto',
            'State Tax Issue': 'StateTaxIssue',
            'State Tax Expiry': 'StateTaxExpiry',
            'State Tax Photo': 'StateTaxPhoto',
            'Loading Capacity': 'VehicleLoadingCapacity',
            'GPS': 'GPS',
            'GPS Company': 'GPSCompany',
            'No Entry Pass': 'NoEntryPass',
            'No Entry Pass Expiry': 'NoEntryPassExpiry',
            'No Entry Pass Copy': 'NoEntryPassCopy',
            'Insurance Info': 'InsuranceInfo',
            'Status': 'Status',
            'Vendor ID': 'VendorID',
            'Vendor Name': 'VendorName',
            'Vendor Code': 'VendorCode',
            'Vendor Mobile': 'VendorMobileNo',
            'Vendor Address': 'VendorAddress',
            'Vendor Alternate No': 'VendorAlternateNo',
            'Vendor Company Type': 'VendorTypeOfCompany',
            'Vendor Company Name': 'VendorCompanyName',
            'Vendor Company GST': 'VendorCompanyGST',
            'Vendor Aadhar': 'VendorAadhar',
            'Vendor PAN': 'VendorPAN',
            'Vendor Bank Details': 'VendorBankDetails',
            'Created At': 'CreatedAt',
            'Updated At': 'UpdatedAt'
          }
        },

        // Vendors
        vendors: {
          query: `
            SELECT
              IFNULL(v.VendorID, 'N/A') as VendorID,
              IFNULL(v.VendorName, 'N/A') as VendorName,
              IFNULL(v.VendorCode, 'N/A') as VendorCode,
              IFNULL(v.VendorMobileNo, 'N/A') as VendorMobileNo,
              IFNULL(v.VendorAddress, 'N/A') as VendorAddress,
              IFNULL(v.VendorAlternateNo, 'N/A') as VendorAlternateNo,
              IFNULL(v.TypeOfCompany, 'N/A') as TypeOfCompany,
              IFNULL(v.CompanyName, 'N/A') as CompanyName,
              IFNULL(v.CompanyGST, 'N/A') as CompanyGST,
              IFNULL(v.VendorCompanyUdhyam, 'N/A') as VendorCompanyUdhyam,
              IFNULL(v.VendorCompanyPAN, 'N/A') as VendorCompanyPAN,
              IFNULL(DATE_FORMAT(v.StartDateOfCompany, '%Y-%m-%d'), 'N/A') as StartDateOfCompany,
              IFNULL(v.AddressOfCompany, 'N/A') as AddressOfCompany,
              IFNULL(v.VendorAadhar, 'N/A') as VendorAadhar,
              IFNULL(v.VendorPAN, 'N/A') as VendorPAN,
              IFNULL(v.BankDetails, 'N/A') as BankDetails,
              IFNULL(v.VendorPhoto, 'N/A') as VendorPhoto,
              IFNULL(v.VendorAadharDoc, 'N/A') as VendorAadharDoc,
              IFNULL(v.VendorPANDoc, 'N/A') as VendorPANDoc,
              IFNULL(v.VendorCompanyUdhyamDoc, 'N/A') as VendorCompanyUdhyamDoc,
              IFNULL(v.VendorCompanyPANDoc, 'N/A') as VendorCompanyPANDoc,
              IFNULL(v.VendorCompanyGSTDoc, 'N/A') as VendorCompanyGSTDoc,
              IFNULL(v.CompanyLegalDocs, 'N/A') as CompanyLegalDocs,
              IFNULL(v.BankChequeUpload, 'N/A') as BankChequeUpload,
              IFNULL(v.Status, 'N/A') as Status,
              IFNULL(DATE_FORMAT(v.CreatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as CreatedAt,
              IFNULL(DATE_FORMAT(v.UpdatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as UpdatedAt
            FROM vendor v
            ORDER BY v.VendorID DESC
          `,
          filename: 'Vendor_Master',
          columns: {
            'Vendor ID': 'VendorID',
            'Vendor Name': 'VendorName',
            'Vendor Code': 'VendorCode',
            'Mobile No': 'VendorMobileNo',
            'Address': 'VendorAddress',
            'Alternate No': 'VendorAlternateNo',
            'Company Type': 'TypeOfCompany',
            'Company Name': 'CompanyName',
            'GST No': 'CompanyGST',
            'Udhyam No': 'VendorCompanyUdhyam',
            'Company PAN': 'VendorCompanyPAN',
            'Company Start Date': 'StartDateOfCompany',
            'Company Address': 'AddressOfCompany',
            'Aadhar No': 'VendorAadhar',
            'PAN No': 'VendorPAN',
            'Bank Details': 'BankDetails',
            'Photo': 'VendorPhoto',
            'Aadhar Doc': 'VendorAadharDoc',
            'PAN Doc': 'VendorPANDoc',
            'Udhyam Doc': 'VendorCompanyUdhyamDoc',
            'Company PAN Doc': 'VendorCompanyPANDoc',
            'Company GST Doc': 'VendorCompanyGSTDoc',
            'Legal Docs': 'CompanyLegalDocs',
            'Bank Cheque': 'BankChequeUpload',
            'Status': 'Status',
            'Created At': 'CreatedAt',
            'Updated At': 'UpdatedAt'
          }
        },

        // Drivers
        drivers: {
          query: `
            SELECT
              IFNULL(d.DriverID, 'N/A') as DriverID,
              IFNULL(d.DriverName, 'N/A') as DriverName,
              IFNULL(d.DriverLicenceNo, 'N/A') as DriverLicenceNo,
              IFNULL(v.VendorName, 'N/A') as VendorName,
              IFNULL(v.VendorCode, 'N/A') as VendorCode,
              IFNULL(v.VendorMobileNo, 'N/A') as VendorMobile,
              IFNULL(v.VendorAddress, 'N/A') as VendorAddress,
              IFNULL(d.DriverMobileNo, 'N/A') as DriverMobileNo,
              IFNULL(d.DriverAddress, 'N/A') as DriverAddress,
              IFNULL(DATE_FORMAT(d.MedicalDate, '%Y-%m-%d'), 'N/A') as MedicalDate,
              IFNULL(DATE_FORMAT(d.LicenceExpiry, '%Y-%m-%d'), 'N/A') as LicenceExpiry,
              IFNULL(d.Status, 'N/A') as Status,
              IFNULL(d.DriverSameAsVendor, 'N/A') as DriverSameAsVendor,
              IFNULL(d.DriverAlternateNo, 'N/A') as DriverAlternateNo,
              IFNULL(DATE_FORMAT(d.DriverLicenceIssueDate, '%Y-%m-%d'), 'N/A') as DriverLicenceIssueDate,
              IFNULL(d.DriverTotalExperience, 'N/A') as DriverTotalExperience,
              IFNULL(d.DriverPhoto, 'N/A') as DriverPhoto,
              IFNULL(DATE_FORMAT(d.CreatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as CreatedAt,
              IFNULL(DATE_FORMAT(d.UpdatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as UpdatedAt
            FROM driver d
            LEFT JOIN vendor v ON d.VendorID = v.VendorID
            ORDER BY d.DriverID DESC
          `,
          filename: 'Driver_Master',
          columns: {
            'Driver ID': 'DriverID',
            'Driver Name': 'DriverName',
            'License No': 'DriverLicenceNo',
            'Vendor Name': 'VendorName',
            'Vendor Code': 'VendorCode',
            'Vendor Mobile': 'VendorMobile',
            'Vendor Address': 'VendorAddress',
            'Mobile No': 'DriverMobileNo',
            'Address': 'DriverAddress',
            'Medical Date': 'MedicalDate',
            'License Expiry': 'LicenceExpiry',
            'Status': 'Status',
            'Same as Vendor': 'DriverSameAsVendor',
            'Alternate No': 'DriverAlternateNo',
            'License Issue Date': 'DriverLicenceIssueDate',
            'Total Experience': 'DriverTotalExperience',
            'Photo': 'DriverPhoto',
            'Created At': 'CreatedAt',
            'Updated At': 'UpdatedAt'
          }
        },

        // Customers
        customers: {
          query: `
        SELECT
          IFNULL(CustomerID, 'N/A') as CustomerID,
          IFNULL(Name, 'N/A') as Name,
          IFNULL(CustomerCode, 'N/A') as CustomerCode,
          IFNULL(CustomerMobileNo, 'N/A') as CustomerMobileNo,
          IFNULL(AlternateMobileNo, 'N/A') as AlternateMobileNo,
          IFNULL(CustomerGroup, 'N/A') as CustomerGroup,
          IFNULL(ServiceCode, 'N/A') as ServiceCode,
          IFNULL(TypeOfServices, 'N/A') as TypeOfServices,
          IFNULL(CityName, 'N/A') as CityName,
          CONCAT(
            IFNULL(HouseFlatNo, ''),
            CASE WHEN HouseFlatNo IS NOT NULL AND StreetLocality IS NOT NULL THEN ', ' ELSE '' END,
            IFNULL(StreetLocality, ''),
            CASE WHEN (HouseFlatNo IS NOT NULL OR StreetLocality IS NOT NULL) AND CustomerCity IS NOT NULL THEN ', ' ELSE '' END,
            IFNULL(CustomerCity, ''),
            CASE WHEN (HouseFlatNo IS NOT NULL OR StreetLocality IS NOT NULL OR CustomerCity IS NOT NULL) AND CustomerState IS NOT NULL THEN ', ' ELSE '' END,
            IFNULL(CustomerState, ''),
            CASE WHEN (HouseFlatNo IS NOT NULL OR StreetLocality IS NOT NULL OR CustomerCity IS NOT NULL OR CustomerState IS NOT NULL) AND CustomerPinCode IS NOT NULL THEN ' - ' ELSE '' END,
            IFNULL(CustomerPinCode, ''),
            CASE WHEN (HouseFlatNo IS NOT NULL OR StreetLocality IS NOT NULL OR CustomerCity IS NOT NULL OR CustomerState IS NOT NULL OR CustomerPinCode IS NOT NULL) AND CustomerCountry IS NOT NULL THEN ', ' ELSE '' END,
            IFNULL(CustomerCountry, '')
          ) as Address,
          IFNULL(TypeOfBilling, 'N/A') as TypeOfBilling,
          IFNULL(DATE_FORMAT(CreatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as CreatedAt,
          IFNULL(DATE_FORMAT(UpdatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as UpdatedAt,
          IFNULL(Locations, 'N/A') as Locations,
          IFNULL(CustomerSite, 'N/A') as CustomerSite,
          IFNULL(Agreement, 'N/A') as Agreement,
          IFNULL(AgreementFile, 'N/A') as AgreementFile,
          IFNULL(DATE_FORMAT(AgreementDate, '%Y-%m-%d'), 'N/A') as AgreementDate,
          IFNULL(AgreementTenure, 'N/A') as AgreementTenure,
          IFNULL(DATE_FORMAT(AgreementExpiryDate, '%Y-%m-%d'), 'N/A') as AgreementExpiryDate,
          IFNULL(CustomerNoticePeriod, 'N/A') as CustomerNoticePeriod,
          IFNULL(CogentNoticePeriod, 'N/A') as CogentNoticePeriod,
          IFNULL(CreditPeriod, 'N/A') as CreditPeriod,
          IFNULL(Insurance, 'N/A') as Insurance,
          IFNULL(MinimumInsuranceValue, 'N/A') as MinimumInsuranceValue,
          IFNULL(CogentDebitClause, 'N/A') as CogentDebitClause,
          IFNULL(CogentDebitLimit, 'N/A') as CogentDebitLimit,
          IFNULL(BG, 'N/A') as BG,
          IFNULL(BGFile, 'N/A') as BGFile,
          IFNULL(BGAmount, 'N/A') as BGAmount,
          IFNULL(DATE_FORMAT(BGDate, '%Y-%m-%d'), 'N/A') as BGDate,
          IFNULL(DATE_FORMAT(BGExpiryDate, '%Y-%m-%d'), 'N/A') as BGExpiryDate,
          IFNULL(BGBank, 'N/A') as BGBank,
          IFNULL(BGReceivingByCustomer, 'N/A') as BGReceivingByCustomer,
          IFNULL(BGReceivingFile, 'N/A') as BGReceivingFile,
          IFNULL(PO, 'N/A') as PO,
          IFNULL(POFile, 'N/A') as POFile,
          IFNULL(POValue, 'N/A') as POValue,
          IFNULL(POTenure, 'N/A') as POTenure,
          IFNULL(DATE_FORMAT(POExpiryDate, '%Y-%m-%d'), 'N/A') as POExpiryDate,
          IFNULL(Rates, 'N/A') as Rates,
          IFNULL(YearlyEscalationClause, 'N/A') as YearlyEscalationClause,
          IFNULL(GSTNo, 'N/A') as GSTNo
        FROM customer
        ORDER BY CustomerID DESC
          `,
          filename: 'Customer_Master',
          columns: {
            'Customer ID': 'CustomerID',
            'Name': 'Name',
            'Customer Code': 'CustomerCode',
            'Mobile No': 'CustomerMobileNo',
            'Alternate Mobile': 'AlternateMobileNo',
            'Customer Group': 'CustomerGroup',
            'Service Code': 'ServiceCode',
            'Services': 'TypeOfServices',
            'City': 'CityName',
            'Address': 'Address',
            'Billing Type': 'TypeOfBilling',
            'Created At': 'CreatedAt',
            'Updated At': 'UpdatedAt',
            'Locations': 'Locations',
            'Customer Site': 'CustomerSite',
            'Agreement': 'Agreement',
            'Agreement File': 'AgreementFile',
            'Agreement Date': 'AgreementDate',
            'Agreement Tenure': 'AgreementTenure',
            'Agreement Expiry': 'AgreementExpiryDate',
            'Customer Notice Period': 'CustomerNoticePeriod',
            'Cogent Notice Period': 'CogentNoticePeriod',
            'Credit Period': 'CreditPeriod',
            'Insurance': 'Insurance',
            'Min Insurance Value': 'MinimumInsuranceValue',
            'Debit Clause': 'CogentDebitClause',
            'Debit Limit': 'CogentDebitLimit',
            'BG': 'BG',
            'BG File': 'BGFile',
            'BG Amount': 'BGAmount',
            'BG Date': 'BGDate',
            'BG Expiry': 'BGExpiryDate',
            'BG Bank': 'BGBank',
            'BG Receiving By Customer': 'BGReceivingByCustomer',
            'BG Receiving File': 'BGReceivingFile',
            'PO': 'PO',
            'PO File': 'POFile',
            'PO Value': 'POValue',
            'PO Tenure': 'POTenure',
            'PO Expiry': 'POExpiryDate',
            'Rates': 'Rates',
            'Escalation Clause': 'YearlyEscalationClause',
            'GST No': 'GSTNo',
            'MIS Format': 'MISFormat',
            'KPI SLA': 'KPISLA',
            'Performance Report': 'PerformanceReport'
          }
        },

        // Projects
        projects: {
          query: `
            SELECT
              IFNULL(p.ProjectID, 'N/A') as ProjectID,
              IFNULL(p.ProjectName, 'N/A') as ProjectName,
              IFNULL(c.Name, 'N/A') as CustomerName,
              IFNULL(c.CustomerCode, 'N/A') as CustomerCode,
              IFNULL(p.CustomerID, 'N/A') as CustomerID,
              IFNULL(p.ProjectCode, 'N/A') as ProjectCode,
              IFNULL(p.ProjectDescription, 'N/A') as ProjectDescription,
              IFNULL(p.ProjectValue, 'N/A') as ProjectValue,
              IFNULL(DATE_FORMAT(p.StartDate, '%Y-%m-%d'), 'N/A') as StartDate,
              IFNULL(DATE_FORMAT(p.EndDate, '%Y-%m-%d'), 'N/A') as EndDate,
              IFNULL(p.Status, 'N/A') as Status,
              IFNULL(DATE_FORMAT(p.CreatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as CreatedAt,
              IFNULL(DATE_FORMAT(p.UpdatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as UpdatedAt
            FROM project p
            LEFT JOIN customer c ON p.CustomerID = c.CustomerID
            ORDER BY p.ProjectID DESC
          `,
          filename: 'Project_Master',
          columns: {
            'Project ID': 'ProjectID',
            'Project Name': 'ProjectName',
            'Customer': 'CustomerName',
            'Customer Code': 'CustomerCode',
            'Customer ID': 'CustomerID',
            'Project Code': 'ProjectCode',
            'Description': 'ProjectDescription',
            'Project Value': 'ProjectValue',
            'Start Date': 'StartDate',
            'End Date': 'EndDate',
            'Status': 'Status',
            'Created At': 'CreatedAt',
            'Updated At': 'UpdatedAt'
          }
        },

        // Billing
        billing: {
          query: `
            SELECT
              IFNULL(b.BillingID, 'N/A') as BillingID,
              IFNULL(b.InvoiceNo, 'N/A') as InvoiceNo,
              IFNULL(DATE_FORMAT(b.InvoiceDate, '%Y-%m-%d'), 'N/A') as InvoiceDate,
              IFNULL(DATE_FORMAT(b.BillingPeriodStart, '%Y-%m-%d'), 'N/A') as BillingPeriodStart,
              IFNULL(DATE_FORMAT(b.BillingPeriodEnd, '%Y-%m-%d'), 'N/A') as BillingPeriodEnd,
              IFNULL(b.CustomerID, 'N/A') as CustomerID,
              IFNULL(c.Name, 'N/A') as CustomerName,
              IFNULL(c.CustomerCode, 'N/A') as CustomerCode,
              IFNULL(b.ProjectID, 'N/A') as ProjectID,
              IFNULL(p.ProjectName, 'N/A') as ProjectName,
              IFNULL(b.TotalTransactions, 'N/A') as TotalTransactions,
              IFNULL(b.TotalAmount, 'N/A') as TotalAmount,
              IFNULL(b.GSTRate, 'N/A') as GSTRate,
              IFNULL(b.GSTAmount, 'N/A') as GSTAmount,
              IFNULL(b.GrandTotal, 'N/A') as GrandTotal,
              IFNULL(b.PaymentStatus, 'N/A') as PaymentStatus,
              IFNULL(DATE_FORMAT(b.DueDate, '%Y-%m-%d'), 'N/A') as DueDate,
              IFNULL(DATE_FORMAT(b.CreatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as CreatedAt,
              IFNULL(DATE_FORMAT(b.UpdatedAt, '%Y-%m-%d %H:%i:%s'), 'N/A') as UpdatedAt
            FROM Billing b
            LEFT JOIN Customer c ON b.CustomerID = c.CustomerID
            LEFT JOIN Project p ON b.ProjectID = p.ProjectID
            ORDER BY b.BillingID DESC
          `,
          filename: 'Billing_Records',
          columns: {
            'Billing ID': 'BillingID',
            'Invoice No': 'InvoiceNo',
            'Invoice Date': 'InvoiceDate',
            'Period Start': 'BillingPeriodStart',
            'Period End': 'BillingPeriodEnd',
            'Customer ID': 'CustomerID',
            'Customer': 'CustomerName',
            'Customer Code': 'CustomerCode',
            'Project ID': 'ProjectID',
            'Project': 'ProjectName',
            'Total Transactions': 'TotalTransactions',
            'Total Amount': 'TotalAmount',
            'GST Rate': 'GSTRate',
            'GST Amount': 'GSTAmount',
            'Grand Total': 'GrandTotal',
            'Payment Status': 'PaymentStatus',
            'Due Date': 'DueDate',
            'Created At': 'CreatedAt',
            'Updated At': 'UpdatedAt'
          }
        }
      };

      const config = entityConfigs[entity];
      if (!config) {
        return res.status(400).json({ error: 'Invalid entity specified' });
      }

      // Prepare base query for filtering (ID and date filtering handled by buildWhereClause)
      let finalQuery = config.query;

      // Date filtering is now handled by buildWhereClause helper function
      // Update filename to include date range if provided
      if (fromDate && toDate) {
        filename = `${config.filename}_${fromDate}_to_${toDate}`;
      } else if (fromDate) {
        filename = `${config.filename}_from_${fromDate}`;
      } else if (toDate) {
        filename = `${config.filename}_to_${toDate}`;
      }

      // Build WHERE clause using helper function
      const { query: queryWithFilters, params: filterParams } = buildWhereClause(finalQuery, {
        entity,
        id,
        fromDate,
        toDate,
        limit: limit ? parseInt(limit) : null,
        offset: offset ? parseInt(offset) : null
      });

      // Execute query with filters
      const [rows] = await pool.query(queryWithFilters, filterParams);

      // Debug: Log the number of columns returned
      if (rows.length > 0) {
        console.log(`🔍 Export Debug - Entity: ${entity}`);
        console.log(`🔍 Export Debug - Columns returned: ${Object.keys(rows[0]).length}`);
        console.log(`🔍 Export Debug - Column names: ${Object.keys(rows[0]).join(', ')}`);
      }

      // Replace NULL values with 'N/A' for all data
      data = rows.map(row => {
        const cleanedRow = {};
        Object.keys(row).forEach(key => {
          cleanedRow[key] = row[key] === null || row[key] === undefined ? 'N/A' : row[key];
        });
        return cleanedRow;
      });

      columns = config.columns;
      filename = config.filename;

      if (data.length === 0) {
        return res.status(404).json({ error: 'No data found to export' });
      }

      // Log export activity
      logExportActivity(req, entity, data.length, filename, format);

      // Handle CSV format
      if (format.toLowerCase() === 'csv') {
        const csvContent = generateCSV(data, columns);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const fullFilename = `${sanitizeFilename(filename)}_${timestamp}.csv`;

        res.setHeader('Content-Disposition', `attachment; filename="${fullFilename}"`);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

        return res.send(csvContent);
      }

      // Process data for Excel
      const excelData = data.map(row => {
        const processedRow = {};

        if (typeof columns === 'object' && columns !== null) {
          Object.entries(columns).forEach(([excelHeader, dbField]) => {
            let value = row[dbField];

            // Handle null/undefined values
            if (value === null || value === undefined) {
              value = '';
            }

            // Convert boolean values
            if (typeof value === 'boolean') {
              value = value ? 'Yes' : 'No';
            }

            // Handle dates
            if (value instanceof Date) {
              value = value.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            }

            // Handle numbers that might be strings
            if (dbField.includes('Amount') || dbField.includes('Value') || dbField.includes('KM')) {
              if (value !== '' && !isNaN(value)) {
                value = parseFloat(value);
              }
            }

            processedRow[excelHeader] = value;
          });
        }

        return processedRow;
      });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Auto-size columns
      const columnWidths = Object.keys(columns || {}).map(header => ({
        wch: Math.max(header.length, 15)
      }));
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

      // Generate buffer
      const buffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'buffer',
        bookSST: false
      });

      // Set response headers
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fullFilename = `${sanitizeFilename(filename)}_${timestamp}.xlsx`;

      res.setHeader('Content-Disposition', `attachment; filename="${fullFilename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', buffer.length);

      // Send file
      res.send(buffer);

    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ 
        error: 'Failed to export data',
        details: error.message 
      });
    }
  });

  // Get available entities for export
  router.get('/', (req, res) => {
    const availableEntities = [
      { key: 'transactions', name: 'Vehicle Transactions', description: 'All transaction records with related data' },
      { key: 'vehicles', name: 'Vehicle Master', description: 'Complete vehicle information' },
      { key: 'vendors', name: 'Vendor Master', description: 'Vendor details and information' },
      { key: 'drivers', name: 'Driver Master', description: 'Driver information and licenses' },
      { key: 'customers', name: 'Customer Master', description: 'Customer details and agreements' },
      { key: 'projects', name: 'Project Master', description: 'Project information' },
      { key: 'billing', name: 'Billing Records', description: 'Invoice and billing data' }
    ];

    res.json({
      message: 'Available entities for export',
      entities: availableEntities,
      usage: 'GET /export/{entity}?format=xlsx'
    });
  });

  return router;
};
