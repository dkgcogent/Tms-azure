import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const PersonalDocsSection = ({ vendorData, handleInputChange, handleFileChange, handleFileDelete, files, editingVendor, errors }) => {
  const commonProps = { files, editingVendor, vendorData, handleFileChange, handleFileDelete };
  const field = (label, name, type = 'text', options = {}, required = false) => <FormField label={label} name={name} type={type} value={vendorData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} {...commonProps} />;

  return (
    <FormSection title="Personal Documents" icon="📄">
      {field('Vendor Aadhaar', 'vendor_aadhar', 'validated', { validationRule: 'AADHAAR', placeholder: 'Enter 12-digit Aadhaar number', autoFormat: true })}
      {field('Vendor Aadhar Document', 'vendor_aadhar_doc', 'file', { accept: 'image/*,.pdf,.doc,.docx', existingFileUrl: editingVendor ? vendorData.vendor_aadhar_doc_url : null })}
      {field('Vendor PAN', 'vendor_pan', 'validated', { validationRule: 'PAN', placeholder: 'Enter PAN number', autoFormat: true })}
      {field('Vendor PAN Document', 'vendor_pan_doc', 'file', { accept: 'image/*,.pdf,.doc,.docx', existingFileUrl: editingVendor ? vendorData.vendor_pan_doc_url : null })}
    </FormSection>
  );
};

export default PersonalDocsSection;
