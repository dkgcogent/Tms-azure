import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';
import logo from '../logo.jpg';
import { focusField } from '../utils/globalFormValidation';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'customer',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (authService.isAuthenticated()) {
      authService.redirectByRole();
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    const fieldOrder = ['username', 'email', 'password', 'confirmPassword'];

    if (!formData.username.trim()) {
      setError('Username is required');
      focusField('username');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      focusField('email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      focusField('email');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      focusField('password');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      focusField('confirmPassword');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await authService.register({
        username: formData.username,
        email: formData.email,
        role: formData.role,
        password: formData.password
      });

      if (result.success) {
        setSuccess('Registration successful! Logging you in...');
        // Reset form
        setFormData({
          username: '',
          email: '',
          role: 'customer',
          password: '',
          confirmPassword: ''
        });

        // Automatically login the user after successful registration
        try {
          const loginResult = await authService.login({
            email: formData.email,
            password: formData.password
          });

          if (loginResult.success) {
            // Redirect based on user role after successful auto-login
            setTimeout(() => {
              authService.redirectByRole();
            }, 1000);
          } else {
            // If auto-login fails, redirect to login page
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
        } catch (loginError) {
          console.error('Auto-login error:', loginError);
          // Redirect to login page if auto-login fails
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-container">
      {/* Logo in top left corner */}
      <div className="auth-logo">
        {/* <img src={logo} alt="Company Logo" /> */}
      </div>

      <div className="register-card">
        <div className="register-header">
          <img src={logo} alt="TMS Logo" className="register-logo" />
          <h1>TMS Registration</h1>
          <p>Create your Transport Management System account</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter your username"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="form-select"
            >
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password (min 6 characters)"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="register-btn"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="register-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="login-link">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
