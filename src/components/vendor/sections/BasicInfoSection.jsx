import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';
import AddressForm from '../../AddressForm';

const BasicInfoSection = ({ vendorData, handleInputChange, handleFileChange, handleFileDelete, handleAddressChange, getAddressData, projects, files, editingVendor, errors }) => {
  const commonProps = { projects, files, editingVendor, vendorData, handleFileChange, handleFileDelete };
  const field = (label, name, type = 'text', options = {}, required = false) => <FormField label={label} name={name} type={type} value={vendorData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} {...commonProps} />;

  return (
    <FormSection title="Basic Information" icon="📋">
      {field('Vendor Name', 'vendor_name', 'text', { placeholder: 'Enter vendor name' }, true)}
      {field('Vendor Mobile No.', 'vendor_mobile_no', 'validated', { validationRule: 'MOBILE', placeholder: 'Enter 10-digit mobile number', autoFormat: true }, true)}
      {field('Assigned Project', 'project_id', 'project')}
      {field('Vendor Alternate/Family No.', 'vendor_alternate_no', 'validated', { validationRule: 'MOBILE', placeholder: 'Enter alternate contact number', autoFormat: true })}

      <div className="form-field form-field-full-width">
        <AddressForm addressData={getAddressData()} onAddressChange={handleAddressChange} errors={errors} required prefix="vendor" title="Vendor Address" />
      </div>

      {field('Vendor Photo', 'vendor_photo', 'file', { accept: 'image/*,.pdf,.doc,.docx', existingFileUrl: editingVendor ? vendorData.vendor_photo_url : null })}
    </FormSection>
  );
};

export default BasicInfoSection;
