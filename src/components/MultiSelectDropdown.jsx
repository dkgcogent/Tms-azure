import React, { useState, useRef, useEffect } from 'react';
import './MultiSelectDropdown.css';

const MultiSelectDropdown = ({
  name,
  value = [],
  onChange,
  options = [],
  valueKey = 'id',
  labelKey = 'name',
  formatLabel,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search...',
  required = false,
  error = '',
  disabled = false,
  maxHeight = '200px',
  showSearch = true,
  allowSelectAll = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Convert value to array if it's not already
  const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    const label = formatLabel ? formatLabel(option) : option[labelKey];
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchTerm('');
    }
  };

  const handleOptionClick = (option) => {
    const optionValue = option[valueKey];
    let newValue;

    if (selectedValues.includes(optionValue)) {
      // Remove from selection
      newValue = selectedValues.filter(val => val !== optionValue);
    } else {
      // Add to selection
      newValue = [...selectedValues, optionValue];
    }

    // Create synthetic event
    const syntheticEvent = {
      target: {
        name,
        value: newValue
      }
    };

    onChange(syntheticEvent);
  };

  const handleSelectAll = () => {
    const allValues = filteredOptions.map(option => option[valueKey]);
    const syntheticEvent = {
      target: {
        name,
        value: selectedValues.length === allValues.length ? [] : allValues
      }
    };
    onChange(syntheticEvent);
  };

  const handleClearAll = () => {
    const syntheticEvent = {
      target: {
        name,
        value: []
      }
    };
    onChange(syntheticEvent);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }

    if (selectedValues.length === 1) {
      const selectedOption = options.find(opt => opt[valueKey] === selectedValues[0]);
      if (selectedOption) {
        return formatLabel ? formatLabel(selectedOption) : selectedOption[labelKey];
      }
    }

    return `${selectedValues.length} selected`;
  };

  const isAllSelected = filteredOptions.length > 0 && 
    filteredOptions.every(option => selectedValues.includes(option[valueKey]));

  return (
    <div className={`multi-select-dropdown ${disabled ? 'disabled' : ''} ${error ? 'error' : ''}`} ref={dropdownRef}>
      <div className="multi-select-trigger" onClick={handleToggleDropdown}>
        <span className={`multi-select-text ${selectedValues.length === 0 ? 'placeholder' : ''}`}>
          {getDisplayText()}
        </span>
        <span className={`multi-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>

      {isOpen && (
        <div className="multi-select-dropdown-menu" style={{ maxHeight }}>
          {showSearch && (
            <div className="multi-select-search">
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {allowSelectAll && filteredOptions.length > 1 && (
            <div className="multi-select-actions">
              <button
                type="button"
                className="multi-select-action-btn"
                onClick={handleSelectAll}
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
              {selectedValues.length > 0 && (
                <button
                  type="button"
                  className="multi-select-action-btn clear"
                  onClick={handleClearAll}
                >
                  Clear All
                </button>
              )}
            </div>
          )}

          <div className="multi-select-options">
            {filteredOptions.length === 0 ? (
              <div className="multi-select-no-options">
                {searchTerm ? 'No matching options' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const optionValue = option[valueKey];
                const isSelected = selectedValues.includes(optionValue);
                const label = formatLabel ? formatLabel(option) : option[labelKey];

                return (
                  <div
                    key={optionValue}
                    className={`multi-select-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleOptionClick(option)}
                  >
                    <div className="multi-select-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent click
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <span className="multi-select-label">{label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <div className="multi-select-error">{error}</div>}
    </div>
  );
};

export default MultiSelectDropdown;
