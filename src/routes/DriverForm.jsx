import React, { useState, useEffect } from 'react';
import { driverAPI, vendorAPI, apiHelpers } from '../services/api';
import DataTable from '../components/DataTable';
import Dropdown from '../components/Dropdown';
import SearchableDropdown from '../components/SearchableDropdown';

import AddressForm from '../components/AddressForm';
import DocumentUpload from '../components/DocumentUpload';
import ValidatedInput from '../components/ValidatedInput';
import ValidationErrorModal from '../components/ValidationErrorModal';
import useFormValidation from '../hooks/useFormValidation';
import './DriverForm.css';
// Simple date formatting function
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

const DriverForm = () => {
  // Global validation system - simplified to avoid errors
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorSummary, setErrorSummary] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateBeforeSubmit = async (formData, successCallback, errorCallback) => {
    try {
      // Basic validation
      const errors = {};

      // Check required fields
      if (!formData.DriverName) {
        errors.DriverName = 'Driver Name is required';
      }
      if (!formData.DriverLicenceNo) {
        errors.DriverLicenceNo = 'Driver Licence Number is required';
      }
      if (!formData.DriverMobileNo) {
        errors.DriverMobileNo = 'Driver Mobile Number is required';
      }

      if (Object.keys(errors).length > 0) {
        setErrors(errors);
        if (errorCallback) {
          errorCallback({ isValid: false, errors, summary: 'Please fill in all required fields' });
        }
        return false;
      }

      // Clear errors and call success callback
      setErrors({});
      if (successCallback) {
        await successCallback(formData);
      }
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      if (errorCallback) {
        errorCallback({ isValid: false, errors: {}, summary: 'Validation failed' });
      }
      return false;
    }
  };

  const closeErrorModal = () => setShowErrorModal(false);
  const goToField = (fieldName) => {
    const element = document.querySelector(`[name="${fieldName}"]`);
    if (element) element.focus();
  };

  const getInitialState = () => ({
    DriverName: '',
    DriverLicenceNo: '',
    DriverMobileNo: '',
    DriverAddress: '',
    vendor_id: '', // Vendor assignment
    // Structured Address Fields
    house_flat_no: '',
    street_locality: '',
    city: '',
    state: '',
    pin_code: '',
    country: 'India',
    DriverLicenceIssueDate: '',
    DriverLicenceExpiryDate: '',
    DriverMedicalDate: '',
    DriverSameAsVendor: 'Separate',
    DriverAlternateNo: '',
    DriverTotalExperience: '',
    // File fields are now handled in separate files state
    DriverPhoto: null, // Keep for existing file reference
    DriverPhoto_url: null, // Keep for existing file URL
  });

  const [driverData, setDriverData] = useState(getInitialState());
  const [drivers, setDrivers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);

  // Separate files state for new file uploads (following Vendor Form pattern)
  const [files, setFiles] = useState({
    DriverPhoto: null,
  });

  // Track files marked for deletion (will be deleted on form submit)
  const [filesToDelete, setFilesToDelete] = useState([]);

  // Date filter state
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: ''
  });

  // Date filter handlers
  const handleDateFilterApply = async () => {
    if (!dateFilter.fromDate || !dateFilter.toDate) {
      alert('Please select both From Date and To Date');
      return;
    }

    if (new Date(dateFilter.fromDate) > new Date(dateFilter.toDate)) {
      alert('From Date cannot be later than To Date');
      return;
    }

    console.log('🗓️ Applying date filter to drivers:', dateFilter);
    await fetchDrivers();
  };

  const handleDateFilterClear = async () => {
    setDateFilter({
      fromDate: '',
      toDate: ''
    });
    console.log('🗑️ Clearing driver date filter');
    await fetchDrivers();
  };

  // State for modal viewer
  const [modalImage, setModalImage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchDrivers();
    fetchVendors();
  }, []);

  // Auto-calculate Driver Total Experience based on Licence Issue Date
  useEffect(() => {
    if (driverData.DriverLicenceIssueDate) {
      const issueDate = new Date(driverData.DriverLicenceIssueDate);
      const today = new Date();

      // Check if the date is valid
      if (!isNaN(issueDate.getTime()) && issueDate <= today) {
        // Calculate the difference in years
        const diffInMs = today - issueDate;
        const diffInYears = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 365.25));

        // Only update if the calculated value is different from current value
        // This prevents infinite loops and allows manual editing
        if (diffInYears >= 0 && driverData.DriverTotalExperience !== diffInYears.toString()) {
          setDriverData(prev => ({
            ...prev,
            DriverTotalExperience: diffInYears.toString()
          }));
        }
      }
    }
  }, [driverData.DriverLicenceIssueDate]); // Only watch DriverLicenceIssueDate

  // Handle address changes from AddressForm component
  const handleAddressChange = (newAddressData) => {
    setDriverData(prev => ({
      ...prev,
      ...newAddressData,
      // Also update the combined address field for backward compatibility
      DriverAddress: `${newAddressData.house_flat_no || ''}, ${newAddressData.street_locality || ''}, ${newAddressData.city || ''}, ${newAddressData.state || ''}, ${newAddressData.pin_code || ''}${newAddressData.country && newAddressData.country !== 'India' ? ', ' + newAddressData.country : ''}`
    }));
  };

  // Get address data for AddressForm component
  const getAddressData = () => ({
    house_flat_no: driverData.house_flat_no || '',
    street_locality: driverData.street_locality || '',
    city: driverData.city || '',
    state: driverData.state || '',
    pin_code: driverData.pin_code || '',
    country: driverData.country || 'India'
  });

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const response = await driverAPI.getAll();
      setDrivers(response.data.value || response.data || []);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to fetch drivers');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await vendorAPI.getAll();
      setVendors(response.data.value || response.data || []);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to load vendors');
    }
  };



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDriverData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Create a wrapper function for each DocumentUpload field (following Vendor Form pattern)
  const createFileChangeHandler = (fieldName) => {
    return (file) => {
      console.log(`📁 DRIVER FILE CHANGE - ${fieldName}:`, file);
      setFiles(prev => ({
        ...prev,
        [fieldName]: file
      }));
    };
  };

  // Enhanced file change handler for new component
  const handleEnhancedFileChange = (fieldName, file) => {
    setDriverData(prev => ({
      ...prev,
      [fieldName]: file
    }));
  };

  // Helper function to get file preview URL
  const getFilePreview = (file) => {
    if (!file) return null;

    if (file.type && file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to get existing image URL from database path
  const getExistingImageUrl = (imagePath) => {
    if (!imagePath) return null;

    // Check if it's already a full URL
    if (imagePath.startsWith('http')) return imagePath;

    // Create URL for server-stored image - use backend port 3004
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004';

    // Extract just the filename from the path
    let filename = imagePath;
    if (imagePath.includes('/') || imagePath.includes('\\')) {
      filename = imagePath.split(/[\\/]/).pop();
    }

    // Use the proper API endpoint for drivers
    return `${baseUrl}/api/drivers/files/${filename}`;
  };

  // Helper function to render comprehensive file preview (images and documents)
  const renderFilePreview = (fieldName, displayName = null) => {
    const newFile = driverData[fieldName];
    const existingPath = editingDriver?.[fieldName];

    if (!newFile && !existingPath) return null;

    const isImage = (file) => {
      if (file && file.type) return file.type.startsWith('image/');
      if (typeof file === 'string') return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
      return false;
    };

    const getFileIcon = (fileName) => {
      const ext = fileName?.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'pdf': return '📄';
        case 'doc':
        case 'docx': return '📝';
        case 'xls':
        case 'xlsx': return '📊';
        default: return '📎';
      }
    };

    return (
      <div className="file-preview">
        {newFile && newFile.name ? (
          // Show newly selected file preview
          isImage(newFile) ? (
            <img
              src={getFilePreview(newFile)}
              alt={`${displayName || fieldName} Preview`}
              className="image-preview clickable-preview"
              onClick={() => {
                setModalImage(getFilePreview(newFile));
                setShowModal(true);
              }}
              title="Click to view full size"
            />
          ) : (
            <div className="document-preview">
              <span className="document-icon">{getFileIcon(newFile.name)}</span>
              <span className="document-type">{newFile.type || 'Document'}</span>
            </div>
          )
        ) : (
          // Show existing file from database
          existingPath && (
            isImage(existingPath) ? (
              <img
                src={getExistingImageUrl(existingPath)}
                alt={`Existing ${displayName || fieldName}`}
                className="image-preview clickable-preview"
                onClick={() => {
                  setModalImage(getExistingImageUrl(existingPath));
                  setShowModal(true);
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  console.warn(`Failed to load existing image for ${fieldName}:`, existingPath);
                }}
                title="Click to view full size"
              />
            ) : (
              <div className="document-preview">
                <span className="document-icon">{getFileIcon(existingPath)}</span>
                <span className="document-type">Document</span>
                <a
                  href={getExistingImageUrl(existingPath)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="document-link"
                >
                  View Document
                </a>
              </div>
            )
          )
        )}
        <div className="file-info">
          {newFile && newFile.name ? (
            <>
              <span className="file-name">{newFile.name}</span>
              <span className="file-size">({formatFileSize(newFile.size)})</span>
            </>
          ) : (
            <span className="file-name">Existing: {existingPath?.split('/').pop() || fieldName}</span>
          )}
        </div>
      </div>
    );
  };


  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!driverData.DriverName.trim()) {
      newErrors.DriverName = 'Driver name is required';
    }
    if (!driverData.DriverLicenceNo.trim()) {
      newErrors.DriverLicenceNo = 'Licence number is required';
    }

    if (driverData.DriverLicenceIssueDate && driverData.DriverLicenceExpiryDate && driverData.DriverLicenceIssueDate > driverData.DriverLicenceExpiryDate) {
      newErrors.DriverLicenceExpiryDate = 'Licence expiry date cannot be before issue date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper function to parse full address into individual fields
  const parseFullAddress = (fullAddress) => {
    if (!fullAddress) return {};

    // Try to parse address like "849, kjsdhk, Kurnool, Andhra Pradesh, 518501"
    const parts = fullAddress.split(',').map(part => part.trim());

    if (parts.length >= 4) {
      return {
        house_flat_no: parts[0] || '',
        street_locality: parts[1] || '',
        city: parts[2] || '',
        state: parts[3] || '',
        pin_code: parts[4] || ''
      };
    } else if (parts.length >= 2) {
      return {
        street_locality: parts.slice(0, -2).join(', ') || '',
        city: parts[parts.length - 2] || '',
        state: parts[parts.length - 1] || ''
      };
    }

    return { street_locality: fullAddress };
  };

  const resetForm = () => {
    setDriverData(getInitialState());
    setErrors({});
    setEditingDriver(null);
    // Reset files state (following Vendor Form pattern)
    setFiles({
      DriverPhoto: null,
    });

    // Clear files marked for deletion
    setFilesToDelete([]);
  };

  // Direct backend export function
  const handleExportDrivers = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const exportUrl = `${API_BASE_URL}/api/export/drivers`;

      // Show loading message
      const loadingToast = document.createElement('div');
      loadingToast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #007bff; color: white; padding: 15px 20px;
        border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif; font-size: 14px;
      `;
      loadingToast.textContent = '🔄 Exporting drivers... Please wait';
      document.body.appendChild(loadingToast);

      // Create download link
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = `Driver_Master_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Remove loading and show success
      document.body.removeChild(loadingToast);

      const successToast = document.createElement('div');
      successToast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #28a745; color: white; padding: 15px 20px;
        border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif; font-size: 14px;
      `;
      successToast.innerHTML = `✅ Driver Export Started!<br><small>Downloading ALL driver master fields + vendor info</small>`;
      document.body.appendChild(successToast);
      setTimeout(() => {
        if (document.body.contains(successToast)) {
          document.body.removeChild(successToast);
        }
      }, 5000);

    } catch (error) {
      console.error('Export error:', error);
      alert(`❌ Export failed: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Use global validation system with error modal and cursor movement
    const isValid = await validateBeforeSubmit(
      driverData,
      // Success callback
      async (validatedData) => {
        await submitDriverData(validatedData);
      },
      // Error callback
      (validationResult) => {
        console.log('Driver validation failed:', validationResult.summary);
        // Error modal will be shown automatically
      }
    );

    if (!isValid) {
      return; // Validation failed, modal shown, cursor moved
    }
  };

  // Separate function for actual data submission
  const submitDriverData = async (validatedData) => {

    setIsSubmitting(true);

    try {
      // If editing, delete marked files first before updating
      if (editingDriver && filesToDelete.length > 0) {
        console.log('🗑️ DRIVER UPDATE - Deleting marked files:', filesToDelete);

        for (const fileToDelete of filesToDelete) {
          try {
            console.log('🗑️ Deleting file:', fileToDelete.fieldName);
            await driverAPI.deleteFile(editingDriver.DriverID, fileToDelete.fieldName);
            console.log('✅ File deleted successfully:', fileToDelete.fieldName);
          } catch (error) {
            console.error('❌ Failed to delete file:', fileToDelete.fieldName, error);
            // Continue with other deletions even if one fails
          }
        }

        // Clear the marked deletions after processing
        setFilesToDelete([]);
      }

      // Create FormData for file upload support
      const formData = new FormData();

      // Add text fields - only add non-empty values to preserve existing data
      if (driverData.DriverName && driverData.DriverName.trim()) {
        formData.append('DriverName', driverData.DriverName.trim());
      }
      if (driverData.DriverLicenceNo && driverData.DriverLicenceNo.trim()) {
        formData.append('DriverLicenceNo', driverData.DriverLicenceNo.trim());
      }
      if (driverData.DriverMobileNo && driverData.DriverMobileNo.trim()) {
        formData.append('DriverMobileNo', driverData.DriverMobileNo.trim());
      }
      if (driverData.DriverAddress && driverData.DriverAddress.trim()) {
        formData.append('DriverAddress', driverData.DriverAddress.trim());
      }
      if (driverData.DriverLicenceIssueDate) {
        formData.append('DriverLicenceIssueDate', driverData.DriverLicenceIssueDate);
      }
      if (driverData.DriverLicenceExpiryDate) {
        formData.append('DriverLicenceExpiryDate', driverData.DriverLicenceExpiryDate);
      }
      if (driverData.DriverMedicalDate) {
        formData.append('DriverMedicalDate', driverData.DriverMedicalDate);
      }
      formData.append('DriverSameAsVendor', driverData.DriverSameAsVendor || 'Separate');
      if (driverData.DriverAlternateNo && driverData.DriverAlternateNo.trim()) {
        formData.append('DriverAlternateNo', driverData.DriverAlternateNo.trim());
      }
      if (driverData.DriverTotalExperience) {
        formData.append('DriverTotalExperience', driverData.DriverTotalExperience);
      }
      if (driverData.vendor_id) {
        formData.append('VendorID', driverData.vendor_id);
      }



      // Add file only if a new file is selected (following Vendor Form pattern)
      if (files.DriverPhoto && files.DriverPhoto.name) {
        formData.append('DriverPhoto', files.DriverPhoto);
        console.log('📁 DRIVER FORM - Adding new photo to FormData:', files.DriverPhoto.name);
      }
      // Note: If no new file is selected, we don't send any file data
      // The backend will preserve the existing photo automatically



      if (editingDriver) {
        await driverAPI.update(editingDriver.DriverID, formData);
        apiHelpers.showSuccess('Driver updated successfully!');
      } else {
        await driverAPI.create(formData);
        apiHelpers.showSuccess('Driver created successfully!');
      }

      resetForm();
      await fetchDrivers();
    } catch (error) {
      apiHelpers.showError(error, 'Failed to save driver');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (driver) => {
    try {
      // Fetch complete driver data with all URLs from API
      const response = await driverAPI.getById(driver.DriverID);
      const completeDriverData = response.data || response;



      setEditingDriver(completeDriverData);

      const editData = {
        DriverName: completeDriverData.DriverName || '',
        DriverLicenceNo: completeDriverData.DriverLicenceNo || '',
        DriverMobileNo: completeDriverData.DriverMobileNo || '',
        DriverAddress: completeDriverData.DriverAddress || '',
        // Fix field name mapping - database uses different field names
        DriverLicenceIssueDate: formatDateForInput(completeDriverData.DriverLicenceIssueDate),
        DriverLicenceExpiryDate: formatDateForInput(completeDriverData.LicenceExpiry), // Database field: LicenceExpiry
        DriverMedicalDate: formatDateForInput(completeDriverData.MedicalDate), // Database field: MedicalDate
        DriverSameAsVendor: completeDriverData.DriverSameAsVendor || 'Separate',
        DriverAlternateNo: completeDriverData.DriverAlternateNo || '',
        DriverTotalExperience: completeDriverData.DriverTotalExperience || '',
        vendor_id: completeDriverData.VendorID || '',
        // Address fields - handle both individual fields and full address
        house_flat_no: completeDriverData.HouseFlatNo || '',
        street_locality: completeDriverData.StreetLocality || '',
        city: completeDriverData.DriverCity || '',
        state: completeDriverData.DriverState || '',
        pin_code: completeDriverData.DriverPinCode || '',
        country: completeDriverData.DriverCountry || 'India',
        // If individual address fields are empty but full address exists, parse it
        ...((!completeDriverData.HouseFlatNo && !completeDriverData.StreetLocality && completeDriverData.DriverAddress) ?
          parseFullAddress(completeDriverData.DriverAddress) : {}),

        // Keep existing photo reference for display with complete URL data
        DriverPhoto: completeDriverData.DriverPhoto || null,
        DriverPhoto_url: completeDriverData.DriverPhoto_url || null
      };

      setDriverData(editData);
      setErrors({});

      // Reset files state for edit mode - only new file uploads should be in files state
      // Existing files are handled through the _url fields in driverData (following Vendor Form pattern)
      setFiles({
        DriverPhoto: null,
      });

      // Scroll to top of the page to show the form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error fetching complete driver data:', error);
      // Fallback to using the passed driver data
      setEditingDriver(driver);

      // Still populate form with available data
      const fallbackEditData = {
        DriverName: driver.DriverName || '',
        DriverLicenceNo: driver.DriverLicenceNo || '',
        DriverMobileNo: driver.DriverMobileNo || '',
        DriverPhoto: driver.DriverPhoto || null,
        DriverPhoto_url: driver.DriverPhoto_url || null
      };

      setDriverData(fallbackEditData);
      setErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
      apiHelpers.showError('Could not fetch complete driver data. Some images may not display.');
    }
  };

  const handleDelete = async (driver) => {
    if (!window.confirm(`Are you sure you want to delete driver "${driver.DriverName}"?`)) {
      return;
    }

    try {
      await driverAPI.delete(driver.DriverID);
      apiHelpers.showSuccess('Driver deleted successfully!');
      await fetchDrivers();
    } catch (error) {
      apiHelpers.showError(error, 'Failed to delete driver');
    }
  };

  const handleBulkDelete = async (driverIds) => {
    console.log('🗑️ Bulk delete requested for driver IDs:', driverIds);

    if (driverIds.length === 0) {
      apiHelpers.showError(null, 'No drivers selected for deletion.');
      return;
    }

    // Get driver names for confirmation
    const selectedDrivers = drivers.filter(d => driverIds.includes(d.DriverID));
    const driverNames = selectedDrivers.map(d => d.DriverName).join(', ');
    const confirmMessage = driverIds.length === 1
      ? `Are you sure you want to delete "${driverNames}"?`
      : `Are you sure you want to delete ${driverIds.length} drivers?\n\nDrivers: ${driverNames}`;

    if (window.confirm(confirmMessage)) {
      try {
        const response = await driverAPI.bulkDelete(driverIds);

        if (response.data.deletedCount > 0) {
          apiHelpers.showSuccess(
            `Successfully deleted ${response.data.deletedCount} driver(s)!` +
            (response.data.notFoundCount > 0 ? ` (${response.data.notFoundCount} not found)` : '')
          );
        } else {
          apiHelpers.showError(null, 'No drivers were deleted. They may have already been removed.');
        }

        await fetchDrivers(); // Refresh the list
      } catch (error) {
        console.error('Error bulk deleting drivers:', error);

        // Provide specific error messages for bulk deletion
        let errorMessage;
        if (error.response?.status === 400) {
          errorMessage = 'Cannot delete one or more drivers because they are linked to other records. Please remove related records first.';
        } else if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to delete these drivers.';
        } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
          errorMessage = 'Unable to connect to server. Please check your connection and try again.';
        } else {
          errorMessage = 'Unable to delete drivers. Please try again.';
        }

        apiHelpers.showError(error, errorMessage);
      }
    }
  };

  // Handle file deletion during edit
  // Handle file deletion during edit - Mark for deletion, don't delete immediately
  const handleFileDelete = (fieldName) => {
    try {
      if (!editingDriver) {
        console.warn('⚠️ No driver being edited, ignoring delete request');
        return;
      }

      console.log('🗑️ DRIVER FILE MARK FOR DELETE - Field:', fieldName);

      // Mark this file for deletion (will be deleted when form is submitted)
      setFilesToDelete(prev => {
        // Avoid duplicates
        if (!prev.some(item => item.fieldName === fieldName)) {
          return [...prev, { fieldName: fieldName }];
        }
        return prev;
      });

      // Update form data to remove the URL reference (clear UI preview)
      setDriverData(prev => ({
        ...prev,
        [`${fieldName}_url`]: null, // Remove the URL reference to clear preview
      }));

      // Update editing driver data to remove the URL reference
      setEditingDriver(prev => ({
        ...prev,
        [`${fieldName}_url`]: null
      }));

      // Also clear any file input state
      setFiles(prev => ({
        ...prev,
        [fieldName]: null
      }));

      console.log('✅ DRIVER FILE MARKED FOR DELETE - Will be deleted on form submit:', {
        fieldName,
        urlField: fieldName + '_url'
      });

    } catch (error) {
      console.error('🗑️ DRIVER FILE MARK DELETE ERROR:', error);
      apiHelpers.showError(error, 'Failed to mark file for deletion');
    }
  };

  const driverColumns = [
    { key: 'DriverName', label: 'Driver Name', sortable: true },
    { key: 'DriverLicenceNo', label: 'Licence No', sortable: true },
    { key: 'DriverMobileNo', label: 'Mobile', sortable: true },
    { key: 'DriverAlternateNo', label: 'Alt. Mobile', sortable: true },
    {
      key: 'DriverLicenceExpiryDate',
      label: 'Licence Expiry',
      sortable: true,
      type: 'date'
    },
    {
      key: 'DriverAddress',
      label: 'Address',
      sortable: false,
      render: (value) => value ? (value.length > 30 ? value.substring(0, 30) + '...' : value) : '-'
    },
  ];

  return (
    <div className="driver-form-container">
      {/* Header */}
      <div className="form-header">
        <h1>👨‍💼 Driver Management</h1>
        <p>Add and manage drivers with their details</p>



        {/* Edit Mode Notice */}
        {editingDriver && (
          <div className="edit-notice">
            <span className="edit-notice-text">
              Editing: <strong className="edit-notice-item">{editingDriver.DriverName}</strong>
            </span>
            <button type="button" onClick={resetForm} className="cancel-edit-btn">
              Cancel Edit
            </button>
          </div>
        )}
      </div>

      {/* Form Section */}
      <div className="form-layout-card">
        <form onSubmit={handleSubmit} className="form-content">
          {/* Section 1: Basic Information */}
          <div className="form-section">
            <h4>👤 Basic Information</h4>
            <div className="form-fields-grid">
              {/* Driver - Same as Vendor / Separate */}
              <div className="form-field">
                <label className="form-field-label">Driver - Same as Vendor / Separate</label>
                <select
                  name="DriverSameAsVendor"
                  value={driverData.DriverSameAsVendor}
                  onChange={handleInputChange}
                  className="form-field-select"
                >
                  <option value="Separate">Separate</option>
                  <option value="Same as Vendor">Same as Vendor</option>
                </select>
              </div>

            {/* Driver Name */}
            {driverData.DriverSameAsVendor === 'Same as Vendor' ? (
              <div className="form-field">
                <label className="form-field-label">
                  Vendor <span className="required-indicator">*</span>
                </label>
                <SearchableDropdown
                  name="vendor_id"
                  value={driverData.vendor_id}
                  onChange={async (e) => {
                    const { value } = e.target;

                    if (!value) {
                      // If no vendor selected, just update vendor_id
                      setDriverData(prev => ({ ...prev, vendor_id: '' }));
                      return;
                    }

                    try {
                      // Fetch complete vendor data including all fields and file URLs
                      const response = await vendorAPI.getById(value);
                      const vendorData = response.data;

                      // Map vendor fields to driver fields
                      setDriverData(prev => ({
                        ...prev,
                        vendor_id: value,
                        // Basic Information
                        DriverName: vendorData.vendor_name || vendorData.VendorName || '',
                        DriverMobileNo: vendorData.vendor_mobile_no || vendorData.VendorMobileNo || '',
                        DriverAlternateNo: vendorData.vendor_alternate_no || vendorData.VendorAlternateNo || '',
                        // Address Fields
                        house_flat_no: vendorData.house_flat_no || vendorData.HouseFlatNo || '',
                        street_locality: vendorData.street_locality || vendorData.StreetLocality || '',
                        city: vendorData.city || vendorData.City || '',
                        state: vendorData.state || vendorData.State || '',
                        pin_code: vendorData.pin_code || vendorData.PinCode || '',
                        country: vendorData.country || vendorData.Country || 'India',
                        // Construct full address for backward compatibility
                        DriverAddress: `${vendorData.house_flat_no || vendorData.HouseFlatNo || ''}, ${vendorData.street_locality || vendorData.StreetLocality || ''}, ${vendorData.city || vendorData.City || ''}, ${vendorData.state || vendorData.State || ''}, ${vendorData.pin_code || vendorData.PinCode || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',').trim(),
                        // Photo URL - Map vendor photo to driver photo
                        DriverPhoto_url: vendorData.vendor_photo_url || null,
                      }));

                      apiHelpers.showSuccess('Vendor details auto-filled successfully!');

                    } catch (error) {
                      console.error('❌ Error fetching vendor data:', error);
                      apiHelpers.showError(error, 'Failed to fetch vendor details');

                      // Fallback to basic vendor data from the list
                      const selectedVendor = vendors.find(v => v.VendorID == value);
                      if (selectedVendor) {
                        setDriverData(prev => ({
                          ...prev,
                          vendor_id: value,
                          DriverName: selectedVendor.VendorName || '',
                          DriverMobileNo: selectedVendor.VendorMobileNo || '',
                          DriverAddress: selectedVendor.VendorAddress || '',
                        }));
                      }
                    }
                  }}
                  options={vendors}
                  valueKey="VendorID"
                  labelKey="VendorName"
                  placeholder="Select a vendor"
                  required
                  error={errors.vendor_id}
                />
              </div>
            ) : (
              <div className="form-field">
                <label className="form-field-label">
                  Driver Name <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  name="DriverName"
                  value={driverData.DriverName}
                  onChange={handleInputChange}
                  placeholder="Enter driver name"
                  required
                  className={`form-input ${errors.DriverName ? 'error' : ''}`}
                />
                {errors.DriverName && <div className="form-field-error">{errors.DriverName}</div>}
              </div>
            )}

            {/* Mobile Number - Enhanced Validation */}
            <ValidatedInput
              name="DriverMobileNo"
              value={driverData.DriverMobileNo}
              onChange={handleInputChange}
              validationRule="MOBILE"
              required={false}
              label="Mobile Number"
              placeholder="Enter mobile number"
              showFormatHint={true}
              autoFormat={true}
            />

            {/* Driver Alternate No / Family No - Enhanced Validation */}
            <ValidatedInput
              name="DriverAlternateNo"
              value={driverData.DriverAlternateNo}
              onChange={handleInputChange}
              validationRule="MOBILE"
              required={false}
              label="Driver Alternate No. / Family No."
              placeholder="Enter alternate/family contact number"
              showFormatHint={true}
              autoFormat={true}
            />

            {/* Driver Photo - Following Vendor Form Pattern */}
            <DocumentUpload
              label="Driver Photo"
              name="DriverPhoto"
              value={files.DriverPhoto}
              onChange={createFileChangeHandler('DriverPhoto')}
              onDelete={() => handleFileDelete('DriverPhoto')}
              accept="image/*,.pdf,.doc,.docx"
              required={false}
              existingFileUrl={driverData.DriverPhoto_url || null}
              isEditing={!!editingDriver}
              entityType="drivers"
            />
            </div>
          </div>

          {/* Section 2: License & Medical Information */}
          <div className="form-section">
            <h4>📋 License & Medical Information</h4>
            <div className="form-fields-grid">
            {/* Licence Number */}
            <div className="form-field">
              <label className="form-field-label">
                Licence Number <span className="required-indicator">*</span>
              </label>
              <input
                type="text"
                name="DriverLicenceNo"
                value={driverData.DriverLicenceNo}
                onChange={handleInputChange}
                placeholder="Enter licence number"
                required
                className={`form-input ${errors.DriverLicenceNo ? 'error' : ''}`}
              />
              {errors.DriverLicenceNo && <div className="form-field-error">{errors.DriverLicenceNo}</div>}
            </div>

            {/* Licence Issue Date */}
            <div className="form-field">
              <label className="form-field-label">Licence Issue Date (Optional)</label>
              <input
                type="date"
                name="DriverLicenceIssueDate"
                value={driverData.DriverLicenceIssueDate}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]}
                className="form-input"
              />
            </div>

            {/* Licence Expiry Date */}
            <div className="form-field">
              <label className="form-field-label">Licence Expiry Date (Optional)</label>
              <input
                type="date"
                name="DriverLicenceExpiryDate"
                value={driverData.DriverLicenceExpiryDate}
                onChange={handleInputChange}
                min={driverData.DriverLicenceIssueDate}
                className="form-input"
              />
            </div>

            {/* Medical Date */}
            <div className="form-field">
              <label className="form-field-label">Medical Date (Optional)</label>
              <input
                type="date"
                name="DriverMedicalDate"
                value={driverData.DriverMedicalDate}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            {/* Driver Total Experience */}
            <div className="form-field">
              <label className="form-field-label">Driver Total Experience (Years) (Optional)</label>
              <input
                type="number"
                name="DriverTotalExperience"
                value={driverData.DriverTotalExperience}
                onChange={handleInputChange}
                placeholder="Enter total experience in years"
                min="0"
                max="50"
                className="form-input"
              />
            </div>
            </div>
          </div>

          {/* Section 3: Address Information */}
          <div className="form-section">
            <h4>📍 Address Information</h4>
            <div className="form-fields-grid">
            {/* Address */}
            {/* Enhanced Address Form with PIN Code Lookup */}
            <div className="form-field form-field-full-width">
              <AddressForm
                addressData={getAddressData()}
                onAddressChange={handleAddressChange}
                errors={errors}
                required={false}
                prefix="driver"
                title="Driver Address"
              />
            </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="submit" disabled={isSubmitting} className="submit-btn">
              {isSubmitting ? 'Processing...' : editingDriver ? 'Update Driver' : 'Add Driver'}
            </button>
          </div>
        </form>
      </div>

      {/* Export Button - Above DataTable */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '15px',
        paddingRight: '10px'
      }}>
        <button
          onClick={handleExportDrivers}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,123,255,0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#0056b3';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#007bff';
            e.target.style.transform = 'translateY(0)';
          }}
          title="Export All Drivers to Excel"
        >
          📊 Export to Excel
        </button>
      </div>

      {/* Data Table */}
      <DataTable
        title="📋 Driver List"
        data={drivers}
        columns={driverColumns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        bulkSelectable={true}
        isLoading={isLoading}
        keyField="DriverID"
        emptyMessage="No drivers found. Add your first driver above."
        showPagination={true}
        customizable={true}
        exportable={false}
      />

      {/* Image Modal Viewer */}
      {showModal && modalImage && (
        <div className="image-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>Image Preview</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <div className="image-modal-body">
              <img
                src={modalImage}
                alt="Full size preview"
                className="modal-image-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Global Validation Error Modal */}
      <ValidationErrorModal
        isOpen={showErrorModal}
        onClose={closeErrorModal}
        errorSummary={errorSummary}
        onGoToField={goToField}
        onTryAgain={() => handleSubmit({ preventDefault: () => {} })}
      />
    </div>
  );
};

export default DriverForm;
