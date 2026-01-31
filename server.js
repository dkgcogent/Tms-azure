const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'transportation_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: false,
  charset: 'utf8mb4',
  insecureAuth: true
};

console.log('Database config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password ? '***' : '(empty)',
  database: dbConfig.database
});

// Create database connection pool
const pool = mysql.createPool(dbConfig);

// Initialize notification service
const NotificationService = require('./backend/services/notificationService');
const notificationService = new NotificationService(pool);

// Initialize uploads manager
const uploadsManager = require('./backend/utils/uploadsManager');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads - serve from external directory with cache control
app.use('/uploads', express.static(uploadsManager.getBaseUploadPath(), {
  // Disable caching for uploaded files to prevent stale file issues
  setHeaders: (res, path, stat) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Import and use routes
const authRoutes = require('./backend/routes/auth');
const customerRoutes = require('./backend/routes/customer');
const vendorRoutes = require('./backend/routes/vendor');
const vehicleRoutes = require('./backend/routes/vehicle');
const driverRoutes = require('./backend/routes/driver');
const projectRoutes = require('./backend/routes/project');
const dashboardRoutes = require('./backend/routes/dashboard');
const transactionRoutes = require('./backend/routes/transaction');
const fixedTransactionRoutes = require('./backend/routes/fixedTransactions');
const adhocTransactionRoutes = require('./backend/routes/adhocTransactions');
const dailyVehicleTransactionRoutes = require('./backend/routes/dailyVehicleTransactions');
const billingRoutes = require('./backend/routes/billing');
const reportsRoutes = require('./backend/routes/reports');
const locationRoutes = require('./backend/routes/location');
const pincodeRoutes = require('./backend/routes/pincode');
const ifscRoutes = require('./backend/routes/ifsc');
const paymentRoutes = require('./backend/routes/payment');
const notificationRoutes = require('./backend/routes/notifications');
const exportRoutes = require('./backend/routes/export');
const importRoutes = require('./backend/routes/import');
const ratesRoutes = require('./backend/routes/rates');
const vehicleProjectLinkingRoutes = require('./backend/routes/vehicleProjectLinking');
const vehicleRelationshipsRoutes = require('./backend/routes/vehicleRelationships');

// Use routes with /api prefix
app.use('/api/auth', authRoutes(pool));
app.use('/api/customers', customerRoutes(pool));
app.use('/api/vendors', vendorRoutes(pool));
app.use('/api/vehicles', vehicleRoutes(pool));
app.use('/api/drivers', driverRoutes(pool));
app.use('/api/projects', projectRoutes(pool));
app.use('/api/dashboard', dashboardRoutes(pool));
app.use('/api/transactions', transactionRoutes(pool));
app.use('/api/fixed-transactions', fixedTransactionRoutes(pool));
app.use('/api/adhoc-transactions', adhocTransactionRoutes(pool));
app.use('/api/daily-vehicle-transactions', dailyVehicleTransactionRoutes(pool));
app.use('/api/billing', billingRoutes(pool));
app.use('/api/reports', reportsRoutes(pool));
app.use('/api/locations', locationRoutes(pool));
app.use('/api/pincode', pincodeRoutes(pool));
app.use('/api/ifsc', ifscRoutes(pool));
app.use('/api/payments', paymentRoutes(pool));
app.use('/api/notifications', notificationRoutes(pool, notificationService));
app.use('/api/export', exportRoutes(pool));
app.use('/api/import', importRoutes(pool));
app.use('/api/rates', ratesRoutes(pool));
app.use('/api/vehicle-project-linking', vehicleProjectLinkingRoutes(pool));
app.use('/api/vehicle-relationships', vehicleRelationshipsRoutes(pool));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TMS Backend Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Initialize uploads directories and start server
async function startServer() {
  try {
    // Initialize uploads directories before starting server
    await uploadsManager.initializeDirectories();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 TMS Backend Server is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🗄️  Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
      console.log(`📁 Uploads directory: ${uploadsManager.getBaseUploadPath()}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});
