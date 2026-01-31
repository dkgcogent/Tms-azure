import React, { useState, useEffect } from 'react';
import './DateInput.css';

const DateInput = ({
  name,
  value = '',
  onChange,
  label,
  required = false,
  disabled = false,
  placeholder = 'DDMMYYYY',
  maxDate = null, // 'today' or specific date
  minDate = null,
  error = null,
  className = '',
  showFormatHint = true
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [validationError, setValidationError] = useState('');

  // Initialize input value
  useEffect(() => {
    if (value) {
      // Convert from various formats to DDMMYYYY
      const formatted = formatToDisplay(value);
      setInputValue(formatted);
    }
  }, [value]);

  // Format date for display (DDMMYYYY)
  const formatToDisplay = (dateValue) => {
    if (!dateValue) return '';
    
    // If already in DDMMYYYY format
    if (/^\d{8}$/.test(dateValue)) {
      return dateValue;
    }
    
    // If in YYYY-MM-DD format (from database)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const [year, month, day] = dateValue.split('-');
      return `${day}${month}${year}`;
    }
    
    // If Date object
    if (dateValue instanceof Date) {
      const day = String(dateValue.getDate()).padStart(2, '0');
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const year = dateValue.getFullYear();
      return `${day}${month}${year}`;
    }
    
    return dateValue;
  };

  // Convert DDMMYYYY to YYYY-MM-DD for database
  const formatForDatabase = (ddmmyyyy) => {
    if (!ddmmyyyy || ddmmyyyy.length !== 8) return '';
    
    const day = ddmmyyyy.substring(0, 2);
    const month = ddmmyyyy.substring(2, 4);
    const year = ddmmyyyy.substring(4, 8);
    
    return `${year}-${month}-${day}`;
  };

  // Validate date format and constraints
  const validateDate = (dateString) => {
    // Check format (exactly 8 digits)
    if (!/^\d{8}$/.test(dateString)) {
      return { isValid: false, error: 'Date must be exactly 8 digits (DDMMYYYY)' };
    }

    const day = parseInt(dateString.substring(0, 2));
    const month = parseInt(dateString.substring(2, 4));
    const year = parseInt(dateString.substring(4, 8));

    // Check valid ranges
    if (day < 1 || day > 31) {
      return { isValid: false, error: 'Day must be between 01 and 31' };
    }
    
    if (month < 1 || month > 12) {
      return { isValid: false, error: 'Month must be between 01 and 12' };
    }
    
    if (year < 1900 || year > 2100) {
      return { isValid: false, error: 'Year must be between 1900 and 2100' };
    }

    // Create date object to check validity
    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getDate() !== day || dateObj.getMonth() !== month - 1 || dateObj.getFullYear() !== year) {
      return { isValid: false, error: 'Invalid date (e.g., 31st February)' };
    }

    // Check max date constraint
    if (maxDate === 'today') {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      if (dateObj > today) {
        return { isValid: false, error: 'Date cannot be in the future' };
      }
    } else if (maxDate) {
      const maxDateObj = new Date(maxDate);
      if (dateObj > maxDateObj) {
        return { isValid: false, error: `Date cannot be after ${formatToDisplay(maxDate)}` };
      }
    }

    // Check min date constraint
    if (minDate) {
      const minDateObj = new Date(minDate);
      if (dateObj < minDateObj) {
        return { isValid: false, error: `Date cannot be before ${formatToDisplay(minDate)}` };
      }
    }

    return { isValid: true, error: null };
  };

  // Handle input change with real-time validation
  const handleInputChange = (e) => {
    let value = e.target.value;
    
    // Remove non-numeric characters
    value = value.replace(/\D/g, '');
    
    // Limit to 8 digits
    if (value.length > 8) {
      value = value.substring(0, 8);
    }
    
    setInputValue(value);

    // Validate if complete
    if (value.length === 8) {
      const validation = validateDate(value);
      setIsValid(validation.isValid);
      setValidationError(validation.error || '');
      
      if (validation.isValid) {
        // Convert to database format and call onChange
        const dbFormat = formatForDatabase(value);
        onChange({ target: { name, value: dbFormat } });
      }
    } else if (value.length === 0) {
      // Empty field
      setIsValid(true);
      setValidationError('');
      onChange({ target: { name, value: '' } });
    } else {
      // Incomplete input
      setIsValid(false);
      setValidationError('');
    }
  };

  // Handle blur event for final validation
  const handleBlur = () => {
    if (inputValue && inputValue.length !== 8) {
      setIsValid(false);
      setValidationError('Date must be exactly 8 digits (DDMMYYYY)');
    }
  };

  // Format display value with separators for better readability
  const getDisplayValue = () => {
    if (inputValue.length >= 2) {
      let formatted = inputValue.substring(0, 2);
      if (inputValue.length >= 4) {
        formatted += '/' + inputValue.substring(2, 4);
        if (inputValue.length >= 8) {
          formatted += '/' + inputValue.substring(4, 8);
        } else if (inputValue.length > 4) {
          formatted += '/' + inputValue.substring(4);
        }
      } else if (inputValue.length > 2) {
        formatted += '/' + inputValue.substring(2);
      }
      return formatted;
    }
    return inputValue;
  };

  const hasError = error || validationError || !isValid;
  const errorMessage = error || validationError;

  return (
    <div className={`date-input-container ${className}`}>
      <label className="date-input-label">
        {label}
        {required && <span className="required-indicator">*</span>}
      </label>
      
      <div className="date-input-wrapper">
        <input
          type="text"
          name={name}
          value={getDisplayValue()}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`date-input ${hasError ? 'error' : ''} ${isValid && inputValue.length === 8 ? 'valid' : ''}`}
          maxLength={10} // Account for separators
        />
        
        {showFormatHint && (
          <div className="format-hint">
            <span className="hint-text">Format: DD/MM/YYYY</span>
            {inputValue.length > 0 && inputValue.length < 8 && (
              <span className="progress-indicator">
                {inputValue.length}/8 digits
              </span>
            )}
          </div>
        )}
      </div>

      {hasError && (
        <div className="date-error-message">
          <span className="error-icon">⚠️</span>
          {errorMessage}
        </div>
      )}

      {isValid && inputValue.length === 8 && (
        <div className="date-success-message">
          <span className="success-icon">✅</span>
          Valid date format
        </div>
      )}
    </div>
  );
};

export default DateInput;
