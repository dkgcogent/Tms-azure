import React, { useState, useEffect, useRef } from 'react';
import './SearchableDropdown.css';

const SearchableDropdown = ({
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
  searchPlaceholder = 'Search...',
}) => {
  const [loading, setLoading] = useState(false);
  const [apiOptions, setApiOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

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
    
    // Try multiple possible label fields based on actual database structure
    return option[labelKey] || 
           option.Name ||                    // Customer table uses 'Name'
           option.CustomerName || 
           option.ProjectName || 
           option.DriverName || 
           option.VehicleRegistrationNo ||   // Vehicle table uses 'VehicleRegistrationNo'
           option.VehicleNumber ||
           option.vehicle_number ||          // New vehicles table uses 'vehicle_number'
           option.VendorName || 
           option.name || 
           option.label || 
           `Item ${option.id || option.CustomerID || option.ProjectID || option.DriverID || option.VehicleID || 'Unknown'}`;
  };

  // Get option value
  const getOptionValue = (option) => {
    if (typeof option === 'string') {
      return option;
    }
    
    // Try multiple possible value fields based on actual database structure
    return option[valueKey] || 
           option.CustomerID ||     // Customer table uses 'CustomerID'
           option.ProjectID ||      // Project table uses 'ProjectID'
           option.DriverID ||       // Driver table uses 'DriverID'
           option.VehicleID ||      // Old Vehicle table uses 'VehicleID'
           option.vehicle_id ||     // New vehicles table uses 'vehicle_id'
           option.VendorID || 
           option.id || 
           option.value;
  };

  // Filter options based on search term
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredOptions(finalOptions);
    } else {
      const filtered = finalOptions.filter(option =>
        getOptionLabel(option).toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, finalOptions]);

  // Set selected label when value changes
  useEffect(() => {
    if (value && finalOptions.length > 0) {
      const selectedOption = finalOptions.find(
        option => getOptionValue(option)?.toString() === value?.toString()
      );
      if (selectedOption) {
        setSelectedLabel(getOptionLabel(selectedOption));
      }
    } else {
      setSelectedLabel('');
    }
  }, [value, finalOptions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    if (!disabled && !loading) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => {
          searchRef.current?.focus();
        }, 100);
      }
    }
  };

  const handleOptionSelect = (option) => {
    const optionValue = getOptionValue(option);
    const optionLabel = getOptionLabel(option);
    
    setSelectedLabel(optionLabel);
    setIsOpen(false);
    setSearchTerm('');

    if (onChange) {
      onChange({
        target: {
          name,
          value: optionValue,
          selectedOption: option,
        }
      });
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedLabel('');
    setSearchTerm('');
    
    if (onChange) {
      onChange({
        target: {
          name,
          value: '',
          selectedOption: null,
        }
      });
    }
  };

  const displayValue = selectedLabel || (loading ? 'Loading...' : emptyLabel);

  return (
    <div className={`searchable-dropdown-container ${className}`} ref={dropdownRef}>
      <div 
        className={`searchable-dropdown ${isOpen ? 'open' : ''} ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleToggle}
      >
        <div className="dropdown-display">
          <span className={`dropdown-text ${!selectedLabel ? 'placeholder' : ''}`}>
            {displayValue}
          </span>
          <div className="dropdown-actions">
            {selectedLabel && !disabled && (
              <button
                type="button"
                className="clear-button"
                onClick={handleClear}
                aria-label="Clear selection"
              >
                ✕
              </button>
            )}
            <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
              ▼
            </span>
          </div>
        </div>

        {isOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-search">
              <input
                ref={searchRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="dropdown-options">
              {loading ? (
                <div className="dropdown-option loading">
                  <span className="loading-spinner">⟳</span>
                  Loading...
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="dropdown-option no-results">
                  {searchTerm ? 'No results found' : 'No options available'}
                </div>
              ) : (
                <>
                  {allowEmpty && (
                    <div
                      className={`dropdown-option ${!value ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOptionSelect(null);
                      }}
                    >
                      {emptyLabel}
                    </div>
                  )}
                  {(() => {
                    const seen = new Set();
                    const uniqueOptions = (filteredOptions || []).filter((opt) => {
                      const val = (getOptionValue(opt)?.toString() ?? '');
                      if (seen.has(val)) return false;
                      seen.add(val);
                      return true;
                    });
                    return uniqueOptions.map((option, index) => {
                      const optionValue = getOptionValue(option);
                      const optionLabel = getOptionLabel(option);
                      const isSelected = value?.toString() === optionValue?.toString();
                      const safeKey = `${name}-${optionValue ?? `idx-${index}`}`;
                      return (
                        <div
                          key={safeKey}
                          className={`dropdown-option ${isSelected ? 'selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect(option);
                          }}
                        >
                          {optionLabel}
                        </div>
                      );
                    });
                  })()}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {error && <span className="dropdown-error">{error}</span>}
    </div>
  );
};

export default SearchableDropdown;
