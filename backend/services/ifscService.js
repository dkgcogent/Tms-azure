/**
 * IFSC Lookup Service
 * Provides intelligent bank details lookup with caching
 * Supports multiple data sources with fallback mechanisms
 */

const axios = require('axios');
const mysql = require('mysql2/promise');

// Database configuration (same as server.js)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'transportation_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: false,
  charset: 'utf8mb4',
  insecureAuth: true
};

if (process.env.DB_PASSWORD) {
  dbConfig.password = process.env.DB_PASSWORD;
}

const db = mysql.createPool(dbConfig);

class IFSCService {
  constructor() {
    this.apiEndpoints = [
      'https://ifsc.razorpay.com',
      'https://bank-apis.justinclicks.com/API/V1/IFSC',
      // Add more backup APIs as needed
    ];
    this.cacheExpiry = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  }

  /**
   * Validate IFSC code format
   * @param {string} ifsc - IFSC code to validate
   * @returns {Object} - { isValid: boolean, error: string|null }
   */
  validateIFSC(ifsc) {
    if (!ifsc || typeof ifsc !== 'string') {
      return { isValid: false, error: 'IFSC code is required' };
    }

    const cleanIFSC = ifsc.trim().toUpperCase();
    
    // IFSC format: 4 letters + 0 + 6 alphanumeric
    const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    
    if (cleanIFSC.length !== 11) {
      return { isValid: false, error: 'IFSC code must be exactly 11 characters' };
    }

    if (!ifscPattern.test(cleanIFSC)) {
      return { isValid: false, error: 'IFSC format: 4 letters + 0 + 6 alphanumeric (e.g., SBIN0001234)' };
    }

    return { isValid: true, error: null };
  }

