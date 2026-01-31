import React, { useState, useEffect } from 'react';
import { validateRealTime, formatValue, getRuleInfo } from '../utils/validationRules';
import './ValidatedInput.css';

const ValidatedInput = ({
  name,
  value,
  onChange,
  validationRule,
  required = false,
  label,
  placeholder,
  disabled = false,
  className = '',
  showFormatHint = true,
  autoFormat = true
}) => {
  const [validationState, setValidationState] = useState({
    isValid: true,
    error: null,
    suggestion: null
  });
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);

  // Get rule information for display
  const ruleInfo = getRuleInfo(validationRule);

  // Validate on value change
  useEffect(() => {
    if (validationRule && (hasBeenTouched || value)) {
      const validation = validateRealTime(value, validationRule, required);
      setValidationState(validation);
    }
  }, [value, validationRule, required, hasBeenTouched]);

  const handleChange = (e) => {
    let inputValue = e.target.value;
    
    // Auto-format the value if enabled
    if (autoFormat && validationRule) {
      inputValue = formatValue(inputValue, validationRule);
    }

    // Call the parent onChange with formatted value
    onChange({
      target: {
        name: name,
        value: inputValue
      }
    });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setHasBeenTouched(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const getInputClassName = () => {
    let classes = ['validated-input', className];
    
    if (hasBeenTouched || value) {
      if (validationState.isValid) {
        classes.push('valid');
      } else {
        classes.push('invalid');
      }
    }
    
    if (isFocused) {
      classes.push('focused');
    }
    
    return classes.join(' ');
  };

  const getValidationIcon = () => {
    if (!hasBeenTouched && !value) return null;
    
    if (validationState.isValid) {
      return <span className="validation-icon valid">✓</span>;
    } else {
      return <span className="validation-icon invalid">✗</span>;
    }
  };

  return (
    <div className="validated-input-container">
      {label && (
        <label className="validated-input-label">
          {label}
          {required && <span className="required-indicator">*</span>}
          {ruleInfo && showFormatHint && (
            <span className="format-hint">({ruleInfo.format})</span>
          )}
        </label>
      )}
      
      <div className="input-wrapper">
        <input
          type="text"
          name={name}
          value={value || ''}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder || (ruleInfo ? ruleInfo.format : '')}
          disabled={disabled}
          className={getInputClassName()}
          maxLength={ruleInfo?.maxLength}
          autoComplete="off"
        />
        {getValidationIcon()}
      </div>
      
      {/* Error Message */}
      {validationState.error && hasBeenTouched && (
        <div className="validation-error">
          <span className="error-icon">⚠️</span>
          {validationState.error}
        </div>
      )}
      
      {/* Format Suggestion */}
      {validationState.suggestion && isFocused && !validationState.error && (
        <div className="validation-suggestion">
          <span className="suggestion-icon">💡</span>
          {validationState.suggestion}
        </div>
      )}
      

    </div>
  );
};

export default ValidatedInput;
