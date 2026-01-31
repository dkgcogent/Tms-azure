import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';
import AddressForm from '../../AddressForm';

const CompanyInfoSection = ({ vendorData, setVendorData, handleInputChange, handleFileChange, handleFileDelete, files, editingVendor, errors }) => {
  const commonProps = { files, editingVendor, vendorData, handleFileChange, handleFileDelete };
  const field = (label, name, type = 'text', options = {}, required = false) => <FormField label={label} name={name} type={type} value={vendorData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} {...commonProps} />;

  return (
    <FormSection title="Company Information" icon="🏢">
      {field('Vendor Company Name', 'vendor_company_name', 'text', { placeholder: 'Enter company name' })}
      {field('Type of Company', 'type_of_company', 'select', { values: ['Proprietorship', 'Partnership', 'LLP', 'Pvt Ltd'] })}
      {field('Start Date of Company', 'start_date_of_company', 'date')}

      <div className="form-field form-field-full-width">
        <label className="form-field-label">Address of Company</label>
        <AddressForm
          addressData={{ house_flat_no: vendorData.address_of_company_house_flat_no, street_locality: vendorData.address_of_company_street_locality, city: vendorData.address_of_company_city, state: vendorData.address_of_company_state, pin_code: vendorData.address_of_company_pin_code, country: vendorData.address_of_company_country }}
          onAddressChange={(newAddress) => setVendorData(prev => ({ ...prev, address_of_company_house_flat_no: newAddress.house_flat_no, address_of_company_street_locality: newAddress.street_locality, address_of_company_city: newAddress.city, address_of_company_state: newAddress.state, address_of_company_pin_code: newAddress.pin_code, address_of_company_country: newAddress.country }))}
          errors={errors}
          required={false}
          prefix="vendor_company"
          title="Company Address"
        />
      </div>

      {field('Vendor Company Udhyam', 'vendor_company_udhyam', 'text', { placeholder: 'Enter Udhyam registration number' })}
      {field('Company Udhyam Document', 'vendor_company_udhyam_doc', 'file', { accept: 'image/*,.pdf,.doc,.docx', existingFileUrl: editingVendor ? vendorData.vendor_company_udhyam_doc_url : null })}
      {field('Vendor Company PAN', 'vendor_company_pan', 'validated', { validationRule: 'PAN', placeholder: 'Enter Company PAN number', autoFormat: true })}
      {field('Company PAN Document', 'vendor_company_pan_doc', 'file', { accept: 'image/*,.pdf,.doc,.docx', existingFileUrl: editingVendor ? vendorData.vendor_company_pan_doc_url : null })}
      {field('Vendor Company GST', 'vendor_company_gst', 'validated', { validationRule: 'GST', placeholder: 'Enter GST number', autoFormat: true })}
      {field('Company GST Document', 'vendor_company_gst_doc', 'file', { accept: 'image/*,.pdf,.doc,.docx', existingFileUrl: editingVendor ? vendorData.vendor_company_gst_doc_url : null })}
      {field('Company Legal Documents', 'company_legal_docs', 'file', { accept: 'image/*,.pdf,.doc,.docx', existingFileUrl: editingVendor ? vendorData.company_legal_docs_url : null })}
    </FormSection>
  );
};

export default CompanyInfoSection;
