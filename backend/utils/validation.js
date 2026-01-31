/**
 * Backend Validation System for ERP
 * Provides server-side validation for critical identification fields
 * Prevents invalid data entry via APIs and bulk uploads
 */

// Validation rule definitions (same as frontend for consistency)
const VALIDATION_RULES = {
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
  }
};

// Field mapping for different modules
const FIELD_MAPPINGS = {
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
    'CustomerEmail': 'EMAIL'
  },
  driver: {
    'DriverAadhar': 'AADHAAR',
    'DriverPAN': 'PAN',
    'DriverMobileNo': 'MOBILE',
    'DriverAlternateNo': 'MOBILE',
    'DriverEmail': 'EMAIL'
  },
  employee: {
    'EmployeeAadhar': 'AADHAAR',
    'EmployeePAN': 'PAN',
    'EmployeeMobile': 'MOBILE',
    'EmployeeEmail': 'EMAIL'
  }
};

/**
 * Validate a single field value against its rule
 * @param {string} value - The value to validate
 * @param {string} ruleKey - The validation rule key (AADHAAR, PAN, etc.)
 * @param {boolean} required - Whether the field is required
 * @returns {Object} - { isValid: boolean, error: string|null }
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

  // Clean the value (remove spaces, convert to uppercase for PAN/GST)
  let cleanValue = value.toString().trim();
  if (ruleKey === 'PAN' || ruleKey === 'GST') {
    cleanValue = cleanValue.toUpperCase();
  }

  // Check length if specified
  if (rule.length && cleanValue.length !== rule.length) {
    return { isValid: false, error: rule.errorMessages.invalid };
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
const validateModule = (data, module, requiredFields = []) => {
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
 * Express middleware for validating request data
 * @param {string} module - The module name
 * @param {Array} requiredFields - Array of required field names
 * @returns {Function} - Express middleware function
 */
const validationMiddleware = (module, requiredFields = []) => {
  return (req, res, next) => {
    const validation = validateModule(req.body, module, requiredFields);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
        details: 'Please check the highlighted fields and correct the errors'
      });
    }
    
    next();
  };
};

/**
 * Sanitize and format data before saving to database
 * @param {Object} data - The data to sanitize
 * @param {string} module - The module name
 * @returns {Object} - Sanitized data
 */
const sanitizeData = (data, module) => {
  const fieldMapping = FIELD_MAPPINGS[module];
  const sanitized = { ...data };

  if (!fieldMapping) return sanitized;

  // Sanitize each mapped field
  Object.entries(fieldMapping).forEach(([fieldName, ruleKey]) => {
    if (sanitized[fieldName]) {
      let value = sanitized[fieldName].toString().trim();
      
      // Apply formatting based on rule type
      switch (ruleKey) {
        case 'PAN':
        case 'GST':
          sanitized[fieldName] = value.toUpperCase();
          break;
        case 'AADHAAR':
        case 'MOBILE':
          // Remove any non-numeric characters
          sanitized[fieldName] = value.replace(/\D/g, '');
          break;
        case 'EMAIL':
          sanitized[fieldName] = value.toLowerCase();
          break;
        default:
          sanitized[fieldName] = value;
      }
    }
  });

  return sanitized;
};

/**
 * Validate bulk upload data
 * @param {Array} dataArray - Array of data objects to validate
 * @param {string} module - The module name
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} - { isValid: boolean, errors: Array, validData: Array }
 */
const validateBulkData = (dataArray, module, requiredFields = []) => {
  const errors = [];
  const validData = [];
  let isValid = true;

  dataArray.forEach((data, index) => {
    const validation = validateModule(data, module, requiredFields);
    
    if (!validation.isValid) {
      errors.push({
        row: index + 1,
        errors: validation.errors
      });
      isValid = false;
    } else {
      validData.push(sanitizeData(data, module));
    }
  });

  return { isValid, errors, validData };
};

module.exports = {
  validateField,
  validateModule,
  validationMiddleware,
  sanitizeData,
  validateBulkData,
  VALIDATION_RULES,
  FIELD_MAPPINGS
};
