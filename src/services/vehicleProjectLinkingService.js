import axios from 'axios';

const API_BASE_URL = 'http://localhost:3002/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/vehicle-project-linking`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const vehicleProjectLinkingService = {
  // Vehicle operations - Enhanced for Vehicle-Driver model
  getAvailableVehicles: async () => {
    try {
      const response = await apiClient.get('/available-vehicles');
      return response.data;
    } catch (error) {
      console.error('Error fetching available vehicles:', error);
      throw error;
    }
  },

  // Get available vehicles with drivers for a specific customer
  getAvailableVehiclesByCustomer: async (customerId) => {
    try {
      const response = await apiClient.get(`/available-vehicles/customer/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer available vehicles with drivers:', error);
      throw error;
    }
  },

  // Get all vehicles provided by vendors with driver information
  getVendorVehiclesWithDrivers: async (vendorId = null) => {
    try {
      const url = vendorId ? `/vendor-vehicles/${vendorId}` : '/vendor-vehicles';
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor vehicles with drivers:', error);
      throw error;
    }
  },

  // Project operations
  getProjects: async () => {
    try {
      const response = await apiClient.get('/projects');
      return response.data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  },

  getProjectsByCustomer: async (customerId) => {
    try {
      const response = await apiClient.get(`/projects/customer/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer projects:', error);
      throw error;
    }
  },

  createProject: async (projectData) => {
    try {
      const response = await apiClient.post('/projects', projectData);
      return response.data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  // Vehicle-Driver assignment operations
  assignVehicleToProject: async (assignmentData) => {
    try {
      // assignmentData should include: vehicle_id, project_id, driver_id, assigned_by, assignment_notes
      const response = await apiClient.post('/assign-vehicle', assignmentData);
      return response.data;
    } catch (error) {
      console.error('Error assigning vehicle (with driver) to project:', error);
      throw error;
    }
  },

  unassignVehicleFromProject: async (unassignmentData) => {
    try {
      // unassignmentData should include: vehicle_id, reason
      const response = await apiClient.post('/unassign-vehicle', unassignmentData);
      return response.data;
    } catch (error) {
      console.error('Error unassigning vehicle (with driver) from project:', error);
      throw error;
    }
  },

  // Assign multiple vehicles to customer (bulk assignment)
  assignMultipleVehiclesToCustomer: async (assignmentData) => {
    try {
      // assignmentData should include: customer_id, vehicle_assignments: [{ vehicle_id, driver_id, project_id }]
      const response = await apiClient.post('/assign-multiple-vehicles', assignmentData);
      return response.data;
    } catch (error) {
      console.error('Error assigning multiple vehicles to customer:', error);
      throw error;
    }
  },

  // Relationship operations
  getVehicleRelationships: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await apiClient.get(`/vehicle-relationships${params ? `?${params}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vehicle relationships:', error);
      throw error;
    }
  },

  createCustomerVendorRelationship: async (relationshipData) => {
    try {
      const response = await apiClient.post('/customer-vendor-relationship', relationshipData);
      return response.data;
    } catch (error) {
      console.error('Error creating customer-vendor relationship:', error);
      throw error;
    }
  },

  // Summary and history operations
  getVendorSummary: async () => {
    try {
      const response = await apiClient.get('/vendor-summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor summary:', error);
      throw error;
    }
  },

  getAssignmentHistory: async (vehicleId) => {
    try {
      const response = await apiClient.get(`/assignment-history/${vehicleId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching assignment history:', error);
      throw error;
    }
  }
};

// Additional API calls for master data (reusing existing endpoints)
export const masterDataService = {
  getCustomers: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/customers`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },

  getVendors: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vendors`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vendors:', error);
      throw error;
    }
  },

  getVehicles: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vehicles`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  }
};

export default vehicleProjectLinkingService;
