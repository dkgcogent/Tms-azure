/**
 * Global Form Validation System
 * Provides comprehensive validation, error handling, and cursor movement
 * for all ERP forms with intelligent error reporting
 */

import { validateFormSubmission, VALIDATION_RULES, FIELD_MAPPINGS } from './validationRules';

// Field priority order for cursor movement (top to bottom sequence)
export const FIELD_PRIORITY_ORDER = {
  vendor: [
    'vendor_name', 'vendor_mobile_no', 'vendor_address',
    'house_flat_no', 'street_locality', 'city', 'state', 'pin_code',
    'vendor_alternate_no', 'vendor_aadhar', 'vendor_pan',
    'vendor_company_name', 'vendor_company_udhyam', 'vendor_company_pan', 'vendor_company_gst',
    'account_holder_name', 'account_number', 'ifsc_code', 'bank_name', 'branch_name'
  ],
  customer: [
    'Name', 'MasterCustomerName', 'CustomerMobileNo', 'house_flat_no', 'street_locality', 'city', 'state', 'pin_code',
    'CustomerCity', 'CustomerState', 'CustomerPinCode',
    'AlternateMobileNo', 'CustomerEmail', 'GSTNo',
    'account_holder_name', 'account_number', 'ifsc_code', 'bank_name', 'branch_name'
  ],
  driver: [
    'DriverName', 'DriverMobileNo', 'DriverAddress',
    'DriverCity', 'DriverState', 'DriverPinCode',
    'DriverAlternateNo', 'DriverEmail',
    'account_holder_name', 'account_number', 'ifsc_code', 'bank_name', 'branch_name'
  ],

  vehicle: [
    'customer_id', 'vendor_id', 'project_id', 'location_id', 'dc_hub',
    'vehicle_code', 'vehicle_number', 'engine_number', 'chassis_number',
    'vehicle_type', 'vehicle_model', 'vehicle_make', 'vehicle_year',
    'insurance_date', 'registration_date', 'fitness_date', 'permit_date',
    'vehicle_photos'
  ]
};

// Required fields configuration for each module
export const REQUIRED_FIELDS = {
  vendor: ['vendor_name', 'vendor_mobile_no'],
  customer: ['Name', 'MasterCustomerName'],
  driver: ['DriverName', 'DriverMobileNo', 'DriverAddress'],
  vehicle: ['customer_id', 'vendor_id', 'vehicle_number', 'engine_number', 'chassis_number', 'insurance_date']
};

// Field display names for user-friendly error messages
export const FIELD_DISPLAY_NAMES = {
  vendor_name: 'Vendor Name',
  vendor_mobile_no: 'Vendor Mobile Number',
  vendor_address: 'Vendor Address',
  vendor_aadhar: 'Vendor Aadhaar',
  vendor_pan: 'Vendor PAN',
  vendor_company_gst: 'Company GST',
  vendor_alternate_no: 'Alternate Mobile Number',
  account_holder_name: 'Account Holder Name',
  account_number: 'Account Number',
  ifsc_code: 'IFSC Code',
  bank_name: 'Bank Name',
  branch_name: 'Branch Name',
  Name: 'Company Name',
  MasterCustomerName: 'Master Customer Name',
  CustomerMobileNo: 'Customer Mobile Number',
  house_flat_no: 'House/Flat Number',
  street_locality: 'Street/Locality',
  city: 'City',
  state: 'State',
  pin_code: 'PIN Code',
  CustomerEmail: 'Customer Email',
  GSTNo: 'GST Number',
  AlternateMobileNo: 'Alternate Mobile Number',
  DriverName: 'Driver Name',
  DriverMobileNo: 'Driver Mobile Number',
  DriverAddress: 'Driver Address',
  DriverAlternateNo: 'Driver Alternate Number',
  // Vehicle field display names
  customer_id: 'Customer',
  vendor_id: 'Vendor',
  project_id: 'Project',
  location_id: 'Location',
  dc_hub: 'DC/Hub',
  vehicle_code: 'Vehicle Code',
  vehicle_number: 'Vehicle Number',
  engine_number: 'Engine Number',
  chassis_number: 'Chassis Number',
  vehicle_type: 'Vehicle Type',
  vehicle_model: 'Vehicle Model',
  vehicle_make: 'Vehicle Make',
  vehicle_year: 'Vehicle Year',
  insurance_date: 'Insurance Date',
  registration_date: 'Registration Date',
  fitness_date: 'Fitness Date',
  permit_date: 'Permit Date',
  vehicle_photos: 'Vehicle Photos'
};

