import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';
import BankDetails from '../../BankDetails';

const BankDetailsSection = ({ bankDetails, setBankDetails, handleFileChange, handleFileDelete, files, editingVendor, vendorData, errors }) => (
  <FormSection title="Bank Details" icon="🏦">
    <div className="bank-section-container">
      <div className="bank-details-wrapper">
        <BankDetails bankData={bankDetails} onBankDataChange={setBankDetails} errors={errors} required={false} title="Bank Details" prefix="vendor" showTitle enableAutoFill />
      </div>

      <div className="bank-cheque-wrapper">
        <FormField label="Bank Cheque Upload" name="bank_cheque_upload" type="file" value={files.bank_cheque_upload} onChange={handleFileChange} options={{ accept: 'image/*,.pdf,.doc,.docx', existingFileUrl: editingVendor ? vendorData.bank_cheque_upload_url : null }} files={files} editingVendor={editingVendor} vendorData={vendorData} handleFileChange={handleFileChange} handleFileDelete={handleFileDelete} />
      </div>
    </div>
  </FormSection>
);

export default BankDetailsSection;
