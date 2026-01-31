const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

// Database connection (adjust according to your config)
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rites',
    database: process.env.DB_NAME || 'transportation_management',
    charset: 'utf8mb4'
};

// =====================================================
// 1. GET AVAILABLE VEHICLES (Not assigned to any project) WITH DRIVERS
// =====================================================

router.get('/available-vehicles', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Try with the actual table names from the database
        let vehicles;
        try {
            // Try with Vehicle and Vendor tables (capitalized)
            const [rows] = await connection.execute(`
                SELECT 
                    v.VehicleID as vehicle_id,
                    v.VehicleRegistrationNo as vehicle_number,
                    v.VehicleCode as vehicle_code,
                    v.VehicleChasisNo as chassis_number,
                    v.VehicleModel as model,
                    v.TypeOfBody as body_type,
                    v.VendorID as vendor_id,
                    v.Status as status,
                    vn.VendorName as vendor_name,
                    vn.VendorMobileNo as vendor_mobile_no,
                    d.DriverID,
                    d.DriverName,
                    d.DriverLicenceNo,
                    d.DriverMobileNo,
                    d.DriverAddress,
                    d.DriverTotalExperience
                FROM Vehicle v
                LEFT JOIN Vendor vn ON v.VendorID = vn.VendorID
                LEFT JOIN Driver d ON v.VendorID = d.VendorID
                WHERE v.Status = 'Active'
                ORDER BY vn.VendorName, v.VehicleRegistrationNo
            `);
            vehicles = rows;
        } catch (capitalError) {
            console.log('Trying lowercase table names...');
            // Fallback to lowercase table names
            const [rows] = await connection.execute(`
                SELECT
                    v.vehicle_id,
                    v.vehicle_number,
                    v.vehicle_code,
                    v.chassis_number,
                    v.model,
                    v.body_type,
                    v.vendor_id,
                    v.status,
                    vn.vendor_name,
                    vn.vendor_mobile_no,
                    d.driver_id as DriverID,
                    d.driver_name as DriverName,
                    d.license_number as DriverLicenceNo,
                    d.phone as DriverMobileNo,
                    d.address as DriverAddress,
                    '5' as DriverTotalExperience
                FROM vehicles v
                LEFT JOIN vendors vn ON v.vendor_id = vn.vendor_id
                LEFT JOIN drivers d ON v.vendor_id = d.vendor_id
                LEFT JOIN vehicle_project_assignments a
                  ON a.vehicle_id = v.vehicle_id AND a.status = 'active'
                WHERE v.status = 'active' AND a.vehicle_id IS NULL
                ORDER BY vn.vendor_name, v.vehicle_number
            `);
            vehicles = rows;
        }
        
        await connection.end();
        res.json({
            success: true,
            data: vehicles,
            count: vehicles.length
        });
        
    } catch (error) {
        console.error('Error fetching available vehicles:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available vehicles',
            error: error.message
        });
    }
});

// =====================================================
// 2. GET AVAILABLE VEHICLES FOR SPECIFIC CUSTOMER
// =====================================================

router.get('/available-vehicles/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const connection = await mysql.createConnection(dbConfig);
        
        // Get vehicles from vendors who have active contracts with this customer
        const [vehicles] = await connection.execute(`
            SELECT DISTINCT
                v.*,
                vn.vendor_name,
                vn.vendor_mobile_no,
                cv.rate_per_km as contract_rate_per_km,
                cv.rate_per_hour as contract_rate_per_hour,
                cv.rate_per_day as contract_rate_per_day,
                cv.contract_status
            FROM vehicles v
            JOIN vendors vn ON v.vendor_id = vn.vendor_id
            JOIN customer_vendors cv ON vn.vendor_id = cv.vendor_id
            WHERE cv.customer_id = ? 
              AND cv.contract_status = 'active'
              AND v.project_id IS NULL
              AND (v.assignment_status = 'available' OR v.assignment_status IS NULL)
              AND v.status = 'active'
            ORDER BY vn.vendor_name, v.vehicle_number
        `, [customerId]);
        
        await connection.end();
        res.json({
            success: true,
            data: vehicles,
            count: vehicles.length,
            message: `Found ${vehicles.length} available vehicles for customer`
        });
        
    } catch (error) {
        console.error('Error fetching customer available vehicles:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available vehicles for customer',
            error: error.message
        });
    }
});

