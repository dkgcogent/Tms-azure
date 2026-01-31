import React from 'react';

const FormField = ({ label, name, type = 'text', value, onChange, options = {}, required = false, error = null, expiryStatus = null, className = '' }) => {
  const { placeholder, values, readOnly, fullWidth, onKeyDown } = options;
  const hasError = !!error;
  const id = `customer-${name}`;
  const baseClassName = `form-group ${fullWidth ? 'full-width' : ''} ${expiryStatus?.className || ''} ${hasError ? 'has-error' : ''} ${className}`;

  const commonProps = { id, name, value: value || '', onChange: (e) => onChange(name, e.target.value), required, className: hasError ? 'error' : '' };

  const renderInput = () => {
    switch (type) {
      case 'radio':
        return (
          <div className="radio-group">
            {values?.map(option => (
              <label key={option} className="radio-label">
                <input type="radio" name={name} value={option} checked={value === option} onChange={(e) => onChange(name, e.target.value)} required={required} />
                <span className="radio-text">{option}</span>
              </label>
            ))}
          </div>
        );
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select {label}</option>
            {values?.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        );
      case 'textarea':
        return <textarea {...commonProps} placeholder={placeholder} readOnly={readOnly} rows={4} />;
      default:
        return <input type={type} {...commonProps} placeholder={placeholder} readOnly={readOnly} onKeyDown={onKeyDown} />;
    }
  };

  return (
    <div className={baseClassName}>
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="required">*</span>}
        {expiryStatus && <span className={`expiry-indicator ${expiryStatus.className}`}>{expiryStatus.message}</span>}
      </label>
      {renderInput()}
      {hasError && <span className="error-message">{error}</span>}
    </div>
  );
};

export default FormField;
