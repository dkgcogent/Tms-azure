import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const DriverDetailsSection = ({ driverData, handleInputChange, vendors, errors, handleVendorSelection }) => {
  const commonProps = { vendors, errors, handleVendorSelection };
  const field = (label, name, type = 'text', options = {}, required = false) => <FormField label={label} name={name} type={type} value={driverData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} {...commonProps} />;

  return (
    <FormSection title="Driver Details" icon="👨‍💼">
      {field('Driver - Same as Vendor / Separate', 'DriverSameAsVendor', 'select', { values: ['Separate', 'Same as Vendor'] })}
      {driverData.DriverSameAsVendor === 'Same as Vendor' ? field('Vendor', 'vendor_id', 'vendor', { placeholder: 'Select a vendor' }, true) : field('Driver Name', 'DriverName', 'text', { placeholder: 'Enter driver name' }, true)}
      {field('Licence Number', 'DriverLicenceNo', 'text', { placeholder: 'Enter licence number' }, true)}
      {field('Mobile Number', 'DriverMobileNo', 'validated', { validationRule: 'MOBILE', placeholder: 'Enter mobile number', autoFormat: true })}
      {field('Driver Alternate No. / Family No.', 'DriverAlternateNo', 'validated', { validationRule: 'MOBILE', placeholder: 'Enter alternate/family contact number', autoFormat: true })}
      {field('Driver Total Experience (Years)', 'DriverTotalExperience', 'number', { placeholder: 'Enter total experience in years', min: '0', max: '50' })}
    </FormSection>
  );
};

export default DriverDetailsSection;
