import React from 'react';
import DocumentUpload from '../DocumentUpload';
import { createFileUploadHandler } from './FileUploadConfig';

const CustomerFileUpload = ({ field, value, setCustomerData, onDelete, editingCustomer, className = '' }) => {
  const { name, label, accept } = field;

  return (
    <div className={`form-group ${className}`}>
      <DocumentUpload
        label={label}
        name={name}
        value={value}
        onChange={createFileUploadHandler(name, setCustomerData)}
        onDelete={onDelete}
        existingFileUrl={editingCustomer?.[`${name}Url`]}
        accept={accept}
        entityType="customers"
        entityId={editingCustomer?.CustomerID}
        isEditing={!!editingCustomer}
      />
    </div>
  );
};

export default CustomerFileUpload;
