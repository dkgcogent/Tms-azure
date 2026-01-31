import React from 'react';
import CustomerFormRefactored from './CustomerFormRefactored';

/**
 * Test component to verify the refactored customer form works correctly
 * This can be used for testing and comparison with the original form
 */
const CustomerFormTest = () => {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        backgroundColor: '#e3f2fd', 
        padding: '15px', 
        borderRadius: '5px', 
        marginBottom: '20px',
        border: '1px solid #2196f3'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
          🧪 Refactored Customer Form Test
        </h2>
        <p style={{ margin: 0, color: '#424242' }}>
          This is the refactored version of the customer form with improved structure and maintainability.
        </p>
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          <strong>Key Improvements:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            <li>Modular component structure</li>
            <li>Unified file upload handling</li>
            <li>Custom hook for state management</li>
            <li>Reusable form components</li>
            <li>Better code organization</li>
          </ul>
        </div>
      </div>
      
      <CustomerFormRefactored />
    </div>
  );
};

export default CustomerFormTest;
