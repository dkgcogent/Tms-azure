import React from 'react';
import Dropdown from '../Dropdown';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", 
  "Ladakh", "Lakshadweep", "Puducherry"
];

const FormField = ({ label, name, type = 'text', value, onChange, options = {}, required = false, error = null, customers = [], employees = [], isSubmitting = false, projectData = {}, handleCustomerChange }) => {
  const { placeholder, readOnly } = options;
  const id = `project-${name}`;
  const commonProps = { id, name, value: value || '', onChange, required, className: error ? 'error' : '', disabled: isSubmitting };

  const renderInput = () => {
    switch (name) {
      case 'CustomerID':
        return <Dropdown name={name} value={value} onChange={handleCustomerChange} options={customers} valueKey="CustomerID" labelKey="Name" formatLabel={(customer) => `${customer.Name} (${customer.CustomerCode})`} placeholder="Select a customer" required={required} error={error} disabled={isSubmitting} />;

      case 'State':
        return (
          <select {...commonProps}>
            <option value="">-- Select State --</option>
            {INDIAN_STATES.map(stateName => (
              <option key={stateName} value={stateName}>
                {stateName}
              </option>
            ))}
          </select>
        );

      case 'AssignedEmployee':
        return (
          <select {...commonProps}>
            <option value="">-- Assign Employee --</option>
            {employees.map(emp => (
              <option key={emp.id || emp.employee_id || emp.employee_code} value={emp.employee_code ? `${emp.employee_code}/${emp.employee_name}` : emp.employee_name}>
                {emp.employee_code ? `${emp.employee_code}/` : ''}{emp.employee_name}
              </option>
            ))}
          </select>
        );

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