/**
 * Comprehensive form validation with error collection
 * @param {Object} formData - Complete form data
 * @param {string} module - Module name (vendor, customer, driver)
 * @param {Object} customValidations - Additional validation functions
 * @returns {Object} - { isValid: boolean, errors: Object, errorList: Array, firstInvalidField: string }
 */
export const validateCompleteForm = (formData, module, customValidations = {}) => {
  const errors = {};
  const errorList = [];
  let firstInvalidField = null;

  // Get required fields for this module
  const requiredFields = REQUIRED_FIELDS[module] || [];
  const fieldOrder = FIELD_PRIORITY_ORDER[module] || [];

  // 1. Check required fields first
  requiredFields.forEach(fieldName => {
    const value = formData[fieldName];
    const displayName = FIELD_DISPLAY_NAMES[fieldName] || fieldName;
    
    if (!value || value.toString().trim() === '') {
      errors[fieldName] = `${displayName} is required`;
      errorList.push({
        field: fieldName,
        displayName: displayName,
        error: `${displayName} is required`,
        type: 'required',
        priority: fieldOrder.indexOf(fieldName)
      });
      
      if (!firstInvalidField) {
        firstInvalidField = fieldName;
      }
    }
  });

  // 2. Validate format for fields with validation rules
  const fieldMapping = FIELD_MAPPINGS[module] || {};
  Object.entries(fieldMapping).forEach(([fieldName, ruleKey]) => {
    const value = formData[fieldName];
    const displayName = FIELD_DISPLAY_NAMES[fieldName] || fieldName;
    const isRequired = requiredFields.includes(fieldName);
    
    // Skip if already has required field error
    if (errors[fieldName]) return;
    
    if (value && value.toString().trim() !== '') {
      const rule = VALIDATION_RULES[ruleKey];
      if (rule) {
        const validation = validateField(value, ruleKey, isRequired);
        if (!validation.isValid) {
          errors[fieldName] = validation.error;
          errorList.push({
            field: fieldName,
            displayName: displayName,
            error: validation.error,
            type: 'format',
            priority: fieldOrder.indexOf(fieldName)
          });
          
          if (!firstInvalidField) {
            firstInvalidField = fieldName;
          }
        }
      }
    }
  });

  // 3. Run custom validations
  Object.entries(customValidations).forEach(([fieldName, validationFn]) => {
    if (errors[fieldName]) return; // Skip if already has error
    
    const value = formData[fieldName];
    const customValidation = validationFn(value, formData);
    
    if (!customValidation.isValid) {
      const displayName = FIELD_DISPLAY_NAMES[fieldName] || fieldName;
      errors[fieldName] = customValidation.error;
      errorList.push({
        field: fieldName,
        displayName: displayName,
        error: customValidation.error,
        type: 'custom',
        priority: fieldOrder.indexOf(fieldName)
      });
      
      if (!firstInvalidField) {
        firstInvalidField = fieldName;
      }
    }
  });

  // Sort errors by field priority (top to bottom order)
  errorList.sort((a, b) => {
    const priorityA = a.priority >= 0 ? a.priority : 999;
    const priorityB = b.priority >= 0 ? b.priority : 999;
    return priorityA - priorityB;
  });

  // Update firstInvalidField to be the highest priority error
  if (errorList.length > 0) {
    firstInvalidField = errorList[0].field;
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    errorList,
    firstInvalidField,
    summary: {
      totalErrors: errorList.length,
      requiredFieldErrors: errorList.filter(e => e.type === 'required').length,
      formatErrors: errorList.filter(e => e.type === 'format').length,
      customErrors: errorList.filter(e => e.type === 'custom').length
    }
  };
};

/**
 * Move cursor to specific field and highlight it
 * @param {string} fieldName - Name of the field to focus
 * @param {Object} options - Focus options
 */
