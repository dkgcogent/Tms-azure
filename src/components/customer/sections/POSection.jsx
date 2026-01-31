import FormSection from '../FormSection';
import FormField from '../FormField';
import CustomerFileUpload from '../CustomerFileUpload';
import { getFileUploadFieldsBySection } from '../FileUploadConfig';

const POSection = ({ customerData, setCustomerData, handleInputChange, handleFileDelete, editingCustomer, errors, getExpiryStatus }) => {
  const fileUploadFields = getFileUploadFieldsBySection('po');

  const field = (label, name, type = 'text', options = {}, required = false) => {
    const expiryStatus = (type === 'date' && name.endsWith('ExpiryDate') && customerData[name]) ? getExpiryStatus(name, customerData[name]) : null;
    return <FormField label={label} name={name} type={type} value={customerData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} expiryStatus={expiryStatus} />;
  };

  const fileUpload = (fieldName) => {
    const uploadField = fileUploadFields.find(f => f.name === fieldName);
    return uploadField ? <CustomerFileUpload field={uploadField} value={customerData[fieldName]} setCustomerData={setCustomerData} onDelete={handleFileDelete} editingCustomer={editingCustomer} /> : null;
  };

  return (
    <FormSection title="3. PO Section">
      {field('PO', 'PO', 'text', { placeholder: 'Enter PO number' })}
      {fileUpload('POFile')}
      {field('PO Value', 'POValue', 'number', { placeholder: 'Enter PO value' })}
      {field('PO Date', 'PODate', 'date')}
      {field('PO Tenure', 'POTenure', 'text', { placeholder: 'e.g., 1 year' })}
      {field('PO Expiry Date', 'POExpiryDate', 'date')}
    </FormSection>
  );
};

export default POSection;
