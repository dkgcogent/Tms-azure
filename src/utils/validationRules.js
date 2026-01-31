/**
 * Centralized Validation System for ERP
 * Provides comprehensive validation rules for identification fields
 * Configurable and extendable for future requirements
 */

// Validation rule definitions
export const VALIDATION_RULES = {
  AADHAAR: {
    name: 'Aadhaar Number',
    pattern: /^\d{12}$/,
    length: 12,
    type: 'numeric',
    format: 'XXXXXXXXXXXX',
    description: 'Must be exactly 12 digits',
    errorMessages: {
      required: 'Aadhaar number is required',
      invalid: 'Aadhaar must be exactly 12 digits',
      format: 'Aadhaar can only contain numbers'
    }
  },
  
  PAN: {
    name: 'PAN Number',
    pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    length: 10,
    type: 'alphanumeric',
    format: 'ABCDE1234F',
    description: '5 letters + 4 digits + 1 letter',
    errorMessages: {
      required: 'PAN number is required',
      invalid: 'PAN must be in format: ABCDE1234F (5 letters + 4 digits + 1 letter)',
      format: 'PAN format is incorrect'
    }
  },

  GST: {
    name: 'GST Number',
    pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    length: 15,
    type: 'alphanumeric',
    format: '22AAAAA0000A1Z5',
    description: '15 characters GST format',
    errorMessages: {
      required: 'GST number is required',
      invalid: 'GST must be in valid 15-character format',
      format: 'GST format is incorrect'
    }
  },

  MOBILE: {
    name: 'Mobile Number',
    pattern: /^[6-9]\d{9}$/,
    length: 10,
    type: 'numeric',
    format: '9XXXXXXXXX',
    description: '10 digits starting with 6-9',
    errorMessages: {
      required: 'Mobile number is required',
      invalid: 'Mobile number must be 10 digits starting with 6-9',
      format: 'Invalid mobile number format'
    }
  },

  PIN_CODE: {
    name: 'PIN Code',
    pattern: /^\d{6}$/,
    length: 6,
    type: 'numeric',
    format: 'XXXXXX',
    description: 'Exactly 6 digits',
    errorMessages: {
      required: 'PIN code is required',
      invalid: 'PIN code must be exactly 6 digits',
      format: 'PIN code can only contain numbers'
    }
  },

  EMAIL: {
    name: 'Email Address',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    type: 'email',
    format: 'user@domain.com',
    description: 'Valid email format',
    errorMessages: {
      required: 'Email address is required',
      invalid: 'Please enter a valid email address',
      format: 'Email format is incorrect'
    }
  },

  ACCOUNT_NUMBER: {
    name: 'Account Number',
    pattern: /^\d{9,18}$/,
    minLength: 9,
    maxLength: 18,
    type: 'numeric',
    format: 'XXXXXXXXXXXXXXXXXX',
    description: '9-18 digits',
    errorMessages: {
      required: 'Account number is required',
      invalid: 'Account number must be 9-18 digits',
      format: 'Account number can only contain numbers'
    }
  },

  IFSC_CODE: {
    name: 'IFSC Code',
    pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/,
    length: 11,
    type: 'alphanumeric',
    format: 'SBIN0001234',
    description: '4 letters + 0 + 6 alphanumeric',
    errorMessages: {
      required: 'IFSC code is required',
      invalid: 'IFSC must be in format: SBIN0001234 (4 letters + 0 + 6 alphanumeric)',
      format: 'IFSC format is incorrect'
    }
  },

  BANK_NAME: {
    name: 'Bank Name',
    pattern: /^[A-Za-z\s&.-]+$/,
    minLength: 2,
    maxLength: 100,
    type: 'alphabetic',
    format: 'State Bank of India',
    description: 'Letters, spaces, &, ., - allowed',
    errorMessages: {
      required: 'Bank name is required',
      invalid: 'Bank name can only contain letters, spaces, &, ., -',
      format: 'Invalid bank name format'
    }
  },

  BRANCH_NAME: {
    name: 'Branch Name',
    pattern: /^[A-Za-z0-9\s&.,-]+$/,
    minLength: 2,
    maxLength: 100,
    type: 'alphanumeric',
    format: 'Main Branch, Delhi',
    description: 'Letters, numbers, spaces, &, ., , - allowed',
    errorMessages: {
      required: 'Branch name is required',
      invalid: 'Branch name can only contain letters, numbers, spaces, &, ., , -',
      format: 'Invalid branch name format'
    }
  },

  ACCOUNT_HOLDER_NAME: {
    name: 'Account Holder Name',
    pattern: /^[A-Za-z\s.]+$/,
    minLength: 2,
    maxLength: 100,
    type: 'alphabetic',
    format: 'John Doe',
    description: 'Letters, spaces, . allowed',
    errorMessages: {
      required: 'Account holder name is required',
      invalid: 'Account holder name can only contain letters, spaces, .',
      format: 'Invalid account holder name format'
    }
  },

  // Vehicle-specific validation rules
  DATE_DDMMYYYY: {
    name: 'Date',
    pattern: /^\d{8}$/,
    length: 8,
    type: 'date',
    format: 'DDMMYYYY',
    description: 'Date in DDMMYYYY format',
    errorMessages: {
      required: 'Date is required',
      invalid: 'Date must be exactly 8 digits in DDMMYYYY format',
      format: 'Date format is incorrect'
    }
  },

  VEHICLE_CODE: {
    name: 'Vehicle Code',
    pattern: /^[A-Z0-9]{8,20}$/,
    minLength: 8,
    maxLength: 20,
    type: 'alphanumeric',
    format: 'CUSPROLOCDC001',
    description: 'Auto-generated unique code',
    errorMessages: {
      required: 'Vehicle code is required',
      invalid: 'Vehicle code must be 8-20 alphanumeric characters',
      format: 'Vehicle code format is incorrect'
    }
  },

  VEHICLE_NUMBER: {
    name: 'Vehicle Number',
    pattern: /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/,
    type: 'alphanumeric',
    format: 'MH12AB1234',
    description: 'Indian vehicle registration format',
    errorMessages: {
      required: 'Vehicle number is required',
      invalid: 'Vehicle number must be in format AB12CD3456',
      format: 'Vehicle number format is incorrect'
    }
  },

  ENGINE_NUMBER: {
    name: 'Engine Number',
    pattern: /^[A-Z0-9]{6,20}$/,
    minLength: 6,
    maxLength: 20,
    type: 'alphanumeric',
    format: 'ABC123DEF456',
    description: 'Engine identification number',
    errorMessages: {
      required: 'Engine number is required',
      invalid: 'Engine number must be 6-20 alphanumeric characters',
      format: 'Engine number format is incorrect'
    }
  },

  CHASSIS_NUMBER: {
    name: 'Chassis Number',
    pattern: /^[A-Z0-9]{17}$/,
    length: 17,
    type: 'alphanumeric',
    format: '1HGBH41JXMN109186',
    description: 'Vehicle Identification Number (VIN)',
    errorMessages: {
      required: 'Chassis number is required',
      invalid: 'Chassis number must be exactly 17 alphanumeric characters',
      format: 'Chassis number format is incorrect'
    }
  }
};