// =====================================================
// 3. GET CUSTOMER PROJECTS
// =====================================================

router.get('/projects/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const connection = await mysql.createConnection(dbConfig);

        // Use the actual Project and Customer tables with correct column names
        const [projects] = await connection.execute(`
            SELECT
                p.ProjectID as project_id,
                p.ProjectCode as project_code,
                p.ProjectName as project_name,
                p.ProjectDescription as project_description,
                p.StartDate as project_start_date,
                p.EndDate as project_end_date,
                p.Status as project_status,
                c.Name as customer_name,
                c.CustomerCode as customer_code
            FROM Project p
            JOIN Customer c ON p.CustomerID = c.CustomerID
            WHERE p.CustomerID = ? AND p.Status = 'Active'
            ORDER BY p.ProjectName
        `, [customerId]);

        await connection.end();
        res.json({
            success: true,
            data: projects,
            count: projects.length
        });

    } catch (error) {
        console.error('Error fetching customer projects:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching customer projects',
            error: error.message
        });
    }
});

// =====================================================
// 4. GET ALL PROJECTS WITH SUMMARY
// =====================================================

router.get('/projects', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const [projects] = await connection.execute(`
            SELECT
                p.ProjectID as project_id,
                p.ProjectName as project_name,
                p.ProjectCode as project_code,
                p.ProjectDescription as project_description,
                p.ProjectValue as project_value,
                p.Status as project_status,
                p.CustomerID as customer_id,
                c.Name as customer_name,
                c.CustomerCode as customer_code,
                DATE_FORMAT(p.CreatedAt, '%Y-%m-%d') as created_date
            FROM Project p
            LEFT JOIN Customer c ON p.CustomerID = c.CustomerID
            WHERE p.Status = 'Active'
            ORDER BY c.Name, p.ProjectName
        `);
        
        await connection.end();
        res.json({
            success: true,
            data: projects,
            count: projects.length
        });
        
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching projects',
            error: error.message
        });
    }
});

// =====================================================
// 5. ASSIGN VEHICLE TO PROJECT
// =====================================================

router.post('/assign-vehicle', async (req, res) => {
    try {
        const { 
            vehicle_id, 
            project_id, 
            assigned_by = 'System',
            assignment_notes = '' 
        } = req.body;

        // Validation
        if (!vehicle_id || !project_id) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle ID and Project ID are required'
            });
        }

        const connection = await mysql.createConnection(dbConfig);
        
        try {
            // Start transaction
            await connection.beginTransaction();
            
            // Check if vehicle is available
            const [vehicleCheck] = await connection.execute(
                'SELECT vehicle_id, assignment_status, project_id FROM vehicles WHERE vehicle_id = ?',
                [vehicle_id]
            );
            
            if (vehicleCheck.length === 0) {
                throw new Error('Vehicle not found');
            }
            
            if (vehicleCheck[0].project_id && vehicleCheck[0].project_id !== 0) {
                throw new Error('Vehicle is already assigned to another project');
            }
            
            // Record assignment without modifying master tables
            await connection.execute(
                `INSERT INTO vehicle_project_assignments (vehicle_id, project_id, assigned_by, assignment_notes, status)
                 VALUES (?, ?, ?, ?, 'active')`,
                [vehicle_id, project_id, assigned_by, assignment_notes]
            );

            // Commit transaction
            await connection.commit();
            await connection.end();
            
            res.json({
                success: true,
                message: 'Vehicle successfully assigned to project',
                data: {
                    vehicle_id: vehicle_id,
                    project_id: project_id,
                    assigned_by: assigned_by,
                    assignment_date: new Date().toISOString().split('T')[0]
                }
            });

        } catch (dbError) {
            await connection.rollback();
            await connection.end();
            throw dbError;
        }
        
    } catch (error) {
        console.error('Error assigning vehicle to project:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning vehicle to project: ' + error.message,
            error: error.message
        });
    }
});

// =====================================================
// 6. UNASSIGN VEHICLE FROM PROJECT
// =====================================================

