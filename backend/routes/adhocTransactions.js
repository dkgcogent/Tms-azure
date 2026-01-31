const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

// GET /api/adhoc-transactions - Get all adhoc/replacement transactions
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT
        at.*,
        c.Name as CustomerName,
        p.ProjectName
      FROM adhoc_transactions at
      LEFT JOIN customer c ON at.CustomerID = c.CustomerID
      LEFT JOIN project p ON at.ProjectID = p.ProjectID
      ORDER BY at.TransactionDate DESC, at.TransactionID DESC
    `;
    
    const [rows] = await pool.query(query);

    // Format date fields for all transactions to avoid timezone issues
    const formattedRows = rows.map(transaction => {
      if (transaction.AdvancePaidDate) {
        const date = new Date(transaction.AdvancePaidDate);
        transaction.AdvancePaidDate = date.getFullYear() + '-' +
          String(date.getMonth() + 1).padStart(2, '0') + '-' +
          String(date.getDate()).padStart(2, '0');
      }
      if (transaction.BalancePaidDate) {
        const date = new Date(transaction.BalancePaidDate);
        transaction.BalancePaidDate = date.getFullYear() + '-' +
          String(date.getMonth() + 1).padStart(2, '0') + '-' +
          String(date.getDate()).padStart(2, '0');
      }
      if (transaction.TransactionDate) {
        const date = new Date(transaction.TransactionDate);
        transaction.TransactionDate = date.getFullYear() + '-' +
          String(date.getMonth() + 1).padStart(2, '0') + '-' +
          String(date.getDate()).padStart(2, '0');
      }
      return transaction;
    });

    res.json({
      success: true,
      data: formattedRows,
      count: formattedRows.length
    });
  } catch (error) {
    console.error('Error fetching adhoc transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch adhoc transactions',
      details: error.message
    });
  }
});

// GET /api/adhoc-transactions/:id - Get single adhoc transaction
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT
        at.*,
        c.Name as CustomerName,
        p.ProjectName
      FROM adhoc_transactions at
      LEFT JOIN customer c ON at.CustomerID = c.CustomerID
      LEFT JOIN project p ON at.ProjectID = p.ProjectID
      WHERE at.TransactionID = ?
    `;

    console.log('🔍 ADHOC API GET: Executing query:', query);
    console.log('🔍 ADHOC API GET: With parameters:', [id]);

    const [rows] = await pool.query(query, [id]);

    console.log('🔍 ADHOC API GET: Raw database result for ID', id, ':', {
      rowCount: rows.length,
      AdvancePaidDate: rows[0]?.AdvancePaidDate,
      BalancePaidDate: rows[0]?.BalancePaidDate,
      UpdatedAt: rows[0]?.UpdatedAt,
      rawAdvancePaidDate: JSON.stringify(rows[0]?.AdvancePaidDate),
      rawBalancePaidDate: JSON.stringify(rows[0]?.BalancePaidDate)
    });

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Adhoc transaction not found'
      });
    }

    // Format date fields to avoid timezone issues
    const transaction = rows[0];
    if (transaction.AdvancePaidDate) {
      const date = new Date(transaction.AdvancePaidDate);
      transaction.AdvancePaidDate = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
    }
    if (transaction.BalancePaidDate) {
      const date = new Date(transaction.BalancePaidDate);
      transaction.BalancePaidDate = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
    }
    if (transaction.TransactionDate) {
      const date = new Date(transaction.TransactionDate);
      transaction.TransactionDate = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching adhoc transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch adhoc transaction',
      details: error.message
    });
  }
});

  // Helper function to validate time in HH:MM format (4 digits mandatory)
  const isValidTime = (time) => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  };

  // Helper function to calculate duty hours considering after midnight scenario
  const calculateDutyHours = (arrival, returnTime) => {
    const [arrivalHour, arrivalMinute] = arrival.split(':').map(Number);
    const [returnHour, returnMinute] = returnTime.split(':').map(Number);

    let arrivalDate = new Date();
    arrivalDate.setHours(arrivalHour, arrivalMinute, 0, 0);

    let returnDate = new Date();
    returnDate.setHours(returnHour, returnMinute, 0, 0);

    if (returnDate <= arrivalDate) {
      // Return time is after midnight
      returnDate.setDate(returnDate.getDate() + 1);
    }

    const diffMs = returnDate - arrivalDate;
    const hours = diffMs / (1000 * 60 * 60);
    return hours;
  };

  // POST /api/adhoc-transactions - Create new adhoc transaction
  router.post('/', async (req, res) => {
    try {
      const {
        TripType,
        TransactionDate,
        TripNo,
        CustomerID,
        ProjectID,
        VehicleNumber,
        VehicleType,
        VendorName,
        VendorCode, // New field
        VendorNumber,
        DriverName,
        DriverNumber,
        DriverAadharNumber,
        DriverLicenceNumber,
        DriverAadharDoc,
        DriverLicenceDoc,
        TollExpensesDoc,
        ParkingChargesDoc,
        ArrivalTimeAtHub,
        InTimeByCust,
        OutTimeFromHub,
        ReturnReportingTime,
        OutTimeFrom,
        OpeningKM,
        ClosingKM,
        TotalShipmentsForDeliveries,
        TotalShipmentDeliveriesAttempted,
        TotalShipmentDeliveriesDone,
        VFreightFix,
        FixKm,
        VFreightVariable,
        TotalFreight,
        TollExpenses,
        ParkingCharges,
        LoadingCharges,
        UnloadingCharges,
        OtherCharges,
        OtherChargesRemarks,
        TotalDutyHours,
        OvertimeCostPerHour, // New field
        CompanyName, // New field
        AdvanceRequestNo,
        AdvanceToPaid,
        AdvanceApprovedAmount,
        AdvanceApprovedBy,
        AdvancePaidAmount,
        AdvancePaidMode,
        AdvancePaidDate,
        AdvancePaidBy,
        EmployeeDetailsAdvance,
        BalanceToBePaid,
        BalancePaidAmount,
        Variance,
        BalancePaidDate,
        BalancePaidBy,
        EmployeeDetailsBalance,
        Revenue,
        Margin,
        MarginPercentage,
        Status = 'Pending',
        TripClose = false,
        Remarks
      } = req.body;

      // Validate required fields
      if (!TripType || !TransactionDate || !TripNo || !VehicleNumber || !VendorName || !DriverName || !DriverNumber || !OpeningKM || !ClosingKM) {
        return res.status(400).json({
          success: false,
          error: 'Required fields: TripType, TransactionDate, TripNo, VehicleNumber, VendorName, DriverName, DriverNumber, OpeningKM, ClosingKM'
        });
      }

      // Validate 4-digit time format for time fields if provided
      const timeFields = { ArrivalTimeAtHub, OutTimeFromHub, ReturnReportingTime };
      for (const [field, value] of Object.entries(timeFields)) {
        if (value && !isValidTime(value)) {
          return res.status(400).json({ success: false, error: `Invalid ${field} format. Use HH:MM.` });
        }
      }

      // Validate return reporting time is not prior to arrival time
      if (ArrivalTimeAtHub && ReturnReportingTime) {
        const dutyHours = calculateDutyHours(ArrivalTimeAtHub, ReturnReportingTime);
        if (dutyHours >= 24) {
          return res.status(400).json({ success: false, error: 'Return time seems incorrect, resulting in a duration of 24 hours or more.' });
        }
      }

      // Note: For ADHOC/REPLACEMENT, all vehicle/vendor/driver details are entered manually
      // No FixedVehicleNumber field needed as it doesn't exist in adhoc_transactions table

      // Calculate TotalDutyHours if ArrivalTimeAtHub and ReturnReportingTime are provided
      let calculatedDutyHours = null;
      if (ArrivalTimeAtHub && ReturnReportingTime) {
        calculatedDutyHours = calculateDutyHours(ArrivalTimeAtHub, ReturnReportingTime);
      }

      const query = `
        INSERT INTO adhoc_transactions (
          TripType, TransactionDate, TripNo, CustomerID, ProjectID,
          VehicleNumber, VehicleType, VendorName, VendorCode, VendorNumber,
          DriverName, DriverNumber, DriverAadharNumber, DriverLicenceNumber,
          DriverAadharDoc, DriverLicenceDoc, TollExpensesDoc, ParkingChargesDoc,
          ArrivalTimeAtHub, InTimeByCust, OutTimeFromHub, ReturnReportingTime, OutTimeFrom,
          OpeningKM, ClosingKM, TotalShipmentsForDeliveries, TotalShipmentDeliveriesAttempted, TotalShipmentDeliveriesDone,
          VFreightFix, FixKm, VFreightVariable, TotalFreight,
          TollExpenses, ParkingCharges, LoadingCharges, UnloadingCharges, OtherCharges, OtherChargesRemarks,
          TotalDutyHours, OvertimeCostPerHour, CompanyName, AdvanceRequestNo, AdvanceToPaid, AdvanceApprovedAmount, AdvanceApprovedBy,
          AdvancePaidAmount, AdvancePaidMode, AdvancePaidDate, AdvancePaidBy, EmployeeDetailsAdvance,
          BalanceToBePaid, BalancePaidAmount, Variance, BalancePaidDate, BalancePaidBy, EmployeeDetailsBalance,
          Revenue, Margin, MarginPercentage, Status, TripClose, Remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        TripType, TransactionDate, TripNo, CustomerID, ProjectID,
        VehicleNumber, VehicleType, VendorName, VendorCode, VendorNumber,
        DriverName, DriverNumber, DriverAadharNumber, DriverLicenceNumber,
        DriverAadharDoc, DriverLicenceDoc, TollExpensesDoc, ParkingChargesDoc,
        ArrivalTimeAtHub, InTimeByCust, OutTimeFromHub, ReturnReportingTime, OutTimeFrom,
        OpeningKM, ClosingKM, TotalShipmentsForDeliveries, TotalShipmentDeliveriesAttempted, TotalShipmentDeliveriesDone,
        VFreightFix, FixKm, VFreightVariable, TotalFreight,
        TollExpenses, ParkingCharges, LoadingCharges, UnloadingCharges, OtherCharges, OtherChargesRemarks,
        calculatedDutyHours, OvertimeCostPerHour, CompanyName, AdvanceRequestNo, AdvanceToPaid, AdvanceApprovedAmount, AdvanceApprovedBy,
        AdvancePaidAmount, AdvancePaidMode, AdvancePaidDate, AdvancePaidBy, EmployeeDetailsAdvance,
        BalanceToBePaid, BalancePaidAmount, Variance, BalancePaidDate, BalancePaidBy, EmployeeDetailsBalance,
        Revenue, Margin, MarginPercentage, Status, TripClose, Remarks
      ];

      const [result] = await pool.query(query, values);

      res.status(201).json({
        success: true,
        message: 'Adhoc transaction created successfully',
        data: {
          TransactionID: result.insertId,
          ...req.body,
          TotalDutyHours: calculatedDutyHours
        }
      });
    } catch (error) {
      console.error('Error creating adhoc transaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create adhoc transaction',
        details: error.message
      });
    }
  });

// PUT /api/adhoc-transactions/:id - Update adhoc transaction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    console.log('🔧 ADHOC API: PUT request received for transaction ID:', id);
    console.log('🔧 ADHOC API: Request body:', JSON.stringify(updateFields, null, 2));

    // Remove TransactionID from update fields if present
    delete updateFields.TransactionID;
    delete updateFields.CreatedAt;

    // Build dynamic update query
    const fields = Object.keys(updateFields);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updateFields[field]);
    values.push(id); // Add ID for WHERE clause

    console.log('🔧 ADHOC API: Fields to update:', fields);
    console.log('🔧 ADHOC API: Values:', values);

    const query = `
      UPDATE adhoc_transactions SET
        ${setClause}, UpdatedAt = CURRENT_TIMESTAMP
      WHERE TransactionID = ?
    `;

    console.log('🔧 ADHOC API: Executing query:', query);

    const [result] = await pool.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Adhoc transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Adhoc transaction updated successfully'
    });
  } catch (error) {
    console.error('Error updating adhoc transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update adhoc transaction',
      details: error.message
    });
  }
});

// DELETE /api/adhoc-transactions/bulk - Bulk delete adhoc transactions
router.delete('/bulk', async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of transaction IDs to delete' });
  }

  try {
    console.log(`🗑️ Bulk delete adhoc transactions - IDs: ${ids.join(', ')}`);

    const placeholders = ids.map(() => '?').join(',');
    const [result] = await pool.query(`DELETE FROM adhoc_transactions WHERE TransactionID IN (${placeholders})`, ids);

    const deletedCount = result.affectedRows;
    const notFoundCount = ids.length - deletedCount;

    console.log(`✅ Bulk delete completed - Deleted: ${deletedCount}, Not found: ${notFoundCount}`);

    res.json({
      message: `Successfully deleted ${deletedCount} adhoc transaction(s)`,
      deletedCount,
      notFoundCount,
      totalRequested: ids.length
    });
  } catch (error) {
    console.error('❌ Error bulk deleting adhoc transactions:', error);
    res.status(500).json({ error: 'Unable to delete adhoc transactions. Please try again later.' });
  }
});

// DELETE /api/adhoc-transactions/:id - Delete adhoc transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM adhoc_transactions WHERE TransactionID = ?';
    const [result] = await pool.query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Adhoc transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Adhoc transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting adhoc transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete adhoc transaction',
      details: error.message
    });
  }
});

  // TEST ENDPOINT - Debug database connection
  router.get('/debug/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Test the exact same query as manual MySQL
      const testQuery = `SELECT TransactionID, AdvancePaidDate, BalancePaidDate FROM adhoc_transactions WHERE TransactionID = ?`;
      const [testRows] = await pool.query(testQuery, [id]);

      console.log('🔍 DEBUG: Test query result:', testRows[0]);

      res.json({
        success: true,
        debug: {
          query: testQuery,
          parameters: [id],
          result: testRows[0],
          rawResult: JSON.stringify(testRows[0])
        }
      });
    } catch (error) {
      console.error('❌ DEBUG endpoint error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};
