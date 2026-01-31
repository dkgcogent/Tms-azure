const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

// GET /api/fixed-transactions - Get all fixed transactions
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT
        ft.*,
        c.Name as CustomerName,
        p.ProjectName,
        v.VendorName,
        v.VendorCode,
        d.DriverName,
        d.DriverMobileNo,
        vh.VehicleRegistrationNo,
        vh.VehicleType
      FROM fixed_transactions ft
      LEFT JOIN customer c ON ft.CustomerID = c.CustomerID
      LEFT JOIN project p ON ft.ProjectID = p.ProjectID
      LEFT JOIN vendor v ON ft.VendorID = v.VendorID
      LEFT JOIN driver d ON JSON_EXTRACT(ft.DriverIDs, '$[0]') = d.DriverID
      LEFT JOIN vehicle vh ON JSON_EXTRACT(ft.VehicleIDs, '$[0]') = vh.VehicleID
      ORDER BY ft.TransactionDate DESC, ft.TransactionID DESC
    `;

    const [rows] = await pool.query(query);

    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching fixed transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fixed transactions',
      details: error.message
    });
  }
});

// GET /api/fixed-transactions/:id - Get single fixed transaction
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        ft.*,
        c.Name as CustomerName,
        p.ProjectName,
        v.VendorName,
        v.VendorCode,
        d.DriverName,
        d.DriverMobileNo,
        vh.VehicleRegistrationNo,
        vh.VehicleType
      FROM fixed_transactions ft
      LEFT JOIN customer c ON ft.CustomerID = c.CustomerID
      LEFT JOIN project p ON ft.ProjectID = p.ProjectID
      LEFT JOIN vendor v ON ft.VendorID = v.VendorID
      LEFT JOIN driver d ON JSON_EXTRACT(ft.DriverIDs, '$[0]') = d.DriverID
      LEFT JOIN vehicle vh ON JSON_EXTRACT(ft.VehicleIDs, '$[0]') = vh.VehicleID
      WHERE ft.TransactionID = ?
    `;

    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Fixed transaction not found'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching fixed transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fixed transaction',
      details: error.message
    });
  }
});

