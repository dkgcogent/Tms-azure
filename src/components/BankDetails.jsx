import React, { useState, useEffect } from 'react';
import ValidatedInput from './ValidatedInput';
import './BankDetails.css';

const BankDetails = ({
  bankData,
  onBankDataChange,
  errors = {},
  required = false,
  title = "Bank Details",
  prefix = "",
  showTitle = true,
  enableAutoFill = true
}) => {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupStatus, setLookupStatus] = useState(null);
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());

  // Generate field names with prefix if provided
  const getFieldName = (field) => prefix ? `${prefix}_${field}` : field;

  // Handle input changes and propagate to parent
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Remove prefix from field name for internal state
    const fieldName = prefix ? name.replace(`${prefix}_`, '') : name;

    const updatedBankData = {
      ...bankData,
      [fieldName]: value
    };

    // If user manually edits an auto-filled field, remove it from auto-filled set
    if (autoFilledFields.has(fieldName) && fieldName !== 'ifsc_code') {
      const newAutoFilledFields = new Set(autoFilledFields);
      newAutoFilledFields.delete(fieldName);
      setAutoFilledFields(newAutoFilledFields);
    }

    onBankDataChange(updatedBankData);

    // Trigger IFSC lookup when IFSC code is entered
    if (fieldName === 'ifsc_code' && enableAutoFill) {
      handleIFSCLookup(value);
    }
  };

  // IFSC lookup function
  const handleIFSCLookup = async (ifscCode) => {
    if (!ifscCode || ifscCode.length !== 11) {
      setLookupStatus(null);
      return;
    }

    setIsLookingUp(true);
    setLookupStatus(null);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004';
      const response = await fetch(`${API_BASE_URL}/api/ifsc/${ifscCode}`);
      const result = await response.json();

      if (result.success && result.data) {
        const { data } = result;

        // Auto-fill bank details
        const autoFilledData = {
          ...bankData,
          ifsc_code: ifscCode,
          bank_name: data.bank || '',
          branch_name: data.branch || '',
          branch_address: data.address || '',
          city: data.city || '',
          state: data.state || ''
        };

        // Track which fields were auto-filled
        const newAutoFilledFields = new Set(['bank_name', 'branch_name', 'branch_address', 'city', 'state']);
        setAutoFilledFields(newAutoFilledFields);

        onBankDataChange(autoFilledData);
        setLookupStatus({
          type: 'success',
          message: `✅ Bank details auto-filled for ${data.bank}`,
          source: data.source
        });
      } else {
        setLookupStatus({
          type: 'error',
          message: result.error || 'IFSC code not found'
        });
      }
    } catch (error) {

      setLookupStatus({
        type: 'error',
        message: 'Unable to lookup IFSC details. Please enter manually.'
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  // Get field value with prefix handling
  const getFieldValue = (field) => {
    return bankData[field] || '';
  };

  // Check if any bank detail field has an error
  const hasErrors = () => {
    const bankFields = ['account_holder_name', 'account_number', 'ifsc_code', 'bank_name', 'branch_name'];
    return bankFields.some(field => {
      const fieldName = getFieldName(field);
      return errors[fieldName];
    });
  };

  // Get field class name with auto-fill indication
  const getFieldClassName = (field) => {
    let className = '';
    if (autoFilledFields.has(field)) {
      className += ' auto-filled';
    }
    return className;
  };

  return (
    <div className="bank-details-container">
      {showTitle && (
        <div className="bank-details-header">
          <h4 className="bank-details-title">
            🏦 {title}
            {required && <span className="required-indicator">*</span>}
          </h4>
          <div className="bank-details-subtitle">
            Enter IFSC code for auto-fill or complete details manually
          </div>
        </div>
      )}

      {/* IFSC Lookup Status */}
      {lookupStatus && (
        <div className={`lookup-status ${lookupStatus.type}`}>
          <span className="status-message">{lookupStatus.message}</span>
          {lookupStatus.source && (
            <span className="status-source">Source: {lookupStatus.source}</span>
          )}
        </div>
      )}

      <div className={`bank-details-grid ${hasErrors() ? 'has-errors' : ''}`}>
        {/* Account Holder Name */}
        <div className="bank-field">
          <ValidatedInput
            name={getFieldName('account_holder_name')}
            value={getFieldValue('account_holder_name')}
            onChange={handleInputChange}
            validationRule="ACCOUNT_HOLDER_NAME"
            required={required}
            label="Account Holder Name"
            placeholder="Enter account holder name"
            showFormatHint={false}
            autoFormat={true}
          />
        </div>

        {/* Account Number */}
        <div className="bank-field">
          <ValidatedInput
            name={getFieldName('account_number')}
            value={getFieldValue('account_number')}
            onChange={handleInputChange}
            validationRule="ACCOUNT_NUMBER"
            required={required}
            label="Account Number"
            placeholder="Enter 9-18 digit account number"
            showFormatHint={true}
            autoFormat={true}
          />
        </div>

        {/* IFSC Code with Auto-lookup */}
        <div className="bank-field">
          <div className="ifsc-field-container">
            <ValidatedInput
              name={getFieldName('ifsc_code')}
              value={getFieldValue('ifsc_code')}
              onChange={handleInputChange}
              validationRule="IFSC_CODE"
              required={required}
              label="IFSC Code"
              placeholder="Enter IFSC code"
              showFormatHint={true}
              autoFormat={true}
              className={getFieldClassName('ifsc_code')}
            />
            {isLookingUp && (
              <div className="lookup-indicator">
                <span className="spinner">🔄</span>
                <span>Looking up...</span>
              </div>
            )}
          </div>
        </div>

        {/* Bank Name */}
        <div className="bank-field">
          <ValidatedInput
            name={getFieldName('bank_name')}
            value={getFieldValue('bank_name')}
            onChange={handleInputChange}
            validationRule="BANK_NAME"
            required={required}
            label={`Bank Name ${autoFilledFields.has('bank_name') ? '✨' : ''}`}
            placeholder="Enter bank name"
            showFormatHint={false}
            autoFormat={true}
            className={getFieldClassName('bank_name')}
          />
        </div>

        {/* Branch Name */}
        <div className="bank-field">
          <ValidatedInput
            name={getFieldName('branch_name')}
            value={getFieldValue('branch_name')}
            onChange={handleInputChange}
            validationRule="BRANCH_NAME"
            required={required}
            label={`Branch Name ${autoFilledFields.has('branch_name') ? '✨' : ''}`}
            placeholder="Enter branch name"
            showFormatHint={false}
            autoFormat={true}
            className={getFieldClassName('branch_name')}
          />
        </div>

        {/* Branch Address (Optional) */}
        <div className="bank-field full-width">
          <div className="form-field">
            <label className="form-field-label">
              Branch Address
              {autoFilledFields.has('branch_address') && (
                <span className="auto-filled-indicator">✨ Auto-filled</span>
              )}
            </label>
            <textarea
              name={getFieldName('branch_address')}
              value={getFieldValue('branch_address')}
              onChange={handleInputChange}
              placeholder="Branch address (auto-filled from IFSC)"
              rows={2}
              className={`bank-textarea ${getFieldClassName('branch_address')}`}
            />
          </div>
        </div>
      </div>




    </div>
  );
};

export default BankDetails;
