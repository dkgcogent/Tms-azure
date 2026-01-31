import React, { useState, useCallback } from 'react';
import { driverAPI, apiHelpers } from '../services/api';
import { useDriverForm } from '../hooks/useDriverForm';
import { useDriverValidation } from '../hooks/useDriverValidation';
import DataTable from '../components/DataTable';
import ValidationErrorModal from '../components/ValidationErrorModal';
import DriverDetailsSection from '../components/driver/sections/DriverDetailsSection';
import LicenseMedicalSection from '../components/driver/sections/LicenseMedicalSection';
import PhotoAddressSection from '../components/driver/sections/PhotoAddressSection';
import './DriverForm.css';

const DriverFormRefactored = () => {
  const { driverData, setDriverData, drivers, vendors, files, errors, setErrors, isSubmitting, setIsSubmitting, isLoading, editingDriver, setEditingDriver, dateFilter, setDateFilter, modalImage, setModalImage, showModal, setShowModal, resetForm, handleInputChange, handleFileChange, handleAddressChange, getAddressData, fetchDrivers, handleEdit, handleDelete, handleFileDelete, handleVendorSelection } = useDriverForm();
  const { validateForm, validateBeforeSubmit } = useDriverValidation();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorSummary, setErrorSummary] = useState(null);
  const closeErrorModal = () => setShowErrorModal(false);
  const goToField = (fieldName) => { const element = document.querySelector(`[name="${fieldName}"]`); element && element.focus(); };

  const handleDateFilterApply = useCallback(async () => {
    if (!dateFilter.fromDate || !dateFilter.toDate) return alert('Please select both From Date and To Date');
    if (new Date(dateFilter.fromDate) > new Date(dateFilter.toDate)) return alert('From Date cannot be later than To Date');
    await fetchDrivers();
  }, [dateFilter, fetchDrivers]);

  const handleDateFilterClear = useCallback(async () => { setDateFilter({ fromDate: '', toDate: '' }); await fetchDrivers(); }, [setDateFilter, fetchDrivers]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateForm(driverData).isValid) return;
    await validateBeforeSubmit(driverData, async (validatedData) => { setIsSubmitting(true); await submitDriverData(validatedData); }, (validationResult) => console.log('Driver validation failed:', validationResult.summary));
  }, [driverData, validateForm, validateBeforeSubmit]);

  const submitDriverData = useCallback(async (validatedData) => {
    try {
      const formData = new FormData();
      ['DriverName', 'DriverLicenceNo', 'DriverMobileNo', 'DriverAddress', 'DriverLicenceIssueDate', 'DriverLicenceExpiryDate', 'DriverMedicalDate', 'DriverAlternateNo', 'DriverTotalExperience'].forEach(field => { driverData[field] && driverData[field].toString().trim() && formData.append(field, driverData[field].toString().trim()); });

      formData.append('DriverSameAsVendor', driverData.DriverSameAsVendor || 'Separate');
      driverData.vendor_id && formData.append('VendorID', driverData.vendor_id);
      files.DriverPhoto?.name && formData.append('DriverPhoto', files.DriverPhoto);

      editingDriver ? await driverAPI.update(editingDriver.DriverID, formData) : await driverAPI.create(formData);
      apiHelpers.showSuccess(`Driver ${editingDriver ? 'updated' : 'created'} successfully!`);
      resetForm();
      await fetchDrivers();
    } catch (error) {
      apiHelpers.showError(error, 'Failed to save driver');
    } finally {
      setIsSubmitting(false);
    }
  }, [driverData, files, editingDriver, resetForm, fetchDrivers]);

  const createToast = useCallback((content, bgColor) => {
    const toast = document.createElement('div');
    toast.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 10000; background: ${bgColor}; color: white; padding: 15px 20px; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: Arial, sans-serif; font-size: 14px;`;
    toast.innerHTML = content;
    document.body.appendChild(toast);
    return toast;
  }, []);

  const handleExportDrivers = useCallback(async () => {
    try {
      // Build query parameters for date filtering (same as fetchDrivers)
      const queryParams = new URLSearchParams();
      if (dateFilter.fromDate) {
        queryParams.append('fromDate', dateFilter.fromDate);
      }
      if (dateFilter.toDate) {
        queryParams.append('toDate', dateFilter.toDate);
      }

      const queryString = queryParams.toString();
      const exportUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/export/drivers${queryString ? `?${queryString}` : ''}`;

      console.log('📊 Export URL with filters:', exportUrl);
      console.log('🗓️ Date filter applied to export:', { fromDate: dateFilter.fromDate, toDate: dateFilter.toDate });

      const loadingToast = createToast('🔄 Exporting drivers... Please wait', '#007bff');
      
      const link = document.createElement('a');
      Object.assign(link, { href: exportUrl, download: `Driver_Master_${new Date().toISOString().slice(0, 10)}.xlsx`, target: '_blank' });
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      document.body.removeChild(loadingToast);

      const successToast = createToast('✅ Driver Export Started!<br><small>Downloading ALL driver master fields + vendor info</small>', '#28a745');
      setTimeout(() => { document.body.contains(successToast) && document.body.removeChild(successToast); }, 5000);
    } catch (error) {
      alert(`❌ Export failed: ${error.message}`);
    }
  }, [createToast]);

  const driverColumns = [
    { key: 'DriverName', label: 'Driver Name', sortable: true },
    { key: 'DriverLicenceNo', label: 'Licence No', sortable: true },
    { key: 'DriverMobileNo', label: 'Mobile', sortable: true },
    { key: 'DriverAlternateNo', label: 'Alt. Mobile', sortable: true },
    { key: 'DriverLicenceExpiryDate', label: 'Licence Expiry', sortable: true, type: 'date' },
    { key: 'DriverAddress', label: 'Address', sortable: false, render: (value) => value ? (value.length > 30 ? value.substring(0, 30) + '...' : value) : '-' }
  ];

  const commonSectionProps = { driverData, handleInputChange, errors };

  return (
    <div className="driver-form-container">
      <div className="form-header">
        <h1>👨‍💼 Driver Management</h1>
        <p>Add and manage drivers with their details</p>
        {editingDriver && (
          <div className="edit-notice">
            <span className="edit-notice-text">Editing: <strong className="edit-notice-item">{editingDriver.DriverName}</strong></span>
            <button type="button" onClick={resetForm} className="cancel-edit-btn">Cancel Edit</button>
          </div>
        )}
      </div>

      <div className="form-layout-card">
        <form onSubmit={handleSubmit} className="form-content">
          <DriverDetailsSection {...commonSectionProps} vendors={vendors} handleVendorSelection={handleVendorSelection} />
          <LicenseMedicalSection {...commonSectionProps} />
          <PhotoAddressSection {...commonSectionProps} handleFileChange={handleFileChange} handleFileDelete={handleFileDelete} handleAddressChange={handleAddressChange} getAddressData={getAddressData} files={files} editingDriver={editingDriver} />
          
          <div className="form-actions">
            <button type="submit" disabled={isSubmitting} className="submit-btn">
              {isSubmitting ? 'Processing...' : editingDriver ? 'Update Driver' : 'Add Driver'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px', paddingRight: '10px' }}>
        <button onClick={handleExportDrivers} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,123,255,0.3)', transition: 'all 0.2s ease' }} title="Export All Drivers to Excel">📊 Export to Excel</button>
      </div>

      <DataTable title="📋 Driver List" data={drivers} columns={driverColumns} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} keyField="DriverID" emptyMessage="No drivers found. Add your first driver above." showPagination customizable exportable={false} />

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

export default DriverFormRefactored;