router.post('/unassign-vehicle', async (req, res) => {
    try {
        const { 
            vehicle_id, 
            reason = 'Manual unassignment' 
        } = req.body;

        if (!vehicle_id) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle ID is required'
            });
        }

        const connection = await mysql.createConnection(dbConfig);
        
        // Call stored procedure to unassign vehicle
        await connection.execute(
            `UPDATE vehicle_project_assignments
             SET status='completed', unassigned_date=NOW(), assignment_notes=CONCAT(COALESCE(assignment_notes,''), ' | ', ?)
             WHERE vehicle_id = ? AND status='active'`,
            [reason, vehicle_id]
        );

        await connection.end();
        
        res.json({
            success: true,
            message: 'Vehicle successfully unassigned from project'
        });
        
    } catch (error) {
        console.error('Error unassigning vehicle from project:', error);
        res.status(500).json({
            success: false,
            message: 'Error unassigning vehicle from project',
            error: error.message
        });
    }
});

// =====================================================
// 7. GET VEHICLE-PROJECT RELATIONSHIPS
// =====================================================

router.get('/vehicle-relationships', async (req, res) => {
    try {
        const { 
            customer_id = null, 
            vendor_id = null, 
            project_id = null,
            assignment_status = null 
        } = req.query;

        const connection = await mysql.createConnection(dbConfig);
        
        let query = 'SELECT * FROM vehicle_project_relationships WHERE 1=1';
        const params = [];

        // Apply filters
        if (customer_id) {
            query += ' AND customer_id = ?';
            params.push(customer_id);
        }
        
        if (vendor_id) {
            query += ' AND vendor_id = ?';
            params.push(vendor_id);
        }
        
        if (project_id) {
            query += ' AND project_id = ?';
            params.push(project_id);
        }
        
        if (assignment_status) {
            query += ' AND assignment_status = ?';
            params.push(assignment_status);
        }

        query += ' ORDER BY customer_name, project_name, vendor_name, vehicle_number';

        const [relationships] = await connection.execute(query, params);
        
        await connection.end();
        res.json({
            success: true,
            data: relationships,
            count: relationships.length,
            filters_applied: {
                customer_id,
                vendor_id, 
                project_id,
                assignment_status
            }
        });
        
    } catch (error) {
        console.error('Error fetching vehicle relationships:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching vehicle relationships',
            error: error.message
        });
    }
});

// =====================================================
// 8. GET VENDOR VEHICLE SUMMARY
// =====================================================

router.get('/vendor-summary', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const [summary] = await connection.execute(`
            SELECT
                v.VendorID as vendor_id,
                v.VendorName as vendor_name,
                v.VendorCode as vendor_code,
                v.VendorMobileNo as vendor_mobile,
                COUNT(vh.VehicleID) as total_vehicles,
                COUNT(CASE WHEN vh.Status = 'Active' THEN 1 END) as active_vehicles,
                COUNT(d.DriverID) as total_drivers,
                COUNT(CASE WHEN d.Status = 'Active' THEN 1 END) as active_drivers
            FROM Vendor v
            LEFT JOIN Vehicle vh ON v.VendorID = vh.VendorID
            LEFT JOIN Driver d ON v.VendorID = d.VendorID
            WHERE v.Status = 'Active'
            GROUP BY v.VendorID, v.VendorName, v.VendorCode, v.VendorMobileNo
            ORDER BY v.VendorName
        `);
        
        await connection.end();
        res.json({
            success: true,
            data: summary,
            count: summary.length
        });
        
    } catch (error) {
        console.error('Error fetching vendor summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching vendor summary',
            error: error.message
        });
    }
});

// =====================================================
// 9. GET ASSIGNMENT HISTORY
// =====================================================

router.get('/assignment-history/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const connection = await mysql.createConnection(dbConfig);
        
        const [history] = await connection.execute(`
            SELECT 
                h.*,
                p.project_name,
                p.project_code,
                c.company_name as customer_name,
                v.vendor_name
            FROM vehicle_assignment_history h
            JOIN projects p ON h.project_id = p.project_id
            JOIN customers c ON h.customer_id = c.customer_id
            JOIN vendors v ON h.vendor_id = v.vendor_id
            WHERE h.vehicle_id = ?
            ORDER BY h.assignment_start_date DESC
        `, [vehicleId]);
        
        await connection.end();
        res.json({
            success: true,
            data: history,
            count: history.length
        });
        
    } catch (error) {
        console.error('Error fetching assignment history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching assignment history',
            error: error.message
        });
    }
});

