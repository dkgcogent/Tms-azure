/**
 * Custom Hook for Global Form Validation
 * Provides comprehensive validation, error handling, and cursor movement
 */

import { useState, useCallback, useRef } from 'react';
import { 
  validateCompleteForm, 
  validateAndFocus, 
  focusField, 
  generateErrorSummary 
} from '../utils/globalFormValidation';

export const useFormValidation = (module, customValidations = {}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorSummary, setErrorSummary] = useState(null);
  const [lastValidationResult, setLastValidationResult] = useState(null);
  
  // Track validation attempts for progressive error focusing
  const validationAttempts = useRef(0);
  const lastFocusedField = useRef(null);

  /**
   * Validate form and show errors if any
   * @param {Object} formData - Complete form data
   * @param {Object} options - Validation options
   * @returns {Promise<boolean>} - True if valid, false if errors
   */
  const validateForm = useCallback(async (formData, options = {}) => {
    const { 
      showModal = true, 
      focusFirstError = true,
      customValidations: additionalValidations = {}
    } = options;

    setIsValidating(true);
    validationAttempts.current += 1;

    try {
      // Combine custom validations
      const allCustomValidations = { ...customValidations, ...additionalValidations };
      
      // Run comprehensive validation
      const validation = validateCompleteForm(formData, module, allCustomValidations);
      setLastValidationResult(validation);

      if (!validation.isValid) {
        // Generate user-friendly error summary
        const summary = generateErrorSummary(validation.errorList);
        setErrorSummary(summary);

        // Show modal if requested
        if (showModal) {
          setShowErrorModal(true);
        }

        // Focus first error field if requested
        if (focusFirstError && validation.firstInvalidField) {
          // If this is a retry and we're on the same field, move to next error
          if (validationAttempts.current > 1 && 
              lastFocusedField.current === validation.firstInvalidField &&
              validation.errorList.length > 1) {
            const nextError = validation.errorList[1];
            if (nextError) {
              focusField(nextError.field);
              lastFocusedField.current = nextError.field;
            }
          } else {
            focusField(validation.firstInvalidField);
            lastFocusedField.current = validation.firstInvalidField;
          }
        }

        return false;
      }

      // Reset validation state on success
      validationAttempts.current = 0;
      lastFocusedField.current = null;
      setErrorSummary(null);
      
      return true;

    } catch (error) {
      console.error('Form validation error:', error);
      setErrorSummary({
        title: 'Validation Error',
        subtitle: 'An error occurred during validation',
        sections: [{
          title: '🔧 System Error',
          errors: ['Please try again or contact support if the issue persists']
        }],
        firstField: null,
        totalCount: 1
      });
      
      if (showModal) {
        setShowErrorModal(true);
      }
      
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [module, customValidations]);

  /**
   * Quick validation without modal (for real-time checks)
   * @param {Object} formData - Form data to validate
   * @returns {Object} - Validation result
   */
  const quickValidate = useCallback((formData) => {
    return validateCompleteForm(formData, module, customValidations);
  }, [module, customValidations]);

  /**
   * Focus on a specific field
   * @param {string} fieldName - Field name to focus
   */
  const goToField = useCallback((fieldName) => {
    focusField(fieldName, { highlightDuration: 4000 });
    lastFocusedField.current = fieldName;
  }, []);

  /**
   * Close error modal
   */
  const closeErrorModal = useCallback(() => {
    setShowErrorModal(false);
  }, []);

  /**
   * Retry validation (typically called from modal)
   */
  const retryValidation = useCallback((formData) => {
    return validateForm(formData, { showModal: true, focusFirstError: true });
  }, [validateForm]);

  /**
   * Reset validation state
   */
  const resetValidation = useCallback(() => {
    setIsValidating(false);
    setShowErrorModal(false);
    setErrorSummary(null);
    setLastValidationResult(null);
    validationAttempts.current = 0;
    lastFocusedField.current = null;
  }, []);

  /**
   * Get validation status for UI display
   */
  const getValidationStatus = useCallback(() => {
    if (!lastValidationResult) return null;
    
    return {
      isValid: lastValidationResult.isValid,
      errorCount: lastValidationResult.errorList.length,
      hasRequiredErrors: lastValidationResult.summary.requiredFieldErrors > 0,
      hasFormatErrors: lastValidationResult.summary.formatErrors > 0,
      hasCustomErrors: lastValidationResult.summary.customErrors > 0
    };
  }, [lastValidationResult]);

  /**
   * Pre-submission validation with comprehensive error handling
   * @param {Object} formData - Form data
   * @param {Function} onSuccess - Callback for successful validation
   * @param {Function} onError - Callback for validation errors
   */
  const validateBeforeSubmit = useCallback(async (formData, onSuccess, onError) => {
    const isValid = await validateForm(formData, {
      showModal: true,
      focusFirstError: true
    });

    if (isValid) {
      if (onSuccess) {
        onSuccess(formData);
      }
    } else {
      if (onError) {
        onError(lastValidationResult);
      }
    }

    return isValid;
  }, [validateForm, lastValidationResult]);

  return {
    // Validation functions
    validateForm,
    quickValidate,
    validateBeforeSubmit,
    
    // Navigation functions
    goToField,
    focusField,
    
    // Modal control
    showErrorModal,
    closeErrorModal,
    retryValidation,
    
    // State management
    resetValidation,
    getValidationStatus,
    
    // State values
    isValidating,
    errorSummary,
    lastValidationResult,
    
    // Validation metadata
    validationAttempts: validationAttempts.current,
    lastFocusedField: lastFocusedField.current
  };
};

export default useFormValidation;
