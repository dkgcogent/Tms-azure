import React from 'react';
import Dropdown from '../Dropdown';
import MultiSelectDropdown from '../MultiSelectDropdown';

const FormField = ({ label, name, type = 'text', value, onChange, options = {}, required = false, error = null, customers = [], locations = [], isSubmitting = false, projectData = {}, handleCustomerChange, handleLocationChange }) => {
  const { placeholder, readOnly } = options;
  const id = `project-${name}`;
  const commonProps = { id, name, value: value || '', onChange, required, className: error ? 'error' : '', disabled: isSubmitting };

  const renderInput = () => {
    switch (name) {
      case 'CustomerID':
        return <Dropdown name={name} value={value} onChange={handleCustomerChange} options={customers} valueKey="CustomerID" labelKey="Name" formatLabel={(customer) => `${customer.Name} (${customer.CustomerCode})`} placeholder="Select a customer" required={required} error={error} disabled={isSubmitting} />;

      case 'LocationID':
        return locations.length === 0
          ? <input type="text" id={id} name={name} value="No locations available" disabled className="disabled-input" placeholder="Select a customer first" />
          : locations.length === 1
            ? <input type="text" id={id} name={name} value={locations[0].LocationName} disabled className="readonly-input" title="Only one location available for this customer" />
            : <MultiSelectDropdown name={name} value={Array.isArray(value) ? value : (value ? [value] : [])} onChange={handleLocationChange} options={locations} valueKey="LocationID" labelKey="LocationName" formatLabel={(location) => location.isCustomerSite ? location.displayName : `${location.LocationName} (${location.Address || 'No address'})`} placeholder="Select locations..." searchPlaceholder="Search locations..." required={required} error={error} disabled={isSubmitting || !projectData.CustomerID} showSearch allowSelectAll maxHeight="250px" />;

      case 'Status':
        return (
          <select {...commonProps}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Completed">Completed</option>
          </select>
        );

      case 'ProjectCode':
        return (
          <div className="project-code-container">
            <input type="text" id={id} name={name} value={value || ''} readOnly placeholder={placeholder || 'Auto-generated'} className={`project-code-input ${error ? 'error' : ''}`} title="Project code is automatically generated based on project name, customer, and location" />
            {value && <div className="project-code-status">✅ Generated</div>}
          </div>
        );

      case 'ProjectDescription':
        return <textarea {...commonProps} placeholder={placeholder} readOnly={readOnly} rows={4} />;

      default:
        return <input type={type} {...commonProps} placeholder={placeholder} readOnly={readOnly} min={type === 'date' && name === 'EndDate' ? projectData.StartDate : undefined} />;
    }
  };

  return (
    <div className={`form-group ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label} {required && <span className="required-indicator">*</span>}</label>
      {renderInput()}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default FormField;
