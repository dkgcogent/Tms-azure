const axios = require('axios');

class PostalService {
  constructor(pool) {
    this.pool = pool;
    this.apiBaseUrl = 'https://api.postalpincode.in/pincode';
  }

  /**
   * Get location details by PIN code with caching
   * First checks local database, then calls India Postal API if not found
   */
  async getLocationByPincode(pincode) {
    try {
      // Validate PIN code format
      if (!/^\d{6}$/.test(pincode)) {
        throw new Error('PIN code must be exactly 6 digits');
      }

      // First, check local cache
      const cachedResult = await this.getCachedLocation(pincode);
      if (cachedResult) {
        console.log(`📍 Using cached data for PIN code: ${pincode}`);
        return {
          success: true,
          source: 'cache',
          data: cachedResult
        };
      }

      // If not in cache, call India Postal API
      console.log(`🌐 Fetching from India Postal API for PIN code: ${pincode}`);
      const apiResult = await this.fetchFromPostalAPI(pincode);
      
      if (apiResult.success) {
        // Cache the result for future use
        await this.cacheLocation(pincode, apiResult.data);
        
        return {
          success: true,
          source: 'api',
          data: apiResult.data
        };
      }

      return {
        success: false,
        message: 'PIN code not found',
        data: null
      };

    } catch (error) {
      console.error('PostalService error:', error);
      throw error;
    }
  }

  /**
   * Check local database for cached PIN code data
   */
  async getCachedLocation(pincode) {
    try {
      const [rows] = await this.pool.execute(
        `SELECT pincode, area, city, district, state, country 
         FROM pincode_lookup 
         WHERE pincode = ? 
         ORDER BY area ASC 
         LIMIT 1`,
        [pincode]
      );

      if (rows.length > 0) {
        return {
          pincode: rows[0].pincode,
          area: rows[0].area,
          city: rows[0].city,
          district: rows[0].district,
          state: rows[0].state,
          country: rows[0].country || 'India'
        };
      }

      return null;
    } catch (error) {
      console.error('Cache lookup error:', error);
      return null;
    }
  }

  /**
   * Fetch location data from India Postal API
   */
  async fetchFromPostalAPI(pincode) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/${pincode}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'TMS-ERP-System/1.0'
        }
      });

      const data = response.data;
      
      // Check if API returned valid data
      if (!data || !Array.isArray(data) || data.length === 0) {
        return {
          success: false,
          message: 'No data found for this PIN code'
        };
      }

      const postOfficeData = data[0];
      
      // Check if the API response indicates success
      if (postOfficeData.Status !== 'Success' || !postOfficeData.PostOffice || postOfficeData.PostOffice.length === 0) {
        return {
          success: false,
          message: 'PIN code not found in postal database'
        };
      }

      // Extract the first post office data (usually the main one)
      const postOffice = postOfficeData.PostOffice[0];
      
      return {
        success: true,
        data: {
          pincode: pincode,
          area: postOffice.Name,
          city: postOffice.District,
          district: postOffice.District,
          state: postOffice.State,
          country: 'India'
        }
      };

    } catch (error) {
      console.error('India Postal API error:', error);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Postal API request timeout');
      } else if (error.response) {
        throw new Error(`Postal API error: ${error.response.status}`);
      } else {
        throw new Error('Failed to connect to Postal API');
      }
    }
  }

  /**
   * Cache location data in local database
   */
  async cacheLocation(pincode, locationData) {
    try {
      await this.pool.execute(
        `INSERT IGNORE INTO pincode_lookup 
         (pincode, area, city, district, state, country) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          pincode,
          locationData.area,
          locationData.city,
          locationData.district,
          locationData.state,
          locationData.country
        ]
      );
      
      console.log(`💾 Cached location data for PIN code: ${pincode}`);
    } catch (error) {
      console.error('Cache storage error:', error);
      // Don't throw error here - caching failure shouldn't break the main flow
    }
  }

  /**
   * Get all states from cache for dropdown
   */
  async getStates() {
    try {
      const [rows] = await this.pool.execute(
        'SELECT DISTINCT state FROM pincode_lookup ORDER BY state ASC'
      );
      return rows.map(row => row.state);
    } catch (error) {
      console.error('States fetch error:', error);
      // Return common Indian states as fallback
      return ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'West Bengal'];
    }
  }

  /**
   * Get cities by state from cache for dropdown
   */
  async getCitiesByState(state) {
    try {
      const [rows] = await this.pool.execute(
        'SELECT DISTINCT city FROM pincode_lookup WHERE state = ? ORDER BY city ASC',
        [state]
      );
      return rows.map(row => row.city);
    } catch (error) {
      console.error('Cities fetch error:', error);
      return [];
    }
  }
}

module.exports = PostalService;
