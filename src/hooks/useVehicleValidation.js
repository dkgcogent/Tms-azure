import { useCallback } from 'react';

export const useVehicleValidation = () => {
  const validateForm = useCallback((vehicleData) => {
    const newErrors = {};

    !vehicleData.VehicleRegistrationNo.trim() && (newErrors.VehicleRegistrationNo = 'Vehicle registration number is required');
    !vehicleData.VehicleCode.trim() && (newErrors.VehicleCode = 'Vehicle code is required');
    !vehicleData.VehicleChasisNo.trim() && (newErrors.VehicleChasisNo = 'Chassis number is required');
    !vehicleData.VehicleModel.trim() && (newErrors.VehicleModel = 'Vehicle model is required');

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

    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  }, []);

  const validateBeforeSubmit = useCallback(async (formData, successCallback, errorCallback) => {
    try {
      const errors = {};
      const requiredFields = [
        { field: 'VehicleRegistrationNo', label: 'Vehicle Registration Number', element: 'input[name="VehicleRegistrationNo"]' },
        { field: 'vendor_id', label: 'Assigned Vendor', element: 'input[name="vendor_id"]' },
        { field: 'VehicleCode', label: 'Vehicle Code', element: 'input[name="VehicleCode"]' },
        { field: 'VehicleChasisNo', label: 'Vehicle Chassis Number', element: 'input[name="VehicleChasisNo"]' },
        { field: 'VehicleModel', label: 'Vehicle Model', element: 'input[name="VehicleModel"]' },
        { field: 'TypeOfBody', label: 'Type of Body', element: 'select[name="TypeOfBody"]' },
        { field: 'VehicleType', label: 'Vehicle Type', element: 'select[name="VehicleType"]' },
        { field: 'VehicleRegistrationDate', label: 'Vehicle Registration Date', element: 'input[name="VehicleRegistrationDate"]' }
      ];

      let firstErrorField = null;
      const missingFields = [];

      requiredFields.forEach(({ field, label, element }) => {
        if (!formData[field] || (typeof formData[field] === 'string' && !formData[field].trim())) {
          errors[field] = `${label} is required`;
          missingFields.push(label);
          if (!firstErrorField) {
            firstErrorField = { field, label, element };
          }
        }
      });

      if (formData.VehicleRegistrationNo && formData.VehicleRegistrationNo.length < 3) {
        errors.VehicleRegistrationNo = 'Vehicle Registration Number must be at least 3 characters';
        if (!firstErrorField) {
          firstErrorField = { field: 'VehicleRegistrationNo', label: 'Vehicle Registration Number', element: 'input[name="VehicleRegistrationNo"]' };
        }
      }

      if (Object.keys(errors).length > 0) {
        const missingFieldsText = missingFields.join(', ');
        
        if (firstErrorField) {
          setTimeout(() => {
            const element = document.querySelector(firstErrorField.element);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
              element.focus();
              element.style.boxShadow = '0 0 15px #ff6b6b';
              element.style.borderColor = '#ff6b6b';
              setTimeout(() => {
                element.style.boxShadow = '';
                element.style.borderColor = '';
              }, 3000);
            }
          }, 500);
        }

        errorCallback && errorCallback({ isValid: false, errors, summary: `${missingFields.length} required fields missing` });
        return false;
      }

      successCallback && await successCallback(formData);
      return true;
    } catch (error) {
      errorCallback && errorCallback({ isValid: false, errors: {}, summary: 'Validation failed' });
      return false;
    }
  }, []);

  return { validateForm, validateBeforeSubmit };
};
