import React, { useState, useEffect } from 'react';
import './Dropdown.css';

const Dropdown = ({
  label,
  name,
  value,
  onChange,
  options = [],
  apiCall,
  valueKey = 'id',
  labelKey = 'name',
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  error = '',
  className = '',
  allowEmpty = true,
  emptyLabel = 'Select...',
  formatLabel,
}) => {
  const [loading, setLoading] = useState(false);
  const [apiOptions, setApiOptions] = useState([]);

  // Fetch options from API if apiCall is provided
  useEffect(() => {
    if (apiCall) {
      fetchOptions();
    }
  }, [apiCall]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const response = await apiCall();
      setApiOptions(response.data || []);
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      setApiOptions([]);
    } finally {
      setLoading(false);
    }
  };

  // Use API options if available, otherwise use provided options
  const finalOptions = apiCall ? apiOptions : options;

  // Format option label
  const getOptionLabel = (option) => {
    if (formatLabel) {
      return formatLabel(option);
    }
    
    if (typeof option === 'string') {
      return option;
    }
    
    return option[labelKey] || option.name || option.label || 'Unknown';
  };

  // Get option value
  const getOptionValue = (option) => {
    if (typeof option === 'string') {
      return option;
    }
    
    return option[valueKey] || option.id || option.value || '';
  };

  const handleChange = (e) => {
    const selectedValue = e.target.value;
    
    if (onChange) {
      // Find the full option object
      const selectedOption = finalOptions.find(
        option => getOptionValue(option).toString() === selectedValue
      );
      
      onChange({
        target: {
          name,
          value: selectedValue,
          selectedOption,
        }
      });
    }
  };

  return (
    <div className={`dropdown-container ${className}`}>
      {label && (
        <label htmlFor={name} className="dropdown-label">
          {label}
          {required && <span className="required-asterisk">*</span>}
        </label>
      )}
      
      <div className="dropdown-wrapper">
        <select
          id={name}
          name={name}
          value={value || ''}
          onChange={handleChange}
          disabled={disabled || loading}
          required={required}
          className={`dropdown-select ${error ? 'error' : ''}`}
        >
          {allowEmpty && (
            <option value="">
              {loading ? 'Loading...' : emptyLabel}
            </option>
          )}
          
          {finalOptions.map((option, index) => {
            const optionValue = getOptionValue(option);
            const optionLabel = getOptionLabel(option);
            
            return (
              <option key={optionValue || index} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </select>
        
        {loading && (
          <div className="dropdown-loading">
            <span className="loading-spinner">⟳</span>
          </div>
        )}
      </div>
      
      {error && <span className="dropdown-error">{error}</span>}
    </div>
  );
};

export default Dropdown;
