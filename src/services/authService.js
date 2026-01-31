// Authentication Service for JWT handling

const API_BASE_URL = 'http://localhost:3004/api';

class AuthService {
  // Get JWT token from localStorage
  getToken() {
    return localStorage.getItem('jwt_token');
  }

  // Get user info from localStorage
  getUser() {
    const userInfo = localStorage.getItem('user_info');
    return userInfo ? JSON.parse(userInfo) : null;
  }

  // Get user role
  getUserRole() {
    return localStorage.getItem('user_role');
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // Check if token is expired
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  // Set authentication token
  setAuthToken(token) {
    if (token) {
      localStorage.setItem('jwt_token', token);
    } else {
      localStorage.removeItem('jwt_token');
    }
  }

  // Login user
  async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        // Store authentication data
        localStorage.setItem('jwt_token', data.jwt_token);
        localStorage.setItem('user_info', JSON.stringify(data.user));
        localStorage.setItem('user_role', data.user.role);
        return { success: true, data };
      } else {
        return { success: false, error: data.message || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Register user
  async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: data.message || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Logout user
  logout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('user_role');
    window.location.href = '/login';
  }

  // Get authorization headers for API requests
  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Make authenticated API request
  async authenticatedRequest(url, options = {}) {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // If token is expired, logout user
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired. Please login again.');
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  // Check user permissions
  hasPermission(requiredRole) {
    const userRole = this.getUserRole();
    if (!userRole) return false;

    const roleHierarchy = {
      admin: 3,
      vendor: 2,
      customer: 1
    };

    const userLevel = roleHierarchy[userRole.toLowerCase()] || 0;
    const requiredLevel = roleHierarchy[requiredRole.toLowerCase()] || 0;

    return userLevel >= requiredLevel;
  }

  // Redirect based on user role
  redirectByRole() {
    const role = this.getUserRole();
    if (!role) {
      window.location.href = '/login';
      return;
    }

    switch (role.toLowerCase()) {
      case 'admin':
        window.location.href = '/dashboard';
        break;
      case 'vendor':
        window.location.href = '/vendor-dashboard';
        break;
      case 'customer':
        window.location.href = '/customer-dashboard';
        break;
      default:
        window.location.href = '/dashboard';
    }
  }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService;
