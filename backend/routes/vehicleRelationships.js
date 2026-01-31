const express = require('express');
const router = express.Router();

// This file defines API routes for managing vehicle relationships in the Transport Management System.
// It handles the complex relationships between customers, vendors, projects, and vehicles.

module.exports = (pool) => {
  
  // =====================================================================
  // ENHANCED RELATIONSHIP MANAGEMENT ENDPOINTS
  // =====================================================================

  // Get complete relationship overview for a customer
  router.get('/customer/:customerId/overview', async (req, res) => {
    try {
      const { customerId } = req.params;

      // Get customer details
      const [customer] = await pool.query('SELECT * FROM customers WHERE customer_id = ?', [customerId]);
      if (customer.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Get customer's projects
      const [projects] = await pool.query(`
        SELECT p.*,
               v.vehicle_id, v.vehicle_number, v.make, v.model,
               vn.vendor_name
        FROM projects p
        LEFT JOIN vehicles v ON p.project_id = v.project_id
        LEFT JOIN vendors vn ON v.vendor_id = vn.vendor_id
        WHERE p.customer_id = ?
        ORDER BY p.project_name
      `, [customerId]);

      // Get customer's vendors
      const [vendors] = await pool.query(`
        SELECT cv.*, v.vendor_name, v.vendor_mobile_no,
               COUNT(DISTINCT vehicles.vehicle_id) as total_vehicles,
               COUNT(DISTINCT CASE WHEN vehicles.assignment_status = 'available' THEN vehicles.vehicle_id END) as available_vehicles
        FROM customer_vendors cv
        JOIN vendors v ON cv.vendor_id = v.vendor_id
        LEFT JOIN vehicles ON v.vendor_id = vehicles.vendor_id
        WHERE cv.customer_id = ? AND cv.contract_status = 'active'
        GROUP BY cv.id, v.vendor_id
        ORDER BY v.vendor_name
      `, [customerId]);

      res.json({
        customer: customer[0],
        projects: projects,
        vendors: vendors,
        summary: {
          total_projects: projects.length,
          assigned_projects: projects.filter(p => p.vehicle_id).length,
          unassigned_projects: projects.filter(p => !p.vehicle_id).length,
          total_vendors: vendors.length,
          total_vehicles: vendors.reduce((sum, v) => sum + v.total_vehicles, 0),
          available_vehicles: vendors.reduce((sum, v) => sum + v.available_vehicles, 0)
        }
      });
    } catch (error) {
      console.error('Error fetching customer overview:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // =====================================================================
  // CUSTOMER-VENDOR RELATIONSHIPS
  // =====================================================================
  
  // Get all customer-vendor relationships
  router.get('/customer-vendors', async (req, res) => {
    try {
      const { customer_id, vendor_id, status } = req.query;
      
      let whereClause = '1=1';
      let queryParams = [];
      
      if (customer_id) {
        whereClause += ' AND cv.customer_id = ?';
        queryParams.push(customer_id);
      }
      
      if (vendor_id) {
        whereClause += ' AND cv.vendor_id = ?';
        queryParams.push(vendor_id);
      }
      
      if (status) {
        whereClause += ' AND cv.contract_status = ?';
        queryParams.push(status);
      }

      const query = `
        SELECT 
          cv.*,
          c.customer_name,
          c.company_name,
          v.vendor_name,
          v.vendor_code,
          COUNT(DISTINCT vehicles.vehicle_id) as vehicles_count,
          COUNT(DISTINCT p.project_id) as projects_count
        FROM customer_vendors cv
        LEFT JOIN customers c ON cv.customer_id = c.customer_id
        LEFT JOIN vendors v ON cv.vendor_id = v.vendor_id
        LEFT JOIN vehicles ON v.vendor_id = vehicles.vendor_id
        LEFT JOIN projects p ON c.customer_id = p.customer_id
        WHERE ${whereClause}
        GROUP BY cv.id
        ORDER BY c.customer_name, v.vendor_name
      `;
      
      const [rows] = await pool.query(query, queryParams);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching customer-vendor relationships:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create customer-vendor relationship
  router.post('/customer-vendors', async (req, res) => {
    try {
      const {
        customer_id,
        vendor_id,
        contract_start_date,
        contract_end_date,
        contract_status = 'active',
        rate_per_km,
        rate_per_hour,
        rate_per_day,
        special_terms
      } = req.body;

      if (!customer_id || !vendor_id) {
        return res.status(400).json({ error: 'customer_id and vendor_id are required' });
      }

      // Check if customer exists
      const [customerCheck] = await pool.query('SELECT customer_id FROM customers WHERE customer_id = ?', [customer_id]);
      if (customerCheck.length === 0) {
        return res.status(400).json({ error: 'Customer not found' });
      }

      // Check if vendor exists
      const [vendorCheck] = await pool.query('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [vendor_id]);
      if (vendorCheck.length === 0) {
        return res.status(400).json({ error: 'Vendor not found' });
      }

      const insertQuery = `
        INSERT INTO customer_vendors (
          customer_id, vendor_id, contract_start_date, contract_end_date,
          contract_status, rate_per_km, rate_per_hour, rate_per_day, special_terms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        customer_id, vendor_id, contract_start_date || null, contract_end_date || null,
        contract_status, rate_per_km || null, rate_per_hour || null, rate_per_day || null, special_terms || null
      ];

      const [result] = await pool.query(insertQuery, values);

      // Fetch the created relationship
      const [newRelationship] = await pool.query(`
        SELECT 
          cv.*,
          c.customer_name,
          v.vendor_name
        FROM customer_vendors cv
        LEFT JOIN customers c ON cv.customer_id = c.customer_id
        LEFT JOIN vendors v ON cv.vendor_id = v.vendor_id
        WHERE cv.id = ?
      `, [result.insertId]);

      res.status(201).json(newRelationship[0]);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Customer-vendor relationship already exists' });
      }
      console.error('Error creating customer-vendor relationship:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update customer-vendor relationship
  router.put('/customer-vendors/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const {
        contract_start_date,
        contract_end_date,
        contract_status,
        rate_per_km,
        rate_per_hour,
        rate_per_day,
        special_terms
      } = req.body;

      const updateQuery = `
        UPDATE customer_vendors SET
          contract_start_date = ?, contract_end_date = ?, contract_status = ?,
          rate_per_km = ?, rate_per_hour = ?, rate_per_day = ?, special_terms = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const values = [
        contract_start_date || null, contract_end_date || null, contract_status,
        rate_per_km || null, rate_per_hour || null, rate_per_day || null, special_terms || null,
        id
      ];

      const [result] = await pool.query(updateQuery, values);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Customer-vendor relationship not found' });
      }

      // Fetch the updated relationship
      const [updatedRelationship] = await pool.query(`
        SELECT 
          cv.*,
          c.customer_name,
          v.vendor_name
        FROM customer_vendors cv
        LEFT JOIN customers c ON cv.customer_id = c.customer_id
        LEFT JOIN vendors v ON cv.vendor_id = v.vendor_id
        WHERE cv.id = ?
      `, [id]);

      res.json(updatedRelationship[0]);
    } catch (error) {
      console.error('Error updating customer-vendor relationship:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // =====================================================================
  // PROJECTS
  // =====================================================================
  
  // Get all projects
  router.get('/projects', async (req, res) => {
    try {
      const { customer_id, status, active_only } = req.query;
      
      let whereClause = '1=1';
      let queryParams = [];
      
      if (customer_id) {
        whereClause += ' AND p.customer_id = ?';
        queryParams.push(customer_id);
      }
      
      if (status) {
        whereClause += ' AND p.project_status = ?';
        queryParams.push(status);
      }
      
      if (active_only === 'true') {
        whereClause += ' AND p.project_status IN ("planning", "active")';
      }

      const query = `
        SELECT 
          p.*,
          c.customer_name,
          c.company_name,
          c.gst_number,
          COUNT(DISTINCT v.vehicle_id) as assigned_vehicles_count,
          GROUP_CONCAT(DISTINCT ven.vendor_name ORDER BY ven.vendor_name SEPARATOR ', ') as vendors_involved,
          SUM(CASE WHEN v.assignment_status = 'assigned' THEN 1 ELSE 0 END) as active_vehicles_count
        FROM projects p
        LEFT JOIN customers c ON p.customer_id = c.customer_id
        LEFT JOIN vehicles v ON p.project_id = v.project_id
        LEFT JOIN vendors ven ON v.vendor_id = ven.vendor_id
        WHERE ${whereClause}
        GROUP BY p.project_id
        ORDER BY p.project_name
      `;
      
      const [rows] = await pool.query(query, queryParams);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get single project with detailed information
  router.get('/projects/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const query = `
        SELECT 
          p.*,
          c.customer_name,
          c.company_name,
          c.contact_person as customer_contact,
          c.phone_number as customer_phone,
          c.email as customer_email,
          c.gst_number
        FROM projects p
        LEFT JOIN customers c ON p.customer_id = c.customer_id
        WHERE p.project_id = ?
      `;
      
      const [rows] = await pool.query(query, [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Get assigned vehicles
      const [vehicles] = await pool.query(`
        SELECT 
          v.*,
          ven.vendor_name,
          ven.vendor_code
        FROM vehicles v
        LEFT JOIN vendors ven ON v.vendor_id = ven.vendor_id
        WHERE v.project_id = ?
      `, [id]);

      const project = rows[0];
      project.assigned_vehicles = vehicles;
      
      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create new project
  router.post('/projects', async (req, res) => {
    try {
      const {
        project_code,
        project_name,
        customer_id,
        project_description,
        project_location,
        project_start_date,
        project_end_date,
        project_status = 'planning',
        project_manager,
        contact_person,
        contact_phone,
        contact_email,
        budget_amount,
        billing_type = 'per-km',
        default_rate_per_km,
        default_rate_per_hour,
        default_rate_per_day,
        remarks
      } = req.body;

      if (!project_code || !project_name || !customer_id) {
        return res.status(400).json({ error: 'project_code, project_name, and customer_id are required' });
      }

      // Check if customer exists
      const [customerCheck] = await pool.query('SELECT customer_id FROM customers WHERE customer_id = ?', [customer_id]);
      if (customerCheck.length === 0) {
        return res.status(400).json({ error: 'Customer not found' });
      }

      const insertQuery = `
        INSERT INTO projects (
          project_code, project_name, customer_id, project_description, project_location,
          project_start_date, project_end_date, project_status, project_manager,
          contact_person, contact_phone, contact_email, budget_amount, billing_type,
          default_rate_per_km, default_rate_per_hour, default_rate_per_day, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        project_code, project_name, customer_id, project_description || null, project_location || null,
        project_start_date || null, project_end_date || null, project_status, project_manager || null,
        contact_person || null, contact_phone || null, contact_email || null, budget_amount || null, billing_type,
        default_rate_per_km || null, default_rate_per_hour || null, default_rate_per_day || null, remarks || null
      ];

      const [result] = await pool.query(insertQuery, values);

      // Fetch the created project
      const [newProject] = await pool.query(`
        SELECT 
          p.*,
          c.customer_name
        FROM projects p
        LEFT JOIN customers c ON p.customer_id = c.customer_id
        WHERE p.project_id = ?
      `, [result.insertId]);

      res.status(201).json(newProject[0]);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Project code already exists' });
      }
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // =====================================================================
  // VEHICLE ASSIGNMENTS
  // =====================================================================

  // Get available vehicles for assignment
  router.get('/vehicles/available', async (req, res) => {
    try {
      const { vendor_id, customer_id } = req.query;
      
      let whereClause = '(v.assignment_status = "available" OR v.assignment_status IS NULL OR v.project_id IS NULL)';
      let queryParams = [];
      
      if (vendor_id) {
        whereClause += ' AND v.vendor_id = ?';
        queryParams.push(vendor_id);
      }
      
      // If customer_id is provided, filter by vendors associated with that customer
      if (customer_id) {
        whereClause += ' AND EXISTS (SELECT 1 FROM customer_vendors cv WHERE cv.customer_id = ? AND cv.vendor_id = v.vendor_id AND cv.contract_status = "active")';
        queryParams.push(customer_id);
      }

      const query = `
        SELECT 
          v.*,
          ven.vendor_name,
          ven.vendor_code,
          ven.contact_person as vendor_contact
        FROM vehicles v
        LEFT JOIN vendors ven ON v.vendor_id = ven.vendor_id
        WHERE ${whereClause}
        ORDER BY ven.vendor_name, v.vehicle_number
      `;
      
      const [rows] = await pool.query(query, queryParams);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching available vehicles:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Assign vehicle to project
  router.post('/vehicles/assign', async (req, res) => {
    try {
      const {
        vehicle_id,
        project_id,
        assignment_start_date,
        rate_per_km,
        rate_per_hour,
        rate_per_day,
        assigned_by,
        remarks
      } = req.body;

      if (!vehicle_id || !project_id) {
        return res.status(400).json({ error: 'vehicle_id and project_id are required' });
      }

      // Check if vehicle exists and is available
      const [vehicleCheck] = await pool.query(`
        SELECT v.*, ven.vendor_id 
        FROM vehicles v 
        LEFT JOIN vendors ven ON v.vendor_id = ven.vendor_id
        WHERE v.vehicle_id = ? AND (v.assignment_status = 'available' OR v.assignment_status IS NULL OR v.project_id IS NULL)
      `, [vehicle_id]);
      
      if (vehicleCheck.length === 0) {
        return res.status(400).json({ error: 'Vehicle not found or not available for assignment' });
      }

      // Check if project exists
      const [projectCheck] = await pool.query('SELECT project_id, customer_id FROM projects WHERE project_id = ?', [project_id]);
      if (projectCheck.length === 0) {
        return res.status(400).json({ error: 'Project not found' });
      }

      const vehicle = vehicleCheck[0];
      const project = projectCheck[0];

      // Check if customer-vendor relationship exists
      const [cvCheck] = await pool.query(`
        SELECT * FROM customer_vendors 
        WHERE customer_id = ? AND vendor_id = ? AND contract_status = 'active'
      `, [project.customer_id, vehicle.vendor_id]);

      if (cvCheck.length === 0) {
        return res.status(400).json({ 
          error: 'No active contract exists between customer and vehicle vendor' 
        });
      }

      // Start transaction
      await pool.execute('START TRANSACTION');

      try {
        // Update vehicle assignment
        await pool.query(`
          UPDATE vehicles SET 
            project_id = ?, 
            assignment_status = 'assigned', 
            assigned_date = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE vehicle_id = ?
        `, [project_id, assignment_start_date || new Date().toISOString().split('T')[0], vehicle_id]);

        // Create project_vehicles record for tracking
        await pool.query(`
          INSERT INTO project_vehicles (
            project_id, vehicle_id, vendor_id, assignment_start_date,
            rate_per_km, rate_per_hour, rate_per_day, assigned_by, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          project_id, vehicle_id, vehicle.vendor_id, 
          assignment_start_date || new Date().toISOString().split('T')[0],
          rate_per_km || null, rate_per_hour || null, rate_per_day || null,
          assigned_by || null, remarks || null
        ]);

        await pool.execute('COMMIT');

        // Fetch updated vehicle with relationship info
        const [updatedVehicle] = await pool.query(`
          SELECT 
            v.*,
            p.project_name,
            p.project_code,
            c.customer_name,
            ven.vendor_name
          FROM vehicles v
          LEFT JOIN projects p ON v.project_id = p.project_id
          LEFT JOIN customers c ON p.customer_id = c.customer_id
          LEFT JOIN vendors ven ON v.vendor_id = ven.vendor_id
          WHERE v.vehicle_id = ?
        `, [vehicle_id]);

        res.json(updatedVehicle[0]);
      } catch (error) {
        await pool.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error assigning vehicle to project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Unassign vehicle from project
  router.post('/vehicles/unassign', async (req, res) => {
    try {
      const { vehicle_id, assignment_end_date, unassigned_by, remarks } = req.body;

      if (!vehicle_id) {
        return res.status(400).json({ error: 'vehicle_id is required' });
      }

      // Check if vehicle exists and is assigned
      const [vehicleCheck] = await pool.query(`
        SELECT * FROM vehicles WHERE vehicle_id = ? AND assignment_status = 'assigned' AND project_id IS NOT NULL
      `, [vehicle_id]);
      
      if (vehicleCheck.length === 0) {
        return res.status(400).json({ error: 'Vehicle not found or not currently assigned' });
      }

      // Start transaction
      await pool.execute('START TRANSACTION');

      try {
        // Update vehicle assignment
        await pool.query(`
          UPDATE vehicles SET 
            project_id = NULL, 
            assignment_status = 'available', 
            assigned_date = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE vehicle_id = ?
        `, [vehicle_id]);

        // Update project_vehicles record
        await pool.query(`
          UPDATE project_vehicles SET 
            assignment_end_date = ?,
            assignment_status = 'completed',
            remarks = CONCAT(IFNULL(remarks, ''), ' - Unassigned by: ', IFNULL(?, 'system'), 
                           IF(? IS NOT NULL, CONCAT(' (', ?, ')'), '')),
            updated_at = CURRENT_TIMESTAMP
          WHERE vehicle_id = ? AND assignment_status = 'active'
        `, [
          assignment_end_date || new Date().toISOString().split('T')[0],
          unassigned_by || 'system',
          remarks, remarks,
          vehicle_id
        ]);

        await pool.execute('COMMIT');

        // Fetch updated vehicle
        const [updatedVehicle] = await pool.query(`
          SELECT v.*, ven.vendor_name
          FROM vehicles v
          LEFT JOIN vendors ven ON v.vendor_id = ven.vendor_id
          WHERE v.vehicle_id = ?
        `, [vehicle_id]);

        res.json(updatedVehicle[0]);
      } catch (error) {
        await pool.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error unassigning vehicle from project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // =====================================================================
  // RELATIONSHIP VIEWS AND REPORTS
  // =====================================================================

  // Get vehicle relationships overview
  router.get('/vehicles/relationships', async (req, res) => {
    try {
      const { customer_id, vendor_id, project_id, assignment_status } = req.query;
      
      let whereClause = '1=1';
      let queryParams = [];
      
      if (customer_id) {
        whereClause += ' AND c.customer_id = ?';
        queryParams.push(customer_id);
      }
      
      if (vendor_id) {
        whereClause += ' AND vn.vendor_id = ?';
        queryParams.push(vendor_id);
      }
      
      if (project_id) {
        whereClause += ' AND p.project_id = ?';
        queryParams.push(project_id);
      }
      
      if (assignment_status) {
        whereClause += ' AND v.assignment_status = ?';
        queryParams.push(assignment_status);
      }

      const query = `
        SELECT * FROM vehicle_relationships_view 
        WHERE ${whereClause}
        ORDER BY customer_name, project_name, vendor_name, vehicle_number
      `;
      
      const [rows] = await pool.query(query, queryParams);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching vehicle relationships:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get customer relationships summary
  router.get('/customers/relationships', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM customer_relationships_view ORDER BY customer_name');
      res.json(rows);
    } catch (error) {
      console.error('Error fetching customer relationships:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get project summary
  router.get('/projects/summary', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM project_summary_view ORDER BY project_name');
      res.json(rows);
    } catch (error) {
      console.error('Error fetching project summary:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
