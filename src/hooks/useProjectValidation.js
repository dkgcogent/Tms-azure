import { useCallback } from 'react';

export const useProjectValidation = () => {
  const validateForm = useCallback((projectData) => {
    const newErrors = {};

    if (!projectData.ProjectName?.trim()) {
      newErrors.ProjectName = 'Project name is required';
    }

    if (!projectData.CustomerID) {
      newErrors.CustomerID = 'Customer selection is required';
    }

    const pValStr = projectData.ProjectValue !== undefined && projectData.ProjectValue !== null ? String(projectData.ProjectValue).trim() : '';
    if (!pValStr) {
      newErrors.ProjectValue = 'Project value is required';
    } else if (isNaN(pValStr) || parseFloat(pValStr) < 0) {
      newErrors.ProjectValue = 'Project value must be a valid positive number';
    }

    if (!projectData.StartDate) {
      newErrors.StartDate = 'Project start date is required';
    }

    if (!projectData.EndDate) {
      newErrors.EndDate = 'Project end date is required';
    }

    if (!projectData.Status) {
      newErrors.Status = 'Project status is required';
    }

    if (projectData.StartDate && projectData.EndDate && new Date(projectData.EndDate) <= new Date(projectData.StartDate)) {
      newErrors.EndDate = 'End date must be after start date';
    }

    if (projectData.BillingTenure === 'Specific Dates') {
      if (!projectData.BillingFromDate) {
        newErrors.BillingFromDate = 'Billing From Date is required';
      }
      if (!projectData.BillingToDate) {
        newErrors.BillingToDate = 'Billing To Date is required';
      } else if (projectData.BillingFromDate && new Date(projectData.BillingToDate) <= new Date(projectData.BillingFromDate)) {
        newErrors.BillingToDate = 'Billing To Date must be after Billing From Date';
      }
    }

    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  }, []);

  const focusField = useCallback((fieldName) => {
    try {
      const fieldElement = document.querySelector(`[name="${fieldName}"]`);

      if (fieldElement) {
        fieldElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });

        setTimeout(() => {
          fieldElement.focus();
          fieldElement.style.boxShadow = '0 0 15px #ff6b6b';
          fieldElement.style.borderColor = '#ff6b6b';

          setTimeout(() => {
            fieldElement.style.boxShadow = '';
            fieldElement.style.borderColor = '';
          }, 3000);
        }, 300);

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error focusing field:', error);
      return false;
    }
  }, []);

  const validateBeforeSubmit = useCallback(async (formData, successCallback, errorCallback) => {
    try {
      const errors = {};
      const errorFields = [];

      // Define field priority order (top to bottom)
      const fieldOrder = ['ProjectName', 'CustomerID', 'ProjectValue', 'StartDate', 'EndDate', 'Status'];

      if (!formData.ProjectName?.trim()) {
        errors.ProjectName = 'Project name is required';
        errorFields.push('ProjectName');
      }

      if (!formData.CustomerID) {
        errors.CustomerID = 'Customer selection is required';
        errorFields.push('CustomerID');
      }

      const pValStr = formData.ProjectValue !== undefined && formData.ProjectValue !== null ? String(formData.ProjectValue).trim() : '';
      if (!pValStr) {
        errors.ProjectValue = 'Project value is required';
        errorFields.push('ProjectValue');
      } else if (isNaN(pValStr) || parseFloat(pValStr) < 0) {
        errors.ProjectValue = 'Project value must be a valid positive number';
        errorFields.push('ProjectValue');
      }

      if (!formData.StartDate) {
        errors.StartDate = 'Project start date is required';
        errorFields.push('StartDate');
      }

      if (!formData.EndDate) {
        errors.EndDate = 'Project end date is required';
        errorFields.push('EndDate');
      }

      if (!formData.Status) {
        errors.Status = 'Project status is required';
        errorFields.push('Status');
      }

      // Date validation
      if (formData.StartDate && formData.EndDate) {
        const startDate = new Date(formData.StartDate);
        const endDate = new Date(formData.EndDate);

        if (endDate <= startDate) {
          errors.EndDate = 'End date must be after start date';
          if (!errorFields.includes('EndDate')) {
            errorFields.push('EndDate');
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        const firstErrorField = fieldOrder.find(field => errorFields.includes(field));
        if (firstErrorField) {
          focusField(firstErrorField);
        }

        errorCallback && errorCallback({ isValid: false, errors, summary: `${Object.keys(errors).length} validation error(s) found` });
        return false;
      }

      successCallback && await successCallback(formData);
      return true;
    } catch (error) {
      errorCallback && errorCallback({ isValid: false, errors: {}, summary: 'Validation failed' });
      return false;
    }
  }, [focusField]);

  return { validateForm, validateBeforeSubmit, focusField };
};
