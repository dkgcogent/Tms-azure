import React from 'react';
import './FormField.css';

const FormField = ({
  label,
  required = false,
  optional = false,
  error = null,
  hint = null,
  children,
  className = '',
  fullWidth = false,
  ...props
}) => {
  return (
    <div className={`form-field ${fullWidth ? 'full-width' : ''} ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <div className="form-field-header">
          <label className="form-field-label">
            {label}
            {required && <span className="required-indicator"> *</span>}
            {optional && <span className="optional-indicator"> (Optional)</span>}
          </label>
          {hint && <span className="form-field-hint">{hint}</span>}
        </div>
      )}
      <div className="form-field-input">
        {children}
      </div>
      {error && (
        <div className="form-field-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}
    </div>
  );
};

export default FormField;
