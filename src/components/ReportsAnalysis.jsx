import React, { useState, useEffect } from 'react';
import './ReportsAnalysis.css';

const API_BASE_URL = 'http://localhost:3002/api';

const ReportsAnalysis = () => {
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        summary: {},
        vehicleStats: {},
        projectStats: {},
        revenueStats: {},
        performanceMetrics: {}
    });
    const [selectedDateRange, setSelectedDateRange] = useState('30');
    const [selectedReport, setSelectedReport] = useState('overview');

    useEffect(() => {
        loadDashboardData();
    }, [selectedDateRange]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // Load all dashboard data in parallel
            const [
                summaryResponse,
                vehicleResponse,
                projectResponse,
                revenueResponse,
                performanceResponse
            ] = await Promise.all([
                fetch(`${API_BASE_URL}/reports/summary?days=${selectedDateRange}`),
                fetch(`${API_BASE_URL}/reports/vehicles?days=${selectedDateRange}`),
                fetch(`${API_BASE_URL}/reports/projects?days=${selectedDateRange}`),
                fetch(`${API_BASE_URL}/reports/revenue?days=${selectedDateRange}`),
                fetch(`${API_BASE_URL}/reports/performance?days=${selectedDateRange}`)
            ]);

            const [summary, vehicles, projects, revenue, performance] = await Promise.all([
                summaryResponse.json(),
                vehicleResponse.json(),
                projectResponse.json(),
                revenueResponse.json(),
                performanceResponse.json()
            ]);

            setDashboardData({
                summary: summary.data || {},
                vehicleStats: vehicles.data || {},
                projectStats: projects.data || {},
                revenueStats: revenue.data || {},
                performanceMetrics: performance.data || {}
            });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-IN').format(num || 0);
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'active': return '#28a745';
            case 'completed': return '#007bff';
            case 'pending': return '#ffc107';
            case 'cancelled': return '#dc3545';
            default: return '#6c757d';
        }
    };

    if (loading) {
        return (
            <div className="reports-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading Reports & Analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reports-container">
            {/* Header */}
            <div className="reports-header">
                <div className="header-content">
                    <h1>📊 Reports & Analysis</h1>
                    <p>View detailed reports and business analytics with live data</p>
                </div>
                
                <div className="header-controls">
                    <select 
                        value={selectedDateRange} 
                        onChange={(e) => setSelectedDateRange(e.target.value)}
                        className="date-range-select"
                    >
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="365">Last Year</option>
                    </select>
                    
                    <button onClick={loadDashboardData} className="refresh-btn">
                        🔄 Refresh Data
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="report-tabs">
                <button 
                    className={selectedReport === 'overview' ? 'tab active' : 'tab'}
                    onClick={() => setSelectedReport('overview')}
                >
                    📈 Overview
                </button>
                <button 
                    className={selectedReport === 'vehicles' ? 'tab active' : 'tab'}
                    onClick={() => setSelectedReport('vehicles')}
                >
                    🚛 Vehicles
                </button>
                <button 
                    className={selectedReport === 'projects' ? 'tab active' : 'tab'}
                    onClick={() => setSelectedReport('projects')}
                >
                    📋 Projects
                </button>
                <button 
                    className={selectedReport === 'financial' ? 'tab active' : 'tab'}
                    onClick={() => setSelectedReport('financial')}
                >
                    💰 Financial
                </button>
                <button 
                    className={selectedReport === 'performance' ? 'tab active' : 'tab'}
                    onClick={() => setSelectedReport('performance')}
                >
                    ⚡ Performance
                </button>
            </div>

            {/* Overview Tab */}
            {selectedReport === 'overview' && (
                <div className="report-content">
                    {/* Key Metrics Cards */}
                    <div className="metrics-grid">
                        <div className="metric-card">
                            <div className="metric-icon">🚛</div>
                            <div className="metric-content">
                                <h3>{formatNumber(dashboardData.summary.totalVehicles)}</h3>
                                <p>Total Vehicles</p>
                                <span className="metric-change positive">
                                    +{dashboardData.summary.vehicleGrowth || 0}% this month
                                </span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">📋</div>
                            <div className="metric-content">
                                <h3>{formatNumber(dashboardData.summary.activeProjects)}</h3>
                                <p>Active Projects</p>
                                <span className="metric-change positive">
                                    {dashboardData.summary.completedProjects || 0} completed
                                </span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">🎯</div>
                            <div className="metric-content">
                                <h3>{formatNumber(dashboardData.summary.totalAssignments)}</h3>
                                <p>Vehicle Assignments</p>
                                <span className="metric-change neutral">
                                    {dashboardData.summary.activeAssignments || 0} active
                                </span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">💰</div>
                            <div className="metric-content">
                                <h3>{formatCurrency(dashboardData.summary.totalRevenue)}</h3>
                                <p>Total Revenue</p>
                                <span className="metric-change positive">
                                    +{dashboardData.summary.revenueGrowth || 0}% vs last period
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="stats-section">
                        <h2>📊 Quick Statistics</h2>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="stat-label">Vehicle Utilization</span>
                                <div className="stat-bar">
                                    <div 
                                        className="stat-fill" 
                                        style={{ width: `${dashboardData.summary.vehicleUtilization || 0}%` }}
                                    ></div>
                                </div>
                                <span className="stat-value">{dashboardData.summary.vehicleUtilization || 0}%</span>
                            </div>

                            <div className="stat-item">
                                <span className="stat-label">Project Completion Rate</span>
                                <div className="stat-bar">
                                    <div 
                                        className="stat-fill success" 
                                        style={{ width: `${dashboardData.summary.completionRate || 0}%` }}
                                    ></div>
                                </div>
                                <span className="stat-value">{dashboardData.summary.completionRate || 0}%</span>
                            </div>

                            <div className="stat-item">
                                <span className="stat-label">Customer Satisfaction</span>
                                <div className="stat-bar">
                                    <div 
                                        className="stat-fill warning" 
                                        style={{ width: `${dashboardData.summary.customerSatisfaction || 0}%` }}
                                    ></div>
                                </div>
                                <span className="stat-value">{dashboardData.summary.customerSatisfaction || 0}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vehicles Tab */}
            {selectedReport === 'vehicles' && (
                <div className="report-content">
                    <h2>🚛 Vehicle Analytics</h2>
                    
                    <div className="vehicle-stats-grid">
                        <div className="stat-card">
                            <h3>Vehicle Status Distribution</h3>
                            <div className="status-list">
                                <div className="status-item">
                                    <span className="status-dot" style={{ backgroundColor: getStatusColor('active') }}></span>
                                    <span>Active: {dashboardData.vehicleStats.active || 0}</span>
                                </div>
                                <div className="status-item">
                                    <span className="status-dot" style={{ backgroundColor: getStatusColor('maintenance') }}></span>
                                    <span>Maintenance: {dashboardData.vehicleStats.maintenance || 0}</span>
                                </div>
                                <div className="status-item">
                                    <span className="status-dot" style={{ backgroundColor: getStatusColor('inactive') }}></span>
                                    <span>Inactive: {dashboardData.vehicleStats.inactive || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <h3>Vehicle Types</h3>
                            <div className="type-list">
                                {Object.entries(dashboardData.vehicleStats.types || {}).map(([type, count]) => (
                                    <div key={type} className="type-item">
                                        <span className="type-name">{type}</span>
                                        <span className="type-count">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add more tabs content here... */}
        </div>
    );
};

export default ReportsAnalysis;
