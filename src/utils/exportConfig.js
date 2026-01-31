// Export configuration for all TMS entities
// This file provides export settings for all forms in the TMS application

export const EXPORT_ENTITIES = {
  TRANSACTIONS: 'transactions',
  VEHICLES: 'vehicles', 
  VENDORS: 'vendors',
  DRIVERS: 'drivers',
  CUSTOMERS: 'customers',
  PROJECTS: 'projects',
  BILLING: 'billing'
};

export const EXPORT_CONFIGS = {
  [EXPORT_ENTITIES.TRANSACTIONS]: {
    filename: 'Vehicle_Transactions',
    entity: 'transactions',
    title: 'Vehicle Transactions Export'
  },
  [EXPORT_ENTITIES.VEHICLES]: {
    filename: 'Vehicle_Master',
    entity: 'vehicles',
    title: 'Vehicle Master Export'
  },
  [EXPORT_ENTITIES.VENDORS]: {
    filename: 'Vendor_Master',
    entity: 'vendors', 
    title: 'Vendor Master Export'
  },
  [EXPORT_ENTITIES.DRIVERS]: {
    filename: 'Driver_Master',
    entity: 'drivers',
    title: 'Driver Master Export'
  },
  [EXPORT_ENTITIES.CUSTOMERS]: {
    filename: 'Customer_Master',
    entity: 'customers',
    title: 'Customer Master Export'
  },
  [EXPORT_ENTITIES.PROJECTS]: {
    filename: 'Project_Master', 
    entity: 'projects',
    title: 'Project Master Export'
  },
  [EXPORT_ENTITIES.BILLING]: {
    filename: 'Billing_Records',
    entity: 'billing',
    title: 'Billing Records Export'
  }
};

// Helper function to get export props for DataTable
export const getExportProps = (entityKey) => {
  const config = EXPORT_CONFIGS[entityKey];
  if (!config) {
    console.warn(`No export config found for entity: ${entityKey}`);
    return {
      exportable: false
    };
  }
  
  return {
    exportable: true,
    exportFilename: config.filename,
    exportEntity: config.entity
  };
};

// Export utility functions
export const exportUtils = {
  // Direct download using backend API
  downloadExport: async (entityKey, format = 'xlsx') => {
    try {
      const config = EXPORT_CONFIGS[entityKey];
      if (!config) {
        throw new Error(`Invalid entity: ${entityKey}`);
      }

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/api/export/${config.entity}?format=${format}`);
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename="')[1].split('"')[0]
        : `${config.filename}_${new Date().toISOString().slice(0, 10)}.${format}`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
    } catch (error) {
      console.error('Export error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get available export formats
  getAvailableFormats: () => {
    return ['xlsx', 'csv'];
  },

  // Validate entity
  isValidEntity: (entityKey) => {
    return Object.values(EXPORT_ENTITIES).includes(entityKey);
  }
};
