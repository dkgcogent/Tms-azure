
const express = require('express');
const router = express.Router();

// This file defines API routes for managing location data in the Transport Management System.
// It uses Express.js to create route handlers for CRUD operations (Create, Read, Update, Delete)
// related to locations. The routes interact with a MySQL database through a connection pool.

module.exports = (pool) => {
  // Get all locations
  // This route retrieves all location records from the database with customer information and site details.
  // It responds with a JSON array of location objects including customer names and associated sites.
  router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          l.LocationID,
          l.CustomerID,
          l.LocationName,
          l.Address,
          c.Name as CustomerName,
          c.CustomerCode
        FROM Location l
        LEFT JOIN Customer c ON l.CustomerID = c.CustomerID
        ORDER BY l.LocationID DESC
      `);

      // Add site information for each location
      for (const location of rows) {
        const [sites] = await pool.query(`
          SELECT
            cs.SiteID,
            cs.SiteName,
            c.Name as CustomerName,
            c.CustomerCode
          FROM customer_site cs
          LEFT JOIN Customer c ON cs.CustomerID = c.CustomerID
          WHERE cs.LocationID = ?
        `, [location.LocationID]);

        location.CustomerSites = sites;
      }

      res.json(rows);
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get locations by customer ID
  // This route retrieves location records filtered by the given customer ID.
  router.get('/customer/:customerId', async (req, res) => {
    const { customerId } = req.params;
    try {
      const [rows] = await pool.query(`
        SELECT 
          l.LocationID,
          l.CustomerID,
          l.LocationName,
          l.Address,
          c.Name as CustomerName,
          c.CustomerCode
        FROM Location l
        LEFT JOIN Customer c ON l.CustomerID = c.CustomerID
        WHERE l.CustomerID = ?
        ORDER BY l.LocationID DESC
      `, [customerId]);
      res.json({ data: rows });
    } catch (error) {
      console.error('Error fetching locations by customer:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get a single location by ID
  // This route retrieves a specific location record based on the provided ID with associated sites.
  // It responds with a JSON object of the location if found, or a 404 error if not found.
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await pool.query(`
        SELECT
          l.LocationID,
          l.CustomerID,
          l.LocationName,
          l.Address,
          c.Name as CustomerName,
          c.CustomerCode
        FROM Location l
        LEFT JOIN Customer c ON l.CustomerID = c.CustomerID
        WHERE l.LocationID = ?
      `, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Location not found' });
      }

      const location = rows[0];

      // Add site information for this location
      const [sites] = await pool.query(`
        SELECT
          cs.SiteID,
          cs.SiteName,
          c.Name as CustomerName,
          c.CustomerCode
        FROM customer_site cs
        LEFT JOIN Customer c ON cs.CustomerID = c.CustomerID
        WHERE cs.LocationID = ?
      `, [id]);

      location.CustomerSites = sites;

      res.json(location);
    } catch (error) {
      console.error('Error fetching location:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create a new location
  // This route creates a new location record in the database using the data provided in the request body.
  // It responds with a 201 status code and the newly created location's data, including the generated ID.
  router.post('/', async (req, res) => {
    const { CustomerID, LocationName, Address } = req.body;
    
    // Validate required fields
    if (!CustomerID || !LocationName) {
      return res.status(400).json({ 
        error: 'CustomerID and LocationName are required fields' 
      });
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

      const [result] = await pool.query(
        'INSERT INTO Location (CustomerID, LocationName, Address) VALUES (?, ?, ?)',
        [CustomerID, LocationName, Address || '']
      );
      
      // Fetch the created location with customer information
      const [newLocation] = await pool.query(`
        SELECT 
          l.LocationID,
          l.CustomerID,
          l.LocationName,
          l.Address,
          c.Name as CustomerName,
          c.CustomerCode
        FROM Location l
        LEFT JOIN Customer c ON l.CustomerID = c.CustomerID
        WHERE l.LocationID = ?
      `, [result.insertId]);
      
      res.status(201).json(newLocation[0]);
    } catch (error) {
      console.error('Error creating location:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update a location
  // This route updates an existing location record identified by the provided ID with new data from the request body.
  // It responds with the updated location data if successful, or a 404 error if the location is not found.
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { CustomerID, LocationName, Address } = req.body;
    
    // Validate required fields
    if (!CustomerID || !LocationName) {
      return res.status(400).json({ 
        error: 'CustomerID and LocationName are required fields' 
      });
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

      const [result] = await pool.query(
        'UPDATE Location SET CustomerID = ?, LocationName = ?, Address = ? WHERE LocationID = ?',
        [CustomerID, LocationName, Address || '', id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Location not found' });
      }
      
      // Fetch the updated location with customer information
      const [updatedLocation] = await pool.query(`
        SELECT 
          l.LocationID,
          l.CustomerID,
          l.LocationName,
          l.Address,
          c.Name as CustomerName,
          c.CustomerCode
        FROM Location l
        LEFT JOIN Customer c ON l.CustomerID = c.CustomerID
        WHERE l.LocationID = ?
      `, [id]);
      
      res.json(updatedLocation[0]);
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete a location
  // This route deletes a location record identified by the provided ID.
  // It responds with a success message if the location is deleted, or a 404 error if the location is not found.
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [result] = await pool.query('DELETE FROM Location WHERE LocationID = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Location not found' });
      }
      res.json({ message: 'Location deleted successfully' });
    } catch (error) {
      console.error('Error deleting location:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
