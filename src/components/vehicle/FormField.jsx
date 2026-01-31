import React from 'react';
import DocumentUpload from '../DocumentUpload';
import SearchableDropdown from '../SearchableDropdown';
import { vendorAPI, driverAPI } from '../../services/api';

const FormField = ({ label, name, type = 'text', value, onChange, options = {}, required = false, error = null, files = {}, editingVehicle = null, vehicleData = {}, handleFileChange, handleFileDelete, generateVehicleCode, getExpiryStatus }) => {
  const { placeholder, values, accept, rows = 3, max, min, title, pattern, readOnly, fullWidth } = options;
  const id = `vehicle-${name}`;
  const isExpiryField = name.endsWith('ExpiryDate') || name.endsWith('Expiry');
  const expiryStatus = (type === 'date' && isExpiryField && value) ? getExpiryStatus(name, value) : null;
  const inputClass = `form-input ${error ? 'error' : ''}`;

  const renderInput = () => {
    switch (type) {
      case 'file':
        return (
          <DocumentUpload
            label={label}
            name={name}
            value={files[name]}
            onChange={handleFileChange}
            onDelete={() => handleFileDelete(name)}
            accept={accept}
            required={required}
            existingFileUrl={editingVehicle?.[`${name}_url`]}
            isEditing={!!editingVehicle}
          />
        );
      case 'vendor':
        return (
          <SearchableDropdown
            name={name}
            value={value}
            onChange={onChange}
            apiCall={async () => {
              try {
                const response = await vendorAPI.getAll();
                return { data: response.data || [] };
              } catch (error) {
                return { data: [] };
              }
            }}
            valueKey="VendorID"
            labelKey="VendorName"
            formatLabel={(vendor) => `${vendor.VendorName || 'Unknown Vendor'} (ID: ${vendor.VendorID})`}
            placeholder={placeholder}
            allowEmpty={false}
            required={required}
            searchPlaceholder="Search vendors..."
          />
        );
      case 'driver':
        return (
          <SearchableDropdown
            name={name}
            value={value}
            onChange={onChange}
            apiCall={async () => {
              try {
                const response = await driverAPI.getAll();
                return { data: response.data || [] };
              } catch (error) {
                return { data: [] };
              }
            }}
            valueKey="DriverID"
            labelKey="DriverName"
            formatLabel={(driver) => `${driver.DriverName || 'Unknown Driver'} (${driver.DriverCode || driver.DriverID})`}
            placeholder={placeholder}
            allowEmpty={true}
            required={required}
            searchPlaceholder="Search drivers..."
          />
        );
      case 'vehicleCode':
        return (
          <div className="input-with-button">
            <input
              type="text"
              name={name}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              required={required}
              className={inputClass}
              readOnly
            />
            <button
              type="button"
              onClick={generateVehicleCode}
              className="generate-code-btn"
              disabled={!vehicleData.vendor_id || !vehicleData.VehicleRegistrationNo}
              title="Generate vehicle code based on vendor and registration number"
            >
              Generate
            </button>
          </div>
        );
      case 'capacityInput':
        return (
          <div className="input-with-unit">
            <input
              type="number"
              name={name}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              required={required}
              min="0"
              className={inputClass}
            />
            <span className="unit-indicator">KG</span>
          </div>
        );
      case 'radio':
        return (
          <div className="radio-group">
            {values.map(val => (
              <label key={val}>
                <input
                  type="radio"
                  id={`${id}-${val}`}
                  name={name}
                  value={val}
                  checked={value === val}
                  onChange={onChange}
                />
                {val}
              </label>
            ))}
          </div>
        );
      case 'select':
        return (
          <select id={id} name={name} value={value} onChange={onChange} required={required} className="form-field-select">
            {values.map(val => <option key={val} value={val}>{val}</option>)}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            required={required}
            className={inputClass}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            max={max}
            min={min}
            className={inputClass}
            readOnly={readOnly || name === 'VehicleAge'}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            max={max}
            min={min}
            title={title}
            pattern={pattern}
            className={inputClass}
          />
        );
      default:
        return (
          <input
            type={type}
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            title={title}
            pattern={pattern}
            className={inputClass}
            readOnly={readOnly}
          />
        );
    }
  };

  return (
    <div className={`form-field ${fullWidth ? 'full-width' : ''} ${expiryStatus ? expiryStatus.className : ''}`}>
      {!['file', 'vendor', 'driver'].includes(type) && (
        <label className="form-field-label" htmlFor={id}>
          {label} {required && <span className="required-indicator">*</span>}
          {name.includes('Photo') && <span className="photo-indicator"> 📷</span>}
          {name.includes('Expiry') && <span className="expiry-indicator"> ⚠️</span>}
          {expiryStatus && (
            <span className={`expiry-indicator ${expiryStatus.status}`}>
              {expiryStatus.message}
            </span>
          )}
        </label>
      )}
      {renderInput()}
      {type === 'vehicleCode' && (
        <div className="form-field-help">
          Code is auto-generated when vendor and registration number are selected
        </div>
      )}
      {type === 'capacityInput' && (
        <small className="field-hint">Enter the maximum loading capacity in kilograms</small>
      )}
      {error && !['file', 'vendor', 'driver'].includes(type) && <div className="form-field-error">{error}</div>}
    </div>
  );
};

export default FormField;