  /**
   * Check local database cache for IFSC details
   * @param {string} ifsc - IFSC code
   * @returns {Object|null} - Cached bank details or null
   */
  async getCachedIFSC(ifsc) {
    try {
      const [rows] = await db.query(
        `SELECT * FROM ifsc_cache 
         WHERE ifsc_code = ? AND 
         (cached_at > DATE_SUB(NOW(), INTERVAL 30 DAY) OR is_permanent = 1)`,
        [ifsc]
      );

      if (rows.length > 0) {
        const cached = rows[0];
        return {
          ifsc: cached.ifsc_code,
          bank: cached.bank_name,
          branch: cached.branch_name,
          address: cached.branch_address,
          city: cached.city,
          state: cached.state,
          district: cached.district,
          contact: cached.contact_number,
          source: 'cache',
          cachedAt: cached.cached_at
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking IFSC cache:', error);
      return null;
    }
  }

  /**
   * Cache IFSC details in local database
   * @param {string} ifsc - IFSC code
   * @param {Object} details - Bank details to cache
   */
  async cacheIFSC(ifsc, details) {
    try {
      await db.query(
        `INSERT INTO ifsc_cache 
         (ifsc_code, bank_name, branch_name, branch_address, city, state, district, contact_number, cached_at, is_permanent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)
         ON DUPLICATE KEY UPDATE
         bank_name = VALUES(bank_name),
         branch_name = VALUES(branch_name),
         branch_address = VALUES(branch_address),
         city = VALUES(city),
         state = VALUES(state),
         district = VALUES(district),
         contact_number = VALUES(contact_number),
         cached_at = NOW()`,
        [
          ifsc,
          details.bank || '',
          details.branch || '',
          details.address || '',
          details.city || '',
          details.state || '',
          details.district || '',
          details.contact || ''
        ]
      );
    } catch (error) {
      console.error('Error caching IFSC details:', error);
    }
  }

  /**
   * Fetch IFSC details from external API
   * @param {string} ifsc - IFSC code
   * @returns {Object|null} - Bank details or null
   */
  async fetchFromAPI(ifsc) {
    for (const endpoint of this.apiEndpoints) {
      try {
        let response;
        
        if (endpoint.includes('razorpay')) {
          // Razorpay API format
          response = await axios.get(`${endpoint}/${ifsc}`, {
            timeout: 5000,
            headers: {
              'User-Agent': 'TMS-ERP-System/1.0'
            }
          });
        } else if (endpoint.includes('justinclicks')) {
          // JustinClicks API format
          response = await axios.get(`${endpoint}/${ifsc}`, {
            timeout: 5000,
            headers: {
              'User-Agent': 'TMS-ERP-System/1.0'
            }
          });
        }

        if (response && response.data) {
          const data = response.data;
          
          // Normalize response format
          return {
            ifsc: ifsc,
            bank: data.BANK || data.bank || '',
            branch: data.BRANCH || data.branch || '',
            address: data.ADDRESS || data.address || '',
            city: data.CITY || data.city || '',
            state: data.STATE || data.state || '',
            district: data.DISTRICT || data.district || '',
            contact: data.CONTACT || data.contact || '',
            source: 'api',
            endpoint: endpoint
          };
        }
      } catch (error) {
        console.warn(`IFSC API ${endpoint} failed:`, error.message);
        continue; // Try next endpoint
      }
    }

    return null;
  }

  /**
   * Main lookup function - checks cache first, then APIs
   * @param {string} ifsc - IFSC code to lookup
   * @returns {Object} - { success: boolean, data: Object|null, error: string|null }
   */
  async lookupIFSC(ifsc) {
    try {
      // Validate IFSC format first
      const validation = this.validateIFSC(ifsc);
      if (!validation.isValid) {
        return {
          success: false,
          data: null,
          error: validation.error
        };
      }

      const cleanIFSC = ifsc.trim().toUpperCase();

      // Check cache first
      const cached = await this.getCachedIFSC(cleanIFSC);
      if (cached) {
        return {
          success: true,
          data: cached,
          error: null
        };
      }

      // Fetch from API
      const apiData = await this.fetchFromAPI(cleanIFSC);
      if (apiData) {
        // Cache the result
        await this.cacheIFSC(cleanIFSC, apiData);
        
        return {
          success: true,
          data: apiData,
          error: null
        };
      }

      // No data found
      return {
        success: false,
        data: null,
        error: 'IFSC code not found. Please verify the code.'
      };

    } catch (error) {
      console.error('IFSC lookup error:', error);
      return {
        success: false,
        data: null,
        error: 'Unable to lookup IFSC details. Please try again.'
      };
    }
  }

  /**
   * Bulk IFSC lookup for data imports
   * @param {Array} ifscCodes - Array of IFSC codes
   * @returns {Object} - { results: Array, errors: Array }
   */
  async bulkLookup(ifscCodes) {
    const results = [];
    const errors = [];

    for (const ifsc of ifscCodes) {
      try {
        const result = await this.lookupIFSC(ifsc);
        if (result.success) {
          results.push({ ifsc, data: result.data });
        } else {
          errors.push({ ifsc, error: result.error });
        }
      } catch (error) {
        errors.push({ ifsc, error: error.message });
      }
    }

    return { results, errors };
  }

  /**
   * Get popular banks for dropdown suggestions
   * @returns {Array} - Array of popular bank names
   */
  async getPopularBanks() {
    try {
      const [rows] = await db.query(
        `SELECT DISTINCT bank_name, COUNT(*) as usage_count
         FROM ifsc_cache 
         WHERE bank_name IS NOT NULL AND bank_name != ''
         GROUP BY bank_name 
         ORDER BY usage_count DESC 
         LIMIT 20`
      );

      return rows.map(row => row.bank_name);
    } catch (error) {
      console.error('Error fetching popular banks:', error);
      return [
        'State Bank of India',
        'HDFC Bank',
        'ICICI Bank',
        'Axis Bank',
        'Punjab National Bank',
        'Bank of Baroda',
        'Canara Bank',
        'Union Bank of India',
        'Bank of India',
        'Indian Bank'
      ];
    }
  }
}

module.exports = new IFSCService();
