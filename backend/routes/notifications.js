const express = require('express');
const router = express.Router();

// This file handles notification and reminder functionality
// It provides endpoints for checking expiring documents and managing alerts

module.exports = (pool, notificationService) => {
  // Get expiry alerts from NotificationService
  router.get('/expiry-alerts', async (req, res) => {
    try {
      if (!notificationService) {
        throw new Error('NotificationService is not available');
      }
      const alerts = await notificationService.getExpiryAlerts();
      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      console.error('Error fetching expiry alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch expiry alerts',
        details: error.message
      });
    }
  });

  // Get expiring documents for notifications
  router.get('/expiring-documents', async (req, res) => {
    try {
      const { days = 30 } = req.query; // Default to 30 days ahead

      const query = `
        SELECT
          'Agreement' as type,
          CustomerID as customerId,
          Name as customerName,
          AgreementExpiryDate as expiryDate,
          DATEDIFF(AgreementExpiryDate, CURDATE()) as daysUntilExpiry
        FROM Customer
        WHERE AgreementExpiryDate IS NOT NULL
          AND DATEDIFF(AgreementExpiryDate, CURDATE()) <= ?
          AND AgreementExpiryDate >= CURDATE()

        UNION ALL

        SELECT
          'BG' as type,
          CustomerID as customerId,
          Name as customerName,
          BGExpiryDate as expiryDate,
          DATEDIFF(BGExpiryDate, CURDATE()) as daysUntilExpiry
        FROM Customer
        WHERE BGExpiryDate IS NOT NULL
          AND DATEDIFF(BGExpiryDate, CURDATE()) <= ?
          AND BGExpiryDate >= CURDATE()

        UNION ALL

        SELECT
          'PO' as type,
          CustomerID as customerId,
          Name as customerName,
          POExpiryDate as expiryDate,
          DATEDIFF(POExpiryDate, CURDATE()) as daysUntilExpiry
        FROM Customer
        WHERE POExpiryDate IS NOT NULL
          AND DATEDIFF(POExpiryDate, CURDATE()) <= ?
          AND POExpiryDate >= CURDATE()

        UNION ALL

        SELECT
          'Insurance' as type,
          CONCAT('Vehicle: ', v.VehicleRegistrationNo) as customerName,
          v.VehicleID as customerId,
          v.InsuranceExpiry as expiryDate,
          DATEDIFF(v.InsuranceExpiry, CURDATE()) as daysUntilExpiry
        FROM Vehicle v
        WHERE v.InsuranceExpiry IS NOT NULL
          AND DATEDIFF(v.InsuranceExpiry, CURDATE()) <= ?
          AND v.InsuranceExpiry >= CURDATE()

        UNION ALL

        SELECT
          'Fitness Certificate' as type,
          CONCAT('Vehicle: ', v.VehicleRegistrationNo) as customerName,
          v.VehicleID as customerId,
          v.FitnessExpiry as expiryDate,
          DATEDIFF(v.FitnessExpiry, CURDATE()) as daysUntilExpiry
        FROM Vehicle v
        WHERE v.FitnessExpiry IS NOT NULL
          AND DATEDIFF(v.FitnessExpiry, CURDATE()) <= ?
          AND v.FitnessExpiry >= CURDATE()

        UNION ALL

        SELECT
          'Pollution Certificate' as type,
          CONCAT('Vehicle: ', v.VehicleRegistrationNo) as customerName,
          v.VehicleID as customerId,
          v.PollutionExpiry as expiryDate,
          DATEDIFF(v.PollutionExpiry, CURDATE()) as daysUntilExpiry
        FROM Vehicle v
        WHERE v.PollutionExpiry IS NOT NULL
          AND DATEDIFF(v.PollutionExpiry, CURDATE()) <= ?
          AND v.PollutionExpiry >= CURDATE()

        UNION ALL

        SELECT
          'State Tax' as type,
          CONCAT('Vehicle: ', v.VehicleRegistrationNo) as customerName,
          v.VehicleID as customerId,
          v.StateTaxExpiry as expiryDate,
          DATEDIFF(v.StateTaxExpiry, CURDATE()) as daysUntilExpiry
        FROM Vehicle v
        WHERE v.StateTaxExpiry IS NOT NULL
          AND DATEDIFF(v.StateTaxExpiry, CURDATE()) <= ?
          AND v.StateTaxExpiry >= CURDATE()

        UNION ALL

        SELECT
          'No Entry Pass' as type,
          CONCAT('Vehicle: ', v.VehicleRegistrationNo) as customerName,
          v.VehicleID as customerId,
          v.NoEntryPassExpiry as expiryDate,
          DATEDIFF(v.NoEntryPassExpiry, CURDATE()) as daysUntilExpiry
        FROM Vehicle v
        WHERE v.NoEntryPassExpiry IS NOT NULL
          AND DATEDIFF(v.NoEntryPassExpiry, CURDATE()) <= ?
          AND v.NoEntryPassExpiry >= CURDATE()

        UNION ALL

        SELECT
          'License' as type,
          CONCAT('Driver: ', d.DriverName) as customerName,
          d.DriverID as customerId,
          d.LicenceExpiry as expiryDate,
          DATEDIFF(d.LicenceExpiry, CURDATE()) as daysUntilExpiry
        FROM Driver d
        WHERE d.LicenceExpiry IS NOT NULL
          AND DATEDIFF(d.LicenceExpiry, CURDATE()) <= ?
          AND d.LicenceExpiry >= CURDATE()

        ORDER BY daysUntilExpiry ASC, expiryDate ASC
      `;

      const [rows] = await pool.query(query, [
        days, days, days, days, days, days, days, days, days, days
      ]);

      // Also get expired documents (negative days)
      const expiredQuery = `
        SELECT
          'Agreement' as type,
          CustomerID as customerId,
          Name as customerName,
          AgreementExpiryDate as expiryDate,
          DATEDIFF(AgreementExpiryDate, CURDATE()) as daysUntilExpiry
        FROM Customer
        WHERE AgreementExpiryDate IS NOT NULL
          AND AgreementExpiryDate < CURDATE()

        UNION ALL

        SELECT
          'BG' as type,
          CustomerID as customerId,
          Name as customerName,
          BGExpiryDate as expiryDate,
          DATEDIFF(BGExpiryDate, CURDATE()) as daysUntilExpiry
        FROM Customer
        WHERE BGExpiryDate IS NOT NULL
          AND BGExpiryDate < CURDATE()

        UNION ALL

        SELECT
          'PO' as type,
          CustomerID as customerId,
          Name as customerName,
          POExpiryDate as expiryDate,
          DATEDIFF(POExpiryDate, CURDATE()) as daysUntilExpiry
        FROM Customer
        WHERE POExpiryDate IS NOT NULL
          AND POExpiryDate < CURDATE()

        UNION ALL

        SELECT
          'Insurance' as type,
          CONCAT('Vehicle: ', v.VehicleRegistrationNo) as customerName,
          v.VehicleID as customerId,
          v.InsuranceExpiry as expiryDate,
          DATEDIFF(v.InsuranceExpiry, CURDATE()) as daysUntilExpiry
        FROM Vehicle v
        WHERE v.InsuranceExpiry IS NOT NULL
          AND v.InsuranceExpiry < CURDATE()

        UNION ALL

        SELECT
          'Fitness Certificate' as type,
          CONCAT('Vehicle: ', v.VehicleRegistrationNo) as customerName,
          v.VehicleID as customerId,
          v.FitnessExpiry as expiryDate,
          DATEDIFF(v.FitnessExpiry, CURDATE()) as daysUntilExpiry
        FROM Vehicle v
        WHERE v.FitnessExpiry IS NOT NULL
          AND v.FitnessExpiry < CURDATE()

        UNION ALL

        SELECT
          'Pollution Certificate' as type,
          CONCAT('Vehicle: ', v.VehicleRegistrationNo) as customerName,
          v.VehicleID as customerId,
          v.PollutionExpiry as expiryDate,
          DATEDIFF(v.PollutionExpiry, CURDATE()) as daysUntilExpiry
        FROM Vehicle v
        WHERE v.PollutionExpiry IS NOT NULL
          AND v.PollutionExpiry < CURDATE()

        UNION ALL

        SELECT
          'State Tax' as type,
          CONCAT('Vehicle: ', v.VehicleRegistrationNo) as customerName,
          v.VehicleID as customerId,
          v.StateTaxExpiry as expiryDate,
          DATEDIFF(v.StateTaxExpiry, CURDATE()) as daysUntilExpiry
        FROM Vehicle v
        WHERE v.StateTaxExpiry IS NOT NULL
          AND v.StateTaxExpiry < CURDATE()

        UNION ALL

        SELECT
          'No Entry Pass' as type,
          CONCAT('Vehicle: ', v.VehicleRegistrationNo) as customerName,
          v.VehicleID as customerId,
          v.NoEntryPassExpiry as expiryDate,
          DATEDIFF(v.NoEntryPassExpiry, CURDATE()) as daysUntilExpiry
        FROM Vehicle v
        WHERE v.NoEntryPassExpiry IS NOT NULL
          AND v.NoEntryPassExpiry < CURDATE()

        UNION ALL

        SELECT
          'License' as type,
          CONCAT('Driver: ', d.DriverName) as customerName,
          d.DriverID as customerId,
          d.LicenceExpiry as expiryDate,
          DATEDIFF(d.LicenceExpiry, CURDATE()) as daysUntilExpiry
        FROM Driver d
        WHERE d.LicenceExpiry IS NOT NULL
          AND d.LicenceExpiry < CURDATE()

        ORDER BY daysUntilExpiry ASC, expiryDate ASC
      `;

      const [expiredRows] = await pool.query(expiredQuery);

      // Combine and sort results
      const allResults = [...rows, ...expiredRows].sort((a, b) => {
        // Sort by days until expiry (negative first, then positive)
        if (a.daysUntilExpiry !== b.daysUntilExpiry) {
          return a.daysUntilExpiry - b.daysUntilExpiry;
        }
        // Then by expiry date
        return new Date(a.expiryDate) - new Date(b.expiryDate);
      });

      res.json(allResults);

    } catch (error) {
      console.error('Error fetching expiring documents:', error);
      res.status(500).json({
        error: 'Failed to fetch expiring documents',
        details: error.message
      });
    }
  });

  // Get notification settings
  router.get('/settings', async (req, res) => {
    try {
      // For now, return default settings
      // In a real app, this would be stored in database
      const settings = {
        emailNotifications: true,
        smsNotifications: false,
        whatsappNotifications: false,
        reminderDays: [1, 7, 30], // Days before expiry to send reminders
        enablePopupAlerts: true,
        enableSoundAlerts: false
      };

      res.json(settings);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      res.status(500).json({
        error: 'Failed to fetch notification settings',
        details: error.message
      });
    }
  });

  // Update notification settings
  router.put('/settings', async (req, res) => {
    try {
      const settings = req.body;

      // In a real app, save to database
      // For now, just return success

      res.json({
        message: 'Notification settings updated successfully',
        settings
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      res.status(500).json({
        error: 'Failed to update notification settings',
        details: error.message
      });
    }
  });

  // Send test notification
  router.post('/test', async (req, res) => {
    try {
      // This would integrate with email/SMS/WhatsApp services
      const { type, message } = req.body;

      console.log(`Test notification sent - Type: ${type}, Message: ${message}`);

      res.json({
        message: 'Test notification sent successfully',
        type,
        message
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({
        error: 'Failed to send test notification',
        details: error.message
      });
    }
  });

  return router;
};