// =====================================================
// 10. CREATE CUSTOMER-VENDOR RELATIONSHIP
// =====================================================

router.post('/customer-vendor-relationship', async (req, res) => {
    try {
        const {
            customer_id,
            vendor_id,
            contract_start_date = new Date().toISOString().split('T')[0],
            contract_end_date = null,
            rate_per_km = null,
            rate_per_hour = null,
            rate_per_day = null,
            special_terms = ''
        } = req.body;

        if (!customer_id || !vendor_id) {
            return res.status(400).json({
                success: false,
                message: 'Customer ID and Vendor ID are required'
            });
        }

        const connection = await mysql.createConnection(dbConfig);
        
        const [result] = await connection.execute(`
            INSERT INTO customer_vendors 
            (customer_id, vendor_id, contract_start_date, contract_end_date, 
             rate_per_km, rate_per_hour, rate_per_day, special_terms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            customer_id, vendor_id, contract_start_date, contract_end_date,
            rate_per_km, rate_per_hour, rate_per_day, special_terms
        ]);

        await connection.end();
        
        res.json({
            success: true,
            message: 'Customer-Vendor relationship created successfully',
            relationship_id: result.insertId
        });
        
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Relationship between this customer and vendor already exists'
            });
        }
        
        console.error('Error creating customer-vendor relationship:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating customer-vendor relationship',
            error: error.message
        });
    }
});

// =====================================================
// 11. CREATE PROJECT
// =====================================================

router.post('/projects', async (req, res) => {
    try {
        const {
            project_code,
            project_name,
            customer_id,
            project_description = '',
            project_location = '',
            project_start_date = new Date().toISOString().split('T')[0],
            project_end_date = null,
            project_manager = '',
            contact_person = '',
            contact_phone = '',
            contact_email = '',
            budget_amount = null,
            billing_type = 'per-km',
            default_rate_per_km = null,
            default_rate_per_hour = null,
            default_rate_per_day = null,
            remarks = ''
        } = req.body;

        if (!project_code || !project_name || !customer_id) {
            return res.status(400).json({
                success: false,
                message: 'Project code, name, and customer ID are required'
            });
        }

        const connection = await mysql.createConnection(dbConfig);
        
        const [result] = await connection.execute(`
            INSERT INTO projects 
            (project_code, project_name, customer_id, project_description, project_location,
             project_start_date, project_end_date, project_manager, contact_person, contact_phone,
             contact_email, budget_amount, billing_type, default_rate_per_km, 
             default_rate_per_hour, default_rate_per_day, remarks, project_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [
            project_code, project_name, customer_id, project_description, project_location,
            project_start_date, project_end_date, project_manager, contact_person, contact_phone,
            contact_email, budget_amount, billing_type, default_rate_per_km,
            default_rate_per_hour, default_rate_per_day, remarks
        ]);

        await connection.end();
        
        res.json({
            success: true,
            message: 'Project created successfully',
            project_id: result.insertId
        });
        
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Project code already exists'
            });
        }
        
        console.error('Error creating project:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating project',
            error: error.message
        });
    }
});

// =====================================================
// 12. GET ALL DRIVERS WITH SEARCH SUPPORT
// =====================================================

router.get('/drivers', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Query to get all drivers from the Driver table (capitalized)
        const [drivers] = await connection.execute(`
            SELECT
                d.DriverID,
                d.DriverName,
                d.DriverLicenceNo,
                d.DriverMobileNo,
                d.DriverAddress,
                d.DriverTotalExperience,
                d.VendorID,
                v.VendorName,
                v.VendorCode,
                d.Status
            FROM Driver d
            LEFT JOIN Vendor v ON d.VendorID = v.VendorID
            WHERE d.Status = 'Active'
            ORDER BY d.DriverName
        `);
        
        await connection.end();
        
        res.json({
            success: true,
            data: drivers,
            count: drivers.length
        });
        
    } catch (error) {
        console.error('Error fetching drivers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching drivers',
            error: error.message
        });
    }
});

