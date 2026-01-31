import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const isAuthenticated = authService.isAuthenticated();
  const userRole = authService.getUserRole();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If specific role is required, check permissions
  if (requiredRole && !authService.hasPermission(requiredRole)) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h2>🚫 Access Denied</h2>
          <p>You don't have permission to access this page.</p>
          <p>Required role: <strong>{requiredRole}</strong></p>
          <p>Your role: <strong>{userRole}</strong></p>
          <button 
            onClick={() => window.history.back()}
            className="back-btn"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
