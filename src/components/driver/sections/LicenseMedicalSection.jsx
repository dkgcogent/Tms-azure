import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const LicenseMedicalSection = ({ driverData, handleInputChange, errors }) => {
  const field = (label, name, type = 'text', options = {}, required = false) => <FormField label={label} name={name} type={type} value={driverData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} />;

  return (
    <FormSection title="License & Medical Information" icon="📋">
      {field('Licence Issue Date (Optional)', 'DriverLicenceIssueDate', 'date', { maxDate: new Date().toISOString().split('T')[0] })}
      {field('Licence Expiry Date (Optional)', 'DriverLicenceExpiryDate', 'date', { minDate: driverData.DriverLicenceIssueDate })}
      {field('Medical Date (Optional)', 'DriverMedicalDate', 'date')}
    </FormSection>
  );
};

export default LicenseMedicalSection;
