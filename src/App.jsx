import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { NotificationManager } from './components/Notification';
import Login from './routes/Login';
import Register from './routes/Register';
import Dashboard from './routes/Dashboard';
import CustomerForm from './routes/CustomerForm';
import VendorForm from './routes/VendorForm';
import VehicleForm from './routes/VehicleForm';
import DriverForm from './routes/DriverForm';
import DailyVehicleTransactionForm from './routes/DailyVehicleTransactionForm';
import FixedTransactionForm from './routes/FixedTransactionForm';
import AdhocTransactionForm from './routes/AdhocTransactionForm';
import ProjectFormRefactored from './routes/ProjectFormRefactored';
import BillingForm from './routes/BillingForm';
import ReportsForm from './routes/ReportsForm';
import NotificationSettings from './components/NotificationSettings';
// import VehicleProjectLinking from './components/VehicleProjectLinking';
import authService from './services/authService';
import './App.css';






function App() {
  const isAuthenticated = authService.isAuthenticated();

  return (
    <Router>
      <div className="app">
        {/* Show Navbar only for authenticated users */}
        {isAuthenticated && <Navbar />}

        <main className={isAuthenticated ? "main-content" : "auth-content"}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/add-customer" element={
              <ProtectedRoute>
                <CustomerForm />
              </ProtectedRoute>
            } />
            <Route path="/add-vendor" element={
              <ProtectedRoute>
                <VendorForm />
              </ProtectedRoute>
            } />
            <Route path="/add-vehicle" element={
              <ProtectedRoute>
                <VehicleForm />
              </ProtectedRoute>
            } />
            <Route path="/add-driver" element={
              <ProtectedRoute>
                <DriverForm />
              </ProtectedRoute>
            } />
            <Route path="/daily-vehicle-transaction" element={
              <ProtectedRoute>
                <DailyVehicleTransactionForm />
              </ProtectedRoute>
            } />
            <Route path="/fixed-transactions" element={
              <ProtectedRoute>
                <FixedTransactionForm />
              </ProtectedRoute>
            } />
            <Route path="/adhoc-transactions" element={
              <ProtectedRoute>
                <AdhocTransactionForm />
              </ProtectedRoute>
            } />
            <Route path="/add-project" element={
              <ProtectedRoute>
                <ProjectFormRefactored />
              </ProtectedRoute>
            } />
            <Route path="/billing" element={
              <ProtectedRoute>
                <BillingForm />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute requiredRole="admin">
                <ReportsForm />
              </ProtectedRoute>
            } />
            <Route path="/notification-settings" element={
              <ProtectedRoute>
                <NotificationSettings />
              </ProtectedRoute>
            } />
            {/* Vehicle-Project Linking removed - no longer used */}
          </Routes>
        </main>

        {/* Global Notification Manager */}
        <NotificationManager />
      </div>
    </Router>
  );
}

export default App;
