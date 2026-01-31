const express = require('express');
const multer = require('multer');

const uploadsManager = require('../utils/uploadsManager');
const router = express.Router();

// Utility function to generate project abbreviation
const generateProjectAbbreviation = (name, length = 3) => {
  if (!name || typeof name !== 'string') return 'PRJ';

  // Remove special characters and split into words
  const words = name.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'PRJ';

  if (words.length === 1) {
    // Single word - take first N characters
    return words[0].substring(0, length).toUpperCase();
  } else if (words.length === 2) {
    // Two words - take first 2 chars from first word, 1 from second
    const first = words[0].substring(0, 2).toUpperCase();
    const second = words[1].substring(0, 1).toUpperCase();
    return (first + second).substring(0, length);
  } else {
    // Multiple words - take first character from each word
    return words.map(word => word.charAt(0).toUpperCase()).join('').substring(0, length);
  }
};

// Configure multer for file uploads using external directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use external uploads directory for projects
    const uploadDir = uploadsManager.ensureEntityDirectory('projects');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit (increased for large PDF documents)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, Word documents, Excel files, and text files are allowed.'), false);
    }
  }
});

const validateDateSequence = (projectData) => {
  const errors = [];

  const checkDates = (startDateField, expiryDateField, errorMsg) => {
    const startDate = projectData[startDateField];
    const expiryDate = projectData[expiryDateField];

    if (startDate && expiryDate && new Date(expiryDate) < new Date(startDate)) {
      errors.push(errorMsg);
    }
  };

  checkDates('StartDate', 'EndDate', 'Project End Date cannot be before Project Start Date');

  return errors;
};

// This file defines API routes for managing project data in the Transport Management System.
// It uses Express.js to create route handlers for CRUD operations (Create, Read, Update, Delete)
// related to projects. The routes interact with a MySQL database through a connection pool.

