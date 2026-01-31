import FormSection from '../FormSection';
import CustomerFileUpload from '../CustomerFileUpload';
import { getFileUploadFieldsBySection } from '../FileUploadConfig';

const MISSection = ({ customerData, setCustomerData, handleFileDelete, editingCustomer }) => {
  const fileUploadFields = getFileUploadFieldsBySection('mis');

  const fileUpload = (fieldName) => {
    const uploadField = fileUploadFields.find(f => f.name === fieldName);
    return uploadField ? <CustomerFileUpload field={uploadField} value={customerData[fieldName]} setCustomerData={setCustomerData} onDelete={handleFileDelete} editingCustomer={editingCustomer} /> : null;
  };

  return (
    <FormSection title="5. MIS Section">
      {fileUpload('MISFormatFile')}
      {fileUpload('KPISLAFile')}
      {fileUpload('PerformanceReportFile')}
    </FormSection>
  );
};

export default MISSection;