// =====================================================
// 13. GET AVAILABLE DRIVERS (Not assigned to any vehicle)
// =====================================================

router.get('/available-drivers', async (req, res) => {
    try {
        const { search = '' } = req.query;
        const connection = await mysql.createConnection(dbConfig);
        
        // Get all drivers - for now, we'll just return all drivers since we don't have a proper vehicle-driver relationship
        let query = `
            SELECT 
                d.DriverID,
                d.DriverName,
                d.DriverLicenceNo,
                d.DriverMobileNo,
                d.DriverAddress,
                d.DriverTotalExperience
            FROM Driver d
        `;
        
        const params = [];
        
        if (search) {
            query += ` WHERE (d.DriverName LIKE ? OR d.DriverLicenceNo LIKE ? OR d.DriverMobileNo LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ` ORDER BY d.DriverName`;
        
        const [drivers] = await connection.execute(query, params);
        
        await connection.end();
        
        res.json({
            success: true,
            data: drivers,
            count: drivers.length
        });
        
    } catch (error) {
        console.error('Error fetching available drivers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available drivers',
            error: error.message
        });
    }
});

// =====================================================
// 14. GET ALL CUSTOMERS FOR DROPDOWN
// =====================================================

router.get('/customers', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Use the actual Customer table with correct column names
        const [customers] = await connection.execute(`
            SELECT
                CustomerID as customer_id,
                Name as company_name,
                CustomerCode as customer_code
            FROM Customer
            WHERE Name IS NOT NULL
            ORDER BY Name ASC
        `);

        await connection.end();
        res.json({
            success: true,
            data: customers,
            count: customers.length
        });

    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching customers',
            error: error.message
        });
    }
});

// =====================================================
// 15. GET ALL VENDORS FOR DROPDOWN
// =====================================================

router.get('/vendors', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Use the actual Vendor table with correct column names
        const [vendors] = await connection.execute(`
            SELECT
                VendorID as vendor_id,
                VendorName as vendor_name,
                VendorCode as vendor_code,
                VendorMobileNo as vendor_phone
            FROM Vendor
            WHERE VendorName IS NOT NULL
            ORDER BY VendorName ASC
        `);

        await connection.end();
        res.json({
            success: true,
            data: vendors,
            count: vendors.length
        });

    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching vendors',
            error: error.message
        });
    }
});

// =====================================================
// 16. GET AVAILABLE VEHICLES FOR SPECIFIC VENDOR
// =====================================================

router.get('/available-vehicles/vendor/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        const connection = await mysql.createConnection(dbConfig);

        // Use the actual Vehicle and Vendor tables with correct column names
        const [vehicles] = await connection.execute(`
            SELECT
                v.VehicleID as vehicle_id,
                v.VehicleRegistrationNo as vehicle_number,
                v.VehicleCode as vehicle_code,
                v.VehicleModel as model,
                v.TypeOfBody as body_type,
                'truck' as vehicle_type,
                v.Status as status,
                vn.VendorName as vendor_name,
                vn.VendorID as vendor_id
            FROM Vehicle v
            JOIN Vendor vn ON v.VendorID = vn.VendorID
            WHERE v.VendorID = ?
              AND v.Status = 'Active'
            ORDER BY v.VehicleRegistrationNo
        `, [vendorId]);

        await connection.end();
        res.json({
            success: true,
            data: vehicles,
            count: vehicles.length,
            message: `Found ${vehicles.length} available vehicles for vendor`
        });

    } catch (error) {
        console.error('Error fetching vendor vehicles:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available vehicles for vendor',
            error: error.message
        });
    }
});

// =====================================================
// 17. GET AVAILABLE DRIVERS FOR SPECIFIC VENDOR
// =====================================================

router.get('/available-drivers/vendor/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        const connection = await mysql.createConnection(dbConfig);

        // Use the actual Driver and Vendor tables with correct column names
        const [drivers] = await connection.execute(`
            SELECT
                d.DriverID as driver_id,
                d.DriverName as driver_name,
                d.DriverLicenceNo as license_number,
                d.DriverMobileNo as phone,
                d.DriverAddress as address,
                d.VendorID as vendor_id,
                v.VendorName as vendor_name
            FROM Driver d
            JOIN Vendor v ON d.VendorID = v.VendorID
            WHERE d.VendorID = ?
              AND d.Status = 'Active'
            ORDER BY d.DriverName
        `, [vendorId]);

        await connection.end();
        res.json({
            success: true,
            data: drivers,
            count: drivers.length,
            message: `Found ${drivers.length} available drivers for vendor`
        });

    } catch (error) {
        console.error('Error fetching vendor drivers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available drivers for vendor',
            error: error.message
        });
    }
});

// =====================================================
// 18. ENHANCED VEHICLE ASSIGNMENT WITH DRIVER
// =====================================================

router.post('/assign-vehicle-with-driver', async (req, res) => {
    try {
        const {
            vehicle_id,
            project_id,
            driver_id,
            customer_id,
            vendor_id,
            placement_type = 'Fixed',
            assigned_by = 'System',
            assignment_notes = ''
        } = req.body;

        // Validation
        if (!vehicle_id || !project_id || !driver_id) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle ID, Project ID, and Driver ID are required'
            });
        }

        const connection = await mysql.createConnection(dbConfig);

        try {
            // Start transaction
            await connection.beginTransaction();

            // Check if vehicle is available
            const [vehicleCheck] = await connection.execute(
                'SELECT VehicleID as vehicle_id, Status as assignment_status FROM Vehicle WHERE VehicleID = ?',
                [vehicle_id]
            );

            if (vehicleCheck.length === 0) {
                throw new Error('Vehicle not found');
            }

            if (vehicleCheck[0].assignment_status !== 'Active') {
                throw new Error('Vehicle is not active');
            }

            // Check if driver is available
            const [driverCheck] = await connection.execute(
                'SELECT DriverID as driver_id, Status as status FROM Driver WHERE DriverID = ?',
                [driver_id]
            );

            if (driverCheck.length === 0) {
                throw new Error('Driver not found');
            }

            if (driverCheck[0].status !== 'Active') {
                throw new Error('Driver is not available');
            }

            // Record assignment
            await connection.execute(
                `INSERT INTO vehicle_project_assignments
                 (vehicle_id, project_id, driver_id, customer_id, vendor_id, placement_type, assigned_by, assignment_notes, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
                [vehicle_id, project_id, driver_id, customer_id, vendor_id, placement_type, assigned_by, assignment_notes]
            );

            // Commit transaction
            await connection.commit();
            await connection.end();

            res.json({
                success: true,
                message: 'Vehicle and driver successfully assigned to project',
                data: {
                    vehicle_id: vehicle_id,
                    project_id: project_id,
                    driver_id: driver_id,
                    assigned_by: assigned_by,
                    assignment_date: new Date().toISOString().split('T')[0]
                }
            });

        } catch (dbError) {
            await connection.rollback();
            await connection.end();
            throw dbError;
        }

    } catch (error) {
        console.error('Error assigning vehicle with driver to project:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning vehicle with driver to project: ' + error.message,
            error: error.message
        });
    }
});

