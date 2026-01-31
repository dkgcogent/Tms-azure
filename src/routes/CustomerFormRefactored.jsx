import React, { useEffect, useCallback } from 'react';
import { customerAPI, apiHelpers } from '../services/api';
import DataTable from '../components/DataTable';
import AddressForm from '../components/AddressForm';
import ValidationErrorModal from '../components/ValidationErrorModal';
import PDFPreviewModal from '../components/PDFPreviewModal';
import DocumentActionModal from '../components/DocumentActionModal';
import { showWarning } from '../components/Notification';
import useFormValidation from '../hooks/useFormValidation';
import { useCustomerForm } from '../hooks/useCustomerForm';
import FormSection from '../components/customer/FormSection';
import FormField from '../components/customer/FormField';
import NameCodeSection from '../components/customer/sections/NameCodeSection';
import AgreementTermsSection from '../components/customer/sections/AgreementTermsSection';
import POSection from '../components/customer/sections/POSection';
import BillingSection from '../components/customer/sections/BillingSection';
import MISSection from '../components/customer/sections/MISSection';
import './CustomerForm.css';

// Utility functions
const formatDateForInput = (dateString) => dateString ? new Date(dateString).toISOString().split('T')[0] : '';
const validateLength = (value, min) => (!value || value.trim().length < min) ? { isValid: false, error: `Must be at least ${min} characters` } : { isValid: true, error: null };
const validateDateOrder = (startDate, endDate, fieldName) => (startDate && endDate && new Date(endDate) < new Date(startDate)) ? { isValid: false, error: `${fieldName} cannot be before start date` } : { isValid: true, error: null };
const safeJsonParse = (str, fallback) => { try { return JSON.parse(str); } catch { return fallback; } };
const SERVICE_CODE_MAP = { 'Transportation': 'TRP', 'Warehousing': 'WHS', 'Both': 'BTH', 'Logistics': 'LOG', 'Industrial Transport': 'IND', 'Retail Distribution': 'RTL', 'Other': 'OTH' };