export const focusField = (fieldName, options = {}) => {
  const { scrollIntoView = true, highlightDuration = 3000 } = options;
  
  try {
    // Find the field element
    const fieldElement = document.querySelector(`[name="${fieldName}"]`);
    
    if (fieldElement) {
      // Scroll into view if needed
      if (scrollIntoView) {
        fieldElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
      
      // Focus the field
      setTimeout(() => {
        fieldElement.focus();
        
        // Add highlight class for visual feedback
        const container = fieldElement.closest('.form-field, .validated-input-container, .bank-field');
        if (container) {
          container.classList.add('field-highlight');
          
          // Remove highlight after duration
          setTimeout(() => {
            container.classList.remove('field-highlight');
          }, highlightDuration);
        }
      }, 300); // Small delay for smooth scrolling
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error focusing field:', error);
    return false;
  }
};

/**
 * Sequential field validation and cursor movement
 * @param {Object} formData - Form data
 * @param {string} module - Module name
 * @param {Object} customValidations - Custom validation functions
 * @param {Function} onErrorsFound - Callback when errors are found
 * @returns {Promise<boolean>} - True if valid, false if errors found
 */
export const validateAndFocus = async (formData, module, customValidations = {}, onErrorsFound = null) => {
  const validation = validateCompleteForm(formData, module, customValidations);
  
  if (!validation.isValid) {
    // Call error callback if provided
    if (onErrorsFound) {
      onErrorsFound(validation);
    }
    
    // Focus first invalid field
    if (validation.firstInvalidField) {
      focusField(validation.firstInvalidField);
    }
    
    return false;
  }
  
  return true;
};

/**
 * Helper function to validate a single field (used internally)
 */
const validateField = (value, ruleKey, required = false) => {
  const rule = VALIDATION_RULES[ruleKey];
  
  if (!rule) {
    return { isValid: false, error: `Unknown validation rule: ${ruleKey}` };
  }

  // Check if field is empty
  if (!value || value.toString().trim() === '') {
    if (required) {
      return { isValid: false, error: rule.errorMessages.required };
    }
    return { isValid: true, error: null };
  }

  // Clean the value
  let cleanValue = value.toString().trim();
  if (ruleKey === 'PAN' || ruleKey === 'GST' || ruleKey === 'IFSC_CODE') {
    cleanValue = cleanValue.toUpperCase();
  }

  // Check length constraints
  if (rule.length && cleanValue.length !== rule.length) {
    return { isValid: false, error: rule.errorMessages.invalid };
  }
  
  if (rule.minLength && cleanValue.length < rule.minLength) {
    return { isValid: false, error: `${rule.name} must be at least ${rule.minLength} characters` };
  }
  
  if (rule.maxLength && cleanValue.length > rule.maxLength) {
    return { isValid: false, error: `${rule.name} cannot exceed ${rule.maxLength} characters` };
  }

  // Check pattern
  if (!rule.pattern.test(cleanValue)) {
    return { isValid: false, error: rule.errorMessages.invalid };
  }

  return { isValid: true, error: null };
};

/**
 * Generate user-friendly error summary for pop-up display
 * @param {Array} errorList - List of validation errors
 * @returns {Object} - Formatted error summary
 */
export const generateErrorSummary = (errorList) => {
  const requiredErrors = errorList.filter(e => e.type === 'required');
  const formatErrors = errorList.filter(e => e.type === 'format');
  const customErrors = errorList.filter(e => e.type === 'custom');
  
  return {
    title: `${errorList.length} Validation Error${errorList.length > 1 ? 's' : ''} Found`,
    subtitle: 'Please correct the following issues before submitting:',
    sections: [
      ...(requiredErrors.length > 0 ? [{
        title: '📋 Required Fields Missing',
        errors: requiredErrors.map(e => e.error)
      }] : []),
      ...(formatErrors.length > 0 ? [{
        title: '⚠️ Format Errors',
        errors: formatErrors.map(e => e.error)
      }] : []),
      ...(customErrors.length > 0 ? [{
        title: '🔍 Validation Errors',
        errors: customErrors.map(e => e.error)
      }] : [])
    ],
    firstField: errorList[0]?.field,
    totalCount: errorList.length
  };
};

export default {
  validateCompleteForm,
  validateAndFocus,
  focusField,
  generateErrorSummary,
  FIELD_PRIORITY_ORDER,
  REQUIRED_FIELDS,
  FIELD_DISPLAY_NAMES
};