// =====================================================
// GET ALL VEHICLE-PROJECT ASSIGNMENTS (TABLE VIEW)
// =====================================================

router.get('/assignments', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Get actual vehicle-project assignments from the assignments table
        const [assignments] = await connection.execute(`
            SELECT
                vpa.assignment_id,
                vpa.assigned_date,
                vpa.status as assignment_status,
                vpa.assigned_by,
                vpa.assignment_notes,
                vpa.placement_type,

                -- Vehicle Details
                v.VehicleID as vehicle_id,
                v.VehicleRegistrationNo as vehicle_number,
                v.VehicleCode as vehicle_code,
                v.VehicleModel as vehicle_model,
                v.TypeOfBody as vehicle_body_type,
                v.VehicleType as vehicle_type,
                v.Status as vehicle_status,

                -- Driver Details
                d.DriverID as driver_id,
                d.DriverName as driver_name,
                d.DriverLicenceNo as driver_license,
                d.DriverMobileNo as driver_phone,

                -- Project Details
                p.ProjectID as project_id,
                p.ProjectCode as project_code,
                p.ProjectName as project_name,
                p.ProjectDescription as project_description,
                p.Status as project_status,

                -- Customer Details
                c.CustomerID as customer_id,
                c.Name as customer_name,
                c.CustomerCode as customer_code,

                -- Vendor Details
                vn.VendorID as vendor_id,
                vn.VendorName as vendor_name,
                vn.VendorCode as vendor_code,
                vn.VendorMobileNo as vendor_phone

            FROM vehicle_project_assignments vpa
            LEFT JOIN Vehicle v ON vpa.vehicle_id = v.VehicleID
            LEFT JOIN Project p ON vpa.project_id = p.ProjectID
            LEFT JOIN Driver d ON vpa.driver_id = d.DriverID
            LEFT JOIN Customer c ON vpa.customer_id = c.CustomerID
            LEFT JOIN Vendor vn ON vpa.vendor_id = vn.VendorID
            WHERE vpa.status = 'active'
            ORDER BY vpa.assigned_date DESC
        `);

        await connection.end();
        res.json({
            success: true,
            data: assignments,
            count: assignments.length
        });

    } catch (error) {
        console.error('Error fetching vehicle assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching vehicle assignments',
            error: error.message
        });
    }
});

