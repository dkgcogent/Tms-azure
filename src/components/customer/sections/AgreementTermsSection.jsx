import React from 'react';
import FormSection from '../FormSection';
import FormField from '../FormField';
import CustomerFileUpload from '../CustomerFileUpload';
import { getFileUploadFieldsBySection } from '../FileUploadConfig';

const AgreementTermsSection = ({ customerData, setCustomerData, handleInputChange, handleFileDelete, editingCustomer, errors, getExpiryStatus }) => {
  const fileUploadFields = getFileUploadFieldsBySection('agreement');

  const field = (label, name, type = 'text', options = {}, required = false) => {
    const expiryStatus = (type === 'date' && name.endsWith('ExpiryDate') && customerData[name]) ? getExpiryStatus(name, customerData[name]) : null;
    return <FormField label={label} name={name} type={type} value={customerData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} expiryStatus={expiryStatus} />;
  };

  const fileUpload = (fieldName) => {
    const uploadField = fileUploadFields.find(f => f.name === fieldName);
    return uploadField ? <CustomerFileUpload field={uploadField} value={customerData[fieldName]} setCustomerData={setCustomerData} onDelete={handleFileDelete} editingCustomer={editingCustomer} /> : null;
  };

  return (
    <FormSection title="2. Agreement & Terms Section">
      {field('Agreement', 'Agreement', 'radio', { values: ['Yes', 'No'] })}
      {fileUpload('AgreementFile')}
      {field('Agreement Date', 'AgreementDate', 'date')}
      {field('Agreement Tenure (in Years)', 'AgreementTenure', 'number', { placeholder: 'e.g., 2' })}
      {field('Agreement Expiry Date', 'AgreementExpiryDate', 'date')}
      {field('Customer Notice Period (in Days)', 'CustomerNoticePeriod', 'number', { placeholder: 'e.g., 30' })}
      {field('Cogent Notice Period (in Days)', 'CogentNoticePeriod', 'number', { placeholder: 'e.g., 30' })}
      {field('Credit Period (in Days)', 'CreditPeriod', 'number', { placeholder: 'e.g., 45' })}
      {field('Customer Insurance', 'Insurance', 'radio', { values: ['Yes', 'No'] })}
      {field('Minimum Insurance value (in Rs)', 'MinimumInsuranceValue', 'number', { placeholder: 'Enter amount', onKeyDown: (e) => (e.key === 'e' || e.key === 'E') && e.preventDefault() })}
      {field('Cogent Debit Clause', 'CogentDebitClause', 'radio', { values: ['Yes', 'No'] })}
      {field('Cogent Debit Limit', 'CogentDebitLimit', 'number', { placeholder: 'Enter limit' })}
      {field('BG (Bank Guarantee)', 'BG', 'radio', { values: ['Yes', 'No'] })}
      {fileUpload('BGFile')}
      {field('BG Amount', 'BGAmount', 'number', { placeholder: 'Enter amount' })}
      {field('BG Date', 'BGDate', 'date')}
      {field('BG Expiry Date', 'BGExpiryDate', 'date')}
      {field('BG Bank', 'BGBank', 'text', { placeholder: 'Enter bank name' })}
      {field('BG Receiving by Customer', 'BGReceivingByCustomer', 'text', { placeholder: 'Receiver name' })}
      {fileUpload('BGReceivingFile')}
    </FormSection>
  );
};

export default AgreementTermsSection;
