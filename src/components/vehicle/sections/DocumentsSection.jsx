import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const DocumentsSection = ({ vehicleData, handleInputChange, files, editingVehicle, errors, handleFileChange, handleFileDelete, getExpiryStatus }) => {
  const commonProps = { vehicleData, files, editingVehicle, errors, handleFileChange, handleFileDelete, getExpiryStatus };
  const field = (label, name, type = 'text', options = {}, required = false) => <FormField label={label} name={name} type={type} value={vehicleData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} {...commonProps} />;

  return (
    <FormSection title="Vehicle Documents & Certificates" icon="📋">
      {field('Last Servicing', 'LastServicing', 'date')}
      {field('Service Bill Photo', 'ServiceBillPhoto', 'file', { accept: '.jpg,.jpeg,.png,.pdf' })}
      {field('Vehicle Insurance Company', 'VehicleInsuranceCompany', 'text', { placeholder: 'Insurance provider' })}
      {field('Vehicle Insurance Date', 'VehicleInsuranceDate', 'date', { max: new Date().toISOString().split('T')[0], title: 'Insurance date must be today or earlier' })}
      {field('Vehicle Insurance Validity ⚠️', 'VehicleInsuranceExpiry', 'date')}
      {field('Insurance Copy', 'InsuranceCopy', 'file', { accept: '.pdf,.jpg,.jpeg,.png' })}
      {field('Vehicle Fitness Certificate Issue', 'VehicleFitnessCertificateIssue', 'date')}
      {field('Vehicle Fitness Certificate Validity ⚠️', 'VehicleFitnessCertificateExpiry', 'date')}
      {field('Fitness Certificate Upload', 'FitnessCertificateUpload', 'file', { accept: '.pdf,.jpg,.jpeg,.png' })}
      {field('Vehicle Pollution Date', 'VehiclePollutionDate', 'date')}
      {field('Vehicle Pollution Validity ⚠️', 'VehiclePollutionExpiry', 'date')}
      {field('Pollution Photo (clear photo required) 📷', 'PollutionPhoto', 'file', { accept: '.jpg,.jpeg,.png' })}
      {field('State Tax Issue', 'StateTaxIssue', 'date')}
      {field('State Tax Validity ⚠️', 'StateTaxExpiry', 'date')}
      {field('State Tax Photo (clear photo required) 📷', 'StateTaxPhoto', 'file', { accept: '.jpg,.jpeg,.png' })}
    </FormSection>
  );
};

export default DocumentsSection;
