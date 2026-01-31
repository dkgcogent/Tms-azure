import React from 'react';
import ValidatedInput from '../ValidatedInput';
import DocumentUpload from '../DocumentUpload';
import Dropdown from '../Dropdown';

const FormField = ({ label, name, type = 'text', value, onChange, options = {}, required = false, error = null, projects = [], files = {}, editingVendor = null, vendorData = {}, handleFileChange, handleFileDelete }) => {
  const { placeholder, validationRule, autoFormat, accept, existingFileUrl } = options;
  const id = `vendor-${name}`;
  const commonProps = { name, value, onChange, required };

  const renderInput = () => {
    switch (type) {
      case 'validated': return <ValidatedInput {...commonProps} validationRule={validationRule} label={label} placeholder={placeholder} autoFormat={autoFormat} />;
      case 'file': return <DocumentUpload label={label} name={name} value={files[name]} onChange={handleFileChange} onDelete={() => handleFileDelete(name)} accept={accept} required={required} existingFileUrl={existingFileUrl} isEditing={!!editingVendor} />;
      case 'project': return <Dropdown label={label} {...commonProps} options={projects} valueKey="ProjectID" labelKey="ProjectName" formatLabel={(project) => `${project.ProjectName} (ID: ${project.ProjectID})`} placeholder="Select project (optional)" allowEmpty emptyLabel="No project assigned" />;
      case 'select': return <select {...commonProps} className="form-input">{options.values?.map(option => <option key={option} value={option}>{option}</option>)}</select>;
      case 'date': return <input type="date" id={id} {...commonProps} className={`form-input ${error ? 'error' : ''}`} />;
      default: return <input type={type} id={id} {...commonProps} placeholder={placeholder} className={`form-input ${error ? 'error' : ''}`} />;
    }
  };

  return (
    <div className={`form-field ${options.fullWidth ? 'form-field-full-width' : ''}`}>
      {!['validated', 'file', 'project'].includes(type) && <label className="form-field-label" htmlFor={id}>{label} {required && <span className="required-indicator">*</span>}</label>}
      {renderInput()}
      {error && type !== 'validated' && <div className="form-field-error">{error}</div>}
    </div>
  );
};

export default FormField;
