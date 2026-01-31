import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const FreightSection = ({ vehicleData, handleInputChange, files, editingVehicle, errors, handleFileChange, handleFileDelete, getExpiryStatus }) => {
  const commonProps = { vehicleData, files, editingVehicle, errors, handleFileChange, handleFileDelete, getExpiryStatus };
  const field = (label, name, type = 'text', options = {}, required = false) => <FormField label={label} name={name} type={type} value={vehicleData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} {...commonProps} />;

  return (
    <FormSection title="Vehicle Freight" icon="💰">
      {field('Fix Rate', 'FixRate', 'number', { placeholder: 'Enter fix rate' })}
      {field('Fuel Rate', 'FuelRate', 'number', { placeholder: 'Enter fuel rate' })}
      {field('Handling Charges', 'HandlingCharges', 'number', { placeholder: 'Enter handling charges' })}
    </FormSection>
  );
};

export default FreightSection;
