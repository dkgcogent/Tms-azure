import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalCustomers: 0,
    totalVendors: 0,
    totalVehicles: 0,
    totalDrivers: 0,
    todayTrips: { fixed: 0, adhoc: 0 },
    pendingInvoices: 0,
    totalPayments: 0,
    recentTransactions: [],
    recentPayments: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [todaySummary, setTodaySummary] = useState({ fixed: 0, adhoc: 0, replacement: 0 });
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Navigation handlers for dashboard cards
  const handleCardClick = (cardType) => {
    switch (cardType) {
      case 'customers':
        navigate('/add-customer');
        break;
      case 'vendors':
        navigate('/add-vendor');
        break;
      case 'vehicles':
        navigate('/add-vehicle');
        break;
      case 'drivers':
        navigate('/add-driver');
        break;
      case 'transactions':
        navigate('/daily-vehicle-transaction');
        break;
      case 'billing':
        navigate('/billing');
        break;
      default:
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Use the dedicated dashboard API for optimized data fetching
      const response = await dashboardAPI.getSummary();
      const data = response.data;


      setDashboardData({
        totalCustomers: data.totalCustomers || 0,
        totalVendors: data.totalVendors || 0,
        totalVehicles: data.totalVehicles || 0,
        totalDrivers: data.totalDrivers || 0,
        todayTrips: data.todayTrips || { fixed: 0, adhoc: 0, replacement: 0 },
        pendingInvoices: data.pendingInvoices || 0,
        totalPayments: data.totalPayments || 0,
        recentTransactions: data.recentTransactions || [],
        recentPayments: data.recentPayments || [],
      });

      // Also update the today summary from the same response
      setTodaySummary({
        fixed: data.todayTrips?.fixed || 0,
        adhoc: data.todayTrips?.adhoc || 0,
        replacement: data.todayTrips?.replacement || 0,
      });

    } catch (error) {
      // Set default values on error
      setDashboardData({
        totalCustomers: 0,
        totalVendors: 0,
        totalVehicles: 0,
        totalDrivers: 0,
        todayTrips: { fixed: 0, adhoc: 0, replacement: 0 },
        pendingInvoices: 0,
        totalPayments: 0,
        recentTransactions: [],
        recentPayments: [],
      });
      setTodaySummary({ fixed: 0, adhoc: 0, replacement: 0 });
    } finally {
      setIsLoading(false);
      setLoadingSummary(false); // Also set this to false
      setLastUpdated(new Date());
    }
  };



  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>🏠 Dashboard</h1>
          <p>Transportation Management System Overview</p>
        </div>
        <div className="loading-state">
          <h3>Loading dashboard...</h3>
          <p>Please wait while we fetch the latest data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>🏠 Dashboard</h1>
        <p>Transportation Management System Overview</p>
        <div className="dashboard-controls">
          <button onClick={fetchDashboardData} className="refresh-btn">
            🔄 Refresh Data
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Dashboard Content Wrapper */}
      <div className="dashboard-content">
        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card customers" onClick={() => handleCardClick('customers')}>
            <div className="card-icon">👥</div>
            <div className="card-content">
              <h3>{dashboardData.totalCustomers}</h3>
              <p>Total Customers</p>
            </div>
          </div>

          <div className="summary-card vendors" onClick={() => handleCardClick('vendors')}>
            <div className="card-icon">🏢</div>
            <div className="card-content">
              <h3>{dashboardData.totalVendors}</h3>
              <p>Total Vendors</p>
            </div>
          </div>

          <div className="summary-card vehicles" onClick={() => handleCardClick('vehicles')}>
            <div className="card-icon">🚛</div>
            <div className="card-content">
              <h3>{dashboardData.totalVehicles}</h3>
              <p>Total Vehicles</p>
            </div>
          </div>

          <div className="summary-card drivers" onClick={() => handleCardClick('drivers')}>
            <div className="card-icon">👨‍💼</div>
            <div className="card-content">
              <h3>{dashboardData.totalDrivers}</h3>
              <p>Total Drivers</p>
            </div>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="activity-section">
          <div className="activity-card trips" onClick={() => handleCardClick('transactions')}>
            <h3>📋 Today's Trips</h3>
            <div className="trip-stats">
              <div className="trip-stat fixed">
                <span className="stat-number">{todaySummary.fixed}</span>
                <span className="stat-label">Fixed Trips</span>
              </div>
              <div className="trip-stat adhoc">
                <span className="stat-number">{todaySummary.adhoc}</span>
                <span className="stat-label">Adhoc Trips</span>
              </div>
            </div>
          </div>

          <div className="activity-card invoices" onClick={() => handleCardClick('billing')}>
            <h3>💰 Pending Invoices</h3>
            <div className="invoice-stat">
              <span className="stat-number pending">{dashboardData.pendingInvoices}</span>
              <span className="stat-label">Invoices Pending</span>
            </div>
          </div>

          <div className="activity-card payments" onClick={() => handleCardClick('billing')}>
            <h3>💳 Total Payments</h3>
            <div className="payment-stat">
              <span className="stat-number received">₹{dashboardData.totalPayments.toLocaleString()}</span>
              <span className="stat-label">Total Received</span>
            </div>
          </div>
        </div>

        {/* Live Summary Section */}
        <div className="live-summary" style={{ marginBottom: '20px', padding: '16px', background: '#eaf6ff', borderRadius: '8px', display: 'flex', gap: '32px', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Today's Trip Summary</h2>
          {loadingSummary ? (
            <span>Loading...</span>
          ) : (
            <>
              <div><strong>Fixed:</strong> {todaySummary.fixed}</div>
              <div><strong>Adhoc:</strong> {todaySummary.adhoc}</div>
              <div><strong>Replacement:</strong> {todaySummary.replacement}</div>
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="recent-activity">
          <div className="recent-section" onClick={() => handleCardClick('transactions')}>
            <h3>🚛 Recent Transactions</h3>
            <div className="recent-list">
              {dashboardData.recentTransactions.length === 0 ? (
                <p className="no-data">No recent transactions</p>
              ) : (
                dashboardData.recentTransactions.map((transaction, index) => (
                  <div key={transaction.TransactionID || index} className="recent-item">
                    <div className="item-info">
                      <span className="item-title">
                        {transaction.TripType} Trip - {transaction.VehicleRegistrationNo}
                      </span>
                      <span className="item-date">
                        {new Date(transaction.TransactionDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="item-amount">
                      ₹{parseFloat(transaction.FreightFix || 0).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="recent-section" onClick={() => handleCardClick('billing')}>
            <h3>💳 Recent Payments</h3>
            <div className="recent-list">
              {dashboardData.recentPayments.length === 0 ? (
                <p className="no-data">No recent payments</p>
              ) : (
                dashboardData.recentPayments.map((payment, index) => (
                  <div key={payment.PaymentID || index} className="recent-item">
                    <div className="item-info">
                      <span className="item-title">
                        {payment.PaymentMode} - {payment.InvoiceNo}
                      </span>
                      <span className="item-date">
                        {new Date(payment.PaymentDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="item-amount">
                      ₹{parseFloat(payment.PaymentAmount || 0).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
