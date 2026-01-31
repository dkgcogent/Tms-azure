import React from 'react';
import ValidatedInput from '../ValidatedInput';
import DocumentUpload from '../DocumentUpload';
import SearchableDropdown from '../SearchableDropdown';

const FormField = ({ label, name, type = 'text', value, onChange, options = {}, required = false, error = null, vendors = [], files = {}, editingDriver = null, driverData = {}, handleFileChange, handleFileDelete, handleVendorSelection }) => {
  const { placeholder, validationRule, autoFormat, accept, existingFileUrl, min, max, values, minDate, maxDate } = options;
  const id = `driver-${name}`;
  const commonProps = { name, value, onChange, required };
  const inputClass = `form-input ${error ? 'error' : ''}`;

  const renderInput = () => {
    switch (type) {
      case 'validated': return <ValidatedInput {...commonProps} validationRule={validationRule} label={label} placeholder={placeholder} autoFormat={autoFormat} showFormatHint />;
      case 'file': return <DocumentUpload label={label} name={name} value={files[name]} onChange={handleFileChange} onDelete={() => handleFileDelete(name)} accept={accept} required={required} existingFileUrl={existingFileUrl} isEditing={!!editingDriver} />;
      case 'vendor': return <SearchableDropdown {...commonProps} onChange={(e) => { onChange(e); handleVendorSelection(e.target.value); }} options={vendors} valueKey="VendorID" labelKey="VendorName" placeholder={placeholder} error={error} />;
      case 'select': return <select {...commonProps} className="form-field-select">{values?.map(option => <option key={option} value={option}>{option}</option>)}</select>;
      case 'number': return <input type="number" id={id} {...commonProps} placeholder={placeholder} min={min} max={max} className={inputClass} />;
      case 'date': return <input type="date" id={id} {...commonProps} min={minDate} max={maxDate} className={inputClass} />;
      default: return <input type={type} id={id} {...commonProps} placeholder={placeholder} className={inputClass} />;
    }
  };

  return (
    <div className={`form-field ${options.fullWidth ? 'form-field-full-width' : ''}`}>
      {!['validated', 'file', 'vendor'].includes(type) && <label className="form-field-label" htmlFor={id}>{label} {required && <span className="required-indicator">*</span>}</label>}
      {renderInput()}
      {error && !['validated', 'vendor'].includes(type) && <div className="form-field-error">{error}</div>}
    </div>
  );
};

export default FormField;