// =====================================================
// DELETE VEHICLE-PROJECT ASSIGNMENT
// =====================================================

router.delete('/assignments/:assignmentId', async (req, res) => {
    try {
        const { assignmentId } = req.params;

        if (!assignmentId) {
            return res.status(400).json({
                success: false,
                message: 'Assignment ID is required'
            });
        }

        const connection = await mysql.createConnection(dbConfig);

        try {
            // Start transaction
            await connection.beginTransaction();

            // Check if assignment exists
            const [assignmentCheck] = await connection.execute(
                'SELECT * FROM vehicle_project_assignments WHERE assignment_id = ?',
                [assignmentId]
            );

            if (assignmentCheck.length === 0) {
                throw new Error('Assignment not found');
            }

            // Delete the assignment
            await connection.execute(
                'DELETE FROM vehicle_project_assignments WHERE assignment_id = ?',
                [assignmentId]
            );

            console.log(`Assignment deleted: ${assignmentId}`);

            // Commit transaction
            await connection.commit();

            res.json({
                success: true,
                message: 'Assignment deleted successfully'
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            await connection.end();
        }

    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting assignment',
            error: error.message
        });
    }
});

// Test route to verify the API is working
router.get('/test', async (req, res) => {
    res.json({
        success: true,
        message: 'Vehicle-Project Linking API is working!',
        timestamp: new Date().toISOString()
    });
});

// =====================================================
// 19. GET ASSIGNMENTS BY CUSTOMER ID
// =====================================================

router.get('/assignments/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;

        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: 'Customer ID is required'
            });
        }

        const connection = await mysql.createConnection(dbConfig);

        try {
            // Get assignments from vehicle_project_assignments table for this customer
            const [assignments] = await connection.execute(
                `SELECT
                    vpa.*,
                    v.VehicleRegistrationNo,
                    v.VehicleCode,
                    ven.VendorName,
                    ven.VendorCode,
                    d.DriverName,
                    d.DriverLicenceNo,
                    d.DriverMobileNo,
                    p.ProjectName,
                    c.Name as CustomerName
                FROM vehicle_project_assignments vpa
                LEFT JOIN Vehicle v ON vpa.vehicle_id = v.VehicleID
                LEFT JOIN Vendor ven ON vpa.vendor_id = ven.VendorID
                LEFT JOIN Driver d ON vpa.driver_id = d.DriverID
                LEFT JOIN Project p ON vpa.project_id = p.ProjectID
                LEFT JOIN Customer c ON vpa.customer_id = c.CustomerID
                WHERE vpa.customer_id = ? AND vpa.status = 'active'
                ORDER BY vpa.created_at DESC`,
                [customerId]
            );

            res.json({
                success: true,
                data: assignments,
                count: assignments.length
            });

        } finally {
            await connection.end();
        }

    } catch (error) {
        console.error('Error fetching assignments by customer:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching assignments by customer: ' + error.message,
            error: error.message
        });
    }
});

module.exports = (pool) => {
    return router;
};
