const express = require('express');
const router = express.Router();

// This file defines API routes for managing payment collection data in the Transport Management System.
// It uses Express.js to create route handlers for CRUD operations (Create, Read, Update, Delete)
// related to payment collections. The routes interact with a MySQL database through a connection pool.

module.exports = (pool) => {
  // Get all payment collections with related data
  // This route retrieves all payment collection records from the database with related information.
  // It responds with a JSON array of payment objects.
  router.get('/', async (req, res) => {
    try {
      const query = `
        SELECT
          pc.*,
          b.InvoiceNo,
          b.GrandTotal as BillingAmount,
          c.Name as CustomerName,
          c.CustomerCode
        FROM PaymentCollection pc
        LEFT JOIN Billing b ON pc.BillingID = b.BillingID
        LEFT JOIN Customer c ON b.CustomerID = c.CustomerID
        ORDER BY pc.PaymentDate DESC, pc.PaymentID DESC
      `;
      
      const [rows] = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching payment collections:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get a single payment collection by ID
  // This route retrieves a specific payment collection record based on the provided ID.
  // It responds with a JSON object of the payment if found, or a 404 error if not found.
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await pool.query('SELECT * FROM PaymentCollection WHERE PaymentID = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Payment collection not found' });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching payment collection:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create a new payment collection
  // This route creates a new payment collection record in the database using the data provided in the request body.
  // It responds with a 201 status code and the newly created payment collection's data, including the generated ID.
  router.post('/', async (req, res) => {
    const payment = req.body;
    
    // Validation: Required fields
    if (!payment.BillingID) {
      return res.status(400).json({ error: 'BillingID is required' });
    }
    if (!payment.PaymentDate) {
      return res.status(400).json({ error: 'PaymentDate is required' });
    }
    if (!payment.PaymentAmount || payment.PaymentAmount <= 0) {
      return res.status(400).json({ error: 'PaymentAmount is required and must be greater than 0' });
    }
    if (!payment.PaymentMode || !['Cash', 'Cheque', 'Online Transfer', 'UPI', 'Bank'].includes(payment.PaymentMode)) {
      return res.status(400).json({ error: 'PaymentMode is required and must be one of: Cash, Cheque, Online Transfer, UPI, Bank' });
    }

    try {
      // First, get the billing record to extract CustomerID and InvoiceNo
      const [billingRows] = await pool.query('SELECT CustomerID, InvoiceNo FROM Billing WHERE BillingID = ?', [payment.BillingID]);
      if (billingRows.length === 0) {
        return res.status(400).json({ error: 'Invalid BillingID - billing record not found' });
      }

      const billing = billingRows[0];

      const [result] = await pool.query(
        `INSERT INTO PaymentCollection (
          BillingID, PaymentDate, PaymentAmount,
          PaymentMode, PaymentReference, Remarks
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          payment.BillingID,
          payment.PaymentDate,
          payment.PaymentAmount,
          payment.PaymentMode,
          payment.PaymentReference || null,
          payment.Remarks || null
        ]
      );
      
      // Fetch the created payment with related data
      const [newPayment] = await pool.query(`
        SELECT
          pc.*,
          b.InvoiceNo,
          b.GrandTotal as BillingAmount,
          c.Name as CustomerName,
          c.CustomerCode
        FROM PaymentCollection pc
        LEFT JOIN Billing b ON pc.BillingID = b.BillingID
        LEFT JOIN Customer c ON b.CustomerID = c.CustomerID
        WHERE pc.PaymentID = ?
      `, [result.insertId]);
      
      res.status(201).json(newPayment[0]);
    } catch (error) {
      console.error('Error creating payment collection:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update a payment collection
  // This route updates an existing payment collection identified by the provided ID with new data from the request body.
  // It responds with the updated payment collection data if successful, or a 404 error if the payment collection is not found.
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const payment = req.body;
    try {
      // Format date to YYYY-MM-DD
      const paymentDate = payment.PaymentDate ?
        new Date(payment.PaymentDate).toISOString().split('T')[0] : null;

      const [result] = await pool.query(
        `UPDATE PaymentCollection SET
          BillingID = ?, PaymentDate = ?, PaymentAmount = ?,
          PaymentMode = ?, PaymentReference = ?, Remarks = ?
        WHERE PaymentID = ?`,
        [
          payment.BillingID,
          paymentDate,
          payment.PaymentAmount,
          payment.PaymentMode,
          payment.PaymentReference || null,
          payment.Remarks || null,
          id
        ]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Payment collection not found' });
      }
      res.json({ PaymentID: parseInt(id), ...payment });
    } catch (error) {
      console.error('Error updating payment collection:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete a payment collection
  // This route deletes a payment collection record from the database based on the provided ID.
  // It responds with a success message if the deletion is successful, or a 404 error if the payment collection is not found.
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [result] = await pool.query('DELETE FROM PaymentCollection WHERE PaymentID = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Payment collection not found' });
      }
      res.json({ message: 'Payment collection deleted successfully' });
    } catch (error) {
      console.error('Error deleting payment collection:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
