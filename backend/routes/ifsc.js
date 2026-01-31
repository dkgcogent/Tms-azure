/**
 * IFSC Lookup API Routes
 * Provides intelligent bank details lookup with caching
 */

const express = require('express');
const ifscService = require('../services/ifscService');

module.exports = (pool) => {
  const router = express.Router();

/**
 * GET /api/ifsc/:ifscCode
 * Lookup bank details by IFSC code
 */
router.get('/:ifscCode', async (req, res) => {
  try {
    const { ifscCode } = req.params;
    
    console.log(`🔍 IFSC Lookup request for: ${ifscCode}`);
    
    const result = await ifscService.lookupIFSC(ifscCode);
    
    if (result.success) {
      console.log(`✅ IFSC Lookup successful for ${ifscCode}:`, result.data.bank);
      res.json({
        success: true,
        data: result.data,
        message: `Bank details found for ${ifscCode}`
      });
    } else {
      console.log(`❌ IFSC Lookup failed for ${ifscCode}:`, result.error);
      res.status(404).json({
        success: false,
        data: null,
        error: result.error,
        message: `Unable to find details for IFSC: ${ifscCode}`
      });
    }
  } catch (error) {
    console.error('IFSC lookup route error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Internal server error during IFSC lookup',
      message: 'Please try again later'
    });
  }
});

/**
 * POST /api/ifsc/validate
 * Validate IFSC code format without lookup
 */
router.post('/validate', async (req, res) => {
  try {
    const { ifscCode } = req.body;
    
    const validation = ifscService.validateIFSC(ifscCode);
    
    res.json({
      success: validation.isValid,
      isValid: validation.isValid,
      error: validation.error,
      message: validation.isValid ? 'IFSC format is valid' : validation.error
    });
  } catch (error) {
    console.error('IFSC validation route error:', error);
    res.status(500).json({
      success: false,
      isValid: false,
      error: 'Internal server error during validation',
      message: 'Please try again later'
    });
  }
});

/**
 * POST /api/ifsc/bulk-lookup
 * Bulk IFSC lookup for data imports
 */
router.post('/bulk-lookup', async (req, res) => {
  try {
    const { ifscCodes } = req.body;
    
    if (!Array.isArray(ifscCodes)) {
      return res.status(400).json({
        success: false,
        error: 'ifscCodes must be an array',
        message: 'Please provide an array of IFSC codes'
      });
    }

    if (ifscCodes.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Too many IFSC codes',
        message: 'Maximum 100 IFSC codes allowed per request'
      });
    }

    const result = await ifscService.bulkLookup(ifscCodes);
    
    res.json({
      success: true,
      data: {
        results: result.results,
        errors: result.errors,
        summary: {
          total: ifscCodes.length,
          successful: result.results.length,
          failed: result.errors.length
        }
      },
      message: `Processed ${ifscCodes.length} IFSC codes`
    });
  } catch (error) {
    console.error('Bulk IFSC lookup route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during bulk lookup',
      message: 'Please try again later'
    });
  }
});

/**
 * GET /api/ifsc/banks/popular
 * Get list of popular banks for suggestions
 */
router.get('/banks/popular', async (req, res) => {
  try {
    const banks = await ifscService.getPopularBanks();
    
    res.json({
      success: true,
      data: banks,
      message: 'Popular banks retrieved successfully'
    });
  } catch (error) {
    console.error('Popular banks route error:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: 'Internal server error',
      message: 'Unable to fetch popular banks'
    });
  }
});

/**
 * GET /api/ifsc/cache/stats
 * Get IFSC cache statistics (for admin purposes)
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const db = require('../config/database');
    const [stats] = await db.query('CALL GetIFSCStats()');
    
    res.json({
      success: true,
      data: stats[0][0],
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error) {
    console.error('IFSC cache stats route error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Internal server error',
      message: 'Unable to fetch cache statistics'
    });
  }
});

  return router;
};
