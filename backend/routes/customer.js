const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { validateModule, sanitizeData } = require('../utils/validation');
const uploadsManager = require('../utils/uploadsManager');

// Configure multer for file uploads using external directory
const { createUploadMiddleware } = require('../utils/uploadMiddleware');

// Configure multer using shared middleware
const upload = createUploadMiddleware('customers');

const validateDateSequence = (customerData) => {
  const errors = [];

  const checkDates = (startDateField, expiryDateField, errorMsg) => {
    const startDate = customerData[startDateField];
    const expiryDate = customerData[expiryDateField];

    if (startDate && expiryDate && new Date(expiryDate) < new Date(startDate)) {
      errors.push(errorMsg);
    }
  };

  checkDates('AgreementDate', 'AgreementExpiryDate', 'Agreement Expiry Date cannot be before Agreement Date');
  checkDates('BGDate', 'BGExpiryDate', 'BG Expiry Date cannot be before BG Date');
  checkDates('PODate', 'POExpiryDate', 'PO Expiry Date cannot be before PO Date');

  return errors;
};

// Helper to sanitize numeric values for database (converts empty strings to null)
const sanitizeInt = (val) => {
  if (val === undefined || val === null || val === '') return null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
};

const sanitizeFloat = (val) => {
  if (val === undefined || val === null || val === '') return null;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? null : parsed;
};

const sanitizeDate = (val) => {
  if (!val || val === '' || val === 'undefined' || val === 'null') return null;
  // If it's an ISO datetime string, extract just the date part for DATE columns
  if (typeof val === 'string' && val.includes('T')) {
    return val.split('T')[0];
  }
  return val;
};

module.exports = (pool) => {
  // Get customers for dropdown (simplified data)
  router.get('/dropdown', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          CustomerID as customer_id,
          COALESCE(Name, 'Unknown') as company_name,
          COALESCE(CustomerCode, '') as customer_code
        FROM Customer 
        ORDER BY Name ASC
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching customers for dropdown:', error);
      if (error.code === 'ECONNREFUSED') {
        res.status(503).json({ error: 'Unable to connect to database. Please try again later.' });
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        res.status(503).json({ error: 'Database access denied. Please contact support.' });
      } else {
        res.status(500).json({ error: 'Unable to load customer list. Please refresh the page and try again.' });
      }
    }
  });

  // Helper function to add file URLs to customer data
  const addFileUrls = (customer) => {
    const baseUrl = '/api/customers/files/';

    const getUrl = (filePath) => {
      if (!filePath) return null;
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
      }

      const filename = filePath.includes('/') || filePath.includes('\\')
        ? filePath.split(/[\/\\]/).pop()
        : filePath;
      return baseUrl + filename;
    };

    if (customer.AgreementFile) customer.AgreementFileUrl = getUrl(customer.AgreementFile);
    if (customer.BGFile) customer.BGFileUrl = getUrl(customer.BGFile);
    if (customer.BGReceivingFile) customer.BGReceivingFileUrl = getUrl(customer.BGReceivingFile);
    if (customer.POFile) customer.POFileUrl = getUrl(customer.POFile);
    if (customer.RatesAnnexureFile) customer.RatesAnnexureFileUrl = getUrl(customer.RatesAnnexureFile);
    if (customer.MISFormatFile) customer.MISFormatFileUrl = getUrl(customer.MISFormatFile);
    if (customer.KPISLAFile) customer.KPISLAFileUrl = getUrl(customer.KPISLAFile);
    if (customer.PerformanceReportFile) customer.PerformanceReportFileUrl = getUrl(customer.PerformanceReportFile);

    return customer;
  };

  // Get all customers with optional date filtering
  // This route retrieves all customer records from the database.
  // It responds with a JSON array of customer objects ordered by latest first.
  // Supports date filtering via fromDate and toDate query parameters.
  router.get('/', async (req, res) => {
    try {
      const { fromDate, toDate } = req.query;

      // Build date filter conditions
      let dateFilter = '';
      let dateParams = [];

      if (fromDate && toDate) {
        dateFilter = 'WHERE DATE(CreatedAt) BETWEEN ? AND ?';
        dateParams = [fromDate, toDate];
        console.log('🗓️ Backend: Applying customer CreatedAt date filter from', fromDate, 'to', toDate);
      } else if (fromDate) {
        dateFilter = 'WHERE DATE(CreatedAt) >= ?';
        dateParams = [fromDate];
        console.log('🗓️ Backend: Applying customer CreatedAt date filter from', fromDate);
      } else if (toDate) {
        dateFilter = 'WHERE DATE(CreatedAt) <= ?';
        dateParams = [toDate];
        console.log('🗓️ Backend: Applying customer CreatedAt date filter to', toDate);
      }

      const query = `SELECT * FROM Customer ${dateFilter} ORDER BY CreatedAt DESC, CustomerID DESC`;
      const [rows] = await pool.query(query, dateParams);

      console.log('🔍 Backend: Found', rows.length, 'customers with date filter');

      // Add file URLs to each customer
      const customersWithFileUrls = rows.map(customer => addFileUrls(customer));

      res.json(customersWithFileUrls);
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (error.code === 'ECONNREFUSED') {
        res.status(503).json({ error: 'Unable to connect to database. Please try again later.' });
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        res.status(503).json({ error: 'Database access denied. Please contact support.' });
      } else {
        res.status(500).json({ error: 'Unable to load customers. Please refresh the page and try again.' });
      }
    }
  });

  // Get a single customer by ID
  // This route retrieves a specific customer record based on the provided ID.
  // It responds with a JSON object of the customer if found, or a 404 error if not found.
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await pool.query('SELECT * FROM Customer WHERE CustomerID = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Fetch related contact data
      const [officeAddresses] = await pool.query('SELECT * FROM customer_office_address WHERE CustomerID = ?', [id]);
      const [keyContacts] = await pool.query('SELECT * FROM customer_key_contact WHERE CustomerID = ?', [id]);
      const [cogentContacts] = await pool.query('SELECT * FROM customer_cogent_contact WHERE CustomerID = ?', [id]);

      // Parse Address field from JSON string back to object for office addresses
      const parsedOfficeAddresses = officeAddresses.map(address => {
        if (address.Address && typeof address.Address === 'string') {
          try {
            // Try to parse as JSON first
            address.Address = JSON.parse(address.Address);
          } catch (e) {
            // If parsing fails, check if it's a comma-separated string from old format
            const addressStr = address.Address.trim();
            if (addressStr.includes(',')) {
              // Try to parse comma-separated address string
              const parts = addressStr.split(',').map(part => part.trim()).filter(part => part);
              address.Address = {
                house_flat_no: parts[0] || '',
                street_locality: parts[1] || '',
                city: parts[2] || '',
                state: parts[3] || '',
                pin_code: parts[4] || '',
                country: parts[5] || 'India'
              };
            } else {
              // Single string, put in street_locality
              address.Address = {
                house_flat_no: '',
                street_locality: addressStr,
                city: '',
                state: '',
                pin_code: '',
                country: 'India'
              };
            }
          }
        }
        return address;
      });

      // Parse Address field from JSON string back to object for key contacts
      const parsedKeyContacts = keyContacts.map(contact => {
        if (contact.Address && typeof contact.Address === 'string') {
          try {
            // Try to parse as JSON first
            contact.Address = JSON.parse(contact.Address);
          } catch (e) {
            // If parsing fails, check if it's a comma-separated string from old format
            const addressStr = contact.Address.trim();
            if (addressStr.includes(',')) {
              // Try to parse comma-separated address string
              const parts = addressStr.split(',').map(part => part.trim()).filter(part => part);
              contact.Address = {
                house_flat_no: parts[0] || '',
                street_locality: parts[1] || '',
                city: parts[2] || '',
                state: parts[3] || '',
                pin_code: parts[4] || '',
                country: parts[5] || 'India'
              };
            } else {
              // Single string, put in street_locality
              contact.Address = {
                house_flat_no: '',
                street_locality: addressStr,
                city: '',
                state: '',
                pin_code: '',
                country: 'India'
              };
            }
          }
        }
        return contact;
      });

      // Add file URLs to the customer data
      const customerWithFileUrls = addFileUrls(rows[0]);

      res.json({
        ...customerWithFileUrls,
        CustomerOfficeAddress: parsedOfficeAddresses,
        CustomerKeyContact: parsedKeyContacts,
        CustomerCogentContact: cogentContacts.length > 0 ? cogentContacts[0] : null
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      if (error.code === 'ECONNREFUSED') {
        res.status(503).json({ error: 'Unable to connect to database. Please try again later.' });
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        res.status(503).json({ error: 'Database access denied. Please contact support.' });
      } else {
        res.status(500).json({ error: 'Unable to load customer details. Please try again.' });
      }
    }
  });

  // Helper function to generate customer code abbreviation
  const generateCustomerAbbreviation = (name, maxLength = 3) => {
    if (!name || name.trim() === '') return 'CUS';

    // Remove common words and get meaningful parts
    const cleanName = name
      .replace(/\b(Ltd|Limited|Pvt|Private|Company|Corp|Corporation|Inc|Incorporated|LLC|LLP)\b/gi, '')
      .replace(/\b(The|And|Of|For|In|On|At|By|With)\b/gi, '')
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .trim();

    // Split into words and take first letters
    const words = cleanName.split(/\s+/).filter(word => word.length > 0);

    if (words.length === 0) {
      return 'CUS'; // Fallback if no valid characters remain
    } else if (words.length === 1) {
      // Single word - take first few characters
      return words[0].substring(0, maxLength).toUpperCase();
    } else if (words.length <= maxLength) {
      // Multiple words - take first letter of each
      return words.map(word => word.charAt(0)).join('').toUpperCase();
    } else {
      // Too many words - take first letter of first few words
      return words.slice(0, maxLength).map(word => word.charAt(0)).join('').toUpperCase();
    }
  };

  // Create a new customer
  // This route creates a new customer record in the database using the data provided in the request body.
  // It responds with a 201 status code and the newly created customer's data, including the generated ID.
  router.post('/', upload.fields([
    { name: 'AgreementFile', maxCount: 1 },
    { name: 'BGFile', maxCount: 1 },
    { name: 'BGReceivingFile', maxCount: 1 },
    { name: 'POFile', maxCount: 1 },
    { name: 'RatesAnnexureFile', maxCount: 1 },
    { name: 'MISFormatFile', maxCount: 1 },
    { name: 'KPISLAFile', maxCount: 1 },
    { name: 'PerformanceReportFile', maxCount: 1 }
  ]), async (req, res) => {
    const customer = req.body;
    const files = req.files;

    console.log('🚀 POST /api/customers - Start processing');
    console.log('📦 Body fields:', Object.keys(customer));
    console.log('📂 Files received:', Object.keys(files || {}));

    // Map frontend field names to backend database column names (only for top-level customer fields)
    // IMPORTANT: Only map top-level customer fields, not nested contact address fields
    if (customer.pin_code && typeof customer.pin_code === 'string') customer.CustomerPinCode = customer.pin_code;
    if (customer.house_flat_no && typeof customer.house_flat_no === 'string') customer.HouseFlatNo = customer.house_flat_no;
    if (customer.street_locality && typeof customer.street_locality === 'string') customer.StreetLocality = customer.street_locality;
    if (customer.city && typeof customer.city === 'string') customer.CustomerCity = customer.city;
    if (customer.state && typeof customer.state === 'string') customer.CustomerState = customer.state;
    if (customer.country && typeof customer.country === 'string') customer.CustomerCountry = customer.country;

    // Handle new contact structure
    if (customer.PrimaryContact && typeof customer.PrimaryContact === 'string') {
      try {
        const primaryContact = JSON.parse(customer.PrimaryContact);
        // Map primary contact fields to existing database fields
        customer.CustomerMobileNo = primaryContact.CustomerMobileNo || null;
        customer.AlternateMobileNo = primaryContact.AlternateMobileNo || null;
        customer.CustomerEmail = primaryContact.CustomerEmail || null;
        customer.CustomerContactPerson = primaryContact.CustomerContactPerson || null;
        customer.CustomerGroup = primaryContact.CustomerGroup || null;
      } catch (e) {
        console.warn('Error parsing PrimaryContact:', e);
      }
    }

    if (customer.AdditionalContacts && typeof customer.AdditionalContacts === 'string') {
      try {
        const additionalContacts = JSON.parse(customer.AdditionalContacts);
        // Split into office addresses and key contacts
        customer.CustomerOfficeAddress = additionalContacts.filter(c => c.ContactType === 'Office Address');
        customer.CustomerKeyContact = additionalContacts.filter(c => c.ContactType === 'Key Contact');
      } catch (e) {
        console.warn('Error parsing AdditionalContacts:', e);
      }
    }

    // Handle legacy contact structure (for backward compatibility)
    if (customer.CustomerOfficeAddress && typeof customer.CustomerOfficeAddress === 'string') {
      customer.CustomerOfficeAddress = JSON.parse(customer.CustomerOfficeAddress);
    }
    if (customer.CustomerKeyContact && typeof customer.CustomerKeyContact === 'string') {
      customer.CustomerKeyContact = JSON.parse(customer.CustomerKeyContact);
    }
    if (customer.CustomerCogentContact && typeof customer.CustomerCogentContact === 'string') {
      customer.CustomerCogentContact = JSON.parse(customer.CustomerCogentContact);
    }

    const dateErrors = validateDateSequence(customer);
    if (dateErrors.length > 0) {
      console.warn('⚠️ Date validation failed:', dateErrors);
      return res.status(400).json({ errors: dateErrors });
    }

    try {
      // Generate CustomerCode automatically if not provided
      let customerCode = customer.CustomerCode;
      if (!customerCode || customerCode.trim() === '') {
        // Combine both Master Customer Name and Company Name for code generation
        const masterName = (customer.MasterCustomerName || '').trim();
        const companyName = (customer.Name || '').trim();

        let combinedName = '';
        if (masterName && companyName) {
          combinedName = `${masterName} ${companyName}`;
        } else if (masterName) {
          combinedName = masterName;
        } else if (companyName) {
          combinedName = companyName;
        } else {
          combinedName = 'Customer'; // fallback
        }

        const namePrefix = generateCustomerAbbreviation(combinedName, 3);
        let nextNumber = 1;

        // Find the highest existing customer code number with the same prefix
        const [rows] = await pool.query(
          'SELECT CustomerCode FROM Customer WHERE CustomerCode LIKE ?',
          [`${namePrefix}%`]
        );

        let maxNum = 0;
        if (rows.length > 0) {
          rows.forEach(row => {
            const code = row.CustomerCode;
            const numPart = code.substring(namePrefix.length);
            const num = parseInt(numPart, 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          });
        }
        nextNumber = maxNum + 1;

        customerCode = `${namePrefix}${String(nextNumber).padStart(3, '0')}`;

        // Double-check that this code doesn't exist (safety check)
        let [existingCheck] = await pool.query(
          'SELECT CustomerID FROM Customer WHERE CustomerCode = ?',
          [customerCode]
        );

        // If somehow it still exists, keep incrementing until we find a free one
        let attempts = 0;
        while (existingCheck.length > 0 && attempts < 100) {
          nextNumber++;
          customerCode = `${namePrefix}${String(nextNumber).padStart(3, '0')}`;
          [existingCheck] = await pool.query(
            'SELECT CustomerID FROM Customer WHERE CustomerCode = ?',
            [customerCode]
          );
          attempts++;
        }

        // Fallback if we can't find a unique code
        if (existingCheck.length > 0) {
          const timestamp = Date.now().toString().slice(-6);
          customerCode = `${namePrefix}${timestamp}`;
        }
      }

      // Handle file paths - store relative paths or Azure URLs for database
      const filePaths = {};
      const getStoragePath = (fileArray, entityType) => {
        if (!fileArray || !fileArray[0]) return null;
        const file = fileArray[0];
        // if it's a URL (Azure), return it. Else compute relative path.
        if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
          return file.path;
        }
        return uploadsManager.getRelativePath(entityType, file.filename);
      };

      if (files) {
        if (files.AgreementFile) filePaths.AgreementFile = getStoragePath(files.AgreementFile, 'customers');
        if (files.BGFile) filePaths.BGFile = getStoragePath(files.BGFile, 'customers');
        if (files.BGReceivingFile) filePaths.BGReceivingFile = getStoragePath(files.BGReceivingFile, 'customers');
        if (files.POFile) filePaths.POFile = getStoragePath(files.POFile, 'customers');
        if (files.RatesAnnexureFile) filePaths.RatesAnnexureFile = getStoragePath(files.RatesAnnexureFile, 'customers');
        if (files.MISFormatFile) filePaths.MISFormatFile = getStoragePath(files.MISFormatFile, 'customers');
        if (files.KPISLAFile) filePaths.KPISLAFile = getStoragePath(files.KPISLAFile, 'customers');
        if (files.PerformanceReportFile) filePaths.PerformanceReportFile = getStoragePath(files.PerformanceReportFile, 'customers');
      }

      // Verify uploaded files exist and are accessible
      const uploadedFiles = Object.values(filePaths).filter(Boolean);
      for (const filePath of uploadedFiles) {
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          continue; // Skip verification for Azure URLs
        }
        const fullPath = uploadsManager.getFullPath(filePath);
        if (!fs.existsSync(fullPath)) {
          console.error('❌ Uploaded customer file not found:', fullPath);
          // Don't fail the whole request if it's just a file check issue, but log it
          // return res.status(500).json({ error: 'File upload failed - file not accessible' });
        } else {
          console.log('✅ Verified uploaded customer file:', filePath);
        }
      }

      console.log('📝 Preparing main Customer insert with code:', customerCode);

      const insertQuery = `INSERT INTO Customer (
        \`MasterCustomerName\`, \`Name\`, \`CustomerCode\`, \`CustomerMobileNo\`, \`CustomerEmail\`, \`CustomerContactPerson\`, \`AlternateMobileNo\`, \`CustomerGroup\`, \`ServiceCode\`, \`TypeOfServices\`, \`CityName\`, \`HouseFlatNo\`, \`StreetLocality\`, \`CustomerCity\`, \`CustomerState\`, \`CustomerPinCode\`, \`CustomerCountry\`, \`TypeOfBilling\`, \`CreatedAt\`, \`UpdatedAt\`, \`Locations\`, \`CustomerSite\`, \`Agreement\`, \`AgreementFile\`, \`AgreementDate\`, \`AgreementTenure\`, \`AgreementExpiryDate\`, \`CustomerNoticePeriod\`, \`CogentNoticePeriod\`, \`CreditPeriod\`, \`Insurance\`, \`MinimumInsuranceValue\`, \`CogentDebitClause\`, \`CogentDebitLimit\`, \`BG\`, \`BGFile\`, \`BGAmount\`, \`BGDate\`, \`BGExpiryDate\`, \`BGBank\`, \`BGReceivingByCustomer\`, \`BGReceivingFile\`, \`PO\`, \`POFile\`, \`PODate\`, \`POValue\`, \`POTenure\`, \`POExpiryDate\`, \`Rates\`, \`RatesAnnexureFile\`, \`YearlyEscalationClause\`, \`GSTNo\`, \`GSTRate\`, \`BillingTenure\`, \`MISFormatFile\`, \`KPISLAFile\`, \`PerformanceReportFile\`, \`CustomerRegisteredOfficeAddress\`, \`CustomerCorporateOfficeAddress\`, \`CogentProjectHead\`, \`CogentProjectOpsManager\`, \`CustomerImportantPersonAddress1\`, \`CustomerImportantPersonAddress2\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const now = new Date();

      // Fallback for MasterCustomerName if empty, to prevent "Column cannot be null" error
      const masterNameValue = (customer.MasterCustomerName || customer.Name || 'Default Master').trim();
      const companyNameValue = (customer.Name || masterNameValue).trim();

      const insertParams = [
        masterNameValue,
        companyNameValue,
        customerCode || null,
        customer.CustomerMobileNo || null,
        customer.CustomerEmail || null,
        customer.CustomerContactPerson || null,
        customer.AlternateMobileNo || null,
        customer.CustomerGroup || null,
        customer.ServiceCode || null,
        customer.TypeOfServices || null,
        customer.CityName || null,
        customer.HouseFlatNo || null,
        customer.StreetLocality || null,
        customer.CustomerCity || null,
        customer.CustomerState || null,
        customer.CustomerPinCode || null,
        customer.CustomerCountry || 'India',
        customer.TypeOfBilling || null,
        now,
        now,
        customer.Locations || null,
        customer.CustomerSite || null,
        customer.Agreement || null,
        filePaths.AgreementFile || null,
        sanitizeDate(customer.AgreementDate),
        sanitizeInt(customer.AgreementTenure),
        sanitizeDate(customer.AgreementExpiryDate),
        sanitizeInt(customer.CustomerNoticePeriod),
        sanitizeInt(customer.CogentNoticePeriod),
        sanitizeInt(customer.CreditPeriod),
        customer.Insurance || null,
        sanitizeFloat(customer.MinimumInsuranceValue),
        customer.CogentDebitClause || null,
        sanitizeFloat(customer.CogentDebitLimit),
        customer.BG || null,
        filePaths.BGFile || null,
        sanitizeFloat(customer.BGAmount),
        sanitizeDate(customer.BGDate),
        sanitizeDate(customer.BGExpiryDate),
        customer.BGBank || null,
        customer.BGReceivingByCustomer || null,
        filePaths.BGReceivingFile || null,
        customer.PO || null,
        filePaths.POFile || null,
        sanitizeDate(customer.PODate),
        sanitizeFloat(customer.POValue),
        sanitizeInt(customer.POTenure),
        sanitizeDate(customer.POExpiryDate),
        customer.Rates || null,
        filePaths.RatesAnnexureFile || null,
        customer.YearlyEscalationClause || null,
        customer.GSTNo || null,
        sanitizeFloat(customer.GSTRate),
        sanitizeInt(customer.BillingTenure),
        filePaths.MISFormatFile || null,
        filePaths.KPISLAFile || null,
        filePaths.PerformanceReportFile || null,
        customer.CustomerRegisteredOfficeAddress || null,
        customer.CustomerCorporateOfficeAddress || null,
        customer.CogentProjectHead || null,
        customer.CogentProjectOpsManager || null,
        customer.CustomerImportantPersonAddress1 || null,
        customer.CustomerImportantPersonAddress2 || null
      ];

      console.log('📊 Executing main Customer insert query...');
      console.log('🔢 Number of params:', insertParams.length);

      const [results] = await pool.query(insertQuery, insertParams);

      const customerId = results.insertId;
      console.log('✅ Main Customer Record inserted with ID:', customerId);

      // Insert related data using Promise.all for parallel execution
      const insertPromises = [];

      // Customer sites are already handled in the main INSERT query above

      // Handle new unified contact structure
      if (customer.PrimaryContact) {
        try {
          const primaryContact = typeof customer.PrimaryContact === 'string'
            ? JSON.parse(customer.PrimaryContact)
            : customer.PrimaryContact;

          // Update the main customer record with primary contact info
          await pool.query(`
            UPDATE Customer SET
              CustomerMobileNo = ?, AlternateMobileNo = ?, CustomerEmail = ?,
              CustomerContactPerson = ?, CustomerGroup = ?
            WHERE CustomerID = ?
          `, [
            primaryContact.CustomerMobileNo || null,
            primaryContact.AlternateMobileNo || null,
            primaryContact.CustomerEmail || null,
            primaryContact.CustomerContactPerson || null,
            primaryContact.CustomerGroup || null,
            customerId
          ]);
        } catch (e) {
          console.warn('Error parsing PrimaryContact:', e);
        }
      }

      // SHARED DUPLICATE PREVENTION
      const globalProcessedContacts = new Set();

      // Handle new unified additional contacts structure
      if (customer.AdditionalContacts) {
        try {
          let additionalContacts = [];
          if (typeof customer.AdditionalContacts === 'string') {
            try {
              additionalContacts = JSON.parse(customer.AdditionalContacts);
            } catch (e) {
              console.error('Failed to parse AdditionalContacts string', e);
              additionalContacts = [];
            }
          } else {
            additionalContacts = customer.AdditionalContacts;
          }

          if (Array.isArray(additionalContacts)) {
            for (const contact of additionalContacts) {
              // Skip empty
              const hasContactData = contact.Name?.trim() || contact.Mobile?.trim() || contact.Email?.trim() ||
                contact.Department?.trim() || contact.Designation?.trim() || contact.OfficeType?.trim();

              if (!hasContactData) continue;

              // Duplicate check
              const duplicateKey = `${contact.Mobile?.trim() || ''}-${contact.Email?.trim() || ''}`;
              if (duplicateKey !== '-' && globalProcessedContacts.has(duplicateKey)) continue;
              if (duplicateKey !== '-') globalProcessedContacts.add(duplicateKey);

              // Address Handling
              let addressValue = null;
              if (contact.Address) {
                if (typeof contact.Address === 'object') {
                  try { addressValue = JSON.stringify(contact.Address); } catch (e) { addressValue = null; }
                } else if (typeof contact.Address === 'string') {
                  let cleanAddress = contact.Address.trim();
                  // Fix malformed string objects
                  if (cleanAddress.includes('=') && cleanAddress.includes("'")) {
                    const parts = cleanAddress.split(',').map(p => p.trim());
                    const addressParts = [];
                    parts.forEach(part => {
                      if (part.includes('=')) {
                        const val = part.split('=')[1]?.replace(/'/g, '').trim();
                        if (val && val !== 'undefined' && val !== 'null') addressParts.push(val);
                      } else {
                        if (part && part !== 'undefined' && part !== 'null') addressParts.push(part);
                      }
                    });
                    cleanAddress = addressParts.join(', ');
                  }
                  addressValue = cleanAddress || null;
                }
              }

              // Insert based on Type
              if (contact.ContactType === 'Office Address') {
                const sqlParams = [
                  customerId, contact.OfficeType || null, contact.Name || null, contact.Department || null,
                  contact.Designation || null, contact.Mobile || null, contact.Email || null, contact.DOB || null,
                  addressValue ? String(addressValue) : null
                ];
                insertPromises.push(
                  pool.query('INSERT INTO customer_office_address (CustomerID, OfficeType, ContactPerson, Department, Designation, Mobile, Email, DOB, Address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', sqlParams)
                );
              } else if (contact.ContactType === 'Key Contact') {
                const keyContactParams = [
                  customerId, contact.Name || null, contact.Department || null, contact.Designation || null,
                  contact.Location || null, contact.OfficeType || null, contact.Mobile || null, contact.Email || null,
                  contact.DOB || null, addressValue ? String(addressValue) : null
                ];
                insertPromises.push(
                  pool.query('INSERT INTO customer_key_contact (CustomerID, Name, Department, Designation, Location, OfficeType, Mobile, Email, DOB, Address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', keyContactParams)
                );
              }
            }
          }
        } catch (e) {
          console.error('Error in AdditionalContacts block', e);
        }
      }

      // Fallback: Handle legacy contact structure for backward compatibility
      if (customer.CustomerOfficeAddress && Array.isArray(customer.CustomerOfficeAddress)) {

        customer.CustomerOfficeAddress.forEach(address => {
          // Create duplicate detection key for legacy contacts
          const legacyDuplicateKey = `${address.Mobile?.trim() || ''}-${address.Email?.trim() || ''}`;

          // Skip if this mobile+email combination has already been processed GLOBALLY
          if (legacyDuplicateKey !== '-' && globalProcessedContacts.has(legacyDuplicateKey)) {
            console.warn('🚫 GLOBAL DUPLICATE PREVENTION - Skipping duplicate contact (CustomerOfficeAddress):', {
              ContactPerson: address.ContactPerson,
              Mobile: address.Mobile,
              Email: address.Email,
              duplicateKey: legacyDuplicateKey,
              source: 'CustomerOfficeAddress',
              reason: 'Already processed in AdditionalContacts or earlier in this format'
            });
            return; // Skip this duplicate contact
          }

          // Add to GLOBAL processed contacts set
          if (legacyDuplicateKey !== '-') {
            globalProcessedContacts.add(legacyDuplicateKey);
          }
          // Handle address conversion for legacy structure - keep as JSON
          let legacyAddressValue = address.Address || null;
          if (legacyAddressValue && typeof legacyAddressValue === 'object') {
            try {
              legacyAddressValue = JSON.stringify(legacyAddressValue);
            } catch (e) {
              console.warn('Failed to convert address object:', e);
              legacyAddressValue = null;
            }
          }

          insertPromises.push(
            pool.query('INSERT INTO customer_office_address (CustomerID, OfficeType, ContactPerson, Department, Designation, Mobile, Email, DOB, Address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
              customerId, address.OfficeType || null, address.ContactPerson || null, address.Department || null, address.Designation || null, address.Mobile || null, address.Email || null, address.DOB || null, legacyAddressValue
            ])
          );
        });
      }

      // Fallback: Handle legacy key contacts for backward compatibility
      if (customer.CustomerKeyContact && Array.isArray(customer.CustomerKeyContact)) {
        customer.CustomerKeyContact.forEach(contact => {
          // Create duplicate detection key for legacy contacts
          const legacyDuplicateKey = `${contact.Mobile?.trim() || ''}-${contact.Email?.trim() || ''}`;

          // Skip if this mobile+email combination has already been processed GLOBALLY
          if (legacyDuplicateKey !== '-' && globalProcessedContacts.has(legacyDuplicateKey)) {
            console.warn('🚫 GLOBAL DUPLICATE PREVENTION - Skipping duplicate contact (CustomerKeyContact):', {
              Name: contact.Name,
              Mobile: contact.Mobile,
              Email: contact.Email,
              duplicateKey: legacyDuplicateKey,
              source: 'CustomerKeyContact',
              reason: 'Already processed in AdditionalContacts or earlier in this format'
            });
            return; // Skip this duplicate contact
          }

          // Add to GLOBAL processed contacts set
          if (legacyDuplicateKey !== '-') {
            globalProcessedContacts.add(legacyDuplicateKey);
          }

          // Fix corrupted address data that may have been affected by field mapping
          let cleanAddress = contact.Address;
          if (cleanAddress && typeof cleanAddress === 'object') {
            // If it's an object, convert to JSON string
            try {
              cleanAddress = JSON.stringify(cleanAddress);
            } catch (e) {
              console.warn('Failed to convert key contact address object:', e);
              cleanAddress = null;
            }
          } else if (cleanAddress && typeof cleanAddress === 'string') {
            // Check if it's corrupted MySQL assignment syntax and fix it
            if (cleanAddress.includes('`') && cleanAddress.includes('=')) {
              console.warn('🔧 LEGACY CONTACT DEBUG - Detected corrupted address, attempting to reconstruct:', cleanAddress);

              // Try to reconstruct JSON from MySQL assignment syntax
              try {
                const addressObj = {};
                const parts = cleanAddress.split(',').map(part => part.trim());

                parts.forEach(part => {
                  if (part.includes('=')) {
                    const [key, value] = part.split('=');
                    const cleanKey = key.replace(/`/g, '').trim();
                    const cleanValue = value.replace(/'/g, '').trim();
                    if (cleanKey && cleanValue && cleanValue !== 'undefined' && cleanValue !== 'null') {
                      addressObj[cleanKey] = cleanValue;
                    }
                  }
                });

                if (Object.keys(addressObj).length > 0) {
                  cleanAddress = JSON.stringify(addressObj);
                  console.log('✅ LEGACY CONTACT DEBUG - Reconstructed address:', cleanAddress);
                } else {
                  cleanAddress = null;
                }
              } catch (e) {
                console.warn('Failed to reconstruct corrupted address:', e);
                cleanAddress = null;
              }
            }
          }

          console.log('🔑 LEGACY KEY CONTACT DEBUG - Inserting legacy Key Contact:', {
            CustomerID: customerId,
            Name: contact.Name,
            Department: contact.Department,
            Designation: contact.Designation,
            Location: contact.Location,
            OfficeType: contact.OfficeType,
            Mobile: contact.Mobile,
            Email: contact.Email,
            DOB: contact.DOB,
            OriginalAddress: contact.Address,
            CleanAddress: cleanAddress,
            AddressType: typeof cleanAddress
          });

          insertPromises.push(
            pool.query('INSERT INTO customer_key_contact (CustomerID, Name, Department, Designation, Location, OfficeType, Mobile, Email, DOB, Address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
              customerId, contact.Name || null, contact.Department || null, contact.Designation || null, contact.Location || null, contact.OfficeType || null, contact.Mobile || null, contact.Email || null, contact.DOB || null, cleanAddress
            ]).catch(error => {
              console.error('❌ LEGACY KEY CONTACT INSERT ERROR:', {
                error: error.message,
                code: error.code,
                errno: error.errno,
                sqlState: error.sqlState,
                contact: contact,
                cleanAddress: cleanAddress
              });
              throw error;
            })
          );
        });
      }

      // Insert cogent contacts
      if (customer.CustomerCogentContact) {
        const cogent = customer.CustomerCogentContact;
        insertPromises.push(
          pool.query('INSERT INTO customer_cogent_contact (CustomerID, CustomerOwner, ProjectHead, OpsHead, OpsManager, Supervisor) VALUES (?, ?, ?, ?, ?, ?)', [
            customerId, cogent.CustomerOwner, cogent.ProjectHead, cogent.OpsHead, cogent.OpsManager, cogent.Supervisor
          ])
        );
      }

      // Wait for all insertions to complete
      if (insertPromises.length > 0) {
        await Promise.all(insertPromises);
      }

      console.log('🔍 BACKEND DEBUG - Customer creation response:', {
        CustomerID: customerId,
        CustomerCode: customerCode,
        customerData: customer,
        filePaths: filePaths
      });

      // Ensure CustomerCode is explicitly set in response
      const responseData = {
        CustomerID: customerId,
        CustomerCode: customerCode,
        ...customer,
        ...filePaths
      };

      // Double-check that CustomerCode is in the response
      responseData.CustomerCode = customerCode;

      console.log('🔍 BACKEND DEBUG - Final response data:', responseData);


      // Send response
      res.status(201).json(responseData);

    } catch (error) {
      console.error('❌ CRITICAL ERROR in Customer Creation:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      console.error('Stack:', error.stack);

      // Log to file too
      const fs = require('fs');
      const logMsg = `[${new Date().toISOString()}] CUSTOMER_CREATE_ERROR: ${error.message}\n` +
        `Code: ${error.code}\n` +
        `SQL: ${error.sql}\n` +
        `Stack: ${error.stack}\n\n`;
      fs.appendFileSync('backend_errors.log', logMsg);

      // Handle specific database errors
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('CustomerCode')) {
          return res.status(400).json({ error: 'A customer with this code already exists. Please use a different code.' });
        } else if (error.message.includes('Name')) {
          return res.status(400).json({ error: 'A customer with this name already exists. Please use a different name.' });
        } else if (error.message.includes('Email')) {
          return res.status(400).json({ error: 'This email address is already registered. Please use a different email.' });
        }
      }

      res.status(500).json({
        error: 'Failed to create customer',
        details: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Update a customer
  // This route updates an existing customer record identified by the provided ID with new data from the request body.
  // It responds with the updated customer data if successful, or a 404 error if the customer is not found.
  router.put('/:id', upload.fields([
    { name: 'AgreementFile', maxCount: 1 },
    { name: 'BGFile', maxCount: 1 },
    { name: 'BGReceivingFile', maxCount: 1 },
    { name: 'POFile', maxCount: 1 },
    { name: 'RatesAnnexureFile', maxCount: 1 },
    { name: 'MISFormatFile', maxCount: 1 },
    { name: 'KPISLAFile', maxCount: 1 },
    { name: 'PerformanceReportFile', maxCount: 1 }
  ]), async (req, res) => {
    const { id } = req.params;
    const customer = req.body;
    const files = req.files;

    // Map frontend field names to backend database column names (only for top-level customer fields)
    // IMPORTANT: Only map top-level customer fields, not nested contact address fields
    if (customer.pin_code && typeof customer.pin_code === 'string') customer.CustomerPinCode = customer.pin_code;
    if (customer.house_flat_no && typeof customer.house_flat_no === 'string') customer.HouseFlatNo = customer.house_flat_no;
    if (customer.street_locality && typeof customer.street_locality === 'string') customer.StreetLocality = customer.street_locality;
    if (customer.city && typeof customer.city === 'string') customer.CustomerCity = customer.city;
    if (customer.state && typeof customer.state === 'string') customer.CustomerState = customer.state;
    if (customer.country && typeof customer.country === 'string') customer.CustomerCountry = customer.country;

    // CustomerSite is now handled as a simple string, no JSON parsing needed
    if (customer.CustomerOfficeAddress && typeof customer.CustomerOfficeAddress === 'string') {
      customer.CustomerOfficeAddress = JSON.parse(customer.CustomerOfficeAddress);
    }
    if (customer.CustomerKeyContact && typeof customer.CustomerKeyContact === 'string') {
      customer.CustomerKeyContact = JSON.parse(customer.CustomerKeyContact);
    }
    if (customer.CustomerCogentContact && typeof customer.CustomerCogentContact === 'string') {
      customer.CustomerCogentContact = JSON.parse(customer.CustomerCogentContact);
    }

    console.log('🔧 Customer UPDATE request for ID:', id);
    console.log('📝 Customer data received:', customer);

    const dateErrors = validateDateSequence(customer);
    if (dateErrors.length > 0) {
      return res.status(400).json({ errors: dateErrors });
    }

    try {
      // Check if customer exists
      const [existingCustomer] = await pool.query(
        'SELECT * FROM Customer WHERE CustomerID = ?',
        [id]
      );

      if (existingCustomer.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Check if CustomerCode is being changed and if it conflicts with another customer
      if (customer.CustomerCode !== existingCustomer[0].CustomerCode) {
        const [codeCheck] = await pool.query(
          'SELECT CustomerID FROM Customer WHERE CustomerCode = ? AND CustomerID != ?',
          [customer.CustomerCode, id]
        );

        if (codeCheck.length > 0) {
          return res.status(400).json({ error: 'Customer code already exists' });
        }
      }

      // Handle file paths - keep existing files if no new files uploaded
      const filePaths = {
        AgreementFile: existingCustomer[0].AgreementFile,
        BGFile: existingCustomer[0].BGFile,
        BGReceivingFile: existingCustomer[0].BGReceivingFile,
        POFile: existingCustomer[0].POFile,
        RatesAnnexureFile: existingCustomer[0].RatesAnnexureFile,
        MISFormatFile: existingCustomer[0].MISFormatFile,
        KPISLAFile: existingCustomer[0].KPISLAFile,
        PerformanceReportFile: existingCustomer[0].PerformanceReportFile
      };

      if (files) {
        if (files.AgreementFile) {
          // Delete old file if exists
          if (existingCustomer[0].AgreementFile) {
            const oldPath = uploadsManager.getFullPath(existingCustomer[0].AgreementFile);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          filePaths.AgreementFile = uploadsManager.getRelativePath('customers', files.AgreementFile[0].filename);
        }
        if (files.BGFile) {
          if (existingCustomer[0].BGFile) {
            const oldPath = uploadsManager.getFullPath(existingCustomer[0].BGFile);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          filePaths.BGFile = uploadsManager.getRelativePath('customers', files.BGFile[0].filename);
        }
        if (files.BGReceivingFile) {
          if (existingCustomer[0].BGReceivingFile) {
            const oldPath = uploadsManager.getFullPath(existingCustomer[0].BGReceivingFile);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          filePaths.BGReceivingFile = uploadsManager.getRelativePath('customers', files.BGReceivingFile[0].filename);
        }
        if (files.POFile) {
          if (existingCustomer[0].POFile) {
            const oldPath = uploadsManager.getFullPath(existingCustomer[0].POFile);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          filePaths.POFile = uploadsManager.getRelativePath('customers', files.POFile[0].filename);
        }
        if (files.RatesAnnexureFile) {
          if (existingCustomer[0].RatesAnnexureFile) {
            const oldPath = uploadsManager.getFullPath(existingCustomer[0].RatesAnnexureFile);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          filePaths.RatesAnnexureFile = uploadsManager.getRelativePath('customers', files.RatesAnnexureFile[0].filename);
        }
        if (files.MISFormatFile) {
          if (existingCustomer[0].MISFormatFile) {
            const oldPath = uploadsManager.getFullPath(existingCustomer[0].MISFormatFile);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          filePaths.MISFormatFile = uploadsManager.getRelativePath('customers', files.MISFormatFile[0].filename);
        }
        if (files.KPISLAFile) {
          if (existingCustomer[0].KPISLAFile) {
            const oldPath = uploadsManager.getFullPath(existingCustomer[0].KPISLAFile);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          filePaths.KPISLAFile = uploadsManager.getRelativePath('customers', files.KPISLAFile[0].filename);
        }
        if (files.PerformanceReportFile) {
          if (existingCustomer[0].PerformanceReportFile) {
            const oldPath = uploadsManager.getFullPath(existingCustomer[0].PerformanceReportFile);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          filePaths.PerformanceReportFile = uploadsManager.getRelativePath('customers', files.PerformanceReportFile[0].filename);
        }
      }

      // Verify uploaded files exist and are accessible
      const newUploadedFiles = [];
      if (files) {
        Object.keys(files).forEach(fieldName => {
          if (files[fieldName]) {
            const relativePath = filePaths[fieldName];
            newUploadedFiles.push(relativePath);
          }
        });
      }

      for (const filePath of newUploadedFiles) {
        const fullPath = uploadsManager.getFullPath(filePath);
        if (!fs.existsSync(fullPath)) {
          console.error('❌ Uploaded customer file not found during update:', fullPath);
          return res.status(500).json({ error: 'File upload failed - file not accessible' });
        }
        console.log('✅ Verified uploaded customer file during update:', filePath);
      }

      // Convert empty strings to null for date and numeric fields
      // Also handle array values (when FormData has duplicate field names)
      const processedCustomer = {};
      Object.keys(customer).forEach(key => {
        let value = customer[key];

        // If value is an array, take the last value (most recent)
        if (Array.isArray(value)) {
          value = value[value.length - 1];
        }

        // Handle new contact structure
        if (key === 'PrimaryContact') {
          try {
            const primaryContact = typeof value === 'string' ? JSON.parse(value) : value;
            // Map primary contact fields to existing database fields
            processedCustomer.CustomerMobileNo = primaryContact.CustomerMobileNo || null;
            processedCustomer.AlternateMobileNo = primaryContact.AlternateMobileNo || null;
            processedCustomer.CustomerEmail = primaryContact.CustomerEmail || null;
            processedCustomer.CustomerContactPerson = primaryContact.CustomerContactPerson || null;
            processedCustomer.CustomerGroup = primaryContact.CustomerGroup || null;
          } catch (e) {
            console.warn('Error parsing PrimaryContact:', e);
          }
          return; // Skip adding PrimaryContact to processedCustomer
        }

        if (key === 'AdditionalContacts') {
          try {
            const additionalContacts = typeof value === 'string' ? JSON.parse(value) : value;
            // Store as JSON for now - we'll handle the separate tables later
            processedCustomer.CustomerOfficeAddress = additionalContacts.filter(c => c.ContactType === 'Office Address');
            processedCustomer.CustomerKeyContact = additionalContacts.filter(c => c.ContactType === 'Key Contact');
          } catch (e) {
            console.warn('Error parsing AdditionalContacts:', e);
          }
          return; // Skip adding AdditionalContacts to processedCustomer
        }

        // Convert empty strings to null for specific fields
        if (key.includes('Date')) {
          // Convert datetime strings to date format for MySQL DATE columns
          if (value && typeof value === 'string' && value.includes('T')) {
            processedCustomer[key] = value.split('T')[0]; // Extract date part only
          } else {
            processedCustomer[key] = value || null;
          }
        } else if (key.includes('Value') || key.includes('Amount') || key.includes('Limit')) {
          processedCustomer[key] = value || null;
        } else if (key.includes('Tenure') || key.includes('Period') || key.includes('Rate')) {
          // Handle integer fields that should be null when empty
          processedCustomer[key] = value || null;
        } else {
          processedCustomer[key] = value;
        }
      });

      // Fallback for MasterCustomerName and Name to prevent "Column cannot be null" error
      const masterNameValue = (processedCustomer.MasterCustomerName || processedCustomer.Name || existingCustomer[0].MasterCustomerName || 'Default Master').trim();
      const companyNameValue = (processedCustomer.Name || masterNameValue || existingCustomer[0].Name).trim();

      await pool.query(`
        UPDATE Customer SET
          MasterCustomerName = ?, Name = ?, CustomerCode = ?, ServiceCode = ?, TypeOfServices = ?, Locations = ?, CustomerSite = ?,
          CustomerMobileNo = ?, AlternateMobileNo = ?, CustomerEmail = ?, CustomerContactPerson = ?, CustomerGroup = ?, CityName = ?,
          HouseFlatNo = ?, StreetLocality = ?, CustomerCity = ?, CustomerState = ?, CustomerPinCode = ?, CustomerCountry = ?,
          Agreement = ?, AgreementFile = ?, AgreementDate = ?, AgreementTenure = ?, AgreementExpiryDate = ?,
          CustomerNoticePeriod = ?, CogentNoticePeriod = ?, CreditPeriod = ?, Insurance = ?, MinimumInsuranceValue = ?,
          CogentDebitClause = ?, CogentDebitLimit = ?, BG = ?, BGFile = ?, BGAmount = ?, BGDate = ?, BGExpiryDate = ?,
          BGBank = ?, BGReceivingByCustomer = ?, BGReceivingFile = ?, PO = ?, POFile = ?, PODate = ?, POValue = ?, POTenure = ?,
          POExpiryDate = ?, Rates = ?, RatesAnnexureFile = ?, YearlyEscalationClause = ?, GSTNo = ?, GSTRate = ?, TypeOfBilling = ?, BillingTenure = ?,
          MISFormatFile = ?, KPISLAFile = ?, PerformanceReportFile = ?,
          CustomerRegisteredOfficeAddress = ?,
          CustomerCorporateOfficeAddress = ?, CogentProjectHead = ?, CogentProjectOpsManager = ?,
          CustomerImportantPersonAddress1 = ?, CustomerImportantPersonAddress2 = ?
        WHERE CustomerID = ?
      `, [
        masterNameValue, companyNameValue, processedCustomer.CustomerCode, processedCustomer.ServiceCode,
        processedCustomer.TypeOfServices, processedCustomer.Locations, processedCustomer.CustomerSite,
        processedCustomer.CustomerMobileNo, processedCustomer.AlternateMobileNo, processedCustomer.CustomerEmail, processedCustomer.CustomerContactPerson, processedCustomer.CustomerGroup, processedCustomer.CityName,
        processedCustomer.house_flat_no || null, processedCustomer.street_locality || null, processedCustomer.city || null, processedCustomer.state || null, processedCustomer.pin_code || null, processedCustomer.country || 'India',
        processedCustomer.Agreement, filePaths.AgreementFile, sanitizeDate(processedCustomer.AgreementDate),
        sanitizeInt(processedCustomer.AgreementTenure), sanitizeDate(processedCustomer.AgreementExpiryDate), sanitizeInt(processedCustomer.CustomerNoticePeriod),
        sanitizeInt(processedCustomer.CogentNoticePeriod), sanitizeInt(processedCustomer.CreditPeriod), processedCustomer.Insurance,
        sanitizeFloat(processedCustomer.MinimumInsuranceValue), processedCustomer.CogentDebitClause,
        sanitizeFloat(processedCustomer.CogentDebitLimit), processedCustomer.BG, filePaths.BGFile,
        sanitizeFloat(processedCustomer.BGAmount), sanitizeDate(processedCustomer.BGDate), sanitizeDate(processedCustomer.BGExpiryDate),
        processedCustomer.BGBank, processedCustomer.BGReceivingByCustomer, filePaths.BGReceivingFile,
        processedCustomer.PO, filePaths.POFile, sanitizeDate(processedCustomer.PODate), sanitizeFloat(processedCustomer.POValue), sanitizeInt(processedCustomer.POTenure),
        sanitizeDate(processedCustomer.POExpiryDate), processedCustomer.Rates, filePaths.RatesAnnexureFile, processedCustomer.YearlyEscalationClause,
        processedCustomer.GSTNo, sanitizeFloat(processedCustomer.GSTRate), processedCustomer.TypeOfBilling, sanitizeInt(processedCustomer.BillingTenure),
        filePaths.MISFormatFile, filePaths.KPISLAFile, filePaths.PerformanceReportFile,
        processedCustomer.CustomerRegisteredOfficeAddress, processedCustomer.CustomerCorporateOfficeAddress,
        processedCustomer.CogentProjectHead, processedCustomer.CogentProjectOpsManager,
        processedCustomer.CustomerImportantPersonAddress1, processedCustomer.CustomerImportantPersonAddress2,
        id
      ]);

      // Customer sites are already handled in the main UPDATE query above

      // Handle new unified additional contacts structure
      if (customer.AdditionalContacts) {
        try {
          const additionalContacts = typeof customer.AdditionalContacts === 'string'
            ? JSON.parse(customer.AdditionalContacts)
            : customer.AdditionalContacts;

          if (Array.isArray(additionalContacts)) {
            // Clear existing contact data
            await pool.query('DELETE FROM customer_office_address WHERE CustomerID = ?', [id]);
            await pool.query('DELETE FROM customer_key_contact WHERE CustomerID = ?', [id]);

            // Insert new contact data with GLOBAL duplicate prevention
            const globalProcessedContactsUpdate = new Set(); // Track ALL processed contacts to prevent duplicates across formats

            for (const contact of additionalContacts) {
              // Skip completely empty contacts
              const hasContactData = contact.Name?.trim() || contact.Mobile?.trim() || contact.Email?.trim() ||
                contact.Department?.trim() || contact.Designation?.trim() || contact.OfficeType?.trim();

              if (!hasContactData) {
                continue; // Skip this contact
              }

              // Create duplicate detection key based on mobile and email
              const duplicateKey = `${contact.Mobile?.trim() || ''}-${contact.Email?.trim() || ''}`;

              // Skip if this mobile+email combination has already been processed GLOBALLY
              if (duplicateKey !== '-' && globalProcessedContactsUpdate.has(duplicateKey)) {
                console.warn('🚫 GLOBAL DUPLICATE PREVENTION (UPDATE) - Skipping duplicate contact:', {
                  ContactType: contact.ContactType,
                  Name: contact.Name,
                  Mobile: contact.Mobile,
                  Email: contact.Email,
                  duplicateKey: duplicateKey,
                  source: 'AdditionalContacts'
                });
                continue; // Skip this duplicate contact
              }

              // Add to GLOBAL processed contacts set
              if (duplicateKey !== '-') {
                globalProcessedContactsUpdate.add(duplicateKey);
              }

              // Handle structured address format with better validation
              let addressValue = null;
              if (contact.Address) {
                if (typeof contact.Address === 'object') {
                  // Serialize structured address to JSON
                  addressValue = JSON.stringify(contact.Address);
                } else if (typeof contact.Address === 'string') {
                  // Sanitize string addresses to prevent SQL injection
                  // Remove any malformed object-like strings and keep only clean text
                  let cleanAddress = contact.Address.trim();

                  // Check if it looks like a malformed object string (contains = signs and unescaped quotes)
                  if (cleanAddress.includes('=') && cleanAddress.includes("'")) {
                    console.warn('⚠️ Detected malformed address string in UPDATE, attempting to clean:', cleanAddress);
                    // Try to extract meaningful address parts
                    const parts = cleanAddress.split(',').map(part => part.trim());
                    const addressParts = [];

                    parts.forEach(part => {
                      // Extract value after = sign if present
                      if (part.includes('=')) {
                        const value = part.split('=')[1]?.replace(/'/g, '').trim();
                        if (value && value !== 'undefined' && value !== 'null') {
                          addressParts.push(value);
                        }
                      } else {
                        // Keep regular parts as-is
                        if (part && part !== 'undefined' && part !== 'null') {
                          addressParts.push(part);
                        }
                      }
                    });

                    cleanAddress = addressParts.join(', ');
                    console.log('✅ Cleaned address in UPDATE:', cleanAddress);
                  }

                  addressValue = cleanAddress || null;
                } else {
                  console.warn('⚠️ Unexpected address type in UPDATE:', typeof contact.Address, contact.Address);
                  addressValue = null;
                }
              }

              if (contact.ContactType === 'Office Address') {
                await pool.query('INSERT INTO customer_office_address (CustomerID, OfficeType, ContactPerson, Department, Designation, Mobile, Email, DOB, Address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                  id, contact.OfficeType || null, contact.Name || null, contact.Department || null, contact.Designation || null, contact.Mobile || null, contact.Email || null, contact.DOB || null, addressValue
                ]);
              } else if (contact.ContactType === 'Key Contact') {
                // Apply the same address processing as Office Address to prevent corruption
                if (addressValue && typeof addressValue !== 'string') {
                  console.warn('⚠️ KEY CONTACT UPDATE SQL DEBUG - Address value is not a string, converting:', addressValue);
                  addressValue = String(addressValue);
                }

                // Keep address as JSON string for proper storage
                let finalKeyContactAddressValue = addressValue;

                // Enhanced error logging for Key Contact insertion (UPDATE)
                const keyContactParams = [
                  id, contact.Name || null, contact.Department || null, contact.Designation || null,
                  contact.Location || null, contact.OfficeType || null, contact.Mobile || null, contact.Email || null,
                  contact.DOB || null, finalKeyContactAddressValue
                ];

                console.log('🔑 KEY CONTACT UPDATE DEBUG - Inserting Key Contact:', {
                  CustomerID: id,
                  Name: contact.Name,
                  Department: contact.Department,
                  Designation: contact.Designation,
                  Location: contact.Location,
                  OfficeType: contact.OfficeType,
                  Mobile: contact.Mobile,
                  Email: contact.Email,
                  DOB: contact.DOB,
                  Address: finalKeyContactAddressValue,
                  AddressType: typeof finalKeyContactAddressValue,
                  parameterCount: keyContactParams.length
                });

                try {
                  await pool.query('INSERT INTO customer_key_contact (CustomerID, Name, Department, Designation, Location, OfficeType, Mobile, Email, DOB, Address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', keyContactParams);
                } catch (error) {
                  console.error('❌ KEY CONTACT UPDATE INSERT ERROR:', {
                    error: error.message,
                    code: error.code,
                    errno: error.errno,
                    sqlState: error.sqlState,
                    contact: contact,
                    parameters: keyContactParams
                  });
                  throw error;
                }
              }
            }
          }
        } catch (e) {
          console.warn('Error parsing AdditionalContacts in UPDATE:', e);
        }
      } else {
        // Fallback: Handle legacy contact structure for backward compatibility

        // Update customer office addresses
        if (customer.CustomerOfficeAddress && Array.isArray(customer.CustomerOfficeAddress)) {
          await pool.query('DELETE FROM customer_office_address WHERE CustomerID = ?', [id]);
          for (const address of customer.CustomerOfficeAddress) {
            // Handle structured address format with better validation
            let addressValue = null;
            if (address.Address) {
              if (typeof address.Address === 'object') {
                // Serialize structured address to JSON
                addressValue = JSON.stringify(address.Address);
              } else if (typeof address.Address === 'string') {
                // Sanitize string addresses to prevent SQL injection
                let cleanAddress = address.Address.trim();

                // Check if it looks like a malformed object string
                if (cleanAddress.includes('=') && cleanAddress.includes("'")) {
                  console.warn('⚠️ Detected malformed address string in legacy office address, attempting to clean:', cleanAddress);
                  const parts = cleanAddress.split(',').map(part => part.trim());
                  const addressParts = [];

                  parts.forEach(part => {
                    if (part.includes('=')) {
                      const value = part.split('=')[1]?.replace(/'/g, '').trim();
                      if (value && value !== 'undefined' && value !== 'null') {
                        addressParts.push(value);
                      }
                    } else {
                      if (part && part !== 'undefined' && part !== 'null') {
                        addressParts.push(part);
                      }
                    }
                  });

                  cleanAddress = addressParts.join(', ');
                  console.log('✅ Cleaned legacy office address:', cleanAddress);
                }

                addressValue = cleanAddress || null;
              } else {
                console.warn('⚠️ Unexpected address type in legacy office address:', typeof address.Address, address.Address);
                addressValue = null;
              }
            }

            await pool.query('INSERT INTO customer_office_address (CustomerID, OfficeType, ContactPerson, Department, Designation, Mobile, Email, DOB, Address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
              id, address.OfficeType || null, address.ContactPerson || null, address.Department || null, address.Designation || null, address.Mobile || null, address.Email || null, address.DOB || null, addressValue
            ]);
          }
        }

        // Update key contacts
        if (customer.CustomerKeyContact && Array.isArray(customer.CustomerKeyContact)) {
          await pool.query('DELETE FROM customer_key_contact WHERE CustomerID = ?', [id]);
          for (const contact of customer.CustomerKeyContact) {
            // Handle structured address format with better validation
            let addressValue = null;
            if (contact.Address) {
              if (typeof contact.Address === 'object') {
                // Serialize structured address to JSON
                addressValue = JSON.stringify(contact.Address);
              } else if (typeof contact.Address === 'string') {
                // Sanitize string addresses to prevent SQL injection
                let cleanAddress = contact.Address.trim();

                // Check if it looks like a malformed object string
                if (cleanAddress.includes('=') && cleanAddress.includes("'")) {
                  console.warn('⚠️ Detected malformed address string in legacy key contact, attempting to clean:', cleanAddress);
                  const parts = cleanAddress.split(',').map(part => part.trim());
                  const addressParts = [];

                  parts.forEach(part => {
                    if (part.includes('=')) {
                      const value = part.split('=')[1]?.replace(/'/g, '').trim();
                      if (value && value !== 'undefined' && value !== 'null') {
                        addressParts.push(value);
                      }
                    } else {
                      if (part && part !== 'undefined' && part !== 'null') {
                        addressParts.push(part);
                      }
                    }
                  });

                  cleanAddress = addressParts.join(', ');
                  console.log('✅ Cleaned legacy key contact address:', cleanAddress);
                }

                addressValue = cleanAddress || null;
              } else {
                console.warn('⚠️ Unexpected address type in legacy key contact:', typeof contact.Address, contact.Address);
                addressValue = null;
              }
            }

            await pool.query('INSERT INTO customer_key_contact (CustomerID, Name, Department, Designation, Location, OfficeType, Mobile, Email, DOB, Address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
              id, contact.Name || null, contact.Department || null, contact.Designation || null, contact.Location || null, contact.OfficeType || null, contact.Mobile || null, contact.Email || null, contact.DOB || null, addressValue
            ]);
          }
        }
      } // End of else block for legacy contact handling

      // Update cogent contacts
      if (customer.CustomerCogentContact) {
        await pool.query('DELETE FROM customer_cogent_contact WHERE CustomerID = ?', [id]);
        const cogent = customer.CustomerCogentContact;
        await pool.query('INSERT INTO customer_cogent_contact (CustomerID, CustomerOwner, ProjectHead, OpsHead, OpsManager, Supervisor) VALUES (?, ?, ?, ?, ?, ?)', [
          id, cogent.CustomerOwner, cogent.ProjectHead, cogent.OpsHead, cogent.OpsManager, cogent.Supervisor
        ]);
      }

      // Add a small delay to ensure file system operations are complete before responding
      setTimeout(() => {
        res.json({ CustomerID: parseInt(id), ...customer, ...filePaths });
      }, 100);
    } catch (error) {
      console.error('Error updating customer:', error);

      // Handle specific database errors
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('CustomerCode')) {
          res.status(400).json({ error: 'A customer with this code already exists. Please use a different code.' });
        } else if (error.message.includes('Name')) {
          res.status(400).json({ error: 'A customer with this name already exists. Please use a different name.' });
        } else if (error.message.includes('Email')) {
          res.status(400).json({ error: 'This email address is already registered. Please use a different email.' });
        } else {
          res.status(400).json({ error: 'This customer information already exists. Please check your data and try again.' });
        }
      } else if (error.code === 'ER_DATA_TOO_LONG') {
        res.status(400).json({ error: 'Some of the information you entered is too long. Please shorten your entries and try again.' });
      } else if (error.code === 'ER_BAD_NULL_ERROR') {
        res.status(400).json({ error: 'Required information is missing. Please fill in all required fields.' });
      } else if (error.code === 'ECONNREFUSED') {
        res.status(503).json({ error: 'Unable to connect to database. Please try again later.' });
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        res.status(503).json({ error: 'Database access denied. Please contact support.' });
      } else {
        res.status(500).json({ error: 'Unable to update customer information. Please check your data and try again.' });
      }
    }
  });

  // Bulk delete customers
  // This route deletes multiple customer records from the database based on the provided array of IDs.
  router.delete('/bulk', async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of customer IDs to delete' });
    }

    try {
      console.log(`🗑️ Bulk delete customers - IDs: ${ids.join(', ')}`);

      // Create placeholders for the IN clause
      const placeholders = ids.map(() => '?').join(',');
      const [result] = await pool.query(`DELETE FROM Customer WHERE CustomerID IN (${placeholders})`, ids);

      const deletedCount = result.affectedRows;
      const notFoundCount = ids.length - deletedCount;

      console.log(`✅ Bulk delete completed - Deleted: ${deletedCount}, Not found: ${notFoundCount}`);

      res.json({
        message: `Successfully deleted ${deletedCount} customer(s)`,
        deletedCount,
        notFoundCount,
        totalRequested: ids.length
      });
    } catch (error) {
      console.error('❌ Error bulk deleting customers:', error);

      // Handle specific database errors
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        res.status(400).json({ error: 'Cannot delete one or more customers because they are referenced by other records. Please remove related records first.' });
      } else if (error.code === 'ECONNREFUSED') {
        res.status(503).json({ error: 'Unable to connect to database. Please try again later.' });
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        res.status(503).json({ error: 'Database access denied. Please contact support.' });
      } else {
        res.status(500).json({ error: 'Unable to delete customers. Please try again later.' });
      }
    }
  });

  // Delete a customer
  // This route deletes a customer record from the database based on the provided ID.
  // It responds with a success message if the deletion is successful, or a 404 error if the customer is not found.
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [result] = await pool.query('DELETE FROM Customer WHERE CustomerID = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
      console.error('Error deleting customer:', error);

      // Handle specific database errors
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        res.status(400).json({ error: 'Cannot delete this customer because it is referenced by other records. Please remove related records first.' });
      } else if (error.code === 'ECONNREFUSED') {
        res.status(503).json({ error: 'Unable to connect to database. Please try again later.' });
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        res.status(503).json({ error: 'Database access denied. Please contact support.' });
      } else {
        res.status(500).json({ error: 'Unable to delete customer. Please try again later.' });
      }
    }
  });

  // Serve customer files from external directory
  router.get('/files/:filename', (req, res) => {
    const filename = req.params.filename;

    // Handle both old format (just filename) and new format (customers/filename)
    let relativePath = filename;
    if (!filename.includes('/')) {
      relativePath = `customers/${filename}`;
    }

    const filePath = uploadsManager.getFullPath(relativePath);
    console.log('🔍 Serving customer file:', { filename, relativePath, filePath });

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('❌ Customer file not found:', filePath);
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file extension to determine content type
    const fileExtension = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream'; // Default

    // Set appropriate content type based on file extension
    switch (fileExtension) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case '.xls':
        contentType = 'application/vnd.ms-excel';
        break;
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      default:
        contentType = 'application/octet-stream';
    }

    // Set proper headers for file serving
    res.setHeader('Content-Type', contentType);

    // For PDFs, be very explicit about inline viewing
    if (contentType === 'application/pdf') {
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(filename)}"`);
      // Additional headers to ensure PDF displays inline
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }

    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Set cache headers to prevent caching issues with newly uploaded files
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Send file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('❌ Error serving customer file:', err);
        // Send proper error response based on error type
        if (err.code === 'ENOENT') {
          res.status(404).json({ error: 'File not found' });
        } else if (err.code === 'EACCES') {
          res.status(403).json({ error: 'Access denied to file' });
        } else {
          res.status(500).json({ error: 'Error serving file' });
        }
      }
    });
  });

  // Delete specific file from customer
  router.delete('/:id/files/:fieldName', async (req, res) => {
    try {
      const { id, fieldName } = req.params;

      console.log(`🗑️ Deleting customer file - ID: ${id}, Field: ${fieldName}`);

      // Get current customer data to find the file path
      const [customers] = await pool.query('SELECT * FROM Customer WHERE CustomerID = ?', [id]);

      if (customers.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const customer = customers[0];
      const fileName = customer[fieldName];

      if (!fileName) {
        return res.status(404).json({ error: 'File not found in database' });
      }

      // Delete file from filesystem using uploadsManager
      // Handle three formats:
      // 1. Just filename: "file.pdf"
      // 2. Relative path: "customers/file.pdf"
      // 3. Full path (legacy): "d:/tms-uploads/customers/file.pdf"
      let relativePath = fileName;

      // Check if it's a full path (contains base uploads directory)
      const baseDir = uploadsManager.getBaseUploadPath();
      if (fileName.includes(baseDir)) {
        // Extract relative path from full path
        relativePath = fileName.replace(baseDir, '').replace(/^[\/\\]+/, '');
        console.log('🗑️ CUSTOMER FILE DELETE - Detected full path, extracted relative:', relativePath);
      } else if (!fileName.includes('/') && !fileName.includes('\\')) {
        // Just filename, add entity prefix
        relativePath = `customers/${fileName}`;
      }

      const filePath = uploadsManager.getFullPath(relativePath);
      console.log('🗑️ CUSTOMER FILE DELETE - Relative path:', relativePath);
      console.log('🗑️ CUSTOMER FILE DELETE - Full path:', filePath);

      if (uploadsManager.fileExists(relativePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ File deleted from filesystem: ${filePath}`);
      } else {
        console.warn(`⚠️ File not found in filesystem: ${filePath}`);
      }

      // Update database to remove file reference
      const updateQuery = `UPDATE Customer SET ${fieldName} = NULL WHERE CustomerID = ?`;
      await pool.query(updateQuery, [id]);

      console.log(`✅ Customer file deleted successfully - ID: ${id}, Field: ${fieldName}`);
      res.json({
        success: true,
        message: 'File deleted successfully',
        fieldName,
        fileName
      });

    } catch (error) {
      console.error('❌ Error deleting customer file:', error);
      res.status(500).json({
        error: 'Failed to delete file',
        details: error.message
      });
    }
  });

  // Customer sites are now stored directly in the Customer table

  return router;
};

