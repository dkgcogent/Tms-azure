const express = require('express');
const router = express.Router();

// This file defines API routes for generating various reports in the Transport Management System.
// It uses Express.js to create route handlers for different types of reports
// related to trips, revenue, utilization, and payments. The routes interact with a MySQL database through a connection pool.

module.exports = (pool) => {
  // Daily Trip Report
  // This route retrieves daily trip data from both Fixed and Adhoc transaction tables
  router.get('/daily-trips', async (req, res) => {
    try {
      console.log('📊 REPORTS API: Daily trips called with params:', req.query);
      const { start_date, end_date, trip_type } = req.query;

      let results = [];

      // Get Fixed transactions if not filtering by Adhoc/Replacement only
      if (!trip_type || trip_type === 'Fixed') {
        let fixedQuery = `
          SELECT
            ft.TransactionID,
            DATE(ft.TransactionDate) as TripDate,
            ft.TripType,
            ft.VFreightFix as FreightFix,
            ft.VFreightVariable as FreightVariable,
            (ft.ClosingKM - ft.OpeningKM) as Kilometers,
            COALESCE(v.VehicleRegistrationNo, 'N/A') as VehicleRegistrationNo,
            COALESCE(v.VehicleCode, v.VehicleRegistrationNo, 'N/A') as VehicleCode,
            COALESCE(d.DriverName, 'N/A') as DriverName,
            COALESCE(c.Name, 'N/A') as CustomerName,
            COALESCE(p.ProjectName, 'N/A') as ProjectName,
            ft.Shift,
            ft.Status,
            ft.TotalDeliveries,
            ft.TotalDeliveriesAttempted,
            ft.TotalDeliveriesDone,
            ft.TotalDutyHours
          FROM fixed_transactions ft
          LEFT JOIN customer c ON ft.CustomerID = c.CustomerID
          LEFT JOIN project p ON ft.ProjectID = p.ProjectID
          LEFT JOIN vehicle v ON v.VehicleID = JSON_UNQUOTE(JSON_EXTRACT(ft.VehicleIDs, '$[0]'))
          LEFT JOIN driver d ON d.DriverID = JSON_UNQUOTE(JSON_EXTRACT(ft.DriverIDs, '$[0]'))
          WHERE 1=1
        `;

        const fixedParams = [];

        if (start_date) {
          fixedQuery += ' AND DATE(ft.TransactionDate) >= ?';
          fixedParams.push(start_date);
        }

        if (end_date) {
          fixedQuery += ' AND DATE(ft.TransactionDate) <= ?';
          fixedParams.push(end_date);
        }

        fixedQuery += ' ORDER BY ft.TransactionDate DESC, ft.TransactionID DESC';

        try {
          console.log('📊 REPORTS API: Executing Fixed query with params:', fixedParams);
          const [fixedRows] = await pool.execute(fixedQuery, fixedParams);
          console.log('📊 REPORTS API: Fixed query returned:', fixedRows.length, 'rows');
          results = results.concat(fixedRows);
        } catch (fixedError) {
          console.error('❌ REPORTS API: Fixed transactions query error:', fixedError);
        }
      }

      // Get Adhoc transactions if not filtering by Fixed only
      if (!trip_type || trip_type === 'Adhoc' || trip_type === 'Replacement') {
        let adhocQuery = `
          SELECT
            at.TransactionID,
            DATE(at.TransactionDate) as TripDate,
            at.TripType,
            at.VFreightFix as FreightFix,
            at.VFreightVariable as FreightVariable,
            (at.ClosingKM - at.OpeningKM) as Kilometers,
            COALESCE(at.VehicleNumber, 'N/A') as VehicleRegistrationNo,
            COALESCE(at.VehicleNumber, 'N/A') as VehicleCode,
            COALESCE(at.DriverName, 'N/A') as DriverName,
            COALESCE(c.Name, 'N/A') as CustomerName,
            COALESCE(p.ProjectName, 'N/A') as ProjectName,
            NULL as Shift,
            at.Status,
            at.TotalShipmentsForDeliveries as TotalDeliveries,
            at.TotalShipmentDeliveriesAttempted as TotalDeliveriesAttempted,
            at.TotalShipmentDeliveriesDone as TotalDeliveriesDone,
            at.TotalDutyHours
          FROM adhoc_transactions at
          LEFT JOIN customer c ON at.CustomerID = c.CustomerID
          LEFT JOIN project p ON at.ProjectID = p.ProjectID
          WHERE 1=1
        `;

        const adhocParams = [];

        if (start_date) {
          adhocQuery += ' AND DATE(at.TransactionDate) >= ?';
          adhocParams.push(start_date);
        }

        if (end_date) {
          adhocQuery += ' AND DATE(at.TransactionDate) <= ?';
          adhocParams.push(end_date);
        }

        if (trip_type && (trip_type === 'Adhoc' || trip_type === 'Replacement')) {
          adhocQuery += ' AND at.TripType = ?';
          adhocParams.push(trip_type);
        }

        adhocQuery += ' ORDER BY at.TransactionDate DESC, at.TransactionID DESC';

        try {
          console.log('📊 REPORTS API: Executing Adhoc query with params:', adhocParams);
          const [adhocRows] = await pool.execute(adhocQuery, adhocParams);
          console.log('📊 REPORTS API: Adhoc query returned:', adhocRows.length, 'rows');
          results = results.concat(adhocRows);
        } catch (adhocError) {
          console.error('❌ REPORTS API: Adhoc transactions query error:', adhocError);
        }
      }

      // Sort combined results by date and ID
      results.sort((a, b) => {
        const dateCompare = new Date(b.TripDate) - new Date(a.TripDate);
        if (dateCompare !== 0) return dateCompare;
        return b.TransactionID - a.TransactionID;
      });

      console.log('📊 REPORTS API: Final results count:', results.length);
      res.json({ success: true, data: results });
    } catch (error) {
      console.error('Error fetching daily trip report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Vehicle Utilization Report
  // This route retrieves vehicle utilization data from both Fixed and Adhoc transactions
  router.get('/utilization', async (req, res) => {
    try {
      const { start_date, end_date, vehicle_id } = req.query;

      // Query to get utilization data combining both Fixed and Adhoc transactions
      let query = `
        SELECT
          COALESCE(v.VehicleID, 'ADHOC') as VehicleID,
          COALESCE(v.VehicleRegistrationNo, combined.VehicleNumber) as VehicleRegistrationNo,
          COALESCE(v.VehicleCode, combined.VehicleNumber) as VehicleCode,
          COALESCE(v.VehicleModel, 'External Vehicle') as VehicleModel,
          COALESCE(vend.VendorName, 'External Vendor') as VendorName,
          combined.TotalTrips,
          combined.TotalKilometers,
          combined.AvgKilometersPerTrip,
          combined.TotalRevenue,
          combined.AvgRevenuePerTrip,
          combined.FirstTripDate,
          combined.LastTripDate,
          combined.UniqueCustomers,
          combined.UniqueDrivers
        FROM (
          -- Fixed transactions
          SELECT
            JSON_UNQUOTE(JSON_EXTRACT(ft.VehicleIDs, '$[0]')) as VehicleID,
            NULL as VehicleNumber,
            COUNT(ft.TransactionID) as TotalTrips,
            SUM(ft.ClosingKM - ft.OpeningKM) as TotalKilometers,
            AVG(ft.ClosingKM - ft.OpeningKM) as AvgKilometersPerTrip,
            SUM(COALESCE(ft.VFreightFix, 0) + COALESCE(ft.VFreightVariable, 0)) as TotalRevenue,
            AVG(COALESCE(ft.VFreightFix, 0) + COALESCE(ft.VFreightVariable, 0)) as AvgRevenuePerTrip,
            MIN(ft.TransactionDate) as FirstTripDate,
            MAX(ft.TransactionDate) as LastTripDate,
            COUNT(DISTINCT ft.CustomerID) as UniqueCustomers,
            COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(ft.DriverIDs, '$[0]'))) as UniqueDrivers
          FROM fixed_transactions ft
          WHERE 1=1
        `;

        let params = [];

        if (start_date) {
          query += ' AND DATE(ft.TransactionDate) >= ?';
          params.push(start_date);
        }

        if (end_date) {
          query += ' AND DATE(ft.TransactionDate) <= ?';
          params.push(end_date);
        }

        if (vehicle_id) {
          query += ' AND JSON_CONTAINS(ft.VehicleIDs, ?)';
          params.push(vehicle_id);
        }

        query += `
          GROUP BY JSON_UNQUOTE(JSON_EXTRACT(ft.VehicleIDs, '$[0]'))

          UNION ALL

          -- Adhoc transactions
          SELECT
            NULL as VehicleID,
            at.VehicleNumber,
            COUNT(at.TransactionID) as TotalTrips,
            SUM(at.ClosingKM - at.OpeningKM) as TotalKilometers,
            AVG(at.ClosingKM - at.OpeningKM) as AvgKilometersPerTrip,
            SUM(COALESCE(at.TotalFreight, 0)) as TotalRevenue,
            AVG(COALESCE(at.TotalFreight, 0)) as AvgRevenuePerTrip,
            MIN(at.TransactionDate) as FirstTripDate,
            MAX(at.TransactionDate) as LastTripDate,
            COUNT(DISTINCT at.CustomerID) as UniqueCustomers,
            1 as UniqueDrivers
          FROM adhoc_transactions at
          WHERE 1=1
        `;

        // Add same date filters for adhoc transactions
        if (start_date) {
          query += ' AND DATE(at.TransactionDate) >= ?';
          params.push(start_date);
        }

        if (end_date) {
          query += ' AND DATE(at.TransactionDate) <= ?';
          params.push(end_date);
        }

        // For adhoc, filter by vehicle number if vehicle_id is provided
        if (vehicle_id) {
          // Skip adhoc transactions if specific vehicle_id is requested
          query += ' AND 1=0';
        }

        query += `
          GROUP BY at.VehicleNumber
        ) combined
        LEFT JOIN vehicle v ON CAST(combined.VehicleID AS UNSIGNED) = v.VehicleID
        LEFT JOIN vendor vend ON v.VendorID = vend.VendorID
        ORDER BY combined.TotalTrips DESC, combined.TotalKilometers DESC
      `;

      const [rows] = await pool.execute(query, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching vehicle utilization report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Revenue Report
  // This route retrieves revenue data grouped by customer and project
  router.get('/revenue', async (req, res) => {
    try {
      const { start_date, end_date, customer_id, project_id } = req.query;
      
      let query = `
        SELECT 
          c.CustomerID,
          c.Name as CustomerName,
          c.CustomerCode,
          p.ProjectID,
          p.ProjectName,
          COUNT(b.BillingID) as TotalInvoices,
          SUM(b.TotalAmount) as TotalAmount,
          SUM(b.GSTAmount) as TotalGST,
          SUM(b.GrandTotal) as TotalRevenue,
          AVG(b.GrandTotal) as AvgInvoiceValue,
          SUM(CASE WHEN b.PaymentStatus = 'Paid' THEN b.GrandTotal ELSE 0 END) as PaidAmount,
          SUM(CASE WHEN b.PaymentStatus = 'Pending' THEN b.GrandTotal ELSE 0 END) as PendingAmount,
          SUM(CASE WHEN b.PaymentStatus = 'Overdue' THEN b.GrandTotal ELSE 0 END) as OverdueAmount,
          MIN(b.InvoiceDate) as FirstInvoiceDate,
          MAX(b.InvoiceDate) as LastInvoiceDate
        FROM customer c
        LEFT JOIN billing b ON c.CustomerID = b.CustomerID
        LEFT JOIN project p ON b.ProjectID = p.ProjectID
        WHERE 1=1
      `;
      
      const params = [];
      
      if (start_date) {
        query += ' AND DATE(b.InvoiceDate) >= ?';
        params.push(start_date);
      }
      
      if (end_date) {
        query += ' AND DATE(b.InvoiceDate) <= ?';
        params.push(end_date);
      }
      
      if (customer_id) {
        query += ' AND c.CustomerID = ?';
        params.push(customer_id);
      }
      
      if (project_id) {
        query += ' AND p.ProjectID = ?';
        params.push(project_id);
      }
      
      query += ' GROUP BY c.CustomerID, p.ProjectID ORDER BY TotalRevenue DESC';
      
      const [rows] = await pool.query(query, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching revenue report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Payment Summary Report
  // This route retrieves payment summary data showing paid vs unpaid amounts by customer
  router.get('/payments', async (req, res) => {
    try {
      const { start_date, end_date, customer_id } = req.query;
      
      let query = `
        SELECT 
          c.CustomerID,
          c.Name as CustomerName,
          c.CustomerCode,
          COUNT(DISTINCT b.BillingID) as TotalInvoices,
          SUM(b.GrandTotal) as TotalBilled,
          COALESCE(SUM(pc.PaymentAmount), 0) as TotalPaid,
          (SUM(b.GrandTotal) - COALESCE(SUM(pc.PaymentAmount), 0)) as TotalUnpaid,
          COUNT(DISTINCT pc.PaymentID) as TotalPayments,
          AVG(pc.PaymentAmount) as AvgPaymentAmount,
          SUM(CASE WHEN b.PaymentStatus = 'Paid' THEN 1 ELSE 0 END) as PaidInvoices,
          SUM(CASE WHEN b.PaymentStatus = 'Pending' THEN 1 ELSE 0 END) as PendingInvoices,
          SUM(CASE WHEN b.PaymentStatus = 'Overdue' THEN 1 ELSE 0 END) as OverdueInvoices,
          GROUP_CONCAT(DISTINCT pc.PaymentMode) as PaymentModes
        FROM customer c
        LEFT JOIN billing b ON c.CustomerID = b.CustomerID
        LEFT JOIN paymentcollection pc ON b.BillingID = pc.BillingID
        WHERE 1=1
      `;
      
      const params = [];
      
      if (start_date) {
        query += ' AND DATE(b.InvoiceDate) >= ?';
        params.push(start_date);
      }
      
      if (end_date) {
        query += ' AND DATE(b.InvoiceDate) <= ?';
        params.push(end_date);
      }
      
      if (customer_id) {
        query += ' AND c.CustomerID = ?';
        params.push(customer_id);
      }
      
      query += ' GROUP BY c.CustomerID ORDER BY TotalBilled DESC';
      
      const [rows] = await pool.query(query, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching payment summary report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GST Summary Report
  // This route retrieves GST summary data invoice-wise
  router.get('/gst-summary', async (req, res) => {
    try {
      const { start_date, end_date, customer_id } = req.query;
      
      let query = `
        SELECT 
          b.BillingID,
          b.InvoiceNo,
          b.InvoiceDate,
          c.Name as CustomerName,
          c.CustomerCode,
          p.ProjectName,
          b.TotalAmount,
          b.GSTAmount,
          b.GrandTotal,
          (b.GSTAmount / b.TotalAmount * 100) as GSTPercentage,
          b.PaymentStatus,
          DATE_FORMAT(b.InvoiceDate, '%Y-%m') as InvoiceMonth,
          DATE_FORMAT(b.InvoiceDate, '%Y') as InvoiceYear
        FROM billing b
        LEFT JOIN customer c ON b.CustomerID = c.CustomerID
        LEFT JOIN project p ON b.ProjectID = p.ProjectID
        WHERE b.GSTAmount > 0
      `;
      
      const params = [];
      
      if (start_date) {
        query += ' AND DATE(b.InvoiceDate) >= ?';
        params.push(start_date);
      }
      
      if (end_date) {
        query += ' AND DATE(b.InvoiceDate) <= ?';
        params.push(end_date);
      }
      
      if (customer_id) {
        query += ' AND c.CustomerID = ?';
        params.push(customer_id);
      }
      
      query += ' ORDER BY b.InvoiceDate DESC';
      
      const [rows] = await pool.query(query, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching GST summary report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Debug endpoint to test simple queries
  router.get('/debug-tables', async (req, res) => {
    try {
      console.log('🔍 Debug: Testing table queries...');

      // Test Fixed transactions
      const [fixedRows] = await pool.execute(`
        SELECT
          TransactionID,
          DATE(TransactionDate) as TripDate,
          TripType,
          (ClosingKM - OpeningKM) as Kilometers,
          CustomerID,
          Status
        FROM fixed_transactions
        ORDER BY TransactionDate DESC
        LIMIT 5
      `);

      // Test Adhoc transactions
      const [adhocRows] = await pool.execute(`
        SELECT
          TransactionID,
          DATE(TransactionDate) as TripDate,
          TripType,
          (ClosingKM - OpeningKM) as Kilometers,
          VehicleNumber,
          Status
        FROM adhoc_transactions
        ORDER BY TransactionDate DESC
        LIMIT 5
      `);

      // Test simple UNION
      const [unionRows] = await pool.execute(`
        SELECT
          TransactionID,
          DATE(TransactionDate) as TripDate,
          TripType,
          (ClosingKM - OpeningKM) as Kilometers,
          'Fixed' as Source
        FROM fixed_transactions

        UNION ALL

        SELECT
          TransactionID,
          DATE(TransactionDate) as TripDate,
          TripType,
          (ClosingKM - OpeningKM) as Kilometers,
          'Adhoc' as Source
        FROM adhoc_transactions

        ORDER BY TripDate DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        debug: {
          fixed_count: fixedRows.length,
          adhoc_count: adhocRows.length,
          union_count: unionRows.length,
          fixed_sample: fixedRows,
          adhoc_sample: adhocRows,
          union_sample: unionRows
        }
      });

    } catch (error) {
      console.error('Debug endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Debug query failed',
        details: error.message
      });
    }
  });

  return router;
};
