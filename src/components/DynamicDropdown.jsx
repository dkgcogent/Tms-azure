import React, { useState, useEffect, useRef } from 'react';
import './DynamicDropdown.css';

const DynamicDropdown = ({
  name,
  value = '',
  onChange,
  label,
  required = false,
  disabled = false,
  placeholder = 'Select an option...',
  options = [],
  loading = false,
  error = null,
  className = '',
  searchable = true,
  onRefresh = null,
  emptyMessage = 'No options available'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Initialize filtered options and selected option
  useEffect(() => {
    setFilteredOptions(options);
    
    // Find selected option
    const selected = options.find(opt => opt.value == value);
    setSelectedOption(selected || null);
  }, [options, value]);

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (option.code && option.code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Handle option selection
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    setIsOpen(false);
    setSearchTerm('');
    
    // Call onChange with the selected value
    onChange({
      target: {
        name,
        value: option.value
      }
    });
  };

  // Handle dropdown toggle
  const handleToggle = () => {
    if (disabled) return;
    
    setIsOpen(!isOpen);
    
    // Focus search input when opening
    if (!isOpen && searchable) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Enter' && filteredOptions.length === 1) {
      handleOptionSelect(filteredOptions[0]);
    }
  };

  const hasError = error !== null;

  return (
    <div className={`dynamic-dropdown-container ${className}`} ref={dropdownRef}>
      <label className="dropdown-label">
        {label}
        {required && <span className="required-indicator">*</span>}
      </label>

      <div className={`dropdown-wrapper ${hasError ? 'error' : ''} ${disabled ? 'disabled' : ''}`}>
        {/* Selected Value Display */}
        <div 
          className={`dropdown-trigger ${isOpen ? 'open' : ''}`}
          onClick={handleToggle}
        >
          <div className="selected-value">
            {selectedOption ? (
              <div className="selected-option">
                <span className="option-label">{selectedOption.label}</span>
                {selectedOption.code && (
                  <span className="option-code">({selectedOption.code})</span>
                )}
              </div>
            ) : (
              <span className="placeholder">{placeholder}</span>
            )}
          </div>
          
          <div className="dropdown-icons">
            {loading && <span className="loading-icon">⏳</span>}
            {onRefresh && !loading && (
              <button
                type="button"
                className="refresh-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                title="Refresh options"
              >
                🔄
              </button>
            )}
            <span className={`dropdown-arrow ${isOpen ? 'up' : 'down'}`}>
              {isOpen ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {/* Dropdown Options */}
        {isOpen && (
          <div className="dropdown-options">
            {/* Search Input */}
            {searchable && (
              <div className="search-container">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Search options..."
                  className="search-input"
                />
                <span className="search-icon">🔍</span>
              </div>
            )}

            {/* Options List */}
            <div className="options-list">
              {loading ? (
                <div className="loading-state">
                  <span className="loading-icon">⏳</span>
                  <span>Loading options...</span>
                </div>
              ) : filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`dropdown-option ${selectedOption?.value == option.value ? 'selected' : ''}`}
                    onClick={() => handleOptionSelect(option)}
                  >
                    <div className="option-content">
                      <span className="option-label">{option.label}</span>
                      {option.code && (
                        <span className="option-code">({option.code})</span>
                      )}
                    </div>
                    {selectedOption?.value == option.value && (
                      <span className="selected-indicator">✓</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">📭</span>
                  <span>{emptyMessage}</span>
                  {onRefresh && (
                    <button
                      type="button"
                      className="refresh-empty-btn"
                      onClick={onRefresh}
                    >
                      🔄 Refresh
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="dropdown-error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Helper Text */}
      {!hasError && selectedOption && (
        <div className="dropdown-helper">
          <span className="helper-icon">ℹ️</span>
          Selected: {selectedOption.label}
        </div>
      )}
    </div>
  );
};

export default DynamicDropdown;
