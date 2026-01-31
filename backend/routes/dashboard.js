const express = require('express');
const router = express.Router();

// This file defines API routes for dashboard summary data in the Transport Management System.
// It provides aggregated data for the dashboard overview including counts and recent activity.

module.exports = (pool) => {
  // Get dashboard summary data
  // This route retrieves aggregated data for the dashboard including counts and recent activity
  router.get('/', async (req, res) => {
    try {
      // Get counts for all entities
      const [customerCount] = await pool.query('SELECT COUNT(*) as count FROM customer');
      const [vendorCount] = await pool.query('SELECT COUNT(*) as count FROM vendor');
      const [vehicleCount] = await pool.query('SELECT COUNT(*) as count FROM vehicle');
      const [driverCount] = await pool.query('SELECT COUNT(*) as count FROM driver');
      
      // Get today's trips from both tables
      const today = new Date().toISOString().split('T')[0];
      // Fixed trips
      const [fixedCountRows] = await pool.query(`
        SELECT COUNT(*) as count FROM fixed_transactions WHERE DATE(TransactionDate) = ?
      `, [today]);
      // Adhoc trips
      const [adhocCountRows] = await pool.query(`
        SELECT COUNT(*) as count FROM adhoc_transactions WHERE DATE(TransactionDate) = ? AND TripType = 'Adhoc'
      `, [today]);
      // Replacement trips
      const [replacementCountRows] = await pool.query(`
        SELECT COUNT(*) as count FROM adhoc_transactions WHERE DATE(TransactionDate) = ? AND TripType = 'Replacement'
      `, [today]);

      // Get pending invoices
      const [pendingInvoices] = await pool.query(`
        SELECT COUNT(*) as count
        FROM billing
        WHERE PaymentStatus IN ('Pending', 'Overdue')
      `);

      // Get total payments received
      const [totalPayments] = await pool.query(`
        SELECT COALESCE(SUM(PaymentAmount), 0) as total
        FROM paymentcollection
      `);
      
      // Get recent transactions (last 5) from both fixed and adhoc transactions
      const [recentTransactions] = await pool.query(`
        (
          SELECT
            ft.TransactionID,
            ft.TransactionDate,
            ft.TripType,
            COALESCE(v.VehicleRegistrationNo, 'N/A') as VehicleRegistrationNo,
            COALESCE(c.Name, 'N/A') as CustomerName,
            COALESCE(p.ProjectName, 'N/A') as ProjectName,
            ft.VFreightFix as Amount,
            ft.Status,
            'fixed' as SourceTable
          FROM fixed_transactions ft
          LEFT JOIN customer c ON ft.CustomerID = c.CustomerID
          LEFT JOIN project p ON ft.ProjectID = p.ProjectID
          LEFT JOIN vehicle v ON v.VehicleID = JSON_UNQUOTE(JSON_EXTRACT(ft.VehicleIDs, '$[0]'))
        )
        UNION ALL
        (
          SELECT
            at.TransactionID,
            at.TransactionDate,
            at.TripType,
            COALESCE(at.VehicleNumber, 'N/A') as VehicleRegistrationNo,
            COALESCE(c.Name, 'N/A') as CustomerName,
            COALESCE(p.ProjectName, 'N/A') as ProjectName,
            at.VFreightFix as Amount,
            at.Status,
            'adhoc' as SourceTable
          FROM adhoc_transactions at
          LEFT JOIN customer c ON at.CustomerID = c.CustomerID
          LEFT JOIN project p ON at.ProjectID = p.ProjectID
        )
        ORDER BY TransactionDate DESC, TransactionID DESC
        LIMIT 5
      `);
      
      // Get recent payments (last 5)
      const [recentPayments] = await pool.query(`
        SELECT
          pc.*,
          b.InvoiceNo,
          c.Name as CustomerName
        FROM paymentcollection pc
        LEFT JOIN billing b ON pc.BillingID = b.BillingID
        LEFT JOIN customer c ON b.CustomerID = c.CustomerID
        ORDER BY pc.PaymentDate DESC, pc.PaymentID DESC
        LIMIT 5
      `);
      
      // Today's trips summary from both tables
      const todayTripsSummary = {
        fixed: fixedCountRows[0]?.count || 0,
        adhoc: adhocCountRows[0]?.count || 0,
        replacement: replacementCountRows[0]?.count || 0
      };

      const dashboardData = {
        totalCustomers: customerCount[0]?.count || 0,
        totalVendors: vendorCount[0]?.count || 0,
        totalVehicles: vehicleCount[0]?.count || 0,
        totalDrivers: driverCount[0]?.count || 0,
        todayTrips: todayTripsSummary,
        pendingInvoices: pendingInvoices[0]?.count || 0,
        totalPayments: parseFloat(totalPayments[0]?.total || 0),
        recentTransactions: recentTransactions || [],
        recentPayments: recentPayments || [],
      };
      
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
