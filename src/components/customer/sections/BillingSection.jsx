import FormSection from '../FormSection';
import FormField from '../FormField';
import CustomerFileUpload from '../CustomerFileUpload';
import ValidatedInput from '../../ValidatedInput';
import { getFileUploadFieldsBySection } from '../FileUploadConfig';

const BillingSection = ({ customerData, setCustomerData, handleInputChange, handleFileDelete, editingCustomer, errors }) => {
  const fileUploadFields = getFileUploadFieldsBySection('billing');

  const field = (label, name, type = 'text', options = {}, required = false) => (
    <FormField label={label} name={name} type={type} value={customerData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} />
  );

  const fileUpload = (fieldName) => {
    const uploadField = fileUploadFields.find(f => f.name === fieldName);
    return uploadField ? <CustomerFileUpload field={uploadField} value={customerData[fieldName]} setCustomerData={setCustomerData} onDelete={handleFileDelete} editingCustomer={editingCustomer} /> : null;
  };

  return (
    <FormSection title="4. Commercials & Billing Section">
      {fileUpload('RatesAnnexureFile')}
      {field('Rates', 'Rates', 'text', { placeholder: 'e.g., As per annexure' })}
      {field('Yearly Escalation Clause', 'YearlyEscalationClause', 'radio', { values: ['Yes', 'No'] })}
      <ValidatedInput name="GSTNo" value={customerData.GSTNo} onChange={handleInputChange} validationRule="GST" required={false} label="GST No." placeholder="Enter GST number (optional)" showFormatHint={true} autoFormat={true} />
      {field('GST Rate (%)', 'GSTRate', 'number', { placeholder: 'e.g., 18' })}
      {field('Type of Billing', 'TypeOfBilling', 'select', { values: ['RCM', 'GST'] }, true)}
      {field('Billing Tenure', 'BillingTenure', 'text', { placeholder: 'e.g., 25th to 24th' })}
    </FormSection>
  );
};

export default BillingSection;
