import React, { useState } from 'react';
import './FormComponents.css';

// Enhanced FormInput component with modern styling
export const FormInput = ({
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error = false,
  disabled = false,
  icon,
  min,
  max,
  rows,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (type === "textarea" || rows) {
    return (
      <div className={`form-input-wrapper ${error ? 'error' : ''} ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''}`}>
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows || 3}
          className="form-textarea"
          {...props}
        />
      </div>
    );
  }

  return (
    <div className={`form-input-wrapper ${error ? 'error' : ''} ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''}`}>
      {icon && <span className="form-input-icon">{icon}</span>}
      <input
        type={type === 'password' && showPassword ? 'text' : type}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        className={`form-input ${icon ? 'with-icon' : ''}`}
        {...props}
      />
      {type === 'password' && (
        <button
          type="button"
          className="form-input-toggle"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      )}
    </div>
  );
};

// Enhanced FormSelect component
export const FormSelect = ({
  name,
  value,
  onChange,
  required = false,
  error = false,
  disabled = false,
  placeholder = "Select an option...",
  children,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`form-select-wrapper ${error ? 'error' : ''} ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''}`}>
      <select
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required={required}
        disabled={disabled}
        className="form-select"
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      <span className="form-select-arrow">▼</span>
    </div>
  );
};

// Enhanced FormCheckbox component
export const FormCheckbox = ({
  name,
  checked,
  onChange,
  label,
  disabled = false,
  error = false,
  ...props
}) => {
  return (
    <div className={`form-checkbox-wrapper ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}>
      <label className="form-checkbox-label">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="form-checkbox"
          {...props}
        />
        <span className="form-checkbox-custom">
          <span className="form-checkbox-check">✓</span>
        </span>
        {label && <span className="form-checkbox-text">{label}</span>}
      </label>
    </div>
  );
};

// Enhanced FormTextarea component (alias for FormInput with textarea)
export const FormTextarea = ({
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error = false,
  disabled = false,
  rows = 3,
  ...props
}) => {
  return (
    <FormInput
      type="textarea"
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      error={error}
      disabled={disabled}
      rows={rows}
      {...props}
    />
  );
};

// New FormButton component
export const FormButton = ({
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  children,
  className = "",
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`form-button form-button-${variant} form-button-${size} ${loading ? 'loading' : ''} ${className}`}
      {...props}
    >
      {loading && <span className="form-button-spinner"></span>}
      {icon && !loading && <span className="form-button-icon">{icon}</span>}
      <span className="form-button-text">{children}</span>
    </button>
  );
};
