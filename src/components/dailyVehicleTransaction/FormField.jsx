import React from 'react';
import SearchableDropdown from '../SearchableDropdown';
import DocumentUpload from '../DocumentUpload';
import TimeInput12Hour from '../TimeInput12Hour';

const FormField = ({ 
  label, 
  name, 
  type = 'text', 
  value, 
  onChange, 
  options = {}, 
  required = false, 
  error = null,
  className = '',
  style = {},
  readOnly = false,
  placeholder = '',
  step,
  maxLength,
  rows,
  accept,
  files = {},
  editingTransaction = null,
  customers = [],
  vehicles = [],
  drivers = [],
  vendors = [],
  projects = [],
  availableProjects = [],
  onSpecialChange,
  children
}) => {
  const baseProps = {
    name,
    value: value || '',
    onChange,
    className: `form-control ${error ? 'error' : ''} ${className}`,
    style,
    readOnly,
    placeholder,
    required
  };

  const renderInput = () => {
    switch (type) {
      case 'searchableDropdown':
        return (
          <SearchableDropdown
            name={name}
            value={value}
            onChange={onChange}
            options={options.data || []}
            valueKey={options.valueKey || 'id'}
            labelKey={options.labelKey || 'name'}
            formatLabel={options.formatLabel}
            placeholder={placeholder}
            searchPlaceholder={options.searchPlaceholder || 'Search...'}
            emptyLabel={options.emptyLabel || 'Select option'}
            allowEmpty={options.allowEmpty !== false}
            required={required}
            error={error}
          />
        );

      case 'customerDropdown':
        return (
          <SearchableDropdown
            name={name}
            value={value}
            onChange={onSpecialChange || onChange}
            options={customers}
            valueKey="CustomerID"
            labelKey="Name"
            formatLabel={(customer) => customer.Name || customer.MasterCustomerName || `Customer ${customer.CustomerID}`}
            placeholder="Select Company"
            searchPlaceholder="Search companies..."
            emptyLabel="Select Company"
            required={required}
            error={error}
          />
        );

      case 'vehicleDropdown':
        return (
          <SearchableDropdown
            name={name}
            value={value}
            onChange={onSpecialChange || onChange}
            options={vehicles}
            valueKey="VehicleID"
            labelKey="VehicleRegistrationNo"
            placeholder="Select Vehicle"
            searchPlaceholder="Search vehicles..."
            emptyLabel="Select Vehicle"
            required={required}
            error={error}
          />
        );

      case 'driverDropdown':
        return (
          <SearchableDropdown
            name={name}
            value={value}
            onChange={onSpecialChange || onChange}
            options={drivers}
            valueKey="DriverID"
            labelKey="DriverName"
            placeholder="Select Driver"
            searchPlaceholder="Search drivers..."
            emptyLabel="Select Driver"
            allowEmpty={true}
            required={required}
            error={error}
          />
        );

      case 'projectDropdown':
        return (
          <SearchableDropdown
            name={name}
            value={value}
            onChange={onSpecialChange || onChange}
            options={availableProjects}
            valueKey="ProjectID"
            labelKey="ProjectName"
            placeholder="Select a project"
            required={required}
            error={error}
          />
        );

      case 'timeInput':
        return (
          <TimeInput12Hour
            name={name}
            value={value}
            onChange={onChange}
          />
        );

      case 'documentUpload':
        return (
          <DocumentUpload
            label={options.uploadLabel || ''}
            name={name}
            value={files[name]}
            onChange={options.onFileChange}
            accept={accept || '.pdf,.jpg,.jpeg,.png'}
            required={required}
            existingFileUrl={editingTransaction?.[`${name}_url`] || null}
            entityType={options.entityType || 'transactions'}
            maxFileSize={options.maxFileSize || 20 * 1024 * 1024} // Default 20MB (increased for large PDF documents)
          />
        );

      case 'select':
        return (
          <select {...baseProps}>
            <option value="">{placeholder || `Select ${label}`}</option>
            {(options.values || []).map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            {...baseProps}
            rows={rows || 3}
          />
        );

      case 'checkbox':
        return (
          <div className="checkbox-wrapper">
            <input
              type="checkbox"
              name={name}
              checked={!!value}
              onChange={onChange}
              className={error ? 'error' : ''}
              required={required}
            />
            {children && <span className="checkbox-label">{children}</span>}
          </div>
        );

      case 'number':
        return (
          <input
            {...baseProps}
            type="number"
            step={step || '0.01'}
          />
        );

      case 'date':
        return (
          <input
            {...baseProps}
            type="date"
          />
        );

      case 'readonly':
        return (
          <input
            {...baseProps}
            className={`readonly-field ${className}`}
            readOnly={true}
          />
        );

      case 'calculated':
        return (
          <input
            {...baseProps}
            className={`readonly-field calculated-field ${className}`}
            style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', ...style }}
            readOnly={true}
          />
        );

      default:
        return (
          <input
            {...baseProps}
            type={type}
            maxLength={maxLength}
          />
        );
    }
  };

  return (
    <div className={`form-group ${options.fullWidth ? 'full-width' : ''}`}>
      {label && (
        <label>
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {renderInput()}
      {error && <span className="error-message">{error}</span>}
      {options.helpText && <small className="help-text">{options.helpText}</small>}
    </div>
  );
};

export default FormField;