module.exports = (pool) => {


  // Utility function to auto-update project status (can be called from other routes)
  const updateExpiredProjectStatus = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [result] = await pool.query(`
        UPDATE Project
        SET Status = 'Inactive', UpdatedAt = NOW()
        WHERE EndDate < ? AND Status = 'Active'
      `, [today]);

      if (result.affectedRows > 0) {
        console.log(`🔄 Auto-updated ${result.affectedRows} expired projects to Inactive status`);
      }

      return result.affectedRows;
    } catch (error) {
      console.error('Error auto-updating project status:', error);
      return 0;
    }
  };

  // Get all projects with optional date filtering
  // This route retrieves all project records from the database with customer information.
  // It responds with a JSON array of project objects including customer names.
  // Supports date filtering via fromDate and toDate query parameters.
  router.get('/', async (req, res) => {
    try {
      // Auto-update expired project status before fetching
      await updateExpiredProjectStatus();

      const { fromDate, toDate } = req.query;

      // Build date filter conditions
      let dateFilter = '';
      let dateParams = [];

      if (fromDate && toDate) {
        dateFilter = 'WHERE DATE(p.CreatedAt) BETWEEN ? AND ?';
        dateParams = [fromDate, toDate];
        console.log('🗓️ Backend: Applying project CreatedAt date filter from', fromDate, 'to', toDate);
      } else if (fromDate) {
        dateFilter = 'WHERE DATE(p.CreatedAt) >= ?';
        dateParams = [fromDate];
        console.log('🗓️ Backend: Applying project CreatedAt date filter from', fromDate);
      } else if (toDate) {
        dateFilter = 'WHERE DATE(p.CreatedAt) <= ?';
        dateParams = [toDate];
        console.log('🗓️ Backend: Applying project CreatedAt date filter to', toDate);
      }

      const query = `
        SELECT
          p.*,
          c.Name as CustomerName,
          c.CustomerCode
        FROM Project p
        LEFT JOIN Customer c ON p.CustomerID = c.CustomerID
        ${dateFilter}
        ORDER BY p.ProjectID DESC
      `;

      const [rows] = await pool.query(query, dateParams);
      console.log('🔍 Backend: Found', rows.length, 'projects with date filter');

      res.json(rows);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get projects by customer ID
  // This route retrieves all project records for a specific customer.
  // It responds with a JSON array of project objects for the given customer.
  // NOTE: This route must come BEFORE the /:id route to avoid conflicts
  router.get('/customer/:customerId', async (req, res) => {
    const { customerId } = req.params;
    try {
      const [rows] = await pool.query(`
        SELECT
          p.*,
          c.Name as CustomerName,
          c.CustomerCode
        FROM Project p
        LEFT JOIN Customer c ON p.CustomerID = c.CustomerID
        WHERE p.CustomerID = ?
        ORDER BY p.ProjectID DESC
      `, [customerId]);
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching projects by customer:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });



  // Get a single project by ID
  // This route retrieves a single project record from the database by ID with customer information.
  // It responds with a JSON object of the project including customer name and file URLs.
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      console.log('📋 PROJECT GET BY ID DEBUG - Fetching project ID:', id);

      const [rows] = await pool.query(`
        SELECT p.*, c.Name as CustomerName
        FROM Project p
        LEFT JOIN Customer c ON p.CustomerID = c.CustomerID
        WHERE p.ProjectID = ?
      `, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching project by ID:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create a new project
  // This route creates a new project record in the database using the data provided in the request body.
  // It responds with a 201 status code and the newly created project's data, including the generated ID.
  router.post('/', async (req, res) => {
    const { ProjectName, CustomerID, ProjectCode, ProjectDescription, LocationID, Location, ProjectValue, StartDate, EndDate, Status } = req.body;

    console.log('📁 PROJECT CREATE DEBUG - Body received:', req.body);

    // Validate required fields
    if (!ProjectName || !CustomerID) {
      return res.status(400).json({
        error: 'ProjectName and CustomerID are required fields'
      });
    }

    const dateErrors = validateDateSequence(req.body);
    if (dateErrors.length > 0) {
      return res.status(400).json({ errors: dateErrors });
    }

    try {
      // Check if customer exists
      const [customerCheck] = await pool.query(
        'SELECT CustomerID, CustomerCode FROM Customer WHERE CustomerID = ?',
        [CustomerID]
      );
      
      if (customerCheck.length === 0) {
        return res.status(400).json({ error: 'Customer not found' });
      }

      // Generate ProjectCode automatically if not provided
      let projectCode = ProjectCode;
      if (!projectCode || projectCode.trim() === '') {
        const customerCode = customerCheck[0].CustomerCode;
        const projectNamePrefix = ProjectName.substring(0, 3).toUpperCase();
        const baseCode = `${customerCode}-${projectNamePrefix}`;

        // Find the highest existing project code number to avoid conflicts
        const [maxCodeResult] = await pool.query(`
          SELECT ProjectCode FROM Project
          WHERE ProjectCode REGEXP '^${baseCode}[0-9]+$'
          ORDER BY CAST(SUBSTRING(ProjectCode, ${baseCode.length + 1}) AS UNSIGNED) DESC
          LIMIT 1
        `);

        let nextNumber = 1;
        if (maxCodeResult.length > 0) {
          const maxCode = maxCodeResult[0].ProjectCode;
          const currentNumber = parseInt(maxCode.substring(baseCode.length));
          nextNumber = currentNumber + 1;
        }

        projectCode = `${baseCode}${String(nextNumber).padStart(3, '0')}`;

        // Double-check that this code doesn't exist (safety check)
        const [existingCheck] = await pool.query(
          'SELECT ProjectID FROM Project WHERE ProjectCode = ?',
          [projectCode]
        );

        // If somehow it still exists, keep incrementing until we find a free one
        while (existingCheck.length > 0) {
          nextNumber++;
          projectCode = `${baseCode}${String(nextNumber).padStart(3, '0')}`;
          const [recheckResult] = await pool.query(
            'SELECT ProjectID FROM Project WHERE ProjectCode = ?',
            [projectCode]
          );
          if (recheckResult.length === 0) break;
        }
      }



      // Handle LocationID - if it's a customer site (starts with 'site_'), store as NULL
      let locationIdValue = null;
      if (LocationID && !LocationID.toString().startsWith('site_')) {
        // Regular location ID (numeric)
        locationIdValue = LocationID;
      }
      // For customer sites, we store NULL in LocationID and the site info is handled via customer relationship

      const [result] = await pool.query(
        'INSERT INTO Project (ProjectName, CustomerID, ProjectCode, ProjectDescription, LocationID, Location, ProjectValue, StartDate, EndDate, Status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [ProjectName, CustomerID, projectCode, ProjectDescription || '', locationIdValue, Location || null, ProjectValue || null, StartDate || null, EndDate || null, Status || 'Active']
      );
      
      // Fetch the created project with customer information
      const [newProject] = await pool.query(`
        SELECT
          p.*,
          c.Name as CustomerName,
          c.CustomerCode
        FROM Project p
        LEFT JOIN Customer c ON p.CustomerID = c.CustomerID
        WHERE p.ProjectID = ?
      `, [result.insertId]);
      
      res.status(201).json(newProject[0]);
    } catch (error) {
      console.error('Error creating project:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: 'Project code already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Update a project
  // This route updates an existing project record identified by the provided ID with new data from the request body.
  // It responds with the updated project data if successful, or a 404 error if the project is not found.
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { ProjectName, CustomerID, ProjectCode, ProjectDescription, LocationID, Location, ProjectValue, StartDate, EndDate, Status } = req.body;

    // Validate required fields
    if (!ProjectName || !CustomerID) {
      return res.status(400).json({
        error: 'ProjectName and CustomerID are required fields'
      });
    }

    const dateErrors = validateDateSequence(req.body);
    if (dateErrors.length > 0) {
      return res.status(400).json({ errors: dateErrors });
    }

    try {
      // Check if customer exists
      const [customerCheck] = await pool.query(
        'SELECT CustomerID FROM Customer WHERE CustomerID = ?',
        [CustomerID]
      );
      
      if (customerCheck.length === 0) {
        return res.status(400).json({ error: 'Customer not found' });
      }

      // Handle LocationID - if it's a customer site (starts with 'site_'), store as NULL
      let locationIdValue = null;
      if (LocationID && !LocationID.toString().startsWith('site_')) {
        // Regular location ID (numeric)
        locationIdValue = LocationID;
      }
      // For customer sites, we store NULL in LocationID and the site info is handled via customer relationship

      // Handle file upload
      let updateFields = 'ProjectName = ?, CustomerID = ?, ProjectCode = ?, ProjectDescription = ?, LocationID = ?, Location = ?, ProjectValue = ?, StartDate = ?, EndDate = ?, Status = ?';
      let updateValues = [ProjectName, CustomerID, ProjectCode, ProjectDescription || '', locationIdValue, Location || null, ProjectValue || null, StartDate || null, EndDate || null, Status || 'Active'];

      updateValues.push(id); // Add the WHERE clause parameter

      const [result] = await pool.query(
        `UPDATE Project SET ${updateFields} WHERE ProjectID = ?`,
        updateValues
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Fetch the updated project with customer information
      const [updatedProject] = await pool.query(`
        SELECT
          p.*,
          c.Name as CustomerName,
          c.CustomerCode
        FROM Project p
        LEFT JOIN Customer c ON p.CustomerID = c.CustomerID
        WHERE p.ProjectID = ?
      `, [id]);

      res.json(updatedProject[0]);
    } catch (error) {
      console.error('Error updating project:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: 'Project code already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Bulk delete projects
  // This route deletes multiple project records based on the provided array of IDs.
  router.delete('/bulk', async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of project IDs to delete' });
    }

    try {
      console.log(`🗑️ Bulk delete projects - IDs: ${ids.join(', ')}`);

      // Create placeholders for the IN clause
      const placeholders = ids.map(() => '?').join(',');
      const [result] = await pool.query(`DELETE FROM Project WHERE ProjectID IN (${placeholders})`, ids);

      const deletedCount = result.affectedRows;
      const notFoundCount = ids.length - deletedCount;

      console.log(`✅ Bulk delete completed - Deleted: ${deletedCount}, Not found: ${notFoundCount}`);

      res.json({
        message: `Successfully deleted ${deletedCount} project(s)`,
        deletedCount,
        notFoundCount,
        totalRequested: ids.length
      });
    } catch (error) {
      console.error('❌ Error bulk deleting projects:', error);

      // Handle specific database errors
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        res.status(400).json({ error: 'Cannot delete one or more projects because they are referenced by other records. Please remove related records first.' });
      } else if (error.code === 'ECONNREFUSED') {
        res.status(503).json({ error: 'Database connection failed. Please try again later.' });
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        res.status(403).json({ error: 'Access denied. Please check your permissions.' });
      } else {
        res.status(500).json({ error: 'Unable to delete projects. Please try again later.' });
      }
    }
  });

  // Delete a project
  // This route deletes a project record identified by the provided ID.
  // It responds with a success message if the project is deleted, or a 404 error if the project is not found.
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [result] = await pool.query('DELETE FROM Project WHERE ProjectID = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create new project
  router.post('/', upload.fields([
    { name: 'ContractFile', maxCount: 1 },
    { name: 'SOWFile', maxCount: 1 }
  ]), async (req, res) => {
    const project = req.body;
    const files = req.files;

    try {
      // Generate ProjectCode automatically if not provided
      let projectCode = project.ProjectCode;
      if (!projectCode || projectCode.trim() === '') {
        // Get customer details for code generation
        const [customer] = await pool.query('SELECT Name, MasterCustomerName, CustomerCode, CustomerSite, Locations FROM Customer WHERE CustomerID = ?', [project.CustomerID]);

        if (customer.length === 0) {
          return res.status(404).json({ error: 'Customer not found' });
        }

        const projectName = (project.ProjectName || '').trim();
        const masterCustomerName = (customer[0].MasterCustomerName || '').trim();
        const companyName = (customer[0].Name || '').trim();
        const customerCode = (customer[0].CustomerCode || '').trim();
        const customerLocations = (customer[0].Locations || '').trim();
        const customerSites = (customer[0].CustomerSite || '').trim();

        // Handle location names - LocationID might be comma-separated or array
        let locationNames = [];
        if (project.LocationID) {
          const locationIds = Array.isArray(project.LocationID)
            ? project.LocationID
            : project.LocationID.toString().split(',').map(id => id.trim()).filter(Boolean);

          if (locationIds.length > 0) {
            // Check if these are customer site IDs (start with 'site_')
            const customerSiteIds = locationIds.filter(id => id.startsWith('site_'));
            const regularLocationIds = locationIds.filter(id => !id.startsWith('site_'));

            // Handle customer sites - get from Customer.CustomerSite field
            if (customerSiteIds.length > 0 && customer.length > 0) {
              const customerSite = customer[0].CustomerSite || '';
              if (customerSite) {
                // Parse customer sites (format: "Location - Site, Location2 - Site2")
                const sites = customerSite.split(',').map(site => site.trim()).filter(Boolean);
                // For now, just use the first site for code generation
                if (sites.length > 0) {
                  // Store the full site string for proper parsing later
                  locationNames.push(sites[0].trim()); // Keep full format: "sfdlgfkl - jgkdjkfg"
                }
              }
            }

            // Handle regular location IDs from Location table
            if (regularLocationIds.length > 0) {
              const [locations] = await pool.query(
                `SELECT LocationName FROM Location WHERE LocationID IN (${regularLocationIds.map(() => '?').join(',')})`,
                regularLocationIds
              );
              locationNames.push(...locations.map(loc => loc.LocationName));
            }
          }
        }

        // Helper function to generate meaningful abbreviation from text
        const generateAbbreviation = (text, maxLength = 3) => {
          if (!text) return '';

          // Remove common words and special characters
          const cleanText = text
            .replace(/[^\w\s]/g, ' ')
            .replace(/\b(the|and|of|for|in|on|at|to|a|an)\b/gi, '')
            .trim();

          // Split into words
          const words = cleanText.split(/\s+/).filter(Boolean);

          if (words.length === 0) {
            return text.substring(0, maxLength).toUpperCase();
          }

          // If single word, take first N characters
          if (words.length === 1) {
            return words[0].substring(0, maxLength).toUpperCase();
          }

          // If multiple words, take first letter of each word
          let abbr = words.map(w => w.charAt(0).toUpperCase()).join('');

          // If abbreviation is too long, truncate
          if (abbr.length > maxLength) {
            abbr = abbr.substring(0, maxLength);
          }

          // If abbreviation is too short, pad with letters from first word
          if (abbr.length < maxLength && words[0].length > 1) {
            const remaining = maxLength - abbr.length;
            abbr += words[0].substring(1, 1 + remaining).toUpperCase();
          }

          return abbr;
        };

        // Generate project code using customer details
        // Format: [MasterCustAbbr]-[CompanyAbbr]-[LocationAbbr]-[ProjectAbbr]-[Seq]

        // Get Master Customer Name abbreviation (3 characters)
        const masterCustAbbr = generateAbbreviation(masterCustomerName || companyName, 3);

        // Get Company Name abbreviation (3-4 characters)
        const companyAbbr = generateAbbreviation(companyName, 4);

        // Get Location/Site abbreviation (3 characters)
        let locationAbbr = 'LOC';
        if (locationNames.length > 0) {
          const locationName = locationNames[0];
          // If location has format "Location - Site", use both parts
          if (locationName.includes(' - ')) {
            const parts = locationName.split(' - ').map(p => p.trim());
            // Take first letter from each part and add one more from first part
            const part1Abbr = generateAbbreviation(parts[0], 2);
            const part2Abbr = parts[1] ? parts[1].charAt(0).toUpperCase() : '';
            locationAbbr = (part1Abbr + part2Abbr).substring(0, 3);
          } else {
            locationAbbr = generateAbbreviation(locationName, 3);
          }
        } else if (customerLocations) {
          // Use customer's Locations field if no specific location selected
          locationAbbr = generateAbbreviation(customerLocations, 3);
        } else if (customerSites) {
          // Use customer's CustomerSite field as fallback
          const firstSite = customerSites.split(',')[0].trim();
          if (firstSite.includes(' - ')) {
            const parts = firstSite.split(' - ').map(p => p.trim());
            const part1Abbr = generateAbbreviation(parts[0], 2);
            const part2Abbr = parts[1] ? parts[1].charAt(0).toUpperCase() : '';
            locationAbbr = (part1Abbr + part2Abbr).substring(0, 3);
          } else {
            locationAbbr = generateAbbreviation(firstSite, 3);
          }
        }

        // Get project abbreviation (3 characters from project name)
        const projectAbbr = generateAbbreviation(projectName, 3);

        // Create the base prefix: MasterCustAbbr-CompanyAbbr-LocationAbbr-ProjectAbbr
        const namePrefix = `${masterCustAbbr}-${companyAbbr}-${locationAbbr}-${projectAbbr}`;

        console.log('🔧 Main route code generation details:', {
          projectName,
          masterCustomerName,
          companyName,
          customerLocations,
          customerSites,
          locationNames,
          masterCustAbbr,
          companyAbbr,
          locationAbbr,
          projectAbbr,
          namePrefix
        });

        // Find the highest existing project code number with the same prefix
        let nextNumber = 1;
        const [rows] = await pool.query(
          'SELECT ProjectCode FROM Project WHERE ProjectCode LIKE ?',
          [`${namePrefix}-%`]
        );

        if (rows.length > 0) {
          const numbers = rows
            .map(row => {
              // Extract number from format: PREFIX-001
              const match = row.ProjectCode.match(new RegExp(`^${namePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`));
              return match ? parseInt(match[1]) : 0;
            })
            .filter(num => num > 0);

          if (numbers.length > 0) {
            nextNumber = Math.max(...numbers) + 1;
          }
        }

        // Final project code: CustomerCode-ProjectAbbr-LocationAbbr-001
        projectCode = `${namePrefix}-${String(nextNumber).padStart(3, '0')}`;

        // Double-check that this code doesn't exist (safety check)
        let [existingCheck] = await pool.query(
          'SELECT ProjectID FROM Project WHERE ProjectCode = ?',
          [projectCode]
        );

        // If somehow it still exists, keep incrementing until we find a free one
        let attempts = 0;
        while (existingCheck.length > 0 && attempts < 100) {
          nextNumber++;
          projectCode = `${namePrefix}-${String(nextNumber).padStart(3, '0')}`;
          [existingCheck] = await pool.query(
            'SELECT ProjectID FROM Project WHERE ProjectCode = ?',
            [projectCode]
          );
          attempts++;
        }

        // Fallback if we can't find a unique code
        if (existingCheck.length > 0) {
          const timestamp = Date.now().toString().slice(-6);
          projectCode = `${namePrefix}${timestamp}`;
        }
      }

      // Handle file paths - store relative paths for database
      const filePaths = {};
      if (files) {

        if (files.ContractFile) {
          filePaths.ContractFile = uploadsManager.getRelativePath('projects', files.ContractFile[0].filename);
          console.log('📁 PROJECT CREATE (NEW) DEBUG - ContractFile relative path:', filePaths.ContractFile);
        }
        if (files.SOWFile) {
          filePaths.SOWFile = uploadsManager.getRelativePath('projects', files.SOWFile[0].filename);
          console.log('📁 PROJECT CREATE (NEW) DEBUG - SOWFile relative path:', filePaths.SOWFile);
        }
      }

      const insertQuery = `INSERT INTO Project (
        ProjectName, ProjectCode, CustomerID, Location, ProjectType, ProjectStatus,
        StartDate, EndDate, ProjectValue, Currency, ProjectDescription,
        ContractFile, SOWFile, CreatedAt, UpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const now = new Date();
      const insertParams = [
        project.ProjectName || null,
        projectCode || null,
        project.CustomerID || null,
        project.Location || null,
        project.ProjectType || null,
        project.ProjectStatus || 'Planning',
        project.StartDate || null,
        project.EndDate || null,
        project.ProjectValue || null,
        project.Currency || 'INR',
        project.ProjectDescription || null,
        filePaths.ContractFile || null,
        filePaths.SOWFile || null,
        now,
        now
      ];

      const [result] = await pool.query(insertQuery, insertParams);
      const projectId = result.insertId;

      console.log(`✅ Project created successfully - ID: ${projectId}, Code: ${projectCode}`);
      res.json({ ProjectID: projectId, ProjectCode: projectCode, ...project, ...filePaths });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Preview project code generation
  router.post('/preview-code', async (req, res) => {
    try {
      console.log('🔧 Preview code request received:', req.body);
      const { ProjectName, CustomerID, LocationID } = req.body;

      if (!ProjectName || !CustomerID) {
        console.log('❌ Missing required fields:', { ProjectName, CustomerID });
        return res.status(400).json({ error: 'ProjectName and CustomerID are required' });
      }

      // Get customer details for code generation
      const [customer] = await pool.query('SELECT Name, MasterCustomerName, CustomerCode, CustomerSite, Locations FROM Customer WHERE CustomerID = ?', [CustomerID]);

      if (customer.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const projectName = (ProjectName || '').trim();
      const masterCustomerName = (customer[0].MasterCustomerName || '').trim();
      const companyName = (customer[0].Name || '').trim();
      const customerCode = (customer[0].CustomerCode || '').trim();
      const customerLocations = (customer[0].Locations || '').trim();
      const customerSites = (customer[0].CustomerSite || '').trim();

      // Handle location names - LocationID might be comma-separated or array
      let locationNames = [];
      if (LocationID) {
        const locationIds = Array.isArray(LocationID)
          ? LocationID
          : LocationID.toString().split(',').map(id => id.trim()).filter(Boolean);

        if (locationIds.length > 0) {
          // Check if these are customer site IDs (start with 'site_')
          const customerSiteIds = locationIds.filter(id => id.startsWith('site_'));
          const regularLocationIds = locationIds.filter(id => !id.startsWith('site_'));

          // Handle customer sites - get from Customer.CustomerSite field
          if (customerSiteIds.length > 0 && customer.length > 0) {
            const customerSite = customer[0].CustomerSite || '';
            if (customerSite) {
              // Parse customer sites (format: "Location - Site, Location2 - Site2")
              const sites = customerSite.split(',').map(site => site.trim()).filter(Boolean);
              // For now, just use the first site for code generation
              if (sites.length > 0) {
                // Store the full site string for proper parsing later
                locationNames.push(sites[0].trim()); // Keep full format: "sfdlgfkl - jgkdjkfg"
              }
            }
          }

          // Handle regular location IDs from Location table
          if (regularLocationIds.length > 0) {
            const [locations] = await pool.query(
              `SELECT LocationName FROM Location WHERE LocationID IN (${regularLocationIds.map(() => '?').join(',')})`,
              regularLocationIds
            );
            locationNames.push(...locations.map(loc => loc.LocationName));
          }
        }
      }

      // Helper function to generate meaningful abbreviation from text
      const generateAbbreviation = (text, maxLength = 3) => {
        if (!text) return '';

        // Remove common words and special characters
        const cleanText = text
          .replace(/[^\w\s]/g, ' ')
          .replace(/\b(the|and|of|for|in|on|at|to|a|an)\b/gi, '')
          .trim();

        // Split into words
        const words = cleanText.split(/\s+/).filter(Boolean);

        if (words.length === 0) {
          return text.substring(0, maxLength).toUpperCase();
        }

        // If single word, take first N characters
        if (words.length === 1) {
          return words[0].substring(0, maxLength).toUpperCase();
        }

        // If multiple words, take first letter of each word
        let abbr = words.map(w => w.charAt(0).toUpperCase()).join('');

        // If abbreviation is too long, truncate
        if (abbr.length > maxLength) {
          abbr = abbr.substring(0, maxLength);
        }

        // If abbreviation is too short, pad with letters from first word
        if (abbr.length < maxLength && words[0].length > 1) {
          const remaining = maxLength - abbr.length;
          abbr += words[0].substring(1, 1 + remaining).toUpperCase();
        }

        return abbr;
      };

      // Generate project code using customer details
      // Format: [MasterCustAbbr]-[CompanyAbbr]-[LocationAbbr]-[ProjectAbbr]-[Seq]

      // Get Master Customer Name abbreviation (3 characters)
      const masterCustAbbr = generateAbbreviation(masterCustomerName || companyName, 3);

      // Get Company Name abbreviation (3-4 characters)
      const companyAbbr = generateAbbreviation(companyName, 4);

      // Get Location/Site abbreviation (3 characters)
      let locationAbbr = 'LOC';
      if (locationNames.length > 0) {
        const locationName = locationNames[0];
        // If location has format "Location - Site", use both parts
        if (locationName.includes(' - ')) {
          const parts = locationName.split(' - ').map(p => p.trim());
          // Take first letter from each part and add one more from first part
          const part1Abbr = generateAbbreviation(parts[0], 2);
          const part2Abbr = parts[1] ? parts[1].charAt(0).toUpperCase() : '';
          locationAbbr = (part1Abbr + part2Abbr).substring(0, 3);
        } else {
          locationAbbr = generateAbbreviation(locationName, 3);
        }
      } else if (customerLocations) {
        // Use customer's Locations field if no specific location selected
        locationAbbr = generateAbbreviation(customerLocations, 3);
      } else if (customerSites) {
        // Use customer's CustomerSite field as fallback
        const firstSite = customerSites.split(',')[0].trim();
        if (firstSite.includes(' - ')) {
          const parts = firstSite.split(' - ').map(p => p.trim());
          const part1Abbr = generateAbbreviation(parts[0], 2);
          const part2Abbr = parts[1] ? parts[1].charAt(0).toUpperCase() : '';
          locationAbbr = (part1Abbr + part2Abbr).substring(0, 3);
        } else {
          locationAbbr = generateAbbreviation(firstSite, 3);
        }
      }

      // Get project abbreviation (3 characters from project name)
      const projectAbbr = generateAbbreviation(projectName, 3);

      // Create the base prefix: MasterCustAbbr-CompanyAbbr-LocationAbbr-ProjectAbbr
      const namePrefix = `${masterCustAbbr}-${companyAbbr}-${locationAbbr}-${projectAbbr}`;

      console.log('🔧 Preview code generation details:', {
        projectName,
        masterCustomerName,
        companyName,
        customerLocations,
        customerSites,
        locationNames,
        masterCustAbbr,
        companyAbbr,
        locationAbbr,
        projectAbbr,
        namePrefix
      });

      // Find the highest existing project code number with the same prefix
      let nextNumber = 1;
      const [rows] = await pool.query(
        'SELECT ProjectCode FROM Project WHERE ProjectCode LIKE ?',
        [`${namePrefix}-%`]
      );

      if (rows.length > 0) {
        const numbers = rows
          .map(row => {
            // Extract number from format: PREFIX-001
            const match = row.ProjectCode.match(new RegExp(`^${namePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`));
            return match ? parseInt(match[1]) : 0;
          })
          .filter(num => num > 0);

        if (numbers.length > 0) {
          nextNumber = Math.max(...numbers) + 1;
        }
      }

      // Final project code: CustomerCode-ProjectAbbr-LocationAbbr-001
      const projectCode = `${namePrefix}-${String(nextNumber).padStart(3, '0')}`;

      res.json({
        success: true,
        projectCode,
        details: {
          projectName,
          masterCustomerName,
          companyName,
          customerCode,
          customerLocations,
          customerSites,
          locationNames,
          masterCustAbbr,
          companyAbbr,
          projectAbbr,
          locationAbbr,
          namePrefix,
          nextNumber
        }
      });
    } catch (error) {
      console.error('❌ Error generating project code preview:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  // Check and update project status based on end dates
  router.post('/check-status', async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

      // Find projects that have ended but are still active
      const [expiredProjects] = await pool.query(`
        SELECT ProjectID, ProjectName, ProjectCode, EndDate, Status
        FROM Project
        WHERE EndDate < ? AND Status = 'Active'
      `, [today]);

      if (expiredProjects.length === 0) {
        return res.json({
          success: true,
          message: 'No projects need status update',
          updatedCount: 0,
          projects: []
        });
      }

      // Update expired projects to Inactive
      const projectIds = expiredProjects.map(p => p.ProjectID);
      const placeholders = projectIds.map(() => '?').join(',');

      const [updateResult] = await pool.query(`
        UPDATE Project
        SET Status = 'Inactive', UpdatedAt = NOW()
        WHERE ProjectID IN (${placeholders})
      `, projectIds);

      console.log(`📅 Updated ${updateResult.affectedRows} expired projects to Inactive status`);

      res.json({
        success: true,
        message: `Updated ${updateResult.affectedRows} expired projects to Inactive status`,
        updatedCount: updateResult.affectedRows,
        projects: expiredProjects.map(p => ({
          ProjectID: p.ProjectID,
          ProjectName: p.ProjectName,
          ProjectCode: p.ProjectCode,
          EndDate: p.EndDate,
          oldStatus: p.Status,
          newStatus: 'Inactive'
        }))
      });

    } catch (error) {
      console.error('Error checking project status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  // Export the utility function for use in other parts of the application
  router.updateExpiredProjectStatus = updateExpiredProjectStatus;



  return router;
};