const express = require('express');
const PostalService = require('../services/postalService');

module.exports = (pool) => {
  const router = express.Router();
  const postalService = new PostalService(pool);

  // Get location details by pin code with India Postal API integration
  router.get('/lookup/:pincode', async (req, res) => {
    try {
      const { pincode } = req.params;

      // Use PostalService for intelligent lookup (cache + API)
      const result = await postalService.getLocationByPincode(pincode);

      if (result.success) {
        res.json({
          success: true,
          message: `PIN code details found (${result.source})`,
          data: {
            pincode: result.data.pincode,
            area: result.data.area,
            city: result.data.city,
            district: result.data.district,
            state: result.data.state,
            country: result.data.country,
            source: result.source
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message || 'PIN code not found',
          data: null
        });
      }

    } catch (error) {
      console.error('PIN code lookup error:', error);

      if (error.message === 'PIN code must be exactly 6 digits') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to lookup PIN code details',
        error: error.message
      });
    }
  });

  // Get all states for dropdown
  router.get('/states', async (req, res) => {
    try {
      const states = await postalService.getStates();

      res.json({
        success: true,
        data: states
      });

    } catch (error) {
      console.error('States lookup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch states',
        error: error.message
      });
    }
  });

  // Get cities by state for dropdown
  router.get('/cities/:state', async (req, res) => {
    try {
      const { state } = req.params;
      const cities = await postalService.getCitiesByState(state);

      res.json({
        success: true,
        data: cities
      });

    } catch (error) {
      console.error('Cities lookup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cities',
        error: error.message
      });
    }
  });

  return router;
};