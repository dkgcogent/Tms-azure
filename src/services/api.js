import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {

    // Handle specific global errors
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (error.response?.status === 503) {
      // Service unavailable
      const event = new CustomEvent('show-notification', {
        detail: {
          message: 'Service temporarily unavailable. Please try again later.',
          type: 'warning'
        }
      });
      window.dispatchEvent(event);
    }

    return Promise.reject(error);
  }
);

// Dashboard API
export const dashboardAPI = {
  getSummary: () => api.get('/dashboard'),
};

// Customer API
export const customerAPI = {
  getAll: (urlParams = '') => api.get(`/customers${urlParams}`),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => {
    // Handle FormData for file uploads
    if (data instanceof FormData) {
      return api.post('/customers', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/customers', data);
  },
  update: (id, data) => {
    // Handle FormData for file uploads
    if (data instanceof FormData) {
      return api.put(`/customers/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.put(`/customers/${id}`, data);
  },
  delete: (id) => api.delete(`/customers/${id}`),
  bulkDelete: (ids) => api.delete('/customers/bulk', { data: { ids } }),
  deleteFile: (id, fieldName) => api.delete(`/customers/${id}/files/${fieldName}`),
};

// Location API
export const locationAPI = {
  getAll: () => api.get('/locations'),
  getById: (id) => api.get(`/locations/${id}`),
  getByCustomer: (customerId) => api.get(`/locations/customer/${customerId}`),
  create: (data) => api.post('/locations', data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`),
};

// Vendor API
export const vendorAPI = {
  getAll: (urlParams = '') => api.get(`/vendors${urlParams}`),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => {
    if (data instanceof FormData) {
      return api.post('/vendors', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/vendors', data);
  },
  update: (id, data) => {
    if (data instanceof FormData) {
      return api.put(`/vendors/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.put(`/vendors/${id}`, data);
  },
  delete: (id) => api.delete(`/vendors/${id}`),
  bulkDelete: (ids) => api.delete('/vendors/bulk', { data: { ids } }),
  deleteFile: (id, fieldName) => api.delete(`/vendors/${id}/files/${fieldName}`),
};

// Vehicle API
export const vehicleAPI = {
  getAll: (urlParams = '') => api.get(`/vehicles${urlParams}`),
  getById: (id) => api.get(`/vehicles/${id}`),
  create: (data) => {
    // Handle FormData for file uploads
    if (data instanceof FormData) {
      return api.post('/vehicles', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return api.post('/vehicles', data);
  },
  update: (id, data) => {
    // Handle FormData for file uploads
    if (data instanceof FormData) {
      return api.put(`/vehicles/${id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return api.put(`/vehicles/${id}`, data);
  },
  delete: (id) => api.delete(`/vehicles/${id}`),
  bulkDelete: (ids) => api.delete('/vehicles/bulk', { data: { ids } }),
  deleteFile: (id, fieldName) => api.delete(`/vehicles/${id}/files/${fieldName}`),
};

// Driver API
export const driverAPI = {
  getAll: (urlParams = '') => api.get(`/drivers${urlParams}`),
  getById: (id) => api.get(`/drivers/${id}`),
  create: (data) => {
    // Handle FormData for file uploads
    const config = data instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : {};
    return api.post('/drivers', data, config);
  },
  update: (id, data) => {
    // Handle FormData for file uploads
    const config = data instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : {};
    return api.put(`/drivers/${id}`, data, config);
  },
  delete: (id) => api.delete(`/drivers/${id}`),
  bulkDelete: (ids) => api.delete('/drivers/bulk', { data: { ids } }),
  deleteFile: (id, fieldName) => api.delete(`/drivers/${id}/files/${fieldName}`),
};

// Project API
export const projectAPI = {
  getAll: (urlParams = '') => api.get(`/projects${urlParams}`),
  getById: (id) => api.get(`/projects/${id}`),
  getByCustomer: (customerId) => api.get(`/projects/customer/${customerId}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  bulkDelete: (ids) => api.delete('/projects/bulk', { data: { ids } }),
  previewCode: (data) => api.post('/projects/preview-code', data),
};

// Vehicle Transaction API
// Original combined API (keeping for backward compatibility)
export const vehicleTransactionAPI = {
  getAll: (params) => api.get('/daily-vehicle-transactions', { params }),
  getById: (id, type = null) => {
    const typeParam = type ? `?type=${type}` : '';
    return api.get(`/daily-vehicle-transactions/${id}${typeParam}`);
  },
  create: (data) => api.post('/daily-vehicle-transactions', data),
  update: (id, data) => api.put(`/daily-vehicle-transactions/${id}`, data),
  delete: (id) => api.delete(`/daily-vehicle-transactions/${id}`),
  bulkDelete: (ids) => api.delete('/daily-vehicle-transactions/bulk', { data: { ids } }),

  // File upload methods
  createWithFiles: (formData) => api.post('/daily-vehicle-transactions', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  updateWithFiles: (id, formData) => api.put(`/daily-vehicle-transactions/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),

  // Export methods - Direct download without opening new tabs
  exportFixed: async () => {
    try {
      const response = await api.get('/daily-vehicle-transactions/export/fixed', {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'fixed-transactions.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export Fixed error:', error);
      throw error;
    }
  },

  exportAdhoc: async () => {
    try {
      const response = await api.get('/daily-vehicle-transactions/export/adhoc', {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'adhoc-replacement-transactions.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export Adhoc error:', error);
      throw error;
    }
  },

  deleteFile: (id, fieldName) => api.delete(`/daily-vehicle-transactions/${id}/files/${fieldName}`),
};

// Fixed Vehicle Transactions API - Uses Master Data Relationships
// Links to: Customer, Project, Vehicle, Driver, Vendor tables via IDs
export const fixedTransactionAPI = {
  getAll: (params) => api.get('/fixed-transactions', { params }),
  getById: (id) => api.get(`/fixed-transactions/${id}`),
  create: (data) => api.post('/fixed-transactions', data),
  update: (id, data) => api.put(`/fixed-transactions/${id}`, data),
  delete: (id) => api.delete(`/fixed-transactions/${id}`),
  bulkDelete: (ids) => api.delete('/fixed-transactions/bulk', { data: { ids } }),
};

// Adhoc/Replacement Vehicle Transactions API - Uses Manual Data Entry
// Stores manual entries directly without master data relationships
export const adhocTransactionAPI = {
  getAll: (params) => api.get('/adhoc-transactions', { params }),
  getById: (id) => api.get(`/adhoc-transactions/${id}`),
  create: (data) => api.post('/adhoc-transactions', data),
  update: (id, data) => api.put(`/adhoc-transactions/${id}`, data),
  delete: (id) => api.delete(`/adhoc-transactions/${id}`),
  bulkDelete: (ids) => api.delete('/adhoc-transactions/bulk', { data: { ids } }),
};



// Billing API
export const billingAPI = {
  getAll: () => api.get('/billing'),
  getById: (id) => api.get(`/billing/${id}`),
  create: (data) => api.post('/billing', data),
  update: (id, data) => api.put(`/billing/${id}`, data),
  delete: (id) => api.delete(`/billing/${id}`),
};

// Payment API
export const paymentAPI = {
  getAll: () => api.get('/payments'),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
};


// Reports API
export const reportsAPI = {
  getDailyTrips: (params) => api.get('/reports/daily-trips', { params }),
  getUtilization: (params) => api.get('/reports/utilization', { params }),
  getVehicleUtilization: (params) => api.get('/reports/utilization', { params }), // Alias for compatibility
  getRevenue: (params) => api.get('/reports/revenue', { params }),
  getPayments: (params) => api.get('/reports/payments', { params }),
  getPaymentSummary: (params) => api.get('/reports/payments', { params }), // Alias for compatibility
  getGSTSummary: (params) => api.get('/reports/gst-summary', { params }),
};

// Error message mapping for common scenarios
const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Unable to connect to server. Please check your internet connection and try again.',
  SERVER_UNAVAILABLE: 'Server is temporarily unavailable. Please try again in a few moments.',
  CONNECTION_TIMEOUT: 'Request timed out. Please check your connection and try again.',

  // Authentication errors
  AUTH_FAILED: 'Your session has expired. Please log in again.',
  ACCESS_DENIED: 'You do not have permission to perform this action.',

  // Data errors
  DUPLICATE_ENTRY: 'This information already exists. Please use different values.',
  VALIDATION_FAILED: 'Please check your information and correct any errors.',
  REQUIRED_FIELD_MISSING: 'Please fill in all required fields.',
  INVALID_FORMAT: 'Please check the format of your information and try again.',

  // File errors
  FILE_TOO_LARGE: 'File size is too large. Please choose a smaller file.',
  FILE_TYPE_NOT_SUPPORTED: 'File type not supported. Please choose a different file.',
  FILE_UPLOAD_FAILED: 'Unable to upload file. Please try again.',

  // Generic errors
  SAVE_FAILED: 'Unable to save your changes. Please try again.',
  LOAD_FAILED: 'Unable to load data. Please refresh the page and try again.',
  DELETE_FAILED: 'Unable to delete item. Please try again.',
  UPDATE_FAILED: 'Unable to update information. Please try again.',
};

// Generic API helper functions
export const apiHelpers = {
  handleError: (error, defaultMessage = 'An error occurred') => {
    // Handle network errors
    if (!error.response) {
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        return ERROR_MESSAGES.NETWORK_ERROR;
      }
      if (error.code === 'ENOTFOUND') {
        return 'Server not found. Please check if the application is running properly.';
      }
      if (error.code === 'ETIMEDOUT') {
        return ERROR_MESSAGES.CONNECTION_TIMEOUT;
      }
      return ERROR_MESSAGES.NETWORK_ERROR;
    }

    // Handle HTTP status codes
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        // Try to get specific error message from response
        if (data?.error) {
          // Check for common patterns and make them more user-friendly
          if (data.error.includes('already exists')) {
            return data.error;
          }
          if (data.error.includes('required')) {
            return ERROR_MESSAGES.REQUIRED_FIELD_MISSING;
          }
          if (data.error.includes('format') || data.error.includes('invalid')) {
            return data.error;
          }
          return data.error;
        }
        return ERROR_MESSAGES.VALIDATION_FAILED;
      case 401:
        return ERROR_MESSAGES.AUTH_FAILED;
      case 403:
        return data?.error || ERROR_MESSAGES.ACCESS_DENIED;
      case 404:
        return data?.error || 'The requested information was not found.';
      case 409:
        return data?.error || ERROR_MESSAGES.DUPLICATE_ENTRY;
      case 413:
        return ERROR_MESSAGES.FILE_TOO_LARGE;
      case 415:
        return ERROR_MESSAGES.FILE_TYPE_NOT_SUPPORTED;
      case 422:
        return data?.error || ERROR_MESSAGES.VALIDATION_FAILED;
      case 500:
        return data?.error || 'Something went wrong on our end. Please try again.';
      case 502:
        return ERROR_MESSAGES.SERVER_UNAVAILABLE;
      case 503:
        return data?.error || ERROR_MESSAGES.SERVER_UNAVAILABLE;
      case 504:
        return ERROR_MESSAGES.CONNECTION_TIMEOUT;
      default:
        // Try to get specific error message from response
        if (data?.error) {
          return data.error;
        }
        if (data?.message) {
          return data.message;
        }
        return `Something went wrong (Error ${status}). ${defaultMessage}`;
    }
  },

  showSuccess: (message) => {
    // Dispatch custom event for in-app notification
    const event = new CustomEvent('show-notification', {
      detail: { message, type: 'success' }
    });
    window.dispatchEvent(event);
  },

  showError: (error, defaultMessage = 'An error occurred') => {
    const errorMessage = apiHelpers.handleError(error, defaultMessage);
    // Dispatch custom event for in-app notification
    const event = new CustomEvent('show-notification', {
      detail: { message: errorMessage, type: 'error' }
    });
    window.dispatchEvent(event);
  },

  showWarning: (message) => {
    // Dispatch custom event for in-app notification
    const event = new CustomEvent('show-notification', {
      detail: { message, type: 'warning' }
    });
    window.dispatchEvent(event);
  },

  showInfo: (message) => {
    // Dispatch custom event for in-app notification
    const event = new CustomEvent('show-notification', {
      detail: { message, type: 'info' }
    });
    window.dispatchEvent(event);
  },

  // Helper to show validation errors
  showValidationErrors: (errors) => {
    if (Array.isArray(errors)) {
      errors.forEach(error => apiHelpers.showError(null, error));
    } else if (typeof errors === 'object') {
      Object.values(errors).forEach(error => apiHelpers.showError(null, error));
    } else {
      apiHelpers.showError(null, errors);
    }
  },

  // Test server connection
  testConnection: async () => {
    try {
      await api.get('/dashboard');
      apiHelpers.showSuccess('Server connection successful!');
      return true;
    } catch (error) {
      apiHelpers.showError(error, 'Failed to connect to server');
      return false;
    }
  },

  // Helper to handle form submission errors
  handleFormError: (error, formName = 'form') => {
    if (error.response?.status === 400 && error.response?.data?.errors) {
      // Handle validation errors from backend
      const errors = error.response.data.errors;
      if (Array.isArray(errors)) {
        errors.forEach(err => apiHelpers.showError(null, err));
      } else {
        Object.entries(errors).forEach(([field, message]) => {
          apiHelpers.showError(null, `${field}: ${message}`);
        });
      }
    } else {
      // Handle general form errors with context-specific messages
      let contextMessage;
      if (formName.toLowerCase().includes('customer')) {
        if (error.response?.status === 400) {
          contextMessage = 'Unable to save customer information. Please check your data and try again.';
        } else if (error.response?.status === 409) {
          contextMessage = 'A customer with this information already exists.';
        } else {
          contextMessage = 'Unable to save customer information. Please try again.';
        }
      } else {
        contextMessage = `Unable to submit ${formName}. Please try again.`;
      }

      apiHelpers.showError(error, contextMessage);
    }
  },

  // Helper for file operation errors
  handleFileError: (error, operation = 'file operation') => {
    let errorMessage;

    if (error.response?.status === 413) {
      errorMessage = 'File is too large. Please choose a file smaller than 5MB.';
    } else if (error.response?.status === 415) {
      errorMessage = 'File type not supported. Please choose a different file format.';
    } else if (error.response?.status === 404) {
      errorMessage = 'File not found. It may have been deleted or moved.';
    } else if (error.response?.status === 403) {
      errorMessage = 'You do not have permission to access this file.';
    } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      errorMessage = 'Unable to connect to server. Please check your connection and try again.';
    } else {
      errorMessage = `Unable to complete ${operation}. Please try again.`;
    }

    apiHelpers.showError(error, errorMessage);
  },

  // Helper for data loading errors
  handleLoadError: (error, dataType = 'data') => {
    let errorMessage;

    if (error.response?.status === 404) {
      errorMessage = `${dataType} not found.`;
    } else if (error.response?.status === 403) {
      errorMessage = `You do not have permission to access this ${dataType}.`;
    } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      errorMessage = 'Unable to connect to server. Please check your connection and try again.';
    } else if (error.response?.status === 503) {
      errorMessage = 'Service is temporarily unavailable. Please try again in a few moments.';
    } else {
      errorMessage = `Unable to load ${dataType}. Please refresh the page and try again.`;
    }

    apiHelpers.showError(error, errorMessage);
  },
};

export default api;