// Field mapping for different modules
export const FIELD_MAPPINGS = {
  vendor: {
    'vendor_aadhar': 'AADHAAR',
    'vendor_pan': 'PAN',
    'vendor_company_gst': 'GST',
    'vendor_mobile_no': 'MOBILE',
    'vendor_alternate_no': 'MOBILE',
    'vendor_email': 'EMAIL',
    'account_holder_name': 'ACCOUNT_HOLDER_NAME',
    'account_number': 'ACCOUNT_NUMBER',
    'ifsc_code': 'IFSC_CODE',
    'bank_name': 'BANK_NAME',
    'branch_name': 'BRANCH_NAME'
  },
  customer: {
    'CustomerAadhar': 'AADHAAR',
    'CustomerPAN': 'PAN',
    'GSTNo': 'GST',
    'CustomerMobileNo': 'MOBILE',
    'AlternateMobileNo': 'MOBILE',
    'CustomerEmail': 'EMAIL',
    'pin_code': 'PIN_CODE',
    'account_holder_name': 'ACCOUNT_HOLDER_NAME',
    'account_number': 'ACCOUNT_NUMBER',
    'ifsc_code': 'IFSC_CODE',
    'bank_name': 'BANK_NAME',
    'branch_name': 'BRANCH_NAME'
  },
  driver: {
    'DriverAadhar': 'AADHAAR',
    'DriverPAN': 'PAN',
    'DriverMobileNo': 'MOBILE',
    'DriverAlternateNo': 'MOBILE',
    'DriverEmail': 'EMAIL',
    'account_holder_name': 'ACCOUNT_HOLDER_NAME',
    'account_number': 'ACCOUNT_NUMBER',
    'ifsc_code': 'IFSC_CODE',
    'bank_name': 'BANK_NAME',
    'branch_name': 'BRANCH_NAME'
  },
  employee: {
    'EmployeeAadhar': 'AADHAAR',
    'EmployeePAN': 'PAN',
    'EmployeeMobile': 'MOBILE',
    'EmployeeEmail': 'EMAIL',
    'account_holder_name': 'ACCOUNT_HOLDER_NAME',
    'account_number': 'ACCOUNT_NUMBER',
    'ifsc_code': 'IFSC_CODE',
    'bank_name': 'BANK_NAME',
    'branch_name': 'BRANCH_NAME'
  },

  vehicle: {
    vehicle_code: 'VEHICLE_CODE',
    vehicle_number: 'VEHICLE_NUMBER',
    engine_number: 'ENGINE_NUMBER',
    chassis_number: 'CHASSIS_NUMBER',
    insurance_date: 'DATE_DDMMYYYY',
    registration_date: 'DATE_DDMMYYYY',
    fitness_date: 'DATE_DDMMYYYY',
    permit_date: 'DATE_DDMMYYYY',
    customer_id: 'REQUIRED_DROPDOWN',
    vendor_id: 'REQUIRED_DROPDOWN',
    project_id: 'REQUIRED_DROPDOWN',
    location_id: 'REQUIRED_DROPDOWN'
  }
};