const CustomerFormRefactored = () => {
  const { customerData, setCustomerData, customers, isLoading, isSubmitting, setIsSubmitting, editingCustomer, setEditingCustomer, errors, dateFilter, setDateFilter, resetForm, handleInputChange, loadCustomers, handleFileDelete, getExpiryStatus } = useCustomerForm();

  const { validateBeforeSubmit, showErrorModal, closeErrorModal, errorSummary, goToField } = useFormValidation('customer', {
    Name: (value) => validateLength(value, 2) || { isValid: false, error: 'Company name must be at least 2 characters' },
    MasterCustomerName: (value) => validateLength(value, 2) || { isValid: false, error: 'Master customer name must be at least 2 characters' },
    AgreementExpiryDate: (value, formData) => validateDateOrder(formData.AgreementDate, value, 'Agreement Expiry Date'),
    BGExpiryDate: (value, formData) => validateDateOrder(formData.BGDate, value, 'BG Expiry Date'),
    POExpiryDate: (value, formData) => validateDateOrder(formData.PODate, value, 'PO Expiry Date')
  });

  useEffect(() => {
    const serviceCode = SERVICE_CODE_MAP[customerData.TypeOfServices];
    if (serviceCode && serviceCode !== customerData.ServiceCode) {
      setCustomerData(prev => ({ ...prev, ServiceCode: serviceCode }));
    }
  }, [customerData.TypeOfServices, customerData.ServiceCode, setCustomerData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !validateBeforeSubmit(customerData).isValid) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(customerData).forEach(([key, value]) => {
        if (value instanceof File) formData.append(key, value);
        else if (typeof value === 'object' && value !== null) formData.append(key, JSON.stringify(value));
        else if (value !== null && value !== undefined && value !== '') formData.append(key, value);
      });

      const action = editingCustomer ? 'update' : 'create';
      const params = editingCustomer ? [editingCustomer.CustomerID, formData] : [formData];
      await customerAPI[action](...params);
      showWarning(`Customer ${action}d successfully!`, 'success');
      resetForm();
      await loadCustomers();
    } catch (error) {
      apiHelpers.handleError(error, editingCustomer ? 'updating customer' : 'creating customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = useCallback((customer) => {
    const editableCustomerData = { ...customer };

    // Parse JSON fields with fallbacks
    const jsonFields = {
      PrimaryContact: { CustomerMobileNo: '', AlternateMobileNo: '', CustomerEmail: '', CustomerContactPerson: '', CustomerGroup: '' },
      AdditionalContacts: [],
      CustomerSite: [{ location: '', site: '' }],
      CustomerCogentContact: { CustomerOwner: '', ProjectHead: '', OpsHead: '', OpsManager: '', Supervisor: '' }
    };

    Object.entries(jsonFields).forEach(([field, fallback]) => {
      if (customer[field] && typeof customer[field] === 'string') {
        editableCustomerData[field] = safeJsonParse(customer[field], fallback);
      }
    });

    // Format dates and set file paths
    ['AgreementDate', 'AgreementExpiryDate', 'BGDate', 'BGExpiryDate', 'PODate', 'POExpiryDate'].forEach(field => {
      if (editableCustomerData[field]) editableCustomerData[field] = formatDateForInput(editableCustomerData[field]);
    });

    ['AgreementFile', 'BGFile', 'BGReceivingFile', 'POFile', 'RatesAnnexureFile', 'MISFormatFile', 'KPISLAFile', 'PerformanceReportFile'].forEach(field => {
      editableCustomerData[field] = customer[field] || '';
    });

    setCustomerData(editableCustomerData);
    setEditingCustomer(customer);
  }, [setCustomerData, setEditingCustomer]);

  const handleDelete = useCallback(async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await customerAPI.delete(customerId);
      showWarning('Customer deleted successfully!', 'success');
      await loadCustomers();
    } catch (error) {
      apiHelpers.handleError(error, 'deleting customer');
    }
  }, [loadCustomers]);

  const updateSite = (index, field, value) => {
    const newSites = [...customerData.CustomerSite];
    newSites[index][field] = value;
    setCustomerData(prev => ({ ...prev, CustomerSite: newSites }));
  };

  const renderMultipleCustomerSites = () => (
    <div className="form-group full-width">
      <label className="form-label">Customer Sites</label>
      {customerData.CustomerSite.map((site, index) => (
        <div key={index} className="customer-site-row">
          <input type="text" placeholder="Location" value={site.location} onChange={(e) => updateSite(index, 'location', e.target.value)} />
          <input type="text" placeholder="Site" value={site.site} onChange={(e) => updateSite(index, 'site', e.target.value)} />
          {customerData.CustomerSite.length > 1 && (
            <button type="button" onClick={() => setCustomerData(prev => ({ ...prev, CustomerSite: prev.CustomerSite.filter((_, i) => i !== index) }))} className="remove-site-btn">Remove</button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => setCustomerData(prev => ({ ...prev, CustomerSite: [...prev.CustomerSite, { location: '', site: '' }] }))} className="add-site-btn">Add Site</button>
    </div>
  );

  return (
    <div className="customer-form-container">
      <div className="form-header">
        <h2>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
        {editingCustomer && (
          <button 
            type="button" 
            onClick={resetForm}
            className="cancel-edit-btn"
          >
            Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-sections">
          {/* Create common props object to reduce repetition */}
          {(() => {
            const commonProps = { customerData, setCustomerData, handleInputChange, handleFileDelete, editingCustomer, errors, getExpiryStatus };
            return (
              <>
                <NameCodeSection {...commonProps} renderMultipleCustomerSites={renderMultipleCustomerSites} />
                <AgreementTermsSection {...commonProps} />
                <POSection {...commonProps} />
                <BillingSection {...commonProps} />
                <MISSection {...commonProps} />
              </>
            );
          })()}

          <FormSection title="6. Address Section">
            <AddressForm addressData={{ house_flat_no: customerData.house_flat_no, street_locality: customerData.street_locality, city: customerData.city, state: customerData.state, pin_code: customerData.pin_code, country: customerData.country }} onAddressChange={(addressData) => setCustomerData(prev => ({ ...prev, ...addressData }))} errors={errors} />
          </FormSection>

          <FormSection title="7. Primary Contact">
            {[
              { label: 'Mobile No', field: 'CustomerMobileNo', placeholder: 'Enter mobile number' },
              { label: 'Alternate Mobile No', field: 'AlternateMobileNo', placeholder: 'Enter alternate mobile number' },
              { label: 'Email', field: 'CustomerEmail', type: 'email', placeholder: 'Enter email address' },
              { label: 'Contact Person', field: 'CustomerContactPerson', placeholder: 'Enter contact person name' },
              { label: 'Customer Group', field: 'CustomerGroup', placeholder: 'Enter customer group' }
            ].map(({ label, field, type = 'text', placeholder }) => (
              <FormField key={field} label={label} name={`PrimaryContact.${field}`} type={type} value={customerData.PrimaryContact?.[field]} onChange={(_name, value) => setCustomerData(prev => ({ ...prev, PrimaryContact: { ...prev.PrimaryContact, [field]: value } }))} options={{ placeholder }} />
            ))}
          </FormSection>

          <FormSection title="8. Cogent Contact">
            {['CustomerOwner', 'ProjectHead', 'OpsHead', 'OpsManager', 'Supervisor'].map(field => (
              <FormField key={field} label={field.replace(/([A-Z])/g, ' $1').trim()} name={`CustomerCogentContact[${field}]`} type="text" value={customerData.CustomerCogentContact?.[field]} onChange={handleInputChange} options={{ placeholder: 'Enter name' }} />
            ))}
          </FormSection>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting} className="submit-btn">
            {isSubmitting ? 'Processing...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
        <h3>Customer List</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input type="date" value={dateFilter.fromDate} onChange={(e) => setDateFilter(prev => ({ ...prev, fromDate: e.target.value }))} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
          <span>to</span>
          <input type="date" value={dateFilter.toDate} onChange={(e) => setDateFilter(prev => ({ ...prev, toDate: e.target.value }))} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
          <button onClick={() => console.log('Apply date filter:', dateFilter)} style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Apply Filter</button>
          <button onClick={() => console.log('Export customers')} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Export to Excel</button>
        </div>
      </div>

      <DataTable data={customers} columns={[{ key: 'CustomerCode', label: 'Customer Code' }, { key: 'MasterCustomerName', label: 'Master Customer' }, { key: 'Name', label: 'Company Name' }, { key: 'TypeOfServices', label: 'Services' }, { key: 'CustomerMobileNo', label: 'Mobile' }, { key: 'CustomerEmail', label: 'Email' }, { key: 'CreatedAt', label: 'Created', type: 'date' }]} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} searchable exportable title="Customers" />
      <ValidationErrorModal isOpen={showErrorModal} onClose={closeErrorModal} errors={errorSummary} onGoToField={goToField} />
      <PDFPreviewModal isOpen={false} onClose={() => {}} pdfUrl="" fileName="" />
      <DocumentActionModal isOpen={false} onClose={() => {}} fileType="" fileName="" onDownload={() => {}} onOpenInNewTab={() => {}} />
    </div>
  );
};

export default CustomerFormRefactored;
