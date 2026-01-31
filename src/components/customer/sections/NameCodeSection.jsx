import React from 'react';
import FormSection from '../FormSection';
import FormField from '../FormField';

const NameCodeSection = ({ customerData, handleInputChange, errors, renderMultipleCustomerSites }) => {
  const field = (label, name, type = 'text', options = {}, required = false) => (
    <FormField label={label} name={name} type={type} value={customerData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} />
  );

  return (
    <FormSection title="1. Name & Code Section">
      {field('Master Customer Name', 'MasterCustomerName', 'text', { placeholder: 'Enter master customer name' }, true)}
      {field('Company Name', 'Name', 'text', { placeholder: 'Enter company name' }, true)}
      {field('Customer Code', 'CustomerCode', 'text', { placeholder: 'Auto-generated', readOnly: true })}
      {field('Type of Services', 'TypeOfServices', 'select', { values: ['Transportation', 'Warehousing', 'Both', 'Logistics', 'Industrial Transport', 'Retail Distribution', 'Other'] }, true)}
      {field('Service Code', 'ServiceCode', 'text', { placeholder: 'Auto-selected', readOnly: true })}
      {renderMultipleCustomerSites()}
    </FormSection>
  );
};

export default NameCodeSection;