/**
 * Validate a single field value against its rule
 * @param {string} value - The value to validate
 * @param {string} ruleKey - The validation rule key (AADHAAR, PAN, etc.)
 * @param {boolean} required - Whether the field is required
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
export const validateField = (value, ruleKey, required = false) => {
  const rule = VALIDATION_RULES[ruleKey];
  
  if (!rule) {
    return { isValid: false, error: `Unknown validation rule: ${ruleKey}` };
  }

  // Check if field is empty
  if (!value || value.trim() === '') {
    if (required) {
      return { isValid: false, error: rule.errorMessages.required };
    }
    return { isValid: true, error: null };
  }

  // Clean the value (remove spaces, convert to uppercase for PAN/GST)
  let cleanValue = value.trim();
  if (ruleKey === 'PAN' || ruleKey === 'GST') {
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
 * Validate multiple fields for a specific module
 * @param {Object} data - The form data object
 * @param {string} module - The module name (vendor, customer, driver, employee)
 * @param {Array} requiredFields - Array of field names that are required
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export const validateModule = (data, module, requiredFields = []) => {
  const fieldMapping = FIELD_MAPPINGS[module];
  const errors = {};
  let isValid = true;

  if (!fieldMapping) {
    return { isValid: false, errors: { general: `Unknown module: ${module}` } };
  }

  // Validate each mapped field
  Object.entries(fieldMapping).forEach(([fieldName, ruleKey]) => {
    const isRequired = requiredFields.includes(fieldName);
    const validation = validateField(data[fieldName], ruleKey, isRequired);
    
    if (!validation.isValid) {
      errors[fieldName] = validation.error;
      isValid = false;
    }
  });

  return { isValid, errors };
};

/**
 * Format value according to rule (for display purposes)
 * @param {string} value - The value to format
 * @param {string} ruleKey - The validation rule key
 * @returns {string} - Formatted value
 */
export const formatValue = (value, ruleKey) => {
  if (!value) return value;
  
  const rule = VALIDATION_RULES[ruleKey];
  if (!rule) return value;

  let cleanValue = value.trim();
  
  // Auto-format based on rule type
  switch (ruleKey) {
    case 'PAN':
    case 'GST':
    case 'IFSC_CODE':
      return cleanValue.toUpperCase();
    case 'AADHAAR':
    case 'MOBILE':
    case 'ACCOUNT_NUMBER':
      // Remove any non-numeric characters
      return cleanValue.replace(/\D/g, '');
    case 'BANK_NAME':
    case 'BRANCH_NAME':
    case 'ACCOUNT_HOLDER_NAME':
      // Capitalize first letter of each word
      return cleanValue.replace(/\b\w/g, l => l.toUpperCase());
    default:
      return cleanValue;
  }
};

