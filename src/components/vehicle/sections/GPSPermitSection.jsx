import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const GPSPermitSection = ({ vehicleData, handleInputChange, files, editingVehicle, errors, handleFileChange, handleFileDelete, getExpiryStatus }) => {
  const commonProps = { vehicleData, files, editingVehicle, errors, handleFileChange, handleFileDelete, getExpiryStatus };
  const field = (label, name, type = 'text', options = {}, required = false) => <FormField label={label} name={name} type={type} value={vehicleData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} {...commonProps} />;

  return (
    <FormSection title="GPS & Permits" icon="📡">
      {field('GPS', 'GPS', 'radio', { values: ['Yes', 'No'] })}
      {field('GPS Company', 'GPSCompany', 'text', { placeholder: 'GPS provider name' })}
      {field('No Entry Pass ⚠️', 'NoEntryPass', 'radio', { values: ['Yes', 'No'] })}
      {field('No Entry Pass Start Date', 'NoEntryPassStartDate', 'date')}
      {field('No Entry Pass Expiry ⚠️', 'NoEntryPassExpiry', 'date')}
      {field('No Entry Pass Copy', 'NoEntryPassCopy', 'file', { accept: '.pdf,.jpg,.jpeg,.png' })}
    </FormSection>
  );
};

export default GPSPermitSection;
