import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import logo from '../logo.jpg';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const user = authService.getUser();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      authService.logout();
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/add-customer', label: 'Add Customer', icon: '👥' },
    { path: '/add-project', label: 'Add Project', icon: '📁' },
    { path: '/add-vendor', label: 'Add Vendor', icon: '🏢' },
    { path: '/add-driver', label: 'Add Driver', icon: '👨‍💼' },
    { path: '/add-vehicle', label: 'Add Vehicle', icon: '🚛' },
    { path: '/daily-vehicle-transaction', label: 'Daily Vehicle Entry', icon: '📝' },
    { path: '/billing', label: 'Billing & Collections', icon: '💰' },
    { path: '/reports', label: 'Reports & Analysis', icon: '📊' },
  ];

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <img src={logo} alt="TMS Logo" className="navbar-logo" />
      </Link>
      
      <ul className="navbar-nav">
        {navItems.map((item) => (
          <li key={item.path} className="nav-item">
            <Link
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      
      <div className="navbar-user">
        <div className="user-info">
          <p className="user-name">👤 {user?.username || 'User'}</p>
          <p className="user-role">{user?.role || 'Role'}</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          🚪 Logout
        </button>
      </div>

      <div className="navbar-footer">
        <p>© 2025 TMS v1.0</p>
      </div>
    </nav>
  );
};

export default Navbar;