/**
 * Get validation rule information for UI display
 * @param {string} ruleKey - The validation rule key
 * @returns {Object} - Rule information for UI
 */
export const getRuleInfo = (ruleKey) => {
  const rule = VALIDATION_RULES[ruleKey];
  if (!rule) return null;

  return {
    name: rule.name,
    format: rule.format,
    description: rule.description,
    maxLength: rule.length,
    type: rule.type
  };
};

/**
 * Real-time validation for input fields (as user types)
 * @param {string} value - Current input value
 * @param {string} ruleKey - The validation rule key
 * @param {boolean} required - Whether field is required
 * @returns {Object} - { isValid: boolean, error: string|null, suggestion: string|null }
 */
export const validateRealTime = (value, ruleKey, required = false) => {
  const rule = VALIDATION_RULES[ruleKey];
  
  if (!rule) {
    return { isValid: false, error: `Unknown rule: ${ruleKey}`, suggestion: null };
  }

  // Empty field handling
  if (!value || value.trim() === '') {
    if (required) {
      return { 
        isValid: false, 
        error: rule.errorMessages.required, 
        suggestion: `Format: ${rule.format}` 
      };
    }
    return { isValid: true, error: null, suggestion: `Format: ${rule.format}` };
  }

  const cleanValue = formatValue(value, ruleKey);
  
  // Length validation with helpful feedback
  if (rule.length) {
    if (cleanValue.length < rule.length) {
      return {
        isValid: false,
        error: `${rule.name} must be ${rule.length} characters (${cleanValue.length}/${rule.length})`,
        suggestion: `Format: ${rule.format}`
      };
    }
    if (cleanValue.length > rule.length) {
      return {
        isValid: false,
        error: `${rule.name} cannot exceed ${rule.length} characters`,
        suggestion: `Format: ${rule.format}`
      };
    }
  } else {
    // Handle min/max length for variable length fields
    if (rule.minLength && cleanValue.length < rule.minLength) {
      return {
        isValid: false,
        error: `${rule.name} must be at least ${rule.minLength} characters (${cleanValue.length}/${rule.minLength})`,
        suggestion: `Format: ${rule.format}`
      };
    }
    if (rule.maxLength && cleanValue.length > rule.maxLength) {
      return {
        isValid: false,
        error: `${rule.name} cannot exceed ${rule.maxLength} characters`,
        suggestion: `Format: ${rule.format}`
      };
    }
  }

  // Pattern validation
  if (!rule.pattern.test(cleanValue)) {
    return { 
      isValid: false, 
      error: rule.errorMessages.invalid,
      suggestion: `Format: ${rule.format}`
    };
  }

  return { isValid: true, error: null, suggestion: null };
};

/**
 * Batch validation for form submission
 * @param {Object} formData - Complete form data
 * @param {Object} validationConfig - Configuration object with module and required fields
 * @returns {Object} - { isValid: boolean, errors: Object, summary: string }
 */
export const validateFormSubmission = (formData, validationConfig) => {
  const { module, requiredFields = [], customRules = {} } = validationConfig;
  
  const moduleValidation = validateModule(formData, module, requiredFields);
  const errors = { ...moduleValidation.errors };
  
  // Apply custom validation rules
  Object.entries(customRules).forEach(([fieldName, ruleKey]) => {
    const isRequired = requiredFields.includes(fieldName);
    const validation = validateField(formData[fieldName], ruleKey, isRequired);
    
    if (!validation.isValid) {
      errors[fieldName] = validation.error;
    }
  });

  const isValid = Object.keys(errors).length === 0;
  const errorCount = Object.keys(errors).length;
  const summary = isValid 
    ? 'All validation checks passed' 
    : `${errorCount} validation error${errorCount > 1 ? 's' : ''} found`;

  return { isValid, errors, summary };
};

// Export default validation functions for easy import
export default {
  validateField,
  validateModule,
  validateRealTime,
  validateFormSubmission,
  formatValue,
  getRuleInfo,
  VALIDATION_RULES,
  FIELD_MAPPINGS
};
