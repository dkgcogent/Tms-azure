import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const VehicleDetailsSection = ({ vehicleData, handleInputChange, files, editingVehicle, errors, handleFileChange, handleFileDelete, generateVehicleCode, getExpiryStatus }) => {
  const commonProps = { vehicleData, files, editingVehicle, errors, handleFileChange, handleFileDelete, generateVehicleCode, getExpiryStatus };
  const field = (label, name, type = 'text', options = {}, required = false) => <FormField label={label} name={name} type={type} value={vehicleData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} {...commonProps} />;

  return (
    <FormSection title="Vehicle Information" icon="🚛">
      {field('Vehicle Registration No.', 'VehicleRegistrationNo', 'text', { placeholder: 'Registration number' }, true)}
      {field('Assigned Vendor', 'vendor_id', 'vendor', { placeholder: 'Select vendor (required)' }, true)}
      {field('Assigned Driver', 'driver_id', 'driver', { placeholder: 'Select driver (optional)' })}
      {field('Vehicle Code', 'VehicleCode', 'vehicleCode', { placeholder: 'Auto-generated based on vendor and registration' }, true)}
      {field('RC Upload', 'RCUpload', 'file', { accept: '.pdf,.jpg,.jpeg,.png' })}
      {field('Vehicle Chassis No.', 'VehicleChasisNo', 'text', { placeholder: 'Chassis number' }, true)}
      {field('Vehicle Model', 'VehicleModel', 'text', { placeholder: 'Vehicle model' }, true)}
      {field('Type of Body', 'TypeOfBody', 'select', { values: ['Open', 'CBD', 'Container'] }, true)}
      {field('Vehicle Type', 'VehicleType', 'select', { values: ['LP', 'LPT', 'Tata Ace', 'Pickup', 'Tata 407 10ft', 'Tata 407 14ft', 'Eicher 17ft'] })}
      {field('Vehicle Registration Year/Date', 'VehicleRegistrationDate', 'date', { title: 'Enter date in YYYY-MM-DD format (8 digits)', pattern: '\\d{4}-\\d{2}-\\d{2}' })}
      {field('Vehicle Age (auto-calculated)', 'VehicleAge', 'number', { placeholder: 'Auto-calculated from registration date', readOnly: true })}
      {field('Vehicle KMS 📷', 'VehicleKMS', 'number', { placeholder: 'Odometer reading' })}
      {field('Vehicle KMS Photo (clear photo required) 📷', 'VehicleKMSPhoto', 'file', { accept: '.jpg,.jpeg,.png' })}
      {field('Vehicle Loading Capacity', 'VehicleLoadingCapacity', 'capacityInput', { placeholder: 'Enter capacity' }, true)}
    </FormSection>
  );
};

export default VehicleDetailsSection;
