import React, { useState, useCallback } from 'react';
import { vendorAPI, apiHelpers } from '../services/api';
import { useVendorForm } from '../hooks/useVendorForm';
import { useVendorValidation } from '../hooks/useVendorValidation';
import useFormValidation from '../hooks/useFormValidation';
import DataTable from '../components/DataTable';
import ValidationErrorModal from '../components/ValidationErrorModal';
import BasicInfoSection from '../components/vendor/sections/BasicInfoSection';
import PersonalDocsSection from '../components/vendor/sections/PersonalDocsSection';
import CompanyInfoSection from '../components/vendor/sections/CompanyInfoSection';
import BankDetailsSection from '../components/vendor/sections/BankDetailsSection';
import './VendorForm.css';

const VendorFormRefactored = () => {
  const { vendorData, setVendorData, bankDetails, setBankDetails, files, setFiles, vendors, projects, errors, setErrors, isSubmitting, setIsSubmitting, isLoading, editingVendor, setEditingVendor, dateFilter, setDateFilter, resetForm, handleInputChange, handleFileChange, handleAddressChange, getAddressData, fetchVendors, handleEdit, handleDelete, handleFileDelete } = useVendorForm();
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

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    await validateBeforeSubmit({ ...vendorData, ...bankDetails }, async (validatedData) => {
      setIsSubmitting(true);
      await submitVendorData(validatedData);
    });
  }, [vendorData, bankDetails, validateBeforeSubmit]);

  const submitVendorData = useCallback(async (validatedData) => {
    try {
      const formData = new FormData();
      const vendorPayload = { vendor_name: validatedData.vendor_name?.trim() || vendorData.vendor_name.trim(), vendor_mobile_no: validatedData.vendor_mobile_no?.trim() || vendorData.vendor_mobile_no.trim(), project_id: vendorData.project_id || null, vendor_address: `${vendorData.house_flat_no.trim()}, ${vendorData.street_locality.trim()}, ${vendorData.city.trim()}, ${vendorData.state.trim()}, ${vendorData.pin_code.trim()}${vendorData.country.trim() ? ', ' + vendorData.country.trim() : ''}`, house_flat_no: vendorData.house_flat_no.trim(), street_locality: vendorData.street_locality.trim(), city: vendorData.city.trim(), state: vendorData.state.trim(), pin_code: vendorData.pin_code.trim(), country: vendorData.country.trim() || 'India', vendor_alternate_no: vendorData.vendor_alternate_no.trim() || null, vendor_aadhar: vendorData.vendor_aadhar.trim().toUpperCase() || null, vendor_pan: vendorData.vendor_pan.trim().toUpperCase() || null, vendor_company_name: vendorData.vendor_company_name.trim() || null, vendor_company_udhyam: vendorData.vendor_company_udhyam.trim() || null, vendor_company_pan: vendorData.vendor_company_pan.trim().toUpperCase() || null, vendor_company_gst: vendorData.vendor_company_gst.trim().toUpperCase() || null, type_of_company: vendorData.type_of_company, start_date_of_company: vendorData.start_date_of_company || null, address_of_company: `${vendorData.address_of_company_house_flat_no || ''}, ${vendorData.address_of_company_street_locality || ''}, ${vendorData.address_of_company_city || ''}, ${vendorData.address_of_company_state || ''}, ${vendorData.address_of_company_pin_code || ''}${vendorData.address_of_company_country && vendorData.address_of_company_country !== 'India' ? ', ' + vendorData.address_of_company_country : ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',').trim() || null, bank_details: vendorData.bank_details.trim() || null, account_holder_name: bankDetails.account_holder_name.trim() || null, account_number: bankDetails.account_number.trim() || null, ifsc_code: bankDetails.ifsc_code.trim() || null, bank_name: bankDetails.bank_name.trim() || null, branch_name: bankDetails.branch_name.trim() || null, branch_address: bankDetails.branch_address.trim() || null, bank_city: bankDetails.city.trim() || null, bank_state: bankDetails.state.trim() || null };

      formData.append('vendorData', JSON.stringify(vendorPayload));
      Object.entries(vendorPayload).forEach(([k, v]) => { v !== undefined && v !== null && v !== '' && formData.append(k, v); });
      Object.keys(files).forEach(fileKey => { files[fileKey] && formData.append(fileKey, files[fileKey]); });

      editingVendor ? await vendorAPI.update(editingVendor.vendor_id ?? editingVendor.VendorID, formData) : await vendorAPI.create(formData);
      apiHelpers.showSuccess(`Vendor ${editingVendor ? 'updated' : 'created'} successfully!`);
      resetForm();
      await fetchVendors();
    } catch (error) {
      apiHelpers.showError(error, 'Failed to save vendor');
    } finally {
      setIsSubmitting(false);
    }
  }, [vendorData, bankDetails, files, editingVendor, resetForm, fetchVendors]);

  const createToast = useCallback((content, bgColor) => {
    const toast = document.createElement('div');
    toast.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 10000; background: ${bgColor}; color: white; padding: 15px 20px; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: Arial, sans-serif; font-size: 14px;`;
    toast.innerHTML = content;
    document.body.appendChild(toast);
    return toast;
  }, []);

  const handleExportVendors = useCallback(async () => {
    try {
      // Build query parameters for date filtering (same as fetchVendors)
      const queryParams = new URLSearchParams();
      if (dateFilter.fromDate) {
        queryParams.append('fromDate', dateFilter.fromDate);
      }
      if (dateFilter.toDate) {
        queryParams.append('toDate', dateFilter.toDate);
      }

      const queryString = queryParams.toString();
      const exportUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/export/vendors${queryString ? `?${queryString}` : ''}`;

      console.log('📊 Export URL with filters:', exportUrl);
      console.log('🗓️ Date filter applied to export:', { fromDate: dateFilter.fromDate, toDate: dateFilter.toDate });

      const loadingToast = createToast('🔄 Exporting vendors... Please wait', '#007bff');

      const link = document.createElement('a');
      Object.assign(link, { href: exportUrl, download: `Vendor_Master_${new Date().toISOString().slice(0, 10)}.xlsx`, target: '_blank' });
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      document.body.removeChild(loadingToast);

      const successToast = createToast('✅ Vendor Export Started!<br><small>Downloading ALL 26+ vendor master fields</small>', '#28a745');
      setTimeout(() => { document.body.contains(successToast) && document.body.removeChild(successToast); }, 5000);
    } catch (error) {
      alert(`❌ Export failed: ${error.message}`);
    }
  }, [createToast]);

  const vendorColumns = [
    { key: 'vendor_name', label: 'Vendor Name', sortable: true, minWidth: '150px' },
    { key: 'vendor_mobile_no', label: 'Mobile', sortable: true, minWidth: '120px', render: (value) => value || '-' },
    { key: 'project_name', label: 'Project', sortable: true, minWidth: '150px', render: (value, row) => value || (row.project_id ? 'Project ID: ' + row.project_id : 'Not Assigned') },
    { key: 'type_of_company', label: 'Company Type', sortable: true, minWidth: '130px' },
    { key: 'vendor_company_name', label: 'Company Name', sortable: true, minWidth: '150px', render: (value) => value || '-' },
    { key: 'vendor_company_gst', label: 'GST No.', sortable: true, minWidth: '150px', render: (value) => value || '-' },
    { key: 'vendor_photo', label: 'Photo', sortable: false, minWidth: '80px', render: (value) => value ? <div className="photo-indicator">📷</div> : <div className="no-photo-indicator">-</div> },
    { key: 'vendor_address', label: 'Address', sortable: false, minWidth: '200px', render: (value) => value ? (value.length > 40 ? value.substring(0, 40) + '...' : value) : '-' }
  ];

  const commonSectionProps = { vendorData, handleInputChange, handleFileChange, handleFileDelete, files, editingVendor, errors };

  return (
    <div className="vendor-form-container">
      <div className="form-header">
        <h1>🏢 Vendor Management</h1>
        <p>Add and manage vendors for your transportation services</p>
        {editingVendor && (
          <div className="edit-notice">
            <span className="edit-notice-text">Editing: <strong className="edit-notice-item">{editingVendor.vendor_name}</strong></span>
            <button type="button" onClick={resetForm} className="cancel-edit-btn">Cancel Edit</button>
          </div>
        )}
      </div>

      <div className="form-layout-card">
        <form onSubmit={handleSubmit} className="form-content" encType="multipart/form-data">
          <BasicInfoSection {...commonSectionProps} handleAddressChange={handleAddressChange} getAddressData={getAddressData} projects={projects} />
          <PersonalDocsSection {...commonSectionProps} />
          <CompanyInfoSection {...commonSectionProps} setVendorData={setVendorData} />
          <BankDetailsSection {...commonSectionProps} bankDetails={bankDetails} setBankDetails={setBankDetails} />

          <div className="form-actions">
            <button type="submit" disabled={isSubmitting} className="submit-btn">
              {isSubmitting ? 'Processing...' : editingVendor ? 'Update Vendor' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px', paddingRight: '10px' }}>
        <button onClick={handleExportVendors} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,123,255,0.3)', transition: 'all 0.2s ease' }} title="Export All Vendors to Excel">📊 Export to Excel</button>
      </div>

      <DataTable title="📋 Vendor List" data={vendors} columns={vendorColumns} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} keyField="VendorID" emptyMessage="No vendors found. Add your first vendor above." showPagination customizable exportable={false} />

      {showModal && modalImage && (
        <div className="image-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>Image Preview</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="image-modal-body">
              <img src={modalImage} alt="Full size preview" className="modal-image-full" />
            </div>
          </div>
        </div>
      )}

      <ValidationErrorModal isOpen={showErrorModal} onClose={closeErrorModal} errorSummary={errorSummary} onGoToField={goToField} onTryAgain={() => handleSubmit({ preventDefault: () => {} })} />
    </div>
  );
};

export default VendorFormRefactored;
