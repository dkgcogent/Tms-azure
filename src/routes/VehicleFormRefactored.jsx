import React, { useState, useCallback } from 'react';
import { vehicleAPI, apiHelpers } from '../services/api';
import { useVehicleForm } from '../hooks/useVehicleForm';
import { useVehicleValidation } from '../hooks/useVehicleValidation';
import DataTable from '../components/DataTable';
import VehicleDetailsSection from '../components/vehicle/sections/VehicleDetailsSection';
import VehiclePhotosSection from '../components/vehicle/sections/VehiclePhotosSection';
import DocumentsSection from '../components/vehicle/sections/DocumentsSection';
import GPSPermitSection from '../components/vehicle/sections/GPSPermitSection';
import FreightSection from '../components/vehicle/sections/FreightSection';
import './VehicleForm.css';

const VehicleFormRefactored = () => {
  const { vehicleData, setVehicleData, vehicles, files, errors, setErrors, isSubmitting, setIsSubmitting, isLoading, editingVehicle, setEditingVehicle, dateFilter, setDateFilter, modalImage, setModalImage, showModal, setShowModal, resetForm, handleInputChange, handleFileChange, generateVehicleCode, fetchVehicles, getExpiryStatus, handleEdit, handleDelete, handleFileDelete, handleExportVehicles, handleDateFilterApply, handleDateFilterClear } = useVehicleForm();
  const { validateForm, validateBeforeSubmit } = useVehicleValidation();

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateForm(vehicleData).isValid) return;
    await validateBeforeSubmit({ ...vehicleData, customer_id: vehicleData.customer_id, vendor_id: vehicleData.vendor_id, project_id: vehicleData.project_id, location_id: vehicleData.location_id, vehicle_number: vehicleData.VehicleRegistrationNo, engine_number: vehicleData.VehicleChasisNo, chassis_number: vehicleData.VehicleChasisNo, insurance_date: vehicleData.VehicleInsuranceDate }, async (validatedData) => { setIsSubmitting(true); await submitVehicleData(validatedData); }, (validationResult) => console.log('Vehicle validation failed:', validationResult.summary));
  }, [vehicleData, validateForm, validateBeforeSubmit]);

  const submitVehicleData = useCallback(async (validatedData) => {
    try {
      const formData = new FormData();
      Object.keys(validatedData).forEach(key => { !(validatedData[key] instanceof File) && validatedData[key] !== null && validatedData[key] !== undefined && validatedData[key] !== '' && formData.append(key, validatedData[key]); });
      Object.keys(files).forEach(fieldName => { files[fieldName] && files[fieldName] instanceof File && formData.append(fieldName, files[fieldName]); });

      editingVehicle ? await vehicleAPI.update(editingVehicle.VehicleID, formData) : await vehicleAPI.create(formData);
      apiHelpers.showSuccess(`Vehicle ${editingVehicle ? 'updated' : 'created'} successfully!`);
      resetForm();
      await fetchVehicles();
    } catch (error) {
      apiHelpers.showError(error, 'Failed to save vehicle');
    } finally {
      setIsSubmitting(false);
    }
  }, [files, editingVehicle, resetForm, fetchVehicles]);

  const vehicleColumns = [
    { key: 'VehicleRegistrationNo', label: 'Registration No', sortable: true },
    { key: 'VehicleCode', label: 'Vehicle Code', sortable: true },
    { key: 'VehicleModel', label: 'Model', sortable: true },
    { key: 'TypeOfBody', label: 'Body Type', sortable: true },
    { key: 'GPS', label: 'GPS', sortable: true, render: (value) => value === 1 || value === '1' || value === 'Yes' ? '✅ Yes' : '❌ No' }
  ];

  const commonSectionProps = { vehicleData, handleInputChange, files, editingVehicle, errors, handleFileChange, handleFileDelete, generateVehicleCode, getExpiryStatus };

  return (
    <div className="vehicle-form-container">
      <div className="form-header">
        <h1>🚛 Vehicle Master</h1>
        <p>Comprehensive vehicle onboarding and management system</p>
        {editingVehicle && (
          <div className="edit-notice">
            <span className="edit-notice-text">Editing: <strong className="edit-notice-item">{editingVehicle.VehicleRegistrationNo}</strong></span>
            <button type="button" onClick={resetForm} className="cancel-edit-btn">Cancel Edit</button>
          </div>
        )}
      </div>

      <div className="vehicle-form">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-sections">
            <VehicleDetailsSection {...commonSectionProps} />
            <VehiclePhotosSection {...commonSectionProps} />
            <DocumentsSection {...commonSectionProps} />
            <GPSPermitSection {...commonSectionProps} />
            <FreightSection {...commonSectionProps} />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isSubmitting} className="submit-btn">
              {isSubmitting ? 'Processing...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px', paddingRight: '10px' }}>
        <button onClick={handleExportVehicles} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,123,255,0.3)', transition: 'all 0.2s ease' }} onMouseOver={(e) => { e.target.style.backgroundColor = '#0056b3'; e.target.style.transform = 'translateY(-1px)'; }} onMouseOut={(e) => { e.target.style.backgroundColor = '#007bff'; e.target.style.transform = 'translateY(0)'; }} title="Export All Vehicles to Excel">📊 Export to Excel</button>
      </div>

      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: 'bold', minWidth: '80px' }}>From Date:</label>
          <input type="date" value={dateFilter.fromDate} onChange={(e) => setDateFilter(prev => ({ ...prev, fromDate: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: 'bold', minWidth: '70px' }}>To Date:</label>
          <input type="date" value={dateFilter.toDate} onChange={(e) => setDateFilter(prev => ({ ...prev, toDate: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} />
        </div>
        <button onClick={handleDateFilterApply} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>🔍 Filter</button>
        <button onClick={handleDateFilterClear} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>🗑️ Clear</button>
      </div>

      <DataTable title="📋 Vehicle Master List" data={vehicles} columns={vehicleColumns} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} keyField="VehicleID" emptyMessage="No vehicles found. Add your first vehicle above." showPagination customizable exportable={false} />

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
    </div>
  );
};

export default VehicleFormRefactored;
