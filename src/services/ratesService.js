import axios from 'axios';

const API_BASE_URL = '/api/rates';

class RatesService {
  // Download rates template
  async downloadTemplate() {
    try {
      const response = await axios.get(`${API_BASE_URL}/template`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'rates_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error downloading template:', error);
      throw error;
    }
  }

  // Import rates from file
  async importRates(file, customerId, projectId, locationId) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      if (customerId) formData.append('customerId', customerId);
      if (projectId) formData.append('projectId', projectId);
      if (locationId) formData.append('locationId', locationId);

      const response = await axios.post(`${API_BASE_URL}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error importing rates:', error);
      throw error;
    }
  }

  // Get rates for customer/project/location
  async getRates(customerId, projectId, locationId) {
    try {
      const params = {};
      if (customerId) params.customerId = customerId;
      if (projectId) params.projectId = projectId;
      if (locationId) params.locationId = locationId;

      const response = await axios.get(API_BASE_URL, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching rates:', error);
      throw error;
    }
  }

  // Update rates for a customer
  async updateRates(customerId, rates) {
    try {
      const response = await axios.put(`${API_BASE_URL}/${customerId}`, { rates });
      return response.data;
    } catch (error) {
      console.error('Error updating rates:', error);
      throw error;
    }
  }

  // Delete rates annexure file
  async deleteRatesFile(customerId) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${customerId}/file`);
      return response.data;
    } catch (error) {
      console.error('Error deleting rates file:', error);
      throw error;
    }
  }

  // Validate rates data structure
  validateRatesData(rates) {
    const errors = [];

    if (!Array.isArray(rates)) {
      errors.push('Rates must be an array');
      return errors;
    }

    rates.forEach((rate, index) => {
      if (!rate.vehicleType || typeof rate.vehicleType !== 'string') {
        errors.push(`Rate ${index + 1}: Vehicle type is required and must be a string`);
      }

      if (!rate.baseRate || typeof rate.baseRate !== 'number' || rate.baseRate < 0) {
        errors.push(`Rate ${index + 1}: Base rate must be a positive number`);
      }

      if (rate.fuelRate && (typeof rate.fuelRate !== 'number' || rate.fuelRate < 0)) {
        errors.push(`Rate ${index + 1}: Fuel rate must be a positive number`);
      }

      if (rate.tollRate && (typeof rate.tollRate !== 'number' || rate.tollRate < 0)) {
        errors.push(`Rate ${index + 1}: Toll rate must be a positive number`);
      }

      if (rate.loadingCharges && (typeof rate.loadingCharges !== 'number' || rate.loadingCharges < 0)) {
        errors.push(`Rate ${index + 1}: Loading charges must be a positive number`);
      }

      if (rate.unloadingCharges && (typeof rate.unloadingCharges !== 'number' || rate.unloadingCharges < 0)) {
        errors.push(`Rate ${index + 1}: Unloading charges must be a positive number`);
      }

      if (rate.effectiveFrom && isNaN(new Date(rate.effectiveFrom).getTime())) {
        errors.push(`Rate ${index + 1}: Invalid effective from date`);
      }

      if (rate.effectiveTo && isNaN(new Date(rate.effectiveTo).getTime())) {
        errors.push(`Rate ${index + 1}: Invalid effective to date`);
      }
    });

    return errors;
  }

  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  }

  // Format date
  formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  }

  // Calculate total rate
  calculateTotalRate(rate) {
    return (
      (rate.baseRate || 0) +
      (rate.fuelRate || 0) +
      (rate.tollRate || 0) +
      (rate.loadingCharges || 0) +
      (rate.unloadingCharges || 0) +
      (rate.otherCharges || 0)
    );
  }
}

export default new RatesService();
