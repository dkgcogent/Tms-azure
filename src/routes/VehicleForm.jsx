import { useState, useEffect } from 'react';
import { vehicleAPI, vendorAPI, driverAPI, apiHelpers } from '../services/api';
import DataTable from '../components/DataTable';
import SearchableDropdown from '../components/SearchableDropdown';

import DocumentUpload from '../components/DocumentUpload';

import useFormValidation from '../hooks/useFormValidation';
import './VehicleForm.css';

// Simple date formatting function
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

// Calculate age from date
const calculateAge = (dateString) => {
  if (!dateString) return 0;
  const today = new Date();
  const birthDate = new Date(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Calculate driving experience
const calculateExperience = (licenseDate) => {
  if (!licenseDate) return 0;
  const today = new Date();
  const issueDate = new Date(licenseDate);
  const diffTime = Math.abs(today - issueDate);
  const diffYears = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 365));
  return diffYears;
};

const VehicleForm = () => {
  // Simple validation system with notifications
  const [isValidating, setIsValidating] = useState(false);

  // Enhanced validation with notification alert, auto scroll, and detailed logging
  const validateBeforeSubmit = async (formData, filesData, successCallback, errorCallback) => {
    try {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔍 VEHICLE FORM VALIDATION STARTED');
      console.log('═══════════════════════════════════════════════════════');

      const errors = {};
      const requiredFields = [
        { field: 'VehicleRegistrationNo', label: 'Vehicle Registration Number', element: 'input[name="VehicleRegistrationNo"]' },
        { field: 'vendor_id', label: 'Assigned Vendor', element: 'input[name="vendor_id"]' },
        { field: 'VehicleCode', label: 'Vehicle Code', element: 'input[name="VehicleCode"]' },
        { field: 'VehicleChasisNo', label: 'Vehicle Chassis Number', element: 'input[name="VehicleChasisNo"]' },
        { field: 'VehicleModel', label: 'Vehicle Model', element: 'input[name="VehicleModel"]' },
        { field: 'TypeOfBody', label: 'Type of Body', element: 'select[name="TypeOfBody"]' },
        { field: 'VehicleType', label: 'Vehicle Type', element: 'select[name="VehicleType"]' },
        { field: 'VehicleRegistrationDate', label: 'Vehicle Registration Date', element: 'input[name="VehicleRegistrationDate"]' },
        { field: 'VehicleLoadingCapacity', label: 'Vehicle Loading Capacity', element: 'input[name="VehicleLoadingCapacity"]' }
      ];

      // Required vehicle photos (all 8 are mandatory)
      const requiredPhotoFields = [
        { field: 'VehiclePhotoFront', label: 'Vehicle Photo - Front View', element: 'input[name="VehiclePhotoFront"]' },
        { field: 'VehiclePhotoBack', label: 'Vehicle Photo - Back View', element: 'input[name="VehiclePhotoBack"]' },
        { field: 'VehiclePhotoLeftSide', label: 'Vehicle Photo - Left Side View', element: 'input[name="VehiclePhotoLeftSide"]' },
        { field: 'VehiclePhotoRightSide', label: 'Vehicle Photo - Right Side View', element: 'input[name="VehiclePhotoRightSide"]' },
        { field: 'VehiclePhotoInterior', label: 'Vehicle Photo - Interior/Dashboard', element: 'input[name="VehiclePhotoInterior"]' },
        { field: 'VehiclePhotoEngine', label: 'Vehicle Photo - Engine Bay', element: 'input[name="VehiclePhotoEngine"]' },
        { field: 'VehiclePhotoRoof', label: 'Vehicle Photo - Roof View', element: 'input[name="VehiclePhotoRoof"]' },
        { field: 'VehiclePhotoDoor', label: 'Vehicle Photo - Door View', element: 'input[name="VehiclePhotoDoor"]' }
      ];

      // Check required fields
      let firstErrorField = null;
      const missingFields = [];
      const missingPhotos = []; // Separate tracking for vehicle photos

      console.log('📋 Checking required text fields...');
      requiredFields.forEach(({ field, label, element }) => {
        const value = formData[field];
        // Check if value is empty, whitespace, or "Select..." placeholder
        // For dropdowns, empty string means user hasn't selected from "Select..." placeholder
        const isEmpty = !value || (typeof value === 'string' && !value.trim()) || value === 'Select...';

        console.log(`  ${field}: ${isEmpty ? '❌ MISSING' : '✅ OK'}`, {
          value: isEmpty ? '(empty or placeholder)' : value,
          type: typeof value
        });

        if (isEmpty) {
          errors[field] = `${label} is required`;
          missingFields.push(label);
          if (!firstErrorField) {
            firstErrorField = { field, label, element };
          }
        }
      });

      // Check required vehicle photos (all 8 are mandatory)
      console.log('📸 Checking required vehicle photos (all 8 required)...');
      requiredPhotoFields.forEach(({ field, label, element }) => {
        // Check if there's a new file uploaded in the files state
        const hasNewPhoto = filesData && filesData[field] && filesData[field] instanceof File;

        // Check if there's an existing photo URL (for edit mode)
        const hasExistingPhoto = editingVehicle && editingVehicle[field + '_url'] &&
                                 typeof editingVehicle[field + '_url'] === 'string' &&
                                 editingVehicle[field + '_url'].trim();

        const photoStatus = hasNewPhoto || hasExistingPhoto ? '✅ OK' : '❌ MISSING';
        console.log(`  ${field}: ${photoStatus}`, {
          hasNewPhoto,
          hasExistingPhoto,
          newFile: filesData?.[field]?.name,
          existingUrl: editingVehicle?.[field + '_url']
        });

        if (!hasNewPhoto && !hasExistingPhoto) {
          errors[field] = `${label} is required`;
          // Extract just the view name (e.g., "Front View" from "Vehicle Photo - Front View")
          const viewName = label.replace('Vehicle Photo - ', '');
          missingPhotos.push(viewName);
          if (!firstErrorField) {
            firstErrorField = { field, label, element };
          }
        }
      });

      // Show specific notification for missing vehicle photos
      if (missingPhotos.length > 0) {
        const uploadedCount = 8 - missingPhotos.length;
        console.log('');
        console.log('📸 VEHICLE PHOTOS STATUS:');
        console.log(`  Uploaded: ${uploadedCount}/8`);
        console.log(`  Missing: ${missingPhotos.join(', ')}`);
        console.log('');
      }

      // Check conditional required fields based on Yes/No selections
      console.log('🔀 Checking conditional required fields...');

      // If GPS = "Yes", then GPSCompany is required
      if (formData.GPS === 'Yes' || formData.GPS === '1' || formData.GPS === 1) {
        const gpsCompany = formData.GPSCompany;
        const isGPSCompanyEmpty = !gpsCompany || (typeof gpsCompany === 'string' && !gpsCompany.trim());

        console.log(`  GPSCompany (conditional on GPS=Yes): ${isGPSCompanyEmpty ? '❌ MISSING' : '✅ OK'}`, {
          GPS: formData.GPS,
          GPSCompany: gpsCompany
        });

        if (isGPSCompanyEmpty) {
          errors.GPSCompany = 'GPS Company is required when GPS is enabled';
          missingFields.push('GPS Company');
          if (!firstErrorField) {
            firstErrorField = { field: 'GPSCompany', label: 'GPS Company', element: 'input[name="GPSCompany"]' };
          }
        }
      }

      // If NoEntryPass = "Yes", then NoEntryPassCopy, NoEntryPassStartDate, and NoEntryPassExpiry are required
      if (formData.NoEntryPass === 'Yes' || formData.NoEntryPass === '1' || formData.NoEntryPass === 1) {
        console.log('  NoEntryPass is "Yes", checking related fields...');

        // Check NoEntryPassCopy file upload
        const hasNewNoEntryPassCopy = filesData && filesData.NoEntryPassCopy && filesData.NoEntryPassCopy instanceof File;
        const hasExistingNoEntryPassCopy = editingVehicle && editingVehicle.NoEntryPassCopy_url &&
                                           typeof editingVehicle.NoEntryPassCopy_url === 'string' &&
                                           editingVehicle.NoEntryPassCopy_url.trim();

        console.log(`  NoEntryPassCopy (conditional): ${hasNewNoEntryPassCopy || hasExistingNoEntryPassCopy ? '✅ OK' : '❌ MISSING'}`, {
          hasNewFile: hasNewNoEntryPassCopy,
          hasExistingFile: hasExistingNoEntryPassCopy
        });

        if (!hasNewNoEntryPassCopy && !hasExistingNoEntryPassCopy) {
          errors.NoEntryPassCopy = 'No Entry Pass Copy is required when No Entry Pass is enabled';
          missingFields.push('No Entry Pass Copy');
          if (!firstErrorField) {
            firstErrorField = { field: 'NoEntryPassCopy', label: 'No Entry Pass Copy', element: 'input[name="NoEntryPassCopy"]' };
          }
        }

        // Check NoEntryPassStartDate
        const noEntryPassStartDate = formData.NoEntryPassStartDate;
        const isStartDateEmpty = !noEntryPassStartDate || (typeof noEntryPassStartDate === 'string' && !noEntryPassStartDate.trim());

        console.log(`  NoEntryPassStartDate (conditional): ${isStartDateEmpty ? '❌ MISSING' : '✅ OK'}`, {
          value: noEntryPassStartDate
        });

        if (isStartDateEmpty) {
          errors.NoEntryPassStartDate = 'No Entry Pass Start Date is required when No Entry Pass is enabled';
          missingFields.push('No Entry Pass Start Date');
          if (!firstErrorField) {
            firstErrorField = { field: 'NoEntryPassStartDate', label: 'No Entry Pass Start Date', element: 'input[name="NoEntryPassStartDate"]' };
          }
        }

        // Check NoEntryPassExpiry
        const noEntryPassExpiry = formData.NoEntryPassExpiry;
        const isExpiryEmpty = !noEntryPassExpiry || (typeof noEntryPassExpiry === 'string' && !noEntryPassExpiry.trim());

        console.log(`  NoEntryPassExpiry (conditional): ${isExpiryEmpty ? '❌ MISSING' : '✅ OK'}`, {
          value: noEntryPassExpiry
        });

        if (isExpiryEmpty) {
          errors.NoEntryPassExpiry = 'No Entry Pass Expiry is required when No Entry Pass is enabled';
          missingFields.push('No Entry Pass Expiry');
          if (!firstErrorField) {
            firstErrorField = { field: 'NoEntryPassExpiry', label: 'No Entry Pass Expiry', element: 'input[name="NoEntryPassExpiry"]' };
          }
        }
      }

      // Data type validation and auto-conversion
      console.log('🔢 Checking data types and performing auto-conversion...');
      const typeConversions = [];

      // Define expected data types for each field
      const fieldTypes = {
        VehicleAge: 'number',
        VehicleKMS: 'number',
        VehicleLoadingCapacity: 'number',
        FixRate: 'number',
        FuelRate: 'number',
        HandlingCharges: 'number',
        GPS: 'string', // Will be converted to 0/1 in backend
        NoEntryPass: 'string', // Will be converted to 'Yes'/'No' in backend
        TypeOfBody: 'string',
        VehicleType: 'string',
        VehicleRegistrationNo: 'string',
        VehicleCode: 'string',
        VehicleChasisNo: 'string',
        VehicleModel: 'string',
        GPSCompany: 'string'
      };

      // Check and convert data types
      Object.keys(fieldTypes).forEach(field => {
        const expectedType = fieldTypes[field];
        const value = formData[field];

        // Skip empty values
        if (value === '' || value === null || value === undefined) {
          return;
        }

        const actualType = typeof value;

        if (expectedType === 'number' && actualType === 'string') {
          // Try to convert string to number
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            formData[field] = numValue;
            typeConversions.push({
              field,
              from: 'string',
              to: 'number',
              originalValue: value,
              convertedValue: numValue
            });
            console.log(`  🔄 ${field}: Auto-converted from string "${value}" to number ${numValue}`);
          } else {
            errors[field] = `${field} must be a valid number`;
            missingFields.push(`${field} (invalid number)`);
            console.log(`  ❌ ${field}: Cannot convert "${value}" to number`);
            if (!firstErrorField) {
              firstErrorField = { field, label: field, element: `input[name="${field}"]` };
            }
          }
        } else if (expectedType === 'string' && actualType === 'number') {
          // Convert number to string
          formData[field] = String(value);
          typeConversions.push({
            field,
            from: 'number',
            to: 'string',
            originalValue: value,
            convertedValue: String(value)
          });
          console.log(`  🔄 ${field}: Auto-converted from number ${value} to string "${String(value)}"`);
        }
      });

      // Show notification if any type conversions were made
      if (typeConversions.length > 0) {
        console.log('');
        console.log('📊 TYPE CONVERSIONS SUMMARY:');
        typeConversions.forEach(({ field, from, to, originalValue, convertedValue }) => {
          console.log(`  • ${field}: ${from} (${originalValue}) → ${to} (${convertedValue})`);
        });
        console.log('');

        // Show user-friendly notification
        const conversionMessage = typeConversions.length === 1
          ? `Field "${typeConversions[0].field}" was auto-converted from ${typeConversions[0].from} to ${typeConversions[0].to}`
          : `${typeConversions.length} fields were auto-converted to correct data types`;

        apiHelpers.showSuccess(`ℹ️ ${conversionMessage}`);
      }

      // Additional validation rules
      console.log('🔍 Checking additional validation rules...');
      if (formData.VehicleRegistrationNo && formData.VehicleRegistrationNo.length < 3) {
        errors.VehicleRegistrationNo = 'Vehicle Registration Number must be at least 3 characters';
        console.log('  ❌ VehicleRegistrationNo: Too short (minimum 3 characters)');
        if (!firstErrorField) {
          firstErrorField = { field: 'VehicleRegistrationNo', label: 'Vehicle Registration Number', element: 'input[name="VehicleRegistrationNo"]' };
        }
      }

      // Check if there are any errors
      const errorCount = Object.keys(errors).length;

      if (errorCount > 0) {
        setErrors(errors);

        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('❌ VALIDATION FAILED');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`Total missing fields: ${errorCount}`);
        console.log('Missing fields:', missingFields);
        console.log('Missing photos:', missingPhotos);
        console.log('First error field:', firstErrorField);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');

        // Show specific notification for missing vehicle photos
        if (missingPhotos.length > 0) {
          const uploadedCount = 8 - missingPhotos.length;
          let photoErrorMessage;

          if (missingPhotos.length === 8) {
            // No photos uploaded at all
            photoErrorMessage = `📷 All 8 vehicle photos are required! Please upload: ${missingPhotos.join(', ')}`;
          } else if (missingPhotos.length <= 3) {
            // Few photos missing - show all missing ones
            photoErrorMessage = `📷 Please upload all 8 vehicle photos! (${uploadedCount}/8 uploaded)\nMissing: ${missingPhotos.join(', ')}`;
          } else {
            // Many photos missing - show count and first few
            const firstThree = missingPhotos.slice(0, 3).join(', ');
            const remaining = missingPhotos.length - 3;
            photoErrorMessage = `📷 Please upload all 8 vehicle photos! (${uploadedCount}/8 uploaded)\nMissing: ${firstThree}... and ${remaining} more`;
          }

          apiHelpers.showError(photoErrorMessage);
        }

        // Show detailed notification alert for other missing fields
        const otherMissingFields = missingFields.filter(field =>
          !field.startsWith('Vehicle Photo -')
        );

        if (otherMissingFields.length > 0) {
          let errorMessage;
          if (otherMissingFields.length === 1) {
            errorMessage = `❌ Missing required field: ${otherMissingFields[0]}`;
          } else if (otherMissingFields.length <= 3) {
            errorMessage = `❌ Missing ${otherMissingFields.length} required fields: ${otherMissingFields.join(', ')}`;
          } else {
            const firstThree = otherMissingFields.slice(0, 3).join(', ');
            const remaining = otherMissingFields.length - 3;
            errorMessage = `❌ Missing ${otherMissingFields.length} required fields including: ${firstThree}... (and ${remaining} more)`;
          }

          // Show this notification after a small delay if photos notification was shown
          if (missingPhotos.length > 0) {
            setTimeout(() => {
              apiHelpers.showError(errorMessage);
            }, 3000); // 3 second delay
          } else {
            apiHelpers.showError(errorMessage);
          }
        }

        // Auto scroll to first error field and focus with enhanced visual feedback
        if (firstErrorField) {
          setTimeout(() => {
            const element = document.querySelector(firstErrorField.element);
            if (element) {
              console.log('🎯 Auto-scrolling to first error field:', firstErrorField.label);

              // Scroll to field with some offset from top
              element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
              });

              // Focus the field
              element.focus();

              // Add enhanced visual highlight with red glow and animation
              element.style.boxShadow = '0 0 20px rgba(255, 107, 107, 0.8)';
              element.style.borderColor = '#ff6b6b';
              element.style.transition = 'all 0.3s ease';

              // Remove highlight after 3 seconds
              setTimeout(() => {
                element.style.boxShadow = '';
                element.style.borderColor = '';
              }, 3000);
            } else {
              console.warn('⚠️ Could not find element for:', firstErrorField.element);
            }
          }, 300); // Small delay to ensure notification shows first
        }

        if (errorCallback) {
          errorCallback({ isValid: false, errors, summary: `${missingFields.length} required fields missing` });
        }
        return false;
      }

      // Clear errors and call success callback
      setErrors({});

      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ VALIDATION PASSED');
      console.log('═══════════════════════════════════════════════════════');
      console.log('All required fields are filled correctly!');
      console.log('Proceeding to submit form...');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');

      if (successCallback) {
        await successCallback(formData);
      }
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      apiHelpers.showError('Validation failed. Please check your inputs.');
      if (errorCallback) {
        errorCallback({ isValid: false, errors: {}, summary: 'Validation failed' });
      }
      return false;
    }
  };



  const getInitialState = () => ({
    // Vehicle Information Fields
    VehicleRegistrationNo: '',
    VehicleCode: '',
    vendor_id: '', // Assigned vendor
    driver_id: '', // Assigned driver
    RCUpload: null,
    VehicleChasisNo: '',
    VehicleModel: '',
    TypeOfBody: '', // Empty by default - user must select from dropdown
    VehicleType: '', // Empty by default - user must select from dropdown
    VehicleRegistrationDate: '',
    VehicleAge: 0,
    VehicleKMS: '',
    VehicleKMSPhoto: null,
    // Multiple Vehicle Photos
    VehiclePhotoFront: null,
    VehiclePhotoBack: null,
    VehiclePhotoLeftSide: null,
    VehiclePhotoRightSide: null,
    VehiclePhotoInterior: null,
    VehiclePhotoEngine: null,
    VehiclePhotoRoof: null,
    VehiclePhotoDoor: null,
    LastServicing: '',
    ServiceBillPhoto: null,
    VehicleInsuranceCompany: '',
    VehicleInsuranceDate: '',
    VehicleInsuranceExpiry: '',
    InsuranceCopy: null,
    VehicleFitnessCertificateIssue: '',
    VehicleFitnessCertificateExpiry: '',
    FitnessCertificateUpload: null,
    VehiclePollutionDate: '',
    VehiclePollutionExpiry: '',
    PollutionPhoto: null,
    StateTaxIssue: '',
    StateTaxExpiry: '',
    StateTaxPhoto: null,
    VehicleLoadingCapacity: '',
    GPS: 'No',
    GPSCompany: '',
    NoEntryPass: 'No',
    NoEntryPassStartDate: '',
    NoEntryPassExpiry: '',
    NoEntryPassCopy: null,
    FixRate: '',
    FuelRate: '',
    HandlingCharges: ''
  });

  const [vehicleData, setVehicleData] = useState(getInitialState());
  const [vehicles, setVehicles] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // Separate files state for new file uploads (following Vendor Form pattern)
  const [files, setFiles] = useState({
    RCUpload: null,
    VehicleKMSPhoto: null,
    VehiclePhotoFront: null,
    VehiclePhotoBack: null,
    VehiclePhotoLeftSide: null,
    VehiclePhotoRightSide: null,
    VehiclePhotoInterior: null,
    VehiclePhotoEngine: null,
    VehiclePhotoRoof: null,
    VehiclePhotoDoor: null,
    ServiceBillPhoto: null,
    InsuranceCopy: null,
    FitnessCertificateUpload: null,
    PollutionPhoto: null,
    StateTaxPhoto: null,
    NoEntryPassCopy: null,
  });

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

    console.log('🗓️ Applying date filter to vehicles:', dateFilter);
    await fetchVehicles();
  };

  const handleDateFilterClear = async () => {
    setDateFilter({
      fromDate: '',
      toDate: ''
    });
    console.log('🗑️ Clearing vehicle date filter');
    await fetchVehicles();
  };

  // State for modal viewer
  const [modalImage, setModalImage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // New state for enhanced features
  const [vehiclePhotos, setVehiclePhotos] = useState({});

  // Expiry date reminder logic with red flag popups
  const checkExpiryDates = (vehicleData) => {
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expiryFields = [
      { field: 'VehicleInsuranceExpiry', label: 'Vehicle Insurance', date: vehicleData.VehicleInsuranceExpiry },
      { field: 'VehicleFitnessCertificateExpiry', label: 'Fitness Certificate', date: vehicleData.VehicleFitnessCertificateExpiry },
      { field: 'VehiclePollutionExpiry', label: 'Pollution Certificate', date: vehicleData.VehiclePollutionExpiry },
      { field: 'StateTaxExpiry', label: 'State Tax', date: vehicleData.StateTaxExpiry },
      { field: 'NoEntryPassExpiry', label: 'No Entry Pass', date: vehicleData.NoEntryPassExpiry }
    ];

    expiryFields.forEach(({ field, label, date }) => {
      if (date) {
        const expiryDate = new Date(date);
        if (expiryDate < today) {
          // Expired - Red flag
          showExpiryAlert('danger', `${label} has EXPIRED!`, `Expired on ${formatDateForInput(date)}`, field);
        } else if (expiryDate <= sevenDaysFromNow) {
          // Expires within 7 days - Critical warning
          const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
          showExpiryAlert('warning', `${label} expires soon!`, `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} (${formatDateForInput(date)})`, field);
        } else if (expiryDate <= thirtyDaysFromNow) {
          // Expires within 30 days - Regular warning
          const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
          apiHelpers.showWarning(`${label} expires in ${daysUntilExpiry} days (${formatDateForInput(date)})`);
        }
      }
    });
  };

  // Show red flag popup for critical expiry alerts
  const showExpiryAlert = (type, title, message, fieldName) => {
    // Create a custom alert modal for critical expiries
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'danger' ? 'danger' : 'warning'} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = `
      top: 20px;
      right: 20px;
      z-index: 9999;
      min-width: 350px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border: 2px solid ${type === 'danger' ? '#dc3545' : '#ffc107'};
    `;

    alertDiv.innerHTML = `
      <div class="d-flex align-items-start">
        <div class="me-3">
          <i class="fas fa-exclamation-triangle fa-2x text-${type === 'danger' ? 'danger' : 'warning'}"></i>
        </div>
        <div class="flex-grow-1">
          <h6 class="alert-heading mb-1">${title}</h6>
          <p class="mb-2">${message}</p>
          <button class="btn btn-sm btn-outline-${type === 'danger' ? 'danger' : 'warning'} me-2" onclick="document.getElementById('${fieldName}').focus(); this.parentElement.parentElement.parentElement.remove();">
            Fix Now
          </button>
        </div>
        <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove();"></button>
      </div>
    `;

    document.body.appendChild(alertDiv);

    // Auto-remove after 10 seconds for danger alerts, 7 seconds for warnings
    setTimeout(() => {
      if (alertDiv.parentElement) {
        alertDiv.remove();
      }
    }, type === 'danger' ? 10000 : 7000);
  };

  // Check expiry dates when vehicle data changes
  useEffect(() => {
    if (vehicleData && Object.keys(vehicleData).length > 0) {
      checkExpiryDates(vehicleData);
    }
  }, [
    vehicleData.VehicleInsuranceExpiry,
    vehicleData.VehicleFitnessCertificateExpiry,
    vehicleData.VehiclePollutionExpiry,
    vehicleData.StateTaxExpiry,
    vehicleData.NoEntryPassExpiry
  ]);

  // Helper function to get expiry status for date fields
  const getExpiryStatus = (fieldName, dateValue) => {
    if (!dateValue) return null;

    const today = new Date();
    const expiryDate = new Date(dateValue);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    if (expiryDate < today) {
      return { status: 'expired', message: 'EXPIRED', className: 'expiry-expired' };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'critical', message: `${daysUntilExpiry} days left`, className: 'expiry-critical' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'warning', message: `${daysUntilExpiry} days left`, className: 'expiry-warning' };
    }
    return null;
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Auto-generate vehicle code when vendor is selected or registration number changes
  useEffect(() => {
    if (vehicleData.vendor_id && vehicleData.VehicleRegistrationNo && !editingVehicle) {
      console.log('🚗 VEHICLE CODE GENERATION - Triggering generation for vendor:', vehicleData.vendor_id, 'registration:', vehicleData.VehicleRegistrationNo);
      generateVehicleCode();
    }
  }, [vehicleData.vendor_id, vehicleData.VehicleRegistrationNo]);

  // Generate unique vehicle code based on vendor and registration number
  const generateVehicleCode = async () => {
    try {
      if (!vehicleData.vendor_id || !vehicleData.VehicleRegistrationNo) {
        console.log('🚗 VEHICLE CODE GENERATION - Missing required fields:', {
          vendor_id: vehicleData.vendor_id,
          registration: vehicleData.VehicleRegistrationNo
        });
        return;
      }

      console.log('🚗 VEHICLE CODE GENERATION - Starting generation...');

      // Get vendor info
      const vendorResponse = await vendorAPI.getAll();
      console.log('🚗 VEHICLE CODE GENERATION - Vendor API response:', vendorResponse);

      const vendor = vendorResponse.data?.find(v => v.VendorID == vehicleData.vendor_id);
      console.log('🚗 VEHICLE CODE GENERATION - Looking for vendor ID:', vehicleData.vendor_id);
      console.log('🚗 VEHICLE CODE GENERATION - Available vendors:', vendorResponse.data?.map(v => ({ id: v.VendorID, name: v.VendorName || v.vendor_name })));

      if (!vendor) {
        throw new Error(`Vendor not found with ID: ${vehicleData.vendor_id}`);
      }

      console.log('🚗 VEHICLE CODE GENERATION - Found vendor:', vendor.VendorName || vendor.vendor_name);

      // Helper function to extract letters from name
      const getLetters = (name, count = 2, fallback = 'XX') => {
        if (!name) return fallback;
        const letters = name.toUpperCase().replace(/[^A-Z]/g, '');
        return letters.length >= count ? letters.substring(0, count) : (letters + fallback).substring(0, count);
      };

      // Extract vendor code (2 letters)
      const vendorCode = getLetters(vendor.VendorName || vendor.vendor_name, 2, 'VE');

      // Extract vehicle registration number (remove all non-alphanumeric characters)
      const cleanRegNumber = vehicleData.VehicleRegistrationNo.replace(/[^A-Z0-9]/gi, '').toUpperCase();

      // Take last 4 characters of registration number, or pad if shorter
      const regSuffix = cleanRegNumber.length >= 4
        ? cleanRegNumber.slice(-4)
        : cleanRegNumber.padStart(4, '0');

      // Generate code: VENDORCODE + REGISTRATION (6 characters total)
      const generatedCode = `${vendorCode}${regSuffix}`;

      console.log('🚗 VEHICLE CODE GENERATION - Generated code:', {
        vendorCode,
        regSuffix,
        finalCode: generatedCode
      });

      setVehicleData(prev => ({
        ...prev,
        VehicleCode: generatedCode
      }));

    } catch (error) {
      console.error('🚗 VEHICLE CODE GENERATION - Error:', error);

      // Fallback to simple generation based on registration number
      const cleanRegNumber = vehicleData.VehicleRegistrationNo.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const fallbackCode = `VH${cleanRegNumber.slice(-4).padStart(4, '0')}`;

      console.log('🚗 VEHICLE CODE GENERATION - Using fallback code:', fallbackCode);

      setVehicleData(prev => ({
        ...prev,
        VehicleCode: fallbackCode
      }));
    }
  };



  // Auto-calculate vehicle age when registration date changes
  useEffect(() => {
    if (vehicleData.VehicleRegistrationDate) {
      const age = calculateAge(vehicleData.VehicleRegistrationDate);
      setVehicleData(prev => ({ ...prev, VehicleAge: age }));
    }
  }, [vehicleData.VehicleRegistrationDate]);

  // Auto-calculate driver experience when license date changes
  useEffect(() => {
    if (vehicleData.DriverLicenseIssueDate) {
      const experience = calculateExperience(vehicleData.DriverLicenseIssueDate);
      setVehicleData(prev => ({ ...prev, DriverTotalExperience: experience }));
    }
  }, [vehicleData.DriverLicenseIssueDate]);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      // Build query parameters for date filtering
      const queryParams = new URLSearchParams();
      if (dateFilter.fromDate) {
        queryParams.append('fromDate', dateFilter.fromDate);
      }
      if (dateFilter.toDate) {
        queryParams.append('toDate', dateFilter.toDate);
      }

      const queryString = queryParams.toString();
      const url = queryString ? `?${queryString}` : '';

      console.log('🗓️ Loading vehicles with date filter:', { fromDate: dateFilter.fromDate, toDate: dateFilter.toDate });

      const response = await vehicleAPI.getAll(url);
      const vehiclesData = response.data?.data || response.data || [];

      console.log('🚗 Fetched vehicles:', vehiclesData.length);

      // Backend now returns correct field names, no mapping needed
      setVehicles(vehiclesData);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to fetch vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;

    console.log('🔄 VEHICLE FORM - Input change:', { name, value, type, files: files?.length });

    if (type === 'file' || files) {
      const file = files?.[0];
      console.log('📁 VEHICLE FORM - File selected:', { name, fileName: file?.name, fileSize: file?.size });
      setVehicleData(prev => ({ ...prev, [name]: file }));
    } else {
      setVehicleData(prev => ({
        ...prev,
        [name]: value
      }));
    }

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
      console.log(`📁 VEHICLE FILE CHANGE - ${fieldName}:`, file);
      setFiles(prev => ({
        ...prev,
        [fieldName]: file
      }));
    };
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

    // Use the proper API endpoint for vehicles
    return `${baseUrl}/api/vehicles/files/${filename}`;
  };

  // Helper function to render comprehensive file preview (images and documents)
  const renderFilePreview = (fieldName, displayName = null) => {
    const newFile = vehicleData[fieldName];
    const existingPath = editingVehicle?.[fieldName];

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
    if (!vehicleData.VehicleRegistrationNo.trim()) {
      newErrors.VehicleRegistrationNo = 'Vehicle registration number is required';
    }
    if (!vehicleData.VehicleCode.trim()) {
      newErrors.VehicleCode = 'Vehicle code is required';
    }
    if (!vehicleData.VehicleChasisNo.trim()) {
      newErrors.VehicleChasisNo = 'Chassis number is required';
    }
    if (!vehicleData.VehicleModel.trim()) {
      newErrors.VehicleModel = 'Vehicle model is required';
    }

    // Date validation
    if (vehicleData.VehicleInsuranceDate && vehicleData.VehicleInsuranceExpiry && vehicleData.VehicleInsuranceDate > vehicleData.VehicleInsuranceExpiry) {
      newErrors.VehicleInsuranceExpiry = 'Insurance expiry date cannot be before issue date';
    }
    if (vehicleData.VehicleFitnessCertificateIssue && vehicleData.VehicleFitnessCertificateExpiry && vehicleData.VehicleFitnessCertificateIssue > vehicleData.VehicleFitnessCertificateExpiry) {
      newErrors.VehicleFitnessCertificateExpiry = 'Fitness certificate expiry date cannot be before issue date';
    }
    if (vehicleData.VehiclePollutionDate && vehicleData.VehiclePollutionExpiry && vehicleData.VehiclePollutionDate > vehicleData.VehiclePollutionExpiry) {
      newErrors.VehiclePollutionExpiry = 'Pollution expiry date cannot be before issue date';
    }
    if (vehicleData.StateTaxIssue && vehicleData.StateTaxExpiry && vehicleData.StateTaxIssue > vehicleData.StateTaxExpiry) {
      newErrors.StateTaxExpiry = 'State tax expiry date cannot be before issue date';
    }
    if (vehicleData.NoEntryPassStartDate && vehicleData.NoEntryPassExpiry && vehicleData.NoEntryPassStartDate > vehicleData.NoEntryPassExpiry) {
      newErrors.NoEntryPassExpiry = 'No entry pass expiry date cannot be before start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setVehicleData(getInitialState());
    setErrors({});
    setEditingVehicle(null);
    // Reset files state (following Vendor Form pattern)
    setFiles({
      RCUpload: null,
      VehicleKMSPhoto: null,
      VehiclePhotoFront: null,
      VehiclePhotoBack: null,
      VehiclePhotoLeftSide: null,
      VehiclePhotoRightSide: null,
      VehiclePhotoInterior: null,
      VehiclePhotoEngine: null,
      VehiclePhotoRoof: null,
      VehiclePhotoDoor: null,
      ServiceBillPhoto: null,
      InsuranceCopy: null,
      FitnessCertificateUpload: null,
      PollutionPhoto: null,
      StateTaxPhoto: null,
      NoEntryPassCopy: null,
    });
  };

  // Direct backend export function with date filtering
  const handleExportVehicles = async () => {
    try {
      console.log('📊 Exporting vehicles to Excel...');

      // Build query parameters for date filtering (same as fetchVehicles)
      const queryParams = new URLSearchParams();
      if (dateFilter.fromDate) {
        queryParams.append('fromDate', dateFilter.fromDate);
      }
      if (dateFilter.toDate) {
        queryParams.append('toDate', dateFilter.toDate);
      }

      const queryString = queryParams.toString();
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const exportUrl = `${API_BASE_URL}/api/export/vehicles${queryString ? `?${queryString}` : ''}`;

      console.log('📊 Export URL with filters:', exportUrl);
      console.log('🗓️ Date filter applied to export:', { fromDate: dateFilter.fromDate, toDate: dateFilter.toDate });

      // Show loading message
      const loadingToast = document.createElement('div');
      loadingToast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #007bff; color: white; padding: 15px 20px;
        border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif; font-size: 14px;
      `;
      loadingToast.textContent = '🔄 Exporting vehicles... Please wait';
      document.body.appendChild(loadingToast);

      // Create download link
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = `Vehicle_Master_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      successToast.innerHTML = `✅ Vehicle Export Started!<br><small>Downloading ${dateFilter.fromDate || dateFilter.toDate ? 'filtered' : 'all'} vehicle records + vendor info</small>`;
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

    // Prepare complete form data including photos
    const completeFormData = {
      ...vehicleData,
      // Note: Individual photo files are handled separately in the files state
      // Do NOT add vehicle_photos object here as it causes [object Object] error
      customer_id: vehicleData.customer_id,
      vendor_id: vehicleData.vendor_id,
      project_id: vehicleData.project_id,
      location_id: vehicleData.location_id,
      vehicle_number: vehicleData.VehicleRegistrationNo,
      engine_number: vehicleData.VehicleChasisNo, // Note: This seems to be engine number
      chassis_number: vehicleData.VehicleChasisNo,
      insurance_date: vehicleData.VehicleInsuranceDate
    };

    // Use enhanced validation system with error modal, cursor movement, and photo validation
    const isValid = await validateBeforeSubmit(
      completeFormData,
      files, // Pass the files state for photo validation
      // Success callback
      async (validatedData) => {
        await submitVehicleData(validatedData);
      },
      // Error callback
      (validationResult) => {

        // Error modal will be shown automatically
      }
    );

    if (!isValid) {
      return; // Validation failed, modal shown, cursor moved
    }
  };

  // Separate function for actual data submission
  const submitVehicleData = async (validatedData) => {
    setIsSubmitting(true);

    try {
      // Create FormData for file uploads
      const formData = new FormData();

      // Add all non-file form data (use validatedData instead of vehicleData)
      Object.keys(validatedData).forEach(key => {
        if (!(validatedData[key] instanceof File) && validatedData[key] !== null && validatedData[key] !== undefined && validatedData[key] !== '') {
          // Add non-file data only if it has a value
          formData.append(key, validatedData[key]);
        }
        // Skip null/undefined/empty values to preserve existing data in database
      });

      // Add files from separate files state (following Vendor Form pattern)
      Object.keys(files).forEach(fieldName => {
        if (files[fieldName] && files[fieldName] instanceof File) {
          formData.append(fieldName, files[fieldName]);
          console.log(`📁 VEHICLE FORM - Adding file to FormData: ${fieldName} = ${files[fieldName].name}`);
        }
      });

      if (editingVehicle) {
        const response = await vehicleAPI.update(editingVehicle.VehicleID, formData);
        apiHelpers.showSuccess('Vehicle updated successfully!');
      } else {
        await vehicleAPI.create(formData);
        apiHelpers.showSuccess('Vehicle created successfully!');
      }

      resetForm();
      await fetchVehicles();
    } catch (error) {
      apiHelpers.showError(error, 'Failed to save vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (vehicle) => {
    try {
      // Fetch complete vehicle data with all URLs from API
      const response = await vehicleAPI.getById(vehicle.VehicleID);
      const completeVehicleData = response.data || response;

      console.log('🚗 VEHICLE EDIT - Complete vehicle data:', completeVehicleData);
      console.log('🚗 VEHICLE EDIT - Freight data:', {
        FixRate: completeVehicleData.FixRate,
        FuelRate: completeVehicleData.FuelRate,
        HandlingCharges: completeVehicleData.HandlingCharges
      });

      setEditingVehicle(completeVehicleData);

      // Populate form with existing data, mapping backend field names to frontend
      const editData = { ...getInitialState() };

      // Use the complete vehicle data for mapping
      const vehicleToEdit = completeVehicleData;
    
    // Map backend data to frontend form fields
    const backendToFrontendMapping = {
      // Direct field mappings from API response
      VehicleID: 'VehicleID',
      VehicleRegistrationNo: 'VehicleRegistrationNo',
      VehicleCode: 'VehicleCode',
      VehicleChasisNo: 'VehicleChasisNo',
      VehicleModel: 'VehicleModel',
      TypeOfBody: 'TypeOfBody',
      VehicleType: 'VehicleType',
      VehicleRegistrationDate: 'VehicleRegistrationDate',
      VehicleAge: 'VehicleAge',
      VehicleKMS: 'VehicleKMS',
      VendorID: 'vendor_id',  // Map VendorID to vendor_id
      DriverID: 'driver_id',  // Map DriverID to driver_id
      GPSCompany: 'GPSCompany',
      NoEntryPassStartDate: 'NoEntryPassStartDate',
      NoEntryPassExpiry: 'NoEntryPassExpiry',
      LastServicing: 'LastServicing',
      VehicleLoadingCapacity: 'VehicleLoadingCapacity',
      VehicleInsuranceCompany: 'VehicleInsuranceCompany',
      VehicleInsuranceDate: 'VehicleInsuranceDate',
      VehicleInsuranceExpiry: 'VehicleInsuranceExpiry',  // Direct mapping
      InsuranceExpiry: 'VehicleInsuranceExpiry',  // Fallback mapping
      VehicleFitnessCertificateIssue: 'VehicleFitnessCertificateIssue',
      VehicleFitnessCertificateExpiry: 'VehicleFitnessCertificateExpiry',  // Direct mapping
      FitnessExpiry: 'VehicleFitnessCertificateExpiry',  // Fallback mapping
      VehiclePollutionDate: 'VehiclePollutionDate',
      PollutionExpiry: 'VehiclePollutionExpiry',  // Map PollutionExpiry to VehiclePollutionExpiry
      StateTaxIssue: 'StateTaxIssue',
      StateTaxExpiry: 'StateTaxExpiry',

      // Vehicle Freight fields
      FixRate: 'FixRate',
      FuelRate: 'FuelRate',
      HandlingCharges: 'HandlingCharges',

      // File path mappings - keep the raw paths for internal use
      RCUpload: 'RCUpload',
      VehicleKMSPhoto: 'VehicleKMSPhoto',
      VehiclePhoto: 'VehiclePhoto',
      VehiclePhotoFront: 'VehiclePhotoFront',
      VehiclePhotoBack: 'VehiclePhotoBack',
      VehiclePhotoLeftSide: 'VehiclePhotoLeftSide',
      VehiclePhotoRightSide: 'VehiclePhotoRightSide',
      VehiclePhotoInterior: 'VehiclePhotoInterior',
      VehiclePhotoEngine: 'VehiclePhotoEngine',
      VehiclePhotoRoof: 'VehiclePhotoRoof',
      VehiclePhotoDoor: 'VehiclePhotoDoor',
      ServiceBillPhoto: 'ServiceBillPhoto',
      InsuranceCopy: 'InsuranceCopy',
      FitnessCertificateUpload: 'FitnessCertificateUpload',
      PollutionPhoto: 'PollutionPhoto',
      StateTaxPhoto: 'StateTaxPhoto',
      NoEntryPassCopy: 'NoEntryPassCopy',

      // File URL mappings - these are what the DocumentUpload components need
      RCUpload_url: 'RCUpload_url',
      VehicleKMSPhoto_url: 'VehicleKMSPhoto_url',
      VehiclePhoto_url: 'VehiclePhoto_url',
      VehiclePhotoFront_url: 'VehiclePhotoFront_url',
      VehiclePhotoBack_url: 'VehiclePhotoBack_url',
      VehiclePhotoLeftSide_url: 'VehiclePhotoLeftSide_url',
      VehiclePhotoRightSide_url: 'VehiclePhotoRightSide_url',
      VehiclePhotoInterior_url: 'VehiclePhotoInterior_url',
      VehiclePhotoEngine_url: 'VehiclePhotoEngine_url',
      VehiclePhotoRoof_url: 'VehiclePhotoRoof_url',
      VehiclePhotoDoor_url: 'VehiclePhotoDoor_url',
      ServiceBillPhoto_url: 'ServiceBillPhoto_url',
      InsuranceCopy_url: 'InsuranceCopy_url',
      FitnessCertificateUpload_url: 'FitnessCertificateUpload_url',
      PollutionPhoto_url: 'PollutionPhoto_url',
      StateTaxPhoto_url: 'StateTaxPhoto_url',
      NoEntryPassCopy_url: 'NoEntryPassCopy_url',

      // Legacy mappings for backward compatibility
      vehicle_number: 'VehicleRegistrationNo',
      chassis_number: 'VehicleChasisNo',
      model: 'VehicleModel',
      body_type: 'TypeOfBody',
      registration_date: 'VehicleRegistrationDate',
      current_km_reading: 'VehicleKMS',
      insurance_company: 'VehicleInsuranceCompany',
      insurance_date: 'VehicleInsuranceDate',
      insurance_expiry: 'VehicleInsuranceExpiry',
      fitness_certificate_issue: 'VehicleFitnessCertificateIssue',
      fitness_expiry: 'VehicleFitnessCertificateExpiry',
      pollution_date: 'VehiclePollutionDate',
      pollution_expiry: 'VehiclePollutionExpiry',
      tax_issue_date: 'StateTaxIssue',
      tax_paid_upto: 'StateTaxExpiry',
      capacity_tons: 'VehicleLoadingCapacity',
      gps_company: 'GPSCompany',
      no_entry_pass_expiry: 'NoEntryPassExpiry',
      last_service_date: 'LastServicing'
    };
    
    // Define all date field names that need formatting
    const dateFields = [
      'VehicleRegistrationDate',
      'VehicleInsuranceDate',
      'VehicleInsuranceExpiry',
      'InsuranceExpiry',
      'VehicleFitnessCertificateIssue',
      'VehicleFitnessCertificateExpiry',
      'FitnessExpiry',
      'VehiclePollutionDate',
      'VehiclePollutionExpiry',
      'PollutionExpiry',
      'StateTaxIssue',
      'StateTaxExpiry',
      'NoEntryPassStartDate',
      'NoEntryPassExpiry',
      'LastServicing'
    ];

      // First try to populate with frontend field names (for backward compatibility)
      Object.keys(editData).forEach(key => {
        if (vehicleToEdit[key] !== undefined && vehicleToEdit[key] !== null) {
          if (dateFields.includes(key)) {
            editData[key] = formatDateForInput(vehicleToEdit[key]);
          } else {
            editData[key] = vehicleToEdit[key];
          }
        }
      });

      // Then populate with mapped backend field names
      Object.entries(backendToFrontendMapping).forEach(([backendKey, frontendKey]) => {
        if (vehicleToEdit[backendKey] !== undefined && vehicleToEdit[backendKey] !== null) {
          if (dateFields.includes(frontendKey)) {
            editData[frontendKey] = formatDateForInput(vehicleToEdit[backendKey]);
          } else {
            editData[frontendKey] = vehicleToEdit[backendKey];
          }

          // Debug freight fields specifically
          if (['FixRate', 'FuelRate', 'HandlingCharges'].includes(frontendKey)) {
            console.log(`🚗 VEHICLE EDIT - Setting ${frontendKey}:`, vehicleToEdit[backendKey]);
          }
        }
      });

      // Special handling for vendor_id - ensure it's properly set even if null
      if (vehicleToEdit.VendorID !== undefined) {
        editData.vendor_id = vehicleToEdit.VendorID || '';
        console.log('🚛 VEHICLE EDIT - VendorID mapping:', {
          'vehicleToEdit.VendorID': vehicleToEdit.VendorID,
          'editData.vendor_id': editData.vendor_id
        });
      }

      // Special handling for driver_id - ensure it's properly set even if null
      if (vehicleToEdit.DriverID !== undefined) {
        editData.driver_id = vehicleToEdit.DriverID || '';
        console.log('🚛 VEHICLE EDIT - DriverID mapping:', {
          'vehicleToEdit.DriverID': vehicleToEdit.DriverID,
          'editData.driver_id': editData.driver_id
        });
      }

      // Handle special GPS and NoEntryPass fields
      if (vehicleToEdit.GPS !== undefined) {
        editData.GPS = (vehicleToEdit.GPS === 1 || vehicleToEdit.GPS === '1' || vehicleToEdit.GPS === 'Yes') ? 'Yes' : 'No';
      }
      if (vehicleToEdit.gps_enabled !== undefined) {
        editData.GPS = vehicleToEdit.gps_enabled ? 'Yes' : 'No';
      }

      if (vehicleToEdit.NoEntryPass !== undefined) {
        editData.NoEntryPass = (vehicleToEdit.NoEntryPass === 1 || vehicleToEdit.NoEntryPass === '1' || vehicleToEdit.NoEntryPass === 'Yes') ? 'Yes' : 'No';
      }
      if (vehicleToEdit.no_entry_pass !== undefined) {
        editData.NoEntryPass = vehicleToEdit.no_entry_pass ? 'Yes' : 'No';
      }
    
      console.log('🚛 VEHICLE EDIT - Setting vehicleData with editData:', editData);
      console.log('🚛 VEHICLE EDIT - vendor_id in editData:', editData.vendor_id);
      console.log('🚛 VEHICLE EDIT - Freight fields in editData:', {
        FixRate: editData.FixRate,
        FuelRate: editData.FuelRate,
        HandlingCharges: editData.HandlingCharges
      });
      setVehicleData(editData);
      setErrors({});

      // Reset files state for edit mode - only new file uploads should be in files state
      // Existing files are handled through the _url fields in vehicleData (following Vendor Form pattern)
      setFiles({
        RCUpload: null,
        VehicleKMSPhoto: null,
        VehiclePhotoFront: null,
        VehiclePhotoBack: null,
        VehiclePhotoLeftSide: null,
        VehiclePhotoRightSide: null,
        VehiclePhotoInterior: null,
        VehiclePhotoEngine: null,
        VehiclePhotoRoof: null,
        VehiclePhotoDoor: null,
        ServiceBillPhoto: null,
        InsuranceCopy: null,
        FitnessCertificateUpload: null,
        PollutionPhoto: null,
        StateTaxPhoto: null,
        NoEntryPassCopy: null,
      });

      // Scroll to top of the page to show the form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error fetching complete vehicle data:', error);
      // Fallback to using the passed vehicle data
      setEditingVehicle(vehicle);

      // Still populate form with available data
      const editData = { ...getInitialState() };
      Object.keys(editData).forEach(key => {
        if (vehicle[key] !== undefined && vehicle[key] !== null) {
          editData[key] = vehicle[key];
        }
      });

      setVehicleData(editData);
      setErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
      apiHelpers.showError('Could not fetch complete vehicle data. Some images may not display.');
    }
  };

  // Handle file deletion during edit
  const handleFileDelete = async (fieldName) => {
    try {
      if (!editingVehicle) {
        throw new Error('No vehicle being edited');
      }

      console.log('🗑️ VEHICLE FILE DELETE - Deleting field:', fieldName, 'for vehicle:', editingVehicle.VehicleID);

      // Call API to delete file
      await vehicleAPI.deleteFile(editingVehicle.VehicleID, fieldName);

      // Update the editing vehicle data to remove the file reference
      setEditingVehicle(prev => ({
        ...prev,
        [fieldName]: null,
        [`${fieldName}_url`]: null
      }));

      // Update form data to remove the file
      setVehicleData(prev => ({
        ...prev,
        [fieldName]: null,
        [`${fieldName}_url`]: null
      }));

      // Also clear any file input state (following Vendor Form pattern)
      setFiles(prev => ({
        ...prev,
        [fieldName]: null
      }));

      console.log('🗑️ VEHICLE FILE DELETE - Successfully deleted:', fieldName);
      apiHelpers.showSuccess('File deleted successfully');

    } catch (error) {
      console.error('🗑️ VEHICLE FILE DELETE - Error:', error);
      apiHelpers.showError('Failed to delete file: ' + error.message);
    }
  };

  // Helper function to render EditFileManager for file fields
  const renderFileField = (fieldName, label, options = {}) => {
    const { accept = "image/*,.pdf,.doc,.docx,.txt", required = false } = options;

    return (
      <EditFileManager
        fieldName={fieldName}
        label={label}
        value={vehicleData[fieldName]}
        onChange={(file) => setVehicleData(prev => ({ ...prev, [fieldName]: file }))}
        onDelete={handleFileDelete}
        accept={accept}
        required={required}
        error={errors[fieldName]}
        existingFileUrl={editingVehicle?.[fieldName]}
        entityType="vehicles"
        entityId={editingVehicle?.VehicleID}
        isEditing={!!editingVehicle}
        showPreview={true}
      />
    );
  };

  const handleDelete = async (vehicle) => {
    if (!window.confirm(`Are you sure you want to delete vehicle "${vehicle.VehicleRegistrationNo}"?`)) {
      return;
    }

    try {
      await vehicleAPI.delete(vehicle.VehicleID);
      apiHelpers.showSuccess('Vehicle deleted successfully!');
      await fetchVehicles();
    } catch (error) {
      apiHelpers.showError(error, 'Failed to delete vehicle');
    }
  };

  const handleBulkDelete = async (vehicleIds) => {
    console.log('🗑️ Bulk delete requested for vehicle IDs:', vehicleIds);

    if (vehicleIds.length === 0) {
      apiHelpers.showError(null, 'No vehicles selected for deletion.');
      return;
    }

    // Get vehicle registration numbers for confirmation
    const selectedVehicles = vehicles.filter(v => vehicleIds.includes(v.VehicleID));
    const vehicleRegNos = selectedVehicles.map(v => v.VehicleRegistrationNo).join(', ');
    const confirmMessage = vehicleIds.length === 1
      ? `Are you sure you want to delete "${vehicleRegNos}"?`
      : `Are you sure you want to delete ${vehicleIds.length} vehicles?\n\nVehicles: ${vehicleRegNos}`;

    if (window.confirm(confirmMessage)) {
      try {
        const response = await vehicleAPI.bulkDelete(vehicleIds);

        if (response.data.deletedCount > 0) {
          apiHelpers.showSuccess(
            `Successfully deleted ${response.data.deletedCount} vehicle(s) and their associated files!` +
            (response.data.notFoundCount > 0 ? ` (${response.data.notFoundCount} not found)` : '')
          );
        } else {
          apiHelpers.showError(null, 'No vehicles were deleted. They may have already been removed.');
        }

        await fetchVehicles(); // Refresh the list
      } catch (error) {
        console.error('Error bulk deleting vehicles:', error);

        // Provide specific error messages for bulk deletion
        let errorMessage;
        if (error.response?.status === 400) {
          errorMessage = 'Cannot delete one or more vehicles because they are linked to other records. Please remove related records first.';
        } else if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to delete these vehicles.';
        } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
          errorMessage = 'Unable to connect to server. Please check your connection and try again.';
        } else {
          errorMessage = 'Unable to delete vehicles. Please try again.';
        }

        apiHelpers.showError(error, errorMessage);
      }
    }
  };

  // Render form field helper
  const renderFormField = (label, name, type = 'text', options = {}, required = false) => {
    const { placeholder, values, accept, rows = 3, max, min, title, pattern, readOnly } = options;
    const isFile = type === 'file';
    const isRadio = type === 'radio';
    const isSelect = type === 'select';
    const isTextarea = type === 'textarea';
    const isNumber = type === 'number';

    const id = `vehicle-${name}`;

    // Check for expiry status only on expiry date fields (fields ending with 'ExpiryDate' or 'Expiry')
    const isExpiryField = name.endsWith('ExpiryDate') || name.endsWith('Expiry');
    const expiryStatus = (type === 'date' && isExpiryField && vehicleData[name]) ? getExpiryStatus(name, vehicleData[name]) : null;

    return (
      <div className={`form-group ${options.fullWidth ? 'full-width' : ''} ${expiryStatus ? expiryStatus.className : ''}`}>
        <label htmlFor={id}>
          {label} {required && <span className="required-indicator">*</span>}
          {name.includes('Photo') && <span className="photo-indicator"> 📷</span>}
          {name.includes('Expiry') && <span className="expiry-indicator"> ⚠️</span>}
          {name.includes('CRM') && <span className="crm-indicator"> 🔗</span>}
          {expiryStatus && (
            <span className={`expiry-indicator ${expiryStatus.status}`}>
              {expiryStatus.message}
            </span>
          )}
        </label>
        
        {isRadio ? (
          <div className="radio-group">
            {values.map(val => (
              <label key={val}>
                <input
                  type="radio"
                  id={`${id}-${val}`}
                  name={name}
                  value={val}
                  checked={vehicleData[name] === val}
                  onChange={handleInputChange}
                />
                {val}
              </label>
            ))}
          </div>
        ) : isSelect ? (
          <select id={id} name={name} value={vehicleData[name]} onChange={handleInputChange} required={required}>
            <option value="" disabled>Select...</option>
            {values.map(val => <option key={val} value={val}>{val}</option>)}
          </select>
        ) : isTextarea ? (
          <textarea
            id={id}
            name={name}
            value={vehicleData[name]}
            onChange={handleInputChange}
            placeholder={placeholder}
            rows={rows}
            required={required}
          />
        ) : (
          <input
            type={type}
            id={id}
            name={name}
            value={type !== 'file' ? vehicleData[name] : undefined}
            onChange={handleInputChange}
            placeholder={placeholder}
            accept={accept}
            required={required}
            max={max}
            min={min}
            title={title}
            pattern={pattern}
            className={errors[name] ? 'error' : ''}
            readOnly={readOnly || name === 'VehicleAge' || name === 'DriverTotalExperience'}
          />
        )}

        {isFile && renderFilePreview(name, label)}
        {errors[name] && <div className="error-message">{errors[name]}</div>}
      </div>
    );
  };

  const vehicleColumns = [
    { key: 'VehicleRegistrationNo', label: 'Registration No', sortable: true },
    { key: 'VehicleCode', label: 'Vehicle Code', sortable: true },
    { key: 'VehicleModel', label: 'Model', sortable: true },
    { key: 'TypeOfBody', label: 'Body Type', sortable: true },
    {
      key: 'GPS',
      label: 'GPS',
      sortable: true,
      render: (value) => value === 1 || value === '1' || value === 'Yes' ? '✅ Yes' : '❌ No'
    },
  ];

  return (
    <div className="vehicle-form-container">
      {/* Header */}
      <div className="form-header">
        <h1>🚛 Vehicle Master</h1>
        <p>Comprehensive vehicle onboarding and management system</p>



        {/* Edit Mode Notice */}
        {editingVehicle && (
          <div className="edit-notice">
            <span className="edit-notice-text">
              Editing: <strong className="edit-notice-item">{editingVehicle.VehicleRegistrationNo}</strong>
            </span>
            <button type="button" onClick={resetForm} className="cancel-edit-btn">
              Cancel Edit
            </button>
          </div>
        )}
      </div>

      {/* Form Section */}
      <div className="vehicle-form">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-sections">




            {/* Vehicle Information Section */}
            <div className="form-section">
              <h4>🚗 Vehicle Information</h4>
              <div className="form-grid">
                {/* Vehicle Basic Info - Simple Straight Line */}
                <div className="form-field">
                  <label className="form-field-label">
                    Vehicle Registration No. <span className="required-indicator">*</span>
                  </label>
                  <input
                    type="text"
                    name="VehicleRegistrationNo"
                    value={vehicleData.VehicleRegistrationNo}
                    onChange={handleInputChange}
                    placeholder="Registration number"
                    required
                    className={errors.VehicleRegistrationNo ? 'error' : ''}
                  />
                  {errors.VehicleRegistrationNo && <div className="form-field-error">{errors.VehicleRegistrationNo}</div>}
                </div>

                <div className="form-field">
                  <label className="form-field-label">
                    Assigned Vendor <span className="required-indicator">*</span>
                  </label>
                  <SearchableDropdown
                    name="vendor_id"
                    value={vehicleData.vendor_id}
                    onChange={handleInputChange}
                    apiCall={async () => {
                      try {
                        const response = await vendorAPI.getAll();
                        // Handle different response formats
                        const vendors = response.data || [];
                        return { data: vendors };
                      } catch (error) {

                        return { data: [] };
                      }
                    }}
                    valueKey="VendorID"
                    labelKey="VendorName"
                    formatLabel={(vendor) => `${vendor.VendorName || 'Unknown Vendor'} (ID: ${vendor.VendorID})`}
                    placeholder="Select vendor (required)"
                    allowEmpty={false}
                    required={true}
                    searchPlaceholder="Search vendors..."
                  />
                </div>

                <div className="form-field">
                  <label className="form-field-label">
                    Assigned Driver
                  </label>
                  <SearchableDropdown
                    name="driver_id"
                    value={vehicleData.driver_id}
                    onChange={handleInputChange}
                    apiCall={async () => {
                      try {
                        const response = await driverAPI.getAll();
                        // Handle different response formats
                        const drivers = response.data || [];
                        return { data: drivers };
                      } catch (error) {
                        console.error('Error fetching drivers:', error);
                        return { data: [] };
                      }
                    }}
                    valueKey="DriverID"
                    labelKey="DriverName"
                    formatLabel={(driver) => `${driver.DriverName || 'Unknown Driver'} (${driver.DriverCode || driver.DriverID})`}
                    placeholder="Select driver (optional)"
                    allowEmpty={true}
                    required={false}
                    searchPlaceholder="Search drivers..."
                  />
                </div>

                <div className="form-field">
                  <label className="form-field-label">
                    Vehicle Code <span className="required-indicator">*</span>
                  </label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      name="VehicleCode"
                      value={vehicleData.VehicleCode}
                      onChange={handleInputChange}
                      placeholder="Auto-generated based on vendor and registration"
                      required
                      className={errors.VehicleCode ? 'error' : ''}
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={generateVehicleCode}
                      className="generate-code-btn"
                      disabled={!vehicleData.vendor_id || !vehicleData.VehicleRegistrationNo}
                      title="Generate vehicle code based on vendor and registration number"
                    >
                      Generate
                    </button>
                  </div>
                  {errors.VehicleCode && <div className="form-field-error">{errors.VehicleCode}</div>}
                  <div className="form-field-help">
                    Code is auto-generated when vendor and registration number are selected
                  </div>
                </div>

                <DocumentUpload
                  label="RC Upload"
                  name="RCUpload"
                  value={files.RCUpload}
                  onChange={createFileChangeHandler('RCUpload')}
                  onDelete={() => handleFileDelete('RCUpload')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required={false}
                  existingFileUrl={editingVehicle?.RCUpload_url}
                  isEditing={!!editingVehicle}
                  entityType="vehicles"
                />
                {renderFormField('Vehicle Chassis No.', 'VehicleChasisNo', 'text', { placeholder: 'Chassis number' }, true)}
                {renderFormField('Vehicle Model', 'VehicleModel', 'text', { placeholder: 'Vehicle model' }, true)}
                {renderFormField('Type of Body', 'TypeOfBody', 'select', { values: ['Open', 'CBD', 'Container'] }, true)}
                {renderFormField('Vehicle Type', 'VehicleType', 'select', {
                  values: ['LP', 'LPT', 'Tata Ace', 'Pickup', 'Tata 407 10ft', 'Tata 407 14ft', 'Eicher 17ft']
                })}
                {renderFormField('Vehicle Registration Year/Date', 'VehicleRegistrationDate', 'date', {
                  title: 'Enter date in YYYY-MM-DD format (8 digits)',
                  pattern: '\d{4}-\d{2}-\d{2}'
                })}
                {renderFormField('Vehicle Age (auto-calculated)', 'VehicleAge', 'number', { placeholder: 'Auto-calculated from registration date' })}
                {renderFormField('Vehicle KMS 📷', 'VehicleKMS', 'number', { placeholder: 'Odometer reading' })}
                <DocumentUpload
                  label="Vehicle KMS Photo (clear photo required) 📷"
                  name="VehicleKMSPhoto"
                  value={files.VehicleKMSPhoto}
                  onChange={createFileChangeHandler('VehicleKMSPhoto')}
                  onDelete={() => handleFileDelete('VehicleKMSPhoto')}
                  accept=".jpg,.jpeg,.png"
                  required={false}
                  existingFileUrl={editingVehicle?.VehicleKMSPhoto_url}
                  isEditing={!!editingVehicle}
                  entityType="vehicles"
                />

                {/* Multiple Vehicle Photos Section */}
                <div className="form-field full-width">
                  <label className="form-field-label">
                    Vehicle Photos 📷 <span className="required-indicator">*</span>
                  </label>
                  <div className="vehicle-photos-grid">
                    <DocumentUpload
                      label="Front View"
                      name="VehiclePhotoFront"
                      value={files.VehiclePhotoFront}
                      onChange={createFileChangeHandler('VehiclePhotoFront')}
                      onDelete={() => handleFileDelete('VehiclePhotoFront')}
                      accept=".jpg,.jpeg,.png"
                      existingFileUrl={editingVehicle?.VehiclePhotoFront_url}
                      isEditing={!!editingVehicle}
                      entityType="vehicles"
                    />
                    <DocumentUpload
                      label="Back View"
                      name="VehiclePhotoBack"
                      value={files.VehiclePhotoBack}
                      onChange={createFileChangeHandler('VehiclePhotoBack')}
                      onDelete={() => handleFileDelete('VehiclePhotoBack')}
                      accept=".jpg,.jpeg,.png"
                      existingFileUrl={editingVehicle?.VehiclePhotoBack_url}
                      isEditing={!!editingVehicle}
                      entityType="vehicles"
                    />
                    <DocumentUpload
                      label="Left Side View"
                      name="VehiclePhotoLeftSide"
                      value={files.VehiclePhotoLeftSide}
                      onChange={createFileChangeHandler('VehiclePhotoLeftSide')}
                      onDelete={() => handleFileDelete('VehiclePhotoLeftSide')}
                      accept=".jpg,.jpeg,.png"
                      existingFileUrl={editingVehicle?.VehiclePhotoLeftSide_url}
                      isEditing={!!editingVehicle}
                      entityType="vehicles"
                    />
                    <DocumentUpload
                      label="Right Side View"
                      name="VehiclePhotoRightSide"
                      value={files.VehiclePhotoRightSide}
                      onChange={createFileChangeHandler('VehiclePhotoRightSide')}
                      onDelete={() => handleFileDelete('VehiclePhotoRightSide')}
                      accept=".jpg,.jpeg,.png"
                      existingFileUrl={editingVehicle?.VehiclePhotoRightSide_url}
                      isEditing={!!editingVehicle}
                      entityType="vehicles"
                    />
                    <DocumentUpload
                      label="Interior/Dashboard"
                      name="VehiclePhotoInterior"
                      value={files.VehiclePhotoInterior}
                      onChange={createFileChangeHandler('VehiclePhotoInterior')}
                      onDelete={() => handleFileDelete('VehiclePhotoInterior')}
                      accept=".jpg,.jpeg,.png"
                      existingFileUrl={editingVehicle?.VehiclePhotoInterior_url}
                      isEditing={!!editingVehicle}
                      entityType="vehicles"
                    />
                    <DocumentUpload
                      label="Engine Bay"
                      name="VehiclePhotoEngine"
                      value={files.VehiclePhotoEngine}
                      onChange={createFileChangeHandler('VehiclePhotoEngine')}
                      onDelete={() => handleFileDelete('VehiclePhotoEngine')}
                      accept=".jpg,.jpeg,.png"
                      existingFileUrl={editingVehicle?.VehiclePhotoEngine_url}
                      isEditing={!!editingVehicle}
                      entityType="vehicles"
                    />
                    <DocumentUpload
                      label="Roof View"
                      name="VehiclePhotoRoof"
                      value={files.VehiclePhotoRoof}
                      onChange={createFileChangeHandler('VehiclePhotoRoof')}
                      onDelete={() => handleFileDelete('VehiclePhotoRoof')}
                      accept=".jpg,.jpeg,.png"
                      existingFileUrl={editingVehicle?.VehiclePhotoRoof_url}
                      isEditing={!!editingVehicle}
                      entityType="vehicles"
                    />
                    <DocumentUpload
                      label="Door View"
                      name="VehiclePhotoDoor"
                      value={files.VehiclePhotoDoor}
                      onChange={createFileChangeHandler('VehiclePhotoDoor')}
                      onDelete={() => handleFileDelete('VehiclePhotoDoor')}
                      accept=".jpg,.jpeg,.png"
                      existingFileUrl={editingVehicle?.VehiclePhotoDoor_url}
                      isEditing={!!editingVehicle}
                      entityType="vehicles"
                    />
                  </div>
                  <small className="photo-hint">
                    📸 Please upload clear, well-lit photos from all angles. At least front and back views are required.
                  </small>
                </div>

                {renderFormField('Last Servicing', 'LastServicing', 'date', {})}
                <DocumentUpload
                  label="Service Bill Photo"
                  name="ServiceBillPhoto"
                  value={files.ServiceBillPhoto}
                  onChange={createFileChangeHandler('ServiceBillPhoto')}
                  onDelete={() => handleFileDelete('ServiceBillPhoto')}
                  accept=".jpg,.jpeg,.png,.pdf"
                  required={false}
                  existingFileUrl={editingVehicle?.ServiceBillPhoto_url}
                  isEditing={!!editingVehicle}
                  entityType="vehicles"
                />
                {renderFormField('Vehicle Insurance Company', 'VehicleInsuranceCompany', 'text', { placeholder: 'Insurance provider' })}
                {renderFormField('Vehicle Insurance Date', 'VehicleInsuranceDate', 'date', {
                  max: new Date().toISOString().split('T')[0],
                  title: 'Insurance date must be today or earlier'
                })}
                {renderFormField('Vehicle Insurance Validity ⚠️', 'VehicleInsuranceExpiry', 'date', {})}
                <DocumentUpload
                  label="Insurance Copy"
                  name="InsuranceCopy"
                  value={files.InsuranceCopy}
                  onChange={createFileChangeHandler('InsuranceCopy')}
                  onDelete={() => handleFileDelete('InsuranceCopy')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required={false}
                  existingFileUrl={editingVehicle?.InsuranceCopy_url}
                  isEditing={!!editingVehicle}
                  entityType="vehicles"
                />
                {renderFormField('Vehicle Fitness Certificate Issue', 'VehicleFitnessCertificateIssue', 'date', {})}
                {renderFormField('Vehicle Fitness Certificate Validity ⚠️', 'VehicleFitnessCertificateExpiry', 'date', {})}
                <DocumentUpload
                  label="Fitness Certificate Upload"
                  name="FitnessCertificateUpload"
                  value={files.FitnessCertificateUpload}
                  onChange={createFileChangeHandler('FitnessCertificateUpload')}
                  onDelete={() => handleFileDelete('FitnessCertificateUpload')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required={false}
                  existingFileUrl={editingVehicle?.FitnessCertificateUpload_url}
                  isEditing={!!editingVehicle}
                  entityType="vehicles"
                />
                {renderFormField('Vehicle Pollution Date', 'VehiclePollutionDate', 'date', {})}
                {renderFormField('Vehicle Pollution Validity ⚠️', 'VehiclePollutionExpiry', 'date', {})}
                <DocumentUpload
                  label="Pollution Photo (clear photo required) 📷"
                  name="PollutionPhoto"
                  value={files.PollutionPhoto}
                  onChange={createFileChangeHandler('PollutionPhoto')}
                  onDelete={() => handleFileDelete('PollutionPhoto')}
                  accept=".jpg,.jpeg,.png"
                  required={false}
                  existingFileUrl={editingVehicle?.PollutionPhoto_url}
                  isEditing={!!editingVehicle}
                  entityType="vehicles"
                />
                {renderFormField('State Tax Issue', 'StateTaxIssue', 'date', {})}
                {renderFormField('State Tax Validity ⚠️', 'StateTaxExpiry', 'date', {})}
                <DocumentUpload
                  label="State Tax Photo (clear photo required) 📷"
                  name="StateTaxPhoto"
                  value={files.StateTaxPhoto}
                  onChange={createFileChangeHandler('StateTaxPhoto')}
                  onDelete={() => handleFileDelete('StateTaxPhoto')}
                  accept=".jpg,.jpeg,.png"
                  required={false}
                  existingFileUrl={editingVehicle?.StateTaxPhoto_url}
                  isEditing={!!editingVehicle}
                  entityType="vehicles"
                />
                <div className="form-field">
                  <label className="form-field-label">
                    Vehicle Loading Capacity <span className="required-indicator">*</span>
                  </label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      name="VehicleLoadingCapacity"
                      value={vehicleData.VehicleLoadingCapacity}
                      onChange={handleInputChange}
                      placeholder="Enter capacity"
                      required
                      min="0"
                      className={errors.VehicleLoadingCapacity ? 'error' : ''}
                    />
                    <span className="unit-indicator">KG</span>
                  </div>
                  {errors.VehicleLoadingCapacity && <div className="form-field-error">{errors.VehicleLoadingCapacity}</div>}
                  <small className="field-hint">Enter the maximum loading capacity in kilograms</small>
                </div>
                {renderFormField('GPS', 'GPS', 'radio', { values: ['Yes', 'No'] })}
                {renderFormField('GPS Company', 'GPSCompany', 'text', { placeholder: 'GPS provider name' })}
                {renderFormField('No Entry Pass ⚠️', 'NoEntryPass', 'radio', { values: ['Yes', 'No'] })}
                {renderFormField('No Entry Pass Start Date', 'NoEntryPassStartDate', 'date', {})}
                {renderFormField('No Entry Pass Expiry ⚠️', 'NoEntryPassExpiry', 'date', {})}
                <DocumentUpload
                  label="No Entry Pass Copy"
                  name="NoEntryPassCopy"
                  value={files.NoEntryPassCopy}
                  onChange={createFileChangeHandler('NoEntryPassCopy')}
                  onDelete={() => handleFileDelete('NoEntryPassCopy')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required={false}
                  existingFileUrl={editingVehicle?.NoEntryPassCopy_url}
                  isEditing={!!editingVehicle}
                  entityType="vehicles"
                />
              </div>
            </div>
            <div className="form-section">
              <h4>💰 Vehicle Freight</h4>
              <div className="form-grid">
                {renderFormField('Fix Rate', 'FixRate', 'number', { placeholder: 'Enter fix rate' })}
                {renderFormField('Fuel Rate', 'FuelRate', 'number', { placeholder: 'Enter fuel rate' })}
                {renderFormField('Handling Charges', 'HandlingCharges', 'number', { placeholder: 'Enter handling charges' })}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="submit" disabled={isSubmitting} className="submit-btn">
              {isSubmitting ? 'Processing...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
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
          onClick={handleExportVehicles}
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
          title="Export All Vehicles to Excel"
        >
          📊 Export to Excel
        </button>
      </div>

      {/* Date Range Filter */}
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: 'bold', minWidth: '80px' }}>From Date:</label>
          <input
            type="date"
            value={dateFilter.fromDate}
            onChange={(e) => setDateFilter(prev => ({ ...prev, fromDate: e.target.value }))}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: 'bold', minWidth: '70px' }}>To Date:</label>
          <input
            type="date"
            value={dateFilter.toDate}
            onChange={(e) => setDateFilter(prev => ({ ...prev, toDate: e.target.value }))}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
        <button
          onClick={handleDateFilterApply}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          🔍 Filter
        </button>
        <button
          onClick={handleDateFilterClear}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🗑️ Clear
        </button>
      </div>

      {/* Data Table */}
      <DataTable
        title="📋 Vehicle Master List"
        data={vehicles}
        columns={vehicleColumns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        bulkSelectable={true}
        isLoading={isLoading}
        keyField="VehicleID"
        emptyMessage="No vehicles found. Add your first vehicle above."
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


    </div>
  );
};

export default VehicleForm;
