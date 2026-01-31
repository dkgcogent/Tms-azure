const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = (pool) => {
  const router = express.Router();
  
  // JWT Secret (in production, use environment variable)
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
  
  // Register endpoint
  router.post('/register', async (req, res) => {
    try {
      const { username, email, password, role } = req.body;
      
      // Validation
      if (!username || !email || !password || !role) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }
      
      // Check if user already exists
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      
      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Insert user into database
      const [result] = await pool.execute(
        'INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())',
        [username, email, hashedPassword, role]
      );
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: result.insertId,
          username,
          email,
          role
        }
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });
  
  // Login endpoint
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }
      
      // Find user by email
      const [users] = await pool.execute(
        'SELECT id, username, email, password_hash, role FROM users WHERE email = ?',
        [email]
      );
      
      if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials and try again.'
      });
      }
      
      const user = users[0];
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials and try again.'
      });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        message: 'Login successful',
        jwt_token: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });
  
  // Verify token endpoint
  router.get('/verify', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get fresh user data
      const [users] = await pool.execute(
        'SELECT id, username, email, role FROM users WHERE id = ?',
        [decoded.userId]
      );
      
      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        user: users[0]
      });
      
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  });
  
  return router;
};
