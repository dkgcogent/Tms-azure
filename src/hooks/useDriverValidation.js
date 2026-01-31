import { useCallback } from 'react';

export const useDriverValidation = () => {
  const validateForm = useCallback((driverData) => {
    const newErrors = {};

    !driverData.DriverName.trim() && (newErrors.DriverName = 'Driver name is required');
    !driverData.DriverLicenceNo.trim() && (newErrors.DriverLicenceNo = 'Licence number is required');

    if (driverData.DriverLicenceIssueDate && driverData.DriverLicenceExpiryDate && driverData.DriverLicenceIssueDate > driverData.DriverLicenceExpiryDate) {
      newErrors.DriverLicenceExpiryDate = 'Licence expiry date cannot be before issue date';
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

      if (!formData.DriverName) {
        errors.DriverName = 'Driver Name is required';
        errorFields.push('DriverName');
      }
      if (!formData.DriverLicenceNo) {
        errors.DriverLicenceNo = 'Driver Licence Number is required';
        errorFields.push('DriverLicenceNo');
      }
      if (!formData.DriverMobileNo) {
        errors.DriverMobileNo = 'Driver Mobile Number is required';
        errorFields.push('DriverMobileNo');
      }

      if (Object.keys(errors).length > 0) {
        // Focus on the first error field
        if (errorFields.length > 0) {
          focusField(errorFields[0]);
        }

        errorCallback && errorCallback({ isValid: false, errors, summary: 'Please fill in all required fields' });
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
