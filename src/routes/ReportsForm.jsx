import React, { useState, useEffect } from 'react';
import { reportsAPI, apiHelpers } from '../services/api';
import DataTable from '../components/DataTable';
// Simple date utility functions
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

const getDateDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

const getDateInputConstraints = (options = {}) => {
  const today = getCurrentDate();
  const constraints = {};

  if (!options.allowFuture) {
    constraints.max = today;
  }

  if (options.maxDaysAgo) {
    constraints.min = getDateDaysAgo(options.maxDaysAgo);
  }

  return constraints;
};
import './ReportsForm.css';

const ReportsForm = () => {
  const [activeTab, setActiveTab] = useState('daily-trips');
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: getDateDaysAgo(30),
    toDate: getCurrentDate(),
    customerID: '',
    vehicleID: '',
    driverID: '',
  });

  useEffect(() => {
    fetchReportData();
  }, [activeTab, filters]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      let response;
      // Map frontend parameter names to backend parameter names
      const apiParams = {
        start_date: filters.fromDate,
        end_date: filters.toDate,
        customer_id: filters.customerID,
        vehicle_id: filters.vehicleID,
        driver_id: filters.driverID,
      };

      switch (activeTab) {
        case 'daily-trips':
          response = await reportsAPI.getDailyTrips(apiParams);
          break;
        case 'vehicle-utilization':
          response = await reportsAPI.getUtilization(apiParams);
          break;
        case 'revenue':
          response = await reportsAPI.getRevenue(apiParams);
          break;
        case 'gst-summary':
          response = await reportsAPI.getGSTSummary(apiParams);
          break;
        case 'payment-summary':
          response = await reportsAPI.getPaymentSummary(apiParams);
          break;
        default:
          response = { data: [] };
      }
      // Ensure we always set an array - handle different response formats
      const data = response?.data?.data || response?.data || [];
      setReportData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Report data fetch error:', error);
      apiHelpers.showError(error, 'Failed to fetch report data');
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const exportToCSV = () => {
    if (!Array.isArray(reportData) || reportData.length === 0) {
      apiHelpers.showError(null, 'No data to export');
      return;
    }

    const headers = Object.keys(reportData[0]);
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab}-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getReportColumns = () => {
    switch (activeTab) {
      case 'daily-trips':
        return [
          { key: 'TripDate', label: 'Date', sortable: true, type: 'date' },
          { key: 'CustomerName', label: 'Customer', sortable: true },
          { key: 'VehicleRegistrationNo', label: 'Vehicle', sortable: true },
          { key: 'DriverName', label: 'Driver', sortable: true },
          { key: 'TripType', label: 'Trip Type', sortable: true },
          { key: 'Kilometers', label: 'Total KM', sortable: true, render: (value) => value ? `${value} km` : '-' },
          {
            key: 'FreightFix',
            label: 'Freight',
            sortable: true,
            type: 'currency',
            render: (value) => value ? `₹${parseFloat(value).toLocaleString()}` : '-'
          },
        ];
      case 'vehicle-utilization':
        return [
          { key: 'VehicleRegistrationNo', label: 'Vehicle', sortable: true },
          { key: 'VehicleCode', label: 'Code', sortable: true },
          { key: 'TotalTrips', label: 'Total Trips', sortable: true },
          { key: 'TotalKilometers', label: 'Total KM', sortable: true, render: (value) => value ? `${value} km` : '-' },
          { key: 'AvgKilometersPerTrip', label: 'Avg KM/Trip', sortable: true, render: (value) => value ? `${parseFloat(value).toFixed(1)} km` : '-' },
          {
            key: 'TotalRevenue',
            label: 'Total Revenue',
            sortable: true,
            type: 'currency',
            render: (value) => value ? `₹${parseFloat(value).toLocaleString()}` : '-'
          },
        ];
      case 'revenue':
        return [
          { key: 'CustomerName', label: 'Customer', sortable: true },
          { key: 'ProjectName', label: 'Project', sortable: true },
          { key: 'TotalInvoices', label: 'Total Invoices', sortable: true },
          {
            key: 'TotalAmount',
            label: 'Total Amount',
            sortable: true,
            type: 'currency',
            render: (value) => value ? `₹${parseFloat(value).toLocaleString()}` : '-'
          },
          {
            key: 'TotalGST',
            label: 'Tax Amount',
            sortable: true,
            type: 'currency',
            render: (value) => value ? `₹${parseFloat(value).toLocaleString()}` : '-'
          },
          {
            key: 'TotalRevenue',
            label: 'Grand Total',
            sortable: true,
            type: 'currency',
            render: (value) => value ? `₹${parseFloat(value).toLocaleString()}` : '-'
          },
        ];
      case 'gst-summary':
        return [
          { key: 'InvoiceNo', label: 'Invoice No', sortable: true },
          { key: 'InvoiceDate', label: 'Invoice Date', sortable: true, type: 'date' },
          { key: 'CustomerName', label: 'Customer', sortable: true },
          { key: 'ProjectName', label: 'Project', sortable: true },
          {
            key: 'TotalAmount',
            label: 'Taxable Amount',
            sortable: true,
            type: 'currency',
            render: (value) => value ? `₹${parseFloat(value).toLocaleString()}` : '-'
          },
          {
            key: 'GSTAmount',
            label: 'GST Amount',
            sortable: true,
            type: 'currency',
            render: (value) => value ? `₹${parseFloat(value).toLocaleString()}` : '-'
          },
          {
            key: 'GrandTotal',
            label: 'Grand Total',
            sortable: true,
            type: 'currency',
            render: (value) => value ? `₹${parseFloat(value).toLocaleString()}` : '-'
          },
        ];
      case 'payment-summary':
        return [
          { key: 'CustomerName', label: 'Customer', sortable: true },
          { key: 'TotalInvoices', label: 'Total Invoices', sortable: true },
          {
            key: 'TotalBilled',
            label: 'Total Billed',
            sortable: true,
            type: 'currency',
            render: (value) => value ? `₹${parseFloat(value).toLocaleString()}` : '-'
          },
          {
            key: 'TotalPaid',
            label: 'Total Paid',
            sortable: true,
            type: 'currency',
            render: (value) => value ? `₹${parseFloat(value).toLocaleString()}` : '-'
          },
          {
            key: 'TotalUnpaid',
            label: 'Outstanding',
            sortable: true,
            type: 'currency',
            render: (value) => {
              const amount = parseFloat(value) || 0;
              const color = amount > 0 ? 'text-red-600' : amount < 0 ? 'text-green-600' : '';
              return <span className={color}>{`₹${Math.abs(amount).toLocaleString()}`}</span>;
            }
          },
          { key: 'TotalPayments', label: 'Payment Count', sortable: true },
        ];
      default:
        return [];
    }
  };

  const getReportKeyField = () => {
    switch (activeTab) {
      case 'daily-trips':
        return 'TransactionID';
      case 'vehicle-utilization':
        return 'VehicleID';
      case 'revenue':
        return 'CustomerID';
      case 'gst-summary':
        return 'BillingID';
      case 'payment-summary':
        return 'CustomerID';
      default:
        return null;
    }
  };

  const getReportTitle = () => {
    switch (activeTab) {
      case 'daily-trips':
        return 'Daily Trips Report';
      case 'vehicle-utilization':
        return 'Vehicle Utilization Report';
      case 'revenue':
        return 'Revenue Report';
      case 'gst-summary':
        return 'GST Summary Report';
      case 'payment-summary':
        return 'Payment Summary Report';
      default:
        return 'Report';
    }
  };

  const getSummaryCards = () => {
    // Ensure reportData is an array before proceeding
    if (!Array.isArray(reportData) || reportData.length === 0) return null;

    switch (activeTab) {
      case 'daily-trips':
        const totalTrips = reportData.length;
        const totalKM = reportData.reduce((sum, trip) => sum + (parseFloat(trip.TotalKM) || 0), 0);
        const totalRevenue = reportData.reduce((sum, trip) => sum + (parseFloat(trip.FreightAmount) || 0), 0);
        return (
          <div className="summary-cards">
            <div className="summary-card">
              <h4>Total Trips</h4>
              <p>{totalTrips}</p>
            </div>
            <div className="summary-card">
              <h4>Total KM</h4>
              <p>{totalKM.toFixed(1)} km</p>
            </div>
            <div className="summary-card">
              <h4>Total Revenue</h4>
              <p>₹{totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        );
      case 'revenue':
        const totalAmount = Array.isArray(reportData) ? reportData.reduce((sum, item) => sum + (parseFloat(item.TotalAmount) || 0), 0) : 0;
        const totalTax = Array.isArray(reportData) ? reportData.reduce((sum, item) => sum + (parseFloat(item.TaxAmount) || 0), 0) : 0;
        const grandTotal = Array.isArray(reportData) ? reportData.reduce((sum, item) => sum + (parseFloat(item.GrandTotal) || 0), 0) : 0;
        return (
          <div className="summary-cards">
            <div className="summary-card">
              <h4>Total Amount</h4>
              <p>₹{totalAmount.toLocaleString()}</p>
            </div>
            <div className="summary-card">
              <h4>Total Tax</h4>
              <p>₹{totalTax.toLocaleString()}</p>
            </div>
            <div className="summary-card">
              <h4>Grand Total</h4>
              <p>₹{grandTotal.toLocaleString()}</p>
            </div>
          </div>
        );
      case 'payment-summary':
        const totalPayments = Array.isArray(reportData) ? reportData.length : 0;
        const totalPaid = Array.isArray(reportData) ? reportData.reduce((sum, payment) => sum + (parseFloat(payment.PaymentAmount) || 0), 0) : 0;
        return (
          <div className="summary-cards">
            <div className="summary-card">
              <h4>Total Payments</h4>
              <p>{totalPayments}</p>
            </div>
            <div className="summary-card">
              <h4>Total Amount Paid</h4>
              <p>₹{totalPaid.toLocaleString()}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="reports-form-container">
      <div className="reports-content-wrapper">
        <div className="form-header">
          <h1>📊 Reports & Analysis</h1>
          <p>View detailed reports and business analytics</p>
        </div>

        <div className="reports-container">
        <div className="tab-container">
          <div className="tab-buttons">
            <button 
              className={`tab-btn ${activeTab === 'daily-trips' ? 'active' : ''}`}
              onClick={() => setActiveTab('daily-trips')}
            >
              📅 Daily Trips
            </button>
            <button 
              className={`tab-btn ${activeTab === 'vehicle-utilization' ? 'active' : ''}`}
              onClick={() => setActiveTab('vehicle-utilization')}
            >
              🚛 Vehicle Utilization
            </button>
            <button 
              className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
              onClick={() => setActiveTab('revenue')}
            >
              💰 Revenue
            </button>
            <button 
              className={`tab-btn ${activeTab === 'gst-summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('gst-summary')}
            >
              📋 GST Summary
            </button>
            <button 
              className={`tab-btn ${activeTab === 'payment-summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('payment-summary')}
            >
              💳 Payment Summary
            </button>
          </div>

          <div className="filters-section">
            <h4>Filters</h4>
            <div className="filters-grid">
              <div className="filter-group">
                <label htmlFor="fromDate">From Date</label>
                <input
                  type="date"
                  id="fromDate"
                  name="fromDate"
                  value={filters.fromDate}
                  onChange={handleFilterChange}
                  max={filters.toDate || getCurrentDate()}
                />
              </div>
              <div className="filter-group">
                <label htmlFor="toDate">To Date</label>
                <input
                  type="date"
                  id="toDate"
                  name="toDate"
                  value={filters.toDate}
                  onChange={handleFilterChange}
                  min={filters.fromDate}
                  max={getCurrentDate()}
                />
              </div>
              <div className="filter-actions">
                <button onClick={fetchReportData} className="refresh-btn">
                  🔄 Refresh
                </button>
                <button onClick={exportToCSV} className="export-btn" disabled={!Array.isArray(reportData) || reportData.length === 0}>
                  📥 Export CSV
                </button>
              </div>
            </div>
          </div>

          {getSummaryCards()}

          <DataTable
            title={getReportTitle()}
            data={reportData}
            columns={getReportColumns()}
            keyField={getReportKeyField()}
            isLoading={isLoading}
            emptyMessage={`No ${activeTab.replace('-', ' ')} data found for the selected period.`}
            showActions={false}
          />
        </div>
      </div>
      </div>
    </div>
  );
};

export default ReportsForm;
