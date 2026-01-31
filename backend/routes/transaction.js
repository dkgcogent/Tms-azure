const express = require('express');
const router = express.Router();

const validateTransactionDates = (transactionData) => {
  const errors = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  // Check TransactionDate is not a future date
  if (transactionData.TransactionDate) {
    const transactionDate = new Date(transactionData.TransactionDate);
    transactionDate.setHours(0, 0, 0, 0);
    if (transactionDate > today) {
      errors.push('Transaction Date cannot be a future date');
    }
  }

  // If AdvancePaidDate or BalancePaidDate are introduced, add checks here
  // Example:
  // if (transactionData.AdvancePaidDate && transactionData.TransactionDate) {
  //   const advancePaidDate = new Date(transactionData.AdvancePaidDate);
  //   const transactionDate = new Date(transactionData.TransactionDate);
  //   if (advancePaidDate < transactionDate) {
  //     errors.push('Advance Paid Date cannot be prior to Transaction Date');
  //   }
  // }

  return errors;
};

// This file defines API routes for managing transaction data in the Transport Management System.
// It uses Express.js to create route handlers for CRUD operations (Create, Read, Update, Delete)
// related to vehicle transactions. The routes interact with a MySQL database through a connection pool.

module.exports = (pool) => {
  // Get all transactions with related data
  // This route retrieves all transaction records from the database with related information.
  // It supports filtering by trip_type query parameter.
  // It responds with a JSON array of transaction objects.
  router.get('/', async (req, res) => {
    try {
      const { trip_type } = req.query;

      let query = `
        SELECT
          vt.*,
          c.Name as CustomerName,
          c.CustomerCode,
          p.ProjectName,
          l.LocationName,
          v.VehicleRegistrationNo,
          v.VehicleCode,
          d.DriverName,
          d.DriverLicenceNo,
          vend.VendorName,
          vend.VendorCode
        FROM VehicleTransaction vt
        LEFT JOIN Customer c ON vt.CustomerID = c.CustomerID
        LEFT JOIN Project p ON vt.ProjectID = p.ProjectID
        LEFT JOIN Location l ON vt.LocationID = l.LocationID
        LEFT JOIN Vehicle v ON vt.VehicleID = v.VehicleID
        LEFT JOIN Driver d ON vt.DriverID = d.DriverID
        LEFT JOIN Vendor vend ON vt.VendorID = vend.VendorID
      `;

      const params = [];

      if (trip_type && (trip_type === 'Fixed' || trip_type === 'Adhoc')) {
        query += ' WHERE vt.TripType = ?';
        params.push(trip_type);
      }

      query += ' ORDER BY vt.TransactionDate DESC, vt.TransactionID DESC';

      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get a single transaction by ID
  // This route retrieves a specific transaction record based on the provided ID.
  // It responds with a JSON object of the transaction if found, or a 404 error if not found.
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await pool.query('SELECT * FROM VehicleTransaction WHERE TransactionID = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create a new transaction
  // This route creates a new transaction record in the database using the data provided in the request body.
  // It responds with a 201 status code and the newly created transaction's data, including the generated ID.
  router.post('/', async (req, res) => {
    let transaction = req.body;

    // Parse JSON if transactionData is sent as string
    if (req.body.transactionData) {
      transaction = JSON.parse(req.body.transactionData || '{}');
    }

    console.log('Transaction data received:', transaction);
    console.log('TripType value:', transaction.TripType);

    // Validation: Required fields
    if (!transaction.TripType || !['Fixed', 'Adhoc'].includes(transaction.TripType)) {
      return res.status(400).json({ error: 'TripType is required and must be either Fixed or Adhoc' });
    }
    if (!transaction.TransactionDate) {
      return res.status(400).json({ error: 'TransactionDate is required' });
    }
    if (!transaction.VehicleID) {
      return res.status(400).json({ error: 'VehicleID is required' });
    }
    if (!transaction.DriverID) {
      return res.status(400).json({ error: 'DriverID is required' });
    }
    // VendorID is optional: derive from selected vehicle; fallback to provided body value if present.
    if (!transaction.CustomerID) {
      return res.status(400).json({ error: 'CustomerID is required' });
    }

    // Trip type specific validation
    if (transaction.TripType === 'Fixed' && !transaction.DeliveriesDone) {
      return res.status(400).json({ error: 'DeliveriesDone is required for Fixed trips' });
    }
    if (transaction.TripType === 'Adhoc' && !transaction.TripNo) {
      return res.status(400).json({ error: 'TripNo is required for Adhoc trips' });
    }

    try {
      // Get VendorID from the selected vehicle
      const [vehicleResult] = await pool.query(
        'SELECT VendorID FROM Vehicle WHERE VehicleID = ?',
        [transaction.VehicleID]
      );

      if (vehicleResult.length === 0) {
        return res.status(400).json({ error: 'Selected vehicle not found' });
      }

      const vendorID = vehicleResult[0].VendorID;

      const [result] = await pool.query(
        `INSERT INTO VehicleTransaction (
          TripType, TransactionDate, Shift, VehicleID, DriverID, VendorID,
          CustomerID, ProjectID, LocationID, OpeningKM, ClosingKM, FreightFix,
          DeliveriesDone, TripNo, FreightVariable, AdvancePaid, BalancePaid,
          LoadingPoint, UnloadingPoint, MaterialType, Remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transaction.TripType,
          transaction.TransactionDate,
          transaction.Shift || null,
          transaction.VehicleID,
          transaction.DriverID,
          vendorID,
          transaction.CustomerID,
          transaction.ProjectID || null,
          transaction.LocationID || null,
          transaction.OpeningKM || null,
          transaction.ClosingKM || null,
          transaction.FreightFix || null,
          transaction.TripType === 'Fixed' ? transaction.DeliveriesDone : null,
          transaction.TripType === 'Adhoc' ? transaction.TripNo : null,
          transaction.TripType === 'Adhoc' ? transaction.FreightVariable : null,
          transaction.TripType === 'Adhoc' ? transaction.AdvancePaid : null,
          transaction.TripType === 'Adhoc' ? transaction.BalancePaid : null,
          transaction.LoadingPoint || null,
          transaction.UnloadingPoint || null,
          transaction.MaterialType || null,
          transaction.Remarks || null
        ]
      );

      // Fetch the created transaction with related data
      const [newTransaction] = await pool.query(`
        SELECT
          vt.*,
          c.Name as CustomerName,
          c.CustomerCode,
          p.ProjectName,
          l.LocationName,
          v.VehicleRegistrationNo,
          v.VehicleCode,
          d.DriverName,
          d.DriverLicenceNo,
          vend.VendorName,
          vend.VendorCode
        FROM VehicleTransaction vt
        LEFT JOIN Customer c ON vt.CustomerID = c.CustomerID
        LEFT JOIN Project p ON vt.ProjectID = p.ProjectID
        LEFT JOIN Location l ON vt.LocationID = l.LocationID
        LEFT JOIN Vehicle v ON vt.VehicleID = v.VehicleID
        LEFT JOIN Driver d ON vt.DriverID = d.DriverID
        LEFT JOIN Vendor vend ON vt.VendorID = vend.VendorID
        WHERE vt.TransactionID = ?
      `, [result.insertId]);

      res.status(201).json(newTransaction[0]);
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update a transaction
  // This route updates an existing transaction record identified by the provided ID with new data from the request body.
  // It responds with the updated transaction data if successful, or a 404 error if the transaction is not found.
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const transaction = req.body;
    try {
      // Get VendorID from the selected vehicle
      const [vehicleResult] = await pool.query(
        'SELECT VendorID FROM Vehicle WHERE VehicleID = ?',
        [transaction.VehicleID]
      );

      if (vehicleResult.length === 0) {
        return res.status(400).json({ error: 'Selected vehicle not found' });
      }

      const vendorID = vehicleResult[0].VendorID;

      // Format date to YYYY-MM-DD
      const transactionDate = transaction.TransactionDate ?
        new Date(transaction.TransactionDate).toISOString().split('T')[0] : null;

      const [result] = await pool.query(
        'UPDATE VehicleTransaction SET TripType = ?, TransactionDate = ?, Shift = ?, VehicleID = ?, DriverID = ?, VendorID = ?, CustomerID = ?, ProjectID = ?, LocationID = ?, OpeningKM = ?, ClosingKM = ?, FreightFix = ?, DeliveriesDone = ?, TripNo = ?, FreightVariable = ?, AdvancePaid = ?, BalancePaid = ?, LoadingPoint = ?, UnloadingPoint = ?, MaterialType = ?, Remarks = ? WHERE TransactionID = ?',
        [
          transaction.TripType,
          transactionDate,
          transaction.Shift || null,
          transaction.VehicleID,
          transaction.DriverID,
          vendorID,
          transaction.CustomerID,
          transaction.ProjectID || null,
          transaction.LocationID || null,
          transaction.OpeningKM || null,
          transaction.ClosingKM || null,
          transaction.FreightFix || null,
          transaction.DeliveriesDone || null,
          transaction.TripNo || null,
          transaction.FreightVariable || null,
          transaction.AdvancePaid || null,
          transaction.BalancePaid || null,
          transaction.LoadingPoint || null,
          transaction.UnloadingPoint || null,
          transaction.MaterialType || null,
          transaction.Remarks || null,
          id
        ]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json({ TransactionID: parseInt(id), ...transaction });
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete a transaction
  // This route deletes a transaction record from the database based on the provided ID.
  // It responds with a success message if the deletion is successful, or a 404 error if the transaction is not found.
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [result] = await pool.query('DELETE FROM VehicleTransaction WHERE TransactionID = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
