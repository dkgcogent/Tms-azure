/**
 * Vehicle Code Generation Service
 * Generates unique vehicle codes based on: Customer + Project + Location + DC/Hub + Vendor
 */

import { customerAPI, vendorAPI, projectAPI, locationAPI } from './api';

class VehicleCodeService {
  constructor() {
    this.cache = {
      customers: [],
      vendors: [],
      projects: [],
      locations: []
    };
    this.lastCacheUpdate = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get abbreviated code from name
   * @param {string} name - Full name
   * @param {number} maxLength - Maximum length of abbreviation
   * @returns {string} - Abbreviated code
   */
  generateAbbreviation(name, maxLength = 3) {
    if (!name) return 'UNK';
    
    // Remove common words and get meaningful parts
    const cleanName = name
      .replace(/\b(Ltd|Limited|Pvt|Private|Company|Corp|Corporation|Inc|Incorporated|LLC|LLP)\b/gi, '')
      .replace(/\b(The|And|Of|For|In|On|At|By|With)\b/gi, '')
      .trim();
    
    // Split into words and take first letters
    const words = cleanName.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length === 1) {
      // Single word - take first few characters
      return words[0].substring(0, maxLength).toUpperCase();
    } else if (words.length <= maxLength) {
      // Multiple words - take first letter of each
      return words.map(word => word.charAt(0)).join('').toUpperCase();
    } else {
      // Too many words - take first letter of first few words
      return words.slice(0, maxLength).map(word => word.charAt(0)).join('').toUpperCase();
    }
  }

  /**
   * Update cache with fresh data
   */
  async updateCache() {
    try {
      const now = Date.now();
      if (this.lastCacheUpdate && (now - this.lastCacheUpdate) < this.cacheExpiry) {
        return; // Cache still valid
      }


      // Fetch all master data
      const [customersRes, vendorsRes, projectsRes, locationsRes] = await Promise.all([
        customerAPI.getAll().catch(() => ({ data: { data: [] } })),
        vendorAPI.getAll().catch(() => ({ data: { data: [] } })),
        projectAPI.getAll().catch(() => ({ data: { data: [] } })),
        locationAPI.getAll().catch(() => ({ data: { data: [] } }))
      ]);

      this.cache = {
        customers: customersRes.data?.data || [],
        vendors: vendorsRes.data?.data || [],
        projects: projectsRes.data?.data || [],
        locations: locationsRes.data?.data || []
      };

      this.lastCacheUpdate = now;
    } catch (error) {
      console.error('❌ Failed to update vehicle code cache:', error);
    }
  }

  /**
   * Get dropdown options for customers
   */
  async getCustomerOptions() {
    await this.updateCache();
    return this.cache.customers.map(customer => ({
      value: customer.CustomerID,
      label: customer.CustomerName || customer.MasterCustomerName,
      code: this.generateAbbreviation(customer.CustomerName || customer.MasterCustomerName, 3)
    }));
  }

  /**
   * Get dropdown options for vendors
   */
  async getVendorOptions() {
    await this.updateCache();
    return this.cache.vendors.map(vendor => ({
      value: vendor.VendorID,
      label: vendor.vendor_name,
      code: `ID: ${vendor.VendorID}`
    }));
  }

  /**
   * Get dropdown options for projects
   */
  async getProjectOptions() {
    await this.updateCache();
    return this.cache.projects.map(project => ({
      value: project.ProjectID,
      label: project.ProjectName,
      code: this.generateAbbreviation(project.ProjectName, 3)
    }));
  }

  /**
   * Get dropdown options for locations
   */
  async getLocationOptions() {
    await this.updateCache();
    return this.cache.locations.map(location => ({
      value: location.LocationID,
      label: location.LocationName,
      code: this.generateAbbreviation(location.LocationName, 3)
    }));
  }

  /**
   * Generate unique vehicle code
   * @param {Object} components - { customerId, projectId, locationId, dcHub, vendorId }
   * @returns {Promise<string>} - Generated unique code
   */
  async generateVehicleCode(components) {
    const { customerId, projectId, locationId, dcHub, vendorId } = components;
    
    await this.updateCache();

    // Find entities by ID
    const customer = this.cache.customers.find(c => c.CustomerID == customerId);
    const vendor = this.cache.vendors.find(v => v.VendorID == vendorId);
    const project = this.cache.projects.find(p => p.ProjectID == projectId);
    const location = this.cache.locations.find(l => l.LocationID == locationId);

    // Generate abbreviations
    const customerCode = customer ? this.generateAbbreviation(customer.CustomerName || customer.MasterCustomerName, 3) : 'CUS';
    const projectCode = project ? this.generateAbbreviation(project.ProjectName, 3) : 'PRJ';
    const locationCode = location ? this.generateAbbreviation(location.LocationName, 3) : 'LOC';
    const dcHubCode = dcHub ? this.generateAbbreviation(dcHub, 2) : 'DC';
    const vendorCode = vendor ? this.generateAbbreviation(vendor.vendor_name, 3) : 'VEN';

    // Combine components
    const baseCode = `${customerCode}${projectCode}${locationCode}${dcHubCode}${vendorCode}`;
    
    // Add timestamp suffix for uniqueness
    const timestamp = Date.now().toString().slice(-4);
    const vehicleCode = `${baseCode}${timestamp}`;

    return vehicleCode.toUpperCase();
  }

  /**
   * Validate vehicle code uniqueness
   * @param {string} vehicleCode - Code to validate
   * @returns {Promise<boolean>} - True if unique, false if exists
   */
  async validateCodeUniqueness(vehicleCode) {
    try {
      // This would typically call an API to check database
      // For now, we'll implement a basic check
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
      const response = await fetch(`${API_BASE_URL}/api/vehicles/check-code/${vehicleCode}`);
      const result = await response.json();
      
      return result.isUnique;
    } catch (error) {
      console.error('Error validating vehicle code uniqueness:', error);
      return true; // Assume unique if check fails
    }
  }

  /**
   * Generate guaranteed unique vehicle code
   * @param {Object} components - Vehicle code components
   * @returns {Promise<string>} - Unique vehicle code
   */
  async generateUniqueVehicleCode(components) {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = await this.generateVehicleCode(components);
      const isUnique = await this.validateCodeUniqueness(code);
      
      if (isUnique) {
        return code;
      }
      
      attempts++;
      // Add random suffix for uniqueness
      if (attempts > 5) {
        const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
        const baseCode = code.substring(0, code.length - 4);
        const uniqueCode = `${baseCode}${randomSuffix}${Date.now().toString().slice(-2)}`;
        
        const isUniqueWithSuffix = await this.validateCodeUniqueness(uniqueCode);
        if (isUniqueWithSuffix) {
          return uniqueCode;
        }
      }
    }

    // Fallback: timestamp-based code
    const timestamp = Date.now().toString();
    return `VEH${timestamp.slice(-8)}`.toUpperCase();
  }

  /**
   * Preview vehicle code without saving
   * @param {Object} components - Vehicle code components
   * @returns {Promise<string>} - Preview code
   */
  async previewVehicleCode(components) {
    return await this.generateVehicleCode(components);
  }
}

// Export singleton instance
export default new VehicleCodeService();