// POST /api/fixed-transactions - Create new fixed transaction
router.post('/', async (req, res) => {
  try {
    const {
      // Basic transaction info
      TripType = 'Fixed',
      TransactionDate,
      Shift,
      VehicleID,
      DriverID,
      VendorID,
      CustomerID,
      ProjectID,
      LocationID,

      // Driver and timing info
      ReplacementDriverID,
      ReplacementDriverName,
      ReplacementDriverNo,
      ArrivalTimeAtHub,
      InTimeByCust,
      OutTimeFromHub,
      ReturnReportingTime,

      // KM and delivery info
      OpeningKM,
      ClosingKM,
      TotalDeliveries,
      TotalDeliveriesAttempted,
      TotalDeliveriesDone,
      // TotalDutyHours, // This will be calculated
      OvertimeCostPerHour, // New field

      // Freight info
      VFreightFix,
      FixKm,
      VFreightVariable,
      TotalFreight,

      // Expense details
      TollExpenses,
      ParkingCharges,
      LoadingCharges,
      UnloadingCharges,
      OtherCharges,
      OtherChargesRemarks,
      HandlingCharges,

      // Advance payment info
      AdvanceRequestNo,
      AdvanceToPaid,
      AdvanceApprovedAmount,
      AdvanceApprovedBy,
      AdvancePaidAmount,
      AdvancePaidMode,
      AdvancePaidDate,
      AdvancePaidBy,
      EmployeeDetailsAdvance,

      // Balance payment info
      BalanceToBePaid,
      BalancePaidAmount,
      Variance,
      BalancePaidDate,
      BalancePaidBy,
      EmployeeDetailsBalance,

      // Financial calculations
      Revenue,
      Margin,
      MarginPercentage,

      // Document fields
      DriverAadharDoc,
      DriverLicenceDoc,
      TollExpensesDoc,
      ParkingChargesDoc,

      // Additional timing
      OutTimeFrom,

      // Shipment info
      TotalShipmentsForDeliveries,
      TotalShipmentDeliveriesAttempted,
      TotalShipmentDeliveriesDone,

      // Trip and status info
      TripNo,
      Remarks,
      Status = 'Pending',
      TripClose = false,

      // Manual entry fields
      VehicleNumber,
      VendorName,
      VendorCode, // New field
      VendorNumber,
      DriverName,
      DriverNumber,
      DriverAadharNumber,
      DriverLicenceNumber,
      VehicleType,

      // Company info
      CompanyName,
      GSTNo,
      CustomerSite,
      Location
    } = req.body;

    // Validate required fields
    if (!TransactionDate || !VehicleID || !DriverID || !CustomerID || !OpeningKM || !ClosingKM) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: TransactionDate, VehicleID, DriverID, CustomerID, OpeningKM, ClosingKM'
      });
    }

    // Time validation (HH:MM format)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (ArrivalTimeAtHub && !timeRegex.test(ArrivalTimeAtHub)) {
        return res.status(400).json({ success: false, error: 'Invalid ArrivalTimeAtHub format. Use HH:MM.' });
    }
    if (ReturnReportingTime && !timeRegex.test(ReturnReportingTime)) {
        return res.status(400).json({ success: false, error: 'Invalid ReturnReportingTime format. Use HH:MM.' });
    }

    let totalDutyHours = null;
    if (ArrivalTimeAtHub && ReturnReportingTime) {
        const [arrivalHour, arrivalMinute] = ArrivalTimeAtHub.split(':').map(Number);
        const [returnHour, returnMinute] = ReturnReportingTime.split(':').map(Number);

        let arrival = new Date();
        arrival.setHours(arrivalHour, arrivalMinute, 0, 0);

        let departure = new Date();
        departure.setHours(returnHour, returnMinute, 0, 0);

        if (departure <= arrival) {
            // If return time is earlier or same, assume it's for the next day for calculation
            departure.setDate(departure.getDate() + 1);
        }

        const diffMs = departure - arrival;
        totalDutyHours = diffMs / (1000 * 60 * 60);

        // Add validation for trip duration
        if (totalDutyHours >= 24) {
            return res.status(400).json({ success: false, error: 'Return time seems incorrect, resulting in a duration of 24 hours or more.' });
        }
    }


    // Convert single VehicleID/DriverID to JSON arrays for database
    const VehicleIDs = VehicleID ? JSON.stringify([VehicleID]) : null;
    const DriverIDs = DriverID ? JSON.stringify([DriverID]) : null;

    const query = `
      INSERT INTO fixed_transactions (
        TripType, TransactionDate, Shift, VehicleIDs, DriverIDs, VendorID, CustomerID, ProjectID, LocationID,
        ReplacementDriverID, ReplacementDriverName, ReplacementDriverNo,
        ArrivalTimeAtHub, InTimeByCust, OutTimeFromHub, ReturnReportingTime,
        OpeningKM, ClosingKM, TotalDeliveries, TotalDeliveriesAttempted, TotalDeliveriesDone,
        TotalDutyHours, OvertimeCostPerHour, VFreightFix, FixKm, VFreightVariable, TotalFreight,
        TollExpenses, ParkingCharges, LoadingCharges, UnloadingCharges, OtherCharges, OtherChargesRemarks,
        HandlingCharges, AdvanceRequestNo, AdvanceToPaid, AdvanceApprovedAmount, AdvanceApprovedBy,
        AdvancePaidAmount, AdvancePaidMode, AdvancePaidDate, AdvancePaidBy, EmployeeDetailsAdvance,
        BalanceToBePaid, BalancePaidAmount, Variance, BalancePaidDate, BalancePaidBy, EmployeeDetailsBalance,
        Revenue, Margin, MarginPercentage, DriverAadharDoc, DriverLicenceDoc, TollExpensesDoc, ParkingChargesDoc,
        OutTimeFrom, TotalShipmentsForDeliveries, TotalShipmentDeliveriesAttempted, TotalShipmentDeliveriesDone,
        TripNo, VehicleNumber, VendorName, VendorCode, VendorNumber, DriverName, DriverNumber, DriverAadharNumber,
        DriverLicenceNumber, VehicleType, CompanyName, GSTNo, CustomerSite, Location,
        Remarks, Status, TripClose
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      TripType, TransactionDate, Shift, VehicleIDs, DriverIDs, VendorID, CustomerID, ProjectID, LocationID,
      ReplacementDriverID, ReplacementDriverName, ReplacementDriverNo,
      ArrivalTimeAtHub, InTimeByCust, OutTimeFromHub, ReturnReportingTime,
      OpeningKM, ClosingKM, TotalDeliveries, TotalDeliveriesAttempted, TotalDeliveriesDone,
      totalDutyHours, OvertimeCostPerHour, VFreightFix, FixKm, VFreightVariable, TotalFreight,
      TollExpenses, ParkingCharges, LoadingCharges, UnloadingCharges, OtherCharges, OtherChargesRemarks,
      HandlingCharges, AdvanceRequestNo, AdvanceToPaid, AdvanceApprovedAmount, AdvanceApprovedBy,
      AdvancePaidAmount, AdvancePaidMode, AdvancePaidDate, AdvancePaidBy, EmployeeDetailsAdvance,
      BalanceToBePaid, BalancePaidAmount, Variance, BalancePaidDate, BalancePaidBy, EmployeeDetailsBalance,
      Revenue, Margin, MarginPercentage, DriverAadharDoc, DriverLicenceDoc, TollExpensesDoc, ParkingChargesDoc,
      OutTimeFrom, TotalShipmentsForDeliveries, TotalShipmentDeliveriesAttempted, TotalShipmentDeliveriesDone,
      TripNo, VehicleNumber, VendorName, VendorCode, VendorNumber, DriverName, DriverNumber, DriverAadharNumber,
      DriverLicenceNumber, VehicleType, CompanyName, GSTNo, CustomerSite, Location,
      Remarks, Status, TripClose
    ];

    const [result] = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Fixed transaction created successfully',
      data: {
        TransactionID: result.insertId,
        ...req.body,
        TotalDutyHours: totalDutyHours // Also return calculated duty hours
      }
    });
  } catch (error) {
    console.error('Error creating fixed transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create fixed transaction',
      details: error.message
    });
  }
});

// PUT /api/fixed-transactions/:id - Update fixed transaction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    console.log('🔧 FIXED API: PUT request received for transaction ID:', id);
    console.log('🔧 FIXED API: Request body:', JSON.stringify(updateFields, null, 2));

    // Remove TransactionID from update fields if present
    delete updateFields.TransactionID;
    delete updateFields.CreatedAt;

    // Time validation (HH:MM format)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (updateFields.ArrivalTimeAtHub && !timeRegex.test(updateFields.ArrivalTimeAtHub)) {
        return res.status(400).json({ success: false, error: 'Invalid ArrivalTimeAtHub format. Use HH:MM.' });
    }
    if (updateFields.ReturnReportingTime && !timeRegex.test(updateFields.ReturnReportingTime)) {
        return res.status(400).json({ success: false, error: 'Invalid ReturnReportingTime format. Use HH:MM.' });
    }

    // Recalculate TotalDutyHours if timing fields are updated
    if (updateFields.ArrivalTimeAtHub || updateFields.ReturnReportingTime) {
        const [existing] = await pool.query('SELECT ArrivalTimeAtHub, ReturnReportingTime FROM fixed_transactions WHERE TransactionID = ?', [id]);
        const arrivalTimeValue = updateFields.ArrivalTimeAtHub || (existing.length > 0 ? existing[0].ArrivalTimeAtHub : null);
        const returnTimeValue = updateFields.ReturnReportingTime || (existing.length > 0 ? existing[0].ReturnReportingTime : null);

        if (arrivalTimeValue && returnTimeValue) {
            const [arrivalHour, arrivalMinute] = arrivalTimeValue.split(':').map(Number);
            const [returnHour, returnMinute] = returnTimeValue.split(':').map(Number);

            let arrival = new Date();
            arrival.setHours(arrivalHour, arrivalMinute, 0, 0);

            let departure = new Date();
            departure.setHours(returnHour, returnMinute, 0, 0);

            if (departure <= arrival) {
                // If return time is earlier or same, assume it's for the next day for calculation
                departure.setDate(departure.getDate() + 1);
            }

            const diffMs = departure - arrival;
            const totalDutyHours = diffMs / (1000 * 60 * 60);

            // Add validation for trip duration
            if (totalDutyHours >= 24) {
                return res.status(400).json({ success: false, error: 'Return time seems incorrect, resulting in a duration of 24 hours or more.' });
            }
            updateFields.TotalDutyHours = totalDutyHours;
        }
    }


    // Handle VehicleID/DriverID conversion to JSON arrays
    if (updateFields.VehicleID && !updateFields.VehicleIDs) {
      updateFields.VehicleIDs = JSON.stringify([updateFields.VehicleID]);
      delete updateFields.VehicleID;
    }
    if (updateFields.DriverID && !updateFields.DriverIDs) {
      updateFields.DriverIDs = JSON.stringify([updateFields.DriverID]);
      delete updateFields.DriverID;
    }

    // Build dynamic update query
    const fields = Object.keys(updateFields);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const updateValues = fields.map(field => updateFields[field]);
    updateValues.push(id); // Add ID for WHERE clause

    console.log('🔧 FIXED API: Fields to update:', fields);
    console.log('🔧 FIXED API: Values:', updateValues);

    const query = `
      UPDATE fixed_transactions SET
        ${setClause}, UpdatedAt = CURRENT_TIMESTAMP
      WHERE TransactionID = ?
    `;

    const [result] = await pool.query(query, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Fixed transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Fixed transaction updated successfully'
    });
  } catch (error) {
    console.error('Error updating fixed transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update fixed transaction',
      details: error.message
    });
  }
});

// DELETE /api/fixed-transactions/bulk - Bulk delete fixed transactions
router.delete('/bulk', async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of transaction IDs to delete' });
  }

  try {
    console.log(`🗑️ Bulk delete fixed transactions - IDs: ${ids.join(', ')}`);

    const placeholders = ids.map(() => '?').join(',');
    const [result] = await pool.query(`DELETE FROM fixed_transactions WHERE TransactionID IN (${placeholders})`, ids);

    const deletedCount = result.affectedRows;
    const notFoundCount = ids.length - deletedCount;

    console.log(`✅ Bulk delete completed - Deleted: ${deletedCount}, Not found: ${notFoundCount}`);

    res.json({
      message: `Successfully deleted ${deletedCount} fixed transaction(s)`,
      deletedCount,
      notFoundCount,
      totalRequested: ids.length
    });
  } catch (error) {
    console.error('❌ Error bulk deleting fixed transactions:', error);
    res.status(500).json({ error: 'Unable to delete fixed transactions. Please try again later.' });
  }
});

// DELETE /api/fixed-transactions/:id - Delete fixed transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM fixed_transactions WHERE TransactionID = ?';
    const [result] = await pool.query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Fixed transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Fixed transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting fixed transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete fixed transaction',
      details: error.message
    });
  }
});

  return router;
};
