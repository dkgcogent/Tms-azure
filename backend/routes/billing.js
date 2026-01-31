const express = require('express');
const router = express.Router();

// This file defines API routes for managing billing data in the Transport Management System.
// It uses Express.js to create route handlers for CRUD operations (Create, Read, Update, Delete)
// related to billing records. The routes interact with a MySQL database through a connection pool.

module.exports = (pool) => {
  // Get all billing records with related data
  // This route retrieves all billing records from the database with related information.
  // It responds with a JSON array of billing objects.
  router.get('/', async (req, res) => {
    try {
      const query = `
        SELECT
          b.*,
          c.Name as CustomerName,
          c.CustomerCode,
          p.ProjectName
        FROM billing b
        LEFT JOIN customer c ON b.CustomerID = c.CustomerID
        LEFT JOIN project p ON b.ProjectID = p.ProjectID
        ORDER BY b.InvoiceDate DESC, b.BillingID DESC
      `;

      const [rows] = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching billing records:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get the latest billing record by InvoiceNo (numeric order)
  // This route retrieves the billing record with the highest invoice number.
  router.get('/latest', async (req, res) => {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM billing ORDER BY CAST(SUBSTRING(InvoiceNo, 4) AS UNSIGNED) DESC LIMIT 1"
      );
      if (rows.length > 0) {
        res.json(rows[0]);
      } else {
        res.json({});
      }
    } catch (error) {
      console.error('Error fetching latest billing record:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get a single billing record by ID
  // This route retrieves a specific billing record based on the provided ID.
  // It responds with a JSON object of the billing record if found, or a 404 error if not found.
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await pool.query('SELECT * FROM billing WHERE BillingID = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Billing record not found' });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching billing record:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create a new billing record
  // This route creates a new billing record in the database using the data provided in the request body.
  // It responds with a 201 status code and the newly created billing record's data, including the generated ID.
  router.post('/', async (req, res) => {
    const billing = req.body;
    try {
      const [result] = await pool.query(
        'INSERT INTO billing (CustomerID, ProjectID, InvoiceNo, InvoiceDate, BillingPeriodStart, BillingPeriodEnd, TotalTransactions, TotalAmount, GSTRate, GSTAmount, GrandTotal, PaymentStatus, DueDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          billing.CustomerID || null,
          billing.ProjectID || null,
          billing.InvoiceNo,
          billing.InvoiceDate,
          billing.BillingPeriodStart || billing.InvoiceDate, // Default to invoice date if not provided
          billing.BillingPeriodEnd || billing.InvoiceDate,   // Default to invoice date if not provided
          billing.TotalTransactions || 0,
          billing.TotalAmount,
          billing.GSTRate || 18.00,
          billing.GSTAmount || 0,
          billing.GrandTotal,
          billing.PaymentStatus || 'Pending',
          billing.DueDate || null
        ]
      );
      res.status(201).json({ BillingID: result.insertId, ...billing });
    } catch (error) {
      console.error('Error creating billing record:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update a billing record
  // This route updates an existing billing record identified by the provided ID with new data from the request body.
  // It responds with the updated billing record data if successful, or a 404 error if the billing record is not found.
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const billing = req.body;
    try {
      console.log('🔄 Updating billing record:', { id, billing });

      // First, get the existing record to see what we're updating
      const [existing] = await pool.query('SELECT * FROM billing WHERE BillingID = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Billing record not found' });
      }

      // Build dynamic update query based on provided fields
      const updateFields = [];
      const updateValues = [];

      if (billing.PaymentStatus !== undefined) {
        updateFields.push('PaymentStatus = ?');
        updateValues.push(billing.PaymentStatus);
      }

      if (billing.GrandTotal !== undefined) {
        updateFields.push('GrandTotal = ?');
        updateValues.push(billing.GrandTotal);
      }

      if (billing.InvoiceNo !== undefined) {
        updateFields.push('InvoiceNo = ?');
        updateValues.push(billing.InvoiceNo);
      }

      if (billing.TotalAmount !== undefined) {
        updateFields.push('TotalAmount = ?');
        updateValues.push(billing.TotalAmount);
      }

      if (billing.GSTAmount !== undefined) {
        updateFields.push('GSTAmount = ?');
        updateValues.push(billing.GSTAmount);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateValues.push(id); // Add ID for WHERE clause

      const updateQuery = `UPDATE billing SET ${updateFields.join(', ')} WHERE BillingID = ?`;
      console.log('📝 Update query:', updateQuery, updateValues);

      const [result] = await pool.query(updateQuery, updateValues);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Billing record not found or no changes made' });
      }

      // Return the updated record
      const [updated] = await pool.query('SELECT * FROM billing WHERE BillingID = ?', [id]);
      res.json(updated[0]);

    } catch (error) {
      console.error('❌ Error updating billing record:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        details: error.sqlMessage || 'Unknown database error'
      });
    }
  });

  // Delete a billing record
  // This route deletes a billing record from the database based on the provided ID.
  // It responds with a success message if the deletion is successful, or a 404 error if the billing record is not found.
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [result] = await pool.query('DELETE FROM Billing WHERE BillingID = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Billing record not found' });
      }
      res.json({ message: 'Billing record deleted successfully' });
    } catch (error) {
      console.error('Error deleting billing record:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
