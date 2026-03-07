import React, { useState, useCallback } from 'react';
import { vendorAPI, apiHelpers } from '../services/api';
import { useVendorForm } from '../hooks/useVendorForm';
import { useVendorValidation } from '../hooks/useVendorValidation';
import useFormValidation from '../hooks/useFormValidation';
import DataTable from '../components/DataTable';
import RestoreDraftNotification from '../components/RestoreDraftNotification';
import ValidationErrorModal from '../components/ValidationErrorModal';
import BasicInfoSection from '../components/vendor/sections/BasicInfoSection';
import PersonalDocsSection from '../components/vendor/sections/PersonalDocsSection';
import CompanyInfoSection from '../components/vendor/sections/CompanyInfoSection';
import BankDetailsSection from '../components/vendor/sections/BankDetailsSection';
import { uploadFileDirectly } from '../utils/azureUpload';
import './VendorForm.css';

const VendorFormRefactored = () => {
  const { vendorData, setVendorData, bankDetails, setBankDetails, files, setFiles, vendors, projects, errors, setErrors, isSubmitting, setIsSubmitting, isLoading, editingVendor, setEditingVendor, dateFilter, setDateFilter, resetForm, handleInputChange, handleFileChange, handleAddressChange, getAddressData, fetchVendors, handleEdit, handleDelete, handleFileDelete, hasDraft, restoreDraft, clearDraft } = useVendorForm();
  const { validateForm } = useVendorValidation();
  const [modalImage, setModalImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { validateBeforeSubmit, showErrorModal, closeErrorModal, errorSummary, goToField } = useFormValidation('vendor', { vendor_name: (value) => value?.length < 2 ? { isValid: false, error: 'Vendor name must be at least 2 characters' } : { isValid: true, error: null } });

  const handleDateFilterApply = useCallback(async () => {
    if (!dateFilter.fromDate || !dateFilter.toDate) return alert('Please select both From Date and To Date');
    if (new Date(dateFilter.fromDate) > new Date(dateFilter.toDate)) return alert('From Date cannot be later than To Date');
    await fetchVendors();
  }, [dateFilter, fetchVendors]);

  const handleDateFilterClear = useCallback(async () => { setDateFilter({ fromDate: '', toDate: '' }); await fetchVendors(); }, [setDateFilter, fetchVendors]);

  const submitVendorData = useCallback(async (validatedData) => {
    try {
      // 1. Handle multiple file uploads directly to Azure
      const updatedFiles = { ...vendorData }; // Start with existing data (URLs or local paths)

      const fileFields = [
        'vendor_photo', 'vendor_aadhar_doc', 'vendor_pan_doc',
        'vendor_company_udhyam_doc', 'vendor_company_pan_doc',
        'vendor_company_gst_doc', 'company_legal_docs', 'bank_cheque_upload'
      ];

      for (const field of fileFields) {
        if (files[field] instanceof File) {
          console.log(`☁️ Uploading ${field} directly to Azure...`);
          updatedFiles[field] = await uploadFileDirectly(files[field], 'vendors');
          console.log(`✅ ${field} uploaded:`, updatedFiles[field]);
        }
      }

      // 2. Prepare payload for JSON API call
      const vendorPayload = {
        vendor_name: validatedData.vendor_name?.trim() || vendorData.vendor_name.trim(),
        vendor_mobile_no: validatedData.vendor_mobile_no?.trim() || vendorData.vendor_mobile_no.trim(),
        project_id: vendorData.project_id || null,
        vendor_address: `${vendorData.house_flat_no.trim()}, ${vendorData.street_locality.trim()}, ${vendorData.city.trim()}, ${vendorData.state.trim()}, ${vendorData.pin_code.trim()}${vendorData.country.trim() ? ', ' + vendorData.country.trim() : ''}`,
        house_flat_no: vendorData.house_flat_no.trim(),
        street_locality: vendorData.street_locality.trim(),
        city: vendorData.city.trim(),
        state: vendorData.state.trim(),
        pin_code: vendorData.pin_code.trim(),
        country: vendorData.country.trim() || 'India',
        vendor_alternate_no: vendorData.vendor_alternate_no.trim() || null,
        vendor_aadhar: vendorData.vendor_aadhar.trim().toUpperCase() || null,
        vendor_pan: vendorData.vendor_pan.trim().toUpperCase() || null,
        vendor_company_name: vendorData.vendor_company_name.trim() || null,
        vendor_company_udhyam: vendorData.vendor_company_udhyam.trim() || null,
        vendor_company_pan: vendorData.vendor_company_pan.trim().toUpperCase() || null,
        vendor_company_gst: vendorData.vendor_company_gst.trim().toUpperCase() || null,
        type_of_company: vendorData.type_of_company,
        start_date_of_company: vendorData.start_date_of_company || null,
        address_of_company: `${vendorData.address_of_company_house_flat_no || ''}, ${vendorData.address_of_company_street_locality || ''}, ${vendorData.address_of_company_city || ''}, ${vendorData.address_of_company_state || ''}, ${vendorData.address_of_company_pin_code || ''}${vendorData.address_of_company_country && vendorData.address_of_company_country !== 'India' ? ', ' + vendorData.address_of_company_country : ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',').trim() || null,
        bank_details: vendorData.bank_details.trim() || null,
        account_holder_name: bankDetails.account_holder_name.trim() || null,
        account_number: bankDetails.account_number.trim() || null,
        ifsc_code: bankDetails.ifsc_code.trim() || null,
        bank_name: bankDetails.bank_name.trim() || null,
        branch_name: bankDetails.branch_name.trim() || null,
        branch_address: bankDetails.branch_address.trim() || null,
        bank_city: bankDetails.city.trim() || null,
        bank_state: bankDetails.state.trim() || null,
        // Add the uploaded file URLs
        ...updatedFiles
      };

      // 3. Send as JSON
      editingVendor
        ? await vendorAPI.update(editingVendor.vendor_id ?? editingVendor.VendorID, vendorPayload)
        : await vendorAPI.create(vendorPayload);

      apiHelpers.showSuccess(`Vendor ${editingVendor ? 'updated' : 'created'} successfully!`);
      clearDraft();
      resetForm();
      await fetchVendors();
    } catch (error) {
      console.error('Submission error:', error);
      apiHelpers.showError(error, 'Failed to save vendor');
    } finally {
      setIsSubmitting(false);
    }
  }, [vendorData, bankDetails, files, editingVendor, resetForm, fetchVendors, clearDraft]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    await validateBeforeSubmit({ ...vendorData, ...bankDetails }, async (validatedData) => {
      setIsSubmitting(true);
      await submitVendorData(validatedData);
    });
  }, [vendorData, bankDetails, validateBeforeSubmit, submitVendorData]);

  const createToast = useCallback((content, bgColor) => {
    const toast = document.createElement('div');
    toast.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 10000; background: ${bgColor}; color: white; padding: 15px 20px; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: Arial, sans-serif; font-size: 14px;`;
    toast.innerHTML = content;
    document.body.appendChild(toast);
    return toast;
  }, []);

  const vendorColumns = [
    { key: 'vendor_name', label: 'Vendor Name', sortable: true },
    { key: 'vendor_mobile_no', label: 'Mobile No', sortable: true },
    { key: 'city', label: 'City', sortable: true },
    { key: 'type_of_company', label: 'Company Type', sortable: true },
    { key: 'vendor_company_gst', label: 'GST No', sortable: true }
  ];

  const commonSectionProps = { vendorData, handleInputChange, files, editingVendor, errors, handleFileChange, handleFileDelete };

  return (
    <div className="vendor-form-container">
      <div className="form-header">
        <h1>🤝 Vendor Master</h1>
        <p>Comprehensive vendor onboarding and management system</p>
        <RestoreDraftNotification isVisible={hasDraft && !editingVendor} onRestore={restoreDraft} onClear={clearDraft} />
        {editingVendor && (
          <div className="edit-notice">
            <span className="edit-notice-text">Editing: <strong className="edit-notice-item">{editingVendor.vendor_name}</strong></span>
            <button type="button" onClick={resetForm} className="cancel-edit-btn">Cancel Edit</button>
          </div>
        )}
      </div>

      <div className="form-layout-card">
        <form onSubmit={handleSubmit} className="form-content">
          <BasicInfoSection {...commonSectionProps} projects={projects} />
          <PersonalDocsSection {...commonSectionProps} />
          <CompanyInfoSection {...commonSectionProps} />
          <BankDetailsSection bankDetails={bankDetails} setBankDetails={setBankDetails} errors={errors} />

          <div className="form-actions">
            <button type="submit" disabled={isSubmitting} className="submit-btn">
              {isSubmitting ? 'Processing...' : editingVendor ? 'Update Vendor' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>

      <DataTable title="📋 Vendor List" data={vendors} columns={driverColumns || vendorColumns} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} keyField="VendorID" emptyMessage="No vendors found. Add your first vendor above." showPagination customizable exportable={false} />

      <ValidationErrorModal isOpen={showErrorModal} onClose={closeErrorModal} errorSummary={errorSummary} onGoToField={goToField} onTryAgain={() => handleSubmit({ preventDefault: () => { } })} />
    </div>
  );
};

export default VendorFormRefactored;
