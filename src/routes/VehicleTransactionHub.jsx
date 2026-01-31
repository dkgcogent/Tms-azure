import React, { useState } from 'react';
import FixedTransactionForm from './FixedTransactionForm';
import AdhocTransactionForm from './AdhocTransactionForm';

const VehicleTransactionHub = () => {
  const [activeTab, setActiveTab] = useState('fixed');

  return (
    <div className="vehicle-transaction-hub">
      {/* Navigation Tabs */}
      <div className="transaction-tabs" style={{
        display: 'flex',
        borderBottom: '2px solid #e9ecef',
        marginBottom: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        <button
          className={`tab-button ${activeTab === 'fixed' ? 'active' : ''}`}
          onClick={() => setActiveTab('fixed')}
          style={{
            padding: '12px 24px',
            border: 'none',
            backgroundColor: activeTab === 'fixed' ? '#007bff' : 'transparent',
            color: activeTab === 'fixed' ? 'white' : '#007bff',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            borderRadius: '8px 8px 0 0',
            marginRight: '4px',
            transition: 'all 0.3s ease'
          }}
        >
          🚛 Fixed Transactions
        </button>
        
        <button
          className={`tab-button ${activeTab === 'adhoc' ? 'active' : ''}`}
          onClick={() => setActiveTab('adhoc')}
          style={{
            padding: '12px 24px',
            border: 'none',
            backgroundColor: activeTab === 'adhoc' ? '#28a745' : 'transparent',
            color: activeTab === 'adhoc' ? 'white' : '#28a745',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            borderRadius: '8px 8px 0 0',
            marginRight: '4px',
            transition: 'all 0.3s ease'
          }}
        >
          📋 Adhoc/Replacement Transactions
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'fixed' && (
          <div className="fixed-tab">
            <div className="tab-description" style={{
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196f3',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>
                🚛 Fixed Transactions
              </h4>
              <p style={{ margin: '0', color: '#1565c0', fontSize: '14px' }}>
                Use master data relationships with Customer, Project, Vehicle, Driver, and Vendor selections.
                Includes replacement driver fields for backup drivers.
              </p>
            </div>
            <FixedTransactionForm />
          </div>
        )}

        {activeTab === 'adhoc' && (
          <div className="adhoc-tab">
            <div className="tab-description" style={{
              backgroundColor: '#e8f5e8',
              border: '1px solid #4caf50',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#2e7d32' }}>
                📋 Adhoc/Replacement Transactions
              </h4>
              <p style={{ margin: '0', color: '#388e3c', fontSize: '14px' }}>
                Manual data entry for one-time or replacement transactions. Enter vehicle, vendor, and driver details manually.
                Includes comprehensive freight, expense, and payment tracking.
              </p>
            </div>
            <AdhocTransactionForm />
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="help-section" style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '8px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#856404' }}>
          💡 Quick Guide
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h5 style={{ margin: '0 0 8px 0', color: '#007bff' }}>Fixed Transactions</h5>
            <ul style={{ margin: '0', paddingLeft: '20px', color: '#6c757d', fontSize: '14px' }}>
              <li>Select from existing customers, projects, vehicles</li>
              <li>Choose drivers from master data</li>
              <li>Simpler form with essential fields</li>
              <li>Replacement driver support</li>
              <li>Ideal for regular, planned trips</li>
            </ul>
          </div>
          <div>
            <h5 style={{ margin: '0 0 8px 0', color: '#28a745' }}>Adhoc/Replacement</h5>
            <ul style={{ margin: '0', paddingLeft: '20px', color: '#6c757d', fontSize: '14px' }}>
              <li>Manual entry for all vehicle/driver details</li>
              <li>Comprehensive freight and expense tracking</li>
              <li>Payment management (advance/balance)</li>
              <li>Revenue and margin calculations</li>
              <li>Perfect for one-time or emergency trips</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tab-button:hover {
          opacity: 0.8;
          transform: translateY(-2px);
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 16px;
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
          color: #333;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }
        
        .form-group input.error,
        .form-group select.error {
          border-color: #dc3545;
        }
        
        .error-message {
          color: #dc3545;
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }
        
        .form-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #e9ecef;
        }
        
        .form-section h3 {
          margin: 0 0 20px 0;
          color: #495057;
          border-bottom: 2px solid #dee2e6;
          padding-bottom: 8px;
        }
        
        .master-section {
          background: linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%);
          border-color: #4caf50;
        }
        
        .transaction-section {
          background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
          border-color: #2196f3;
        }
        
        .form-actions {
          display: flex;
          gap: 12px;
          padding: 20px 0;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        .btn-primary {
          background-color: #007bff;
          color: white;
        }
        
        .btn-primary:hover {
          background-color: #0056b3;
          transform: translateY(-1px);
        }
        
        .btn-primary:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
          transform: none;
        }
        
        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover {
          background-color: #545b62;
          transform: translateY(-1px);
        }
        
        .vehicle-tag {
          transition: all 0.2s ease;
        }
        
        .vehicle-tag:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 8px rgba(0,123,255,0.4);
        }
        
        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .transaction-tabs {
            flex-direction: column;
          }
          
          .tab-button {
            border-radius: 4px;
            margin-bottom: 4px;
            margin-right: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default VehicleTransactionHub;
