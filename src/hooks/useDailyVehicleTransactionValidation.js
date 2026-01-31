import { useCallback } from 'react';

export const useDailyVehicleTransactionValidation = () => {
  const validateForm = useCallback((masterData, transactionData, selectedDrivers) => {
    const newErrors = {};

    // Master data validations
    if (!masterData.Customer) newErrors.Customer = 'Company Name is required';
    if (!masterData.Project) newErrors.Project = 'Project is required';
    if (!masterData.CustSite) newErrors.CustSite = 'Location is required';

    // Fixed transaction specific validations
    if (masterData.TypeOfTransaction === 'Fixed') {
      if (!masterData.VehicleNo || masterData.VehicleNo.length === 0) {
        newErrors.VehicleNo = 'At least one vehicle must be selected';
      }

      // Check if driver is selected (either through selectedDrivers array or DriverID)
      const hasDriver = (selectedDrivers && selectedDrivers.length > 0) || transactionData.DriverID;
      if (!hasDriver) {
        newErrors.DriverID = 'Driver must be selected for Fixed transactions';
      }
    }

    // Common transaction data validations
    if (!transactionData.Date) newErrors.Date = 'Date is required';
    if (!transactionData.OpeningKM) newErrors.OpeningKM = 'Opening KM is required';
    if (!transactionData.ClosingKM) newErrors.ClosingKM = 'Closing KM is required';

    // Trip Number validation for all transaction types
    if (!transactionData.TripNo) {
      newErrors.TripNo = 'Trip Number is required';
    } else {
      const tripNum = parseInt(transactionData.TripNo, 10);
      if (isNaN(tripNum) || tripNum <= 0) {
        newErrors.TripNo = 'Trip Number must be a positive integer';
      }
    }

    // Adhoc/Replacement-specific validations
    if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
      if (!transactionData.TripNo) newErrors.TripNo = 'Trip No is required for Adhoc/Replacement transactions';
      if (!transactionData.VehicleNumber) newErrors.VehicleNumber = 'Vehicle Number is required for Adhoc/Replacement transactions';
      if (!transactionData.VendorName) newErrors.VendorName = 'Vendor Name is required for Adhoc/Replacement transactions';
      if (!transactionData.DriverName) newErrors.DriverName = 'Driver Name is required for Adhoc/Replacement transactions';
      if (!transactionData.DriverNumber) newErrors.DriverNumber = 'Driver Number is required for Adhoc/Replacement transactions';

      // Validate driver number format
      if (transactionData.DriverNumber && transactionData.DriverNumber.length !== 10) {
        newErrors.DriverNumber = 'Driver Number must be exactly 10 digits';
      }

      // Validate vendor number format if provided
      if (transactionData.VendorNumber && transactionData.VendorNumber.length !== 10) {
        newErrors.VendorNumber = 'Vendor Number must be exactly 10 digits';
      }

      // Validate Aadhar number format if provided
      if (transactionData.DriverAadharNumber && transactionData.DriverAadharNumber.length !== 12) {
        newErrors.DriverAadharNumber = 'Aadhar Number must be exactly 12 digits';
      }
    }

    // Replacement driver validation - optional but conditional
    // Skip validation if the values are "NA" (default values)
    if (transactionData.ReplacementDriverName &&
        transactionData.ReplacementDriverName.trim() !== '' &&
        transactionData.ReplacementDriverName.trim().toLowerCase() !== 'na') {
      // If replacement driver name is provided (and not "NA"), number is required
      if (!transactionData.ReplacementDriverNo ||
          transactionData.ReplacementDriverNo.trim() === '' ||
          transactionData.ReplacementDriverNo.trim().toLowerCase() === 'na') {
        newErrors.ReplacementDriverNo = 'Replacement driver number is required when driver name is provided';
      } else if (transactionData.ReplacementDriverNo.length !== 10) {
        newErrors.ReplacementDriverNo = 'Replacement driver number must be exactly 10 digits';
      }
    }

    // Validation for KM values
    if (transactionData.OpeningKM && transactionData.ClosingKM) {
      const opening = parseFloat(transactionData.OpeningKM);
      const closing = parseFloat(transactionData.ClosingKM);
      if (closing <= opening) {
        newErrors.ClosingKM = 'Closing KM must be greater than Opening KM';
      }
    }

    const isValid = Object.keys(newErrors).length === 0;
    return { isValid, errors: newErrors };
  }, []);

  const validateBeforeSubmit = useCallback(async (formData, successCallback, errorCallback) => {
    try {
      const validationResult = validateForm(formData.masterData, formData.transactionData, formData.selectedDrivers);

      if (!validationResult.isValid) {
        if (errorCallback) {
          errorCallback({
            success: false,
            errors: validationResult.errors,
            summary: `Validation failed with ${Object.keys(validationResult.errors).length} errors`
          });
        }
        return;
      }

      if (successCallback) {
        await successCallback(formData);
      }
    } catch (error) {
      if (errorCallback) {
        errorCallback({
          success: false,
          error: error.message,
          summary: 'Validation process failed'
        });
      }
    }
  }, [validateForm]);

  // Handler for Trip Number input (allows alphanumeric and special characters)
  const handleTripNumberChange = useCallback((e, setTransactionData) => {
    const value = e.target.value;

    // Allow any alphanumeric and special characters
    // Maximum length of 50 characters (as per database schema: varchar(50))
    if (value.length <= 50) {
      setTransactionData(prev => ({ ...prev, TripNumber: value }));
    }
  }, []);

  // Handler for replacement driver number with validation
  const handleReplacementDriverNoChange = useCallback((e, setTransactionData, setErrors) => {
    const value = e.target.value;

    // Allow "NA" as a valid value
    if (value.toLowerCase() === 'na' || value.toLowerCase() === 'n/a') {
      setTransactionData(prev => ({ ...prev, ReplacementDriverNo: 'NA' }));
      // Clear any errors for "NA"
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.ReplacementDriverNo;
        return newErrors;
      });
      return;
    }

    // Only allow digits for non-NA values
    if (!/^\d*$/.test(value)) return;

    // Limit to 10 digits
    if (value.length > 10) return;

    setTransactionData(prev => ({ ...prev, ReplacementDriverNo: value }));

    // Validate mobile number (skip validation for empty or "NA")
    if (value.length > 0 && value.length !== 10) {
      setErrors(prev => ({ ...prev, ReplacementDriverNo: 'Mobile number must be exactly 10 digits' }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.ReplacementDriverNo;
        return newErrors;
      });
    }
  }, []);

  // Handler for vendor number with validation
  const handleVendorNumberChange = useCallback((e, setTransactionData, setErrors) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;
    if (value.length > 10) return;

    setTransactionData(prev => ({ ...prev, VendorNumber: value }));

    if (value.length > 0 && value.length !== 10) {
      setErrors(prev => ({ ...prev, VendorNumber: 'Vendor number must be exactly 10 digits' }));
    } else {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors.VendorNumber; return newErrors; });
    }
  }, []);

  // Handler for driver number with validation
  const handleDriverNumberChange = useCallback((e, setTransactionData, setErrors) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;
    if (value.length > 10) return;

    setTransactionData(prev => ({ ...prev, DriverNumber: value }));

    if (value.length > 0 && value.length !== 10) {
      setErrors(prev => ({ ...prev, DriverNumber: 'Driver number must be exactly 10 digits' }));
    } else {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors.DriverNumber; return newErrors; });
    }
  }, []);

  // Handler for Aadhar number with validation
  const handleAadharNumberChange = useCallback((e, setTransactionData, setErrors) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;
    if (value.length > 12) return;

    setTransactionData(prev => ({ ...prev, DriverAadharNumber: value }));

    if (value.length > 0 && value.length !== 12) {
      setErrors(prev => ({ ...prev, DriverAadharNumber: 'Aadhar number must be exactly 12 digits' }));
    } else {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors.DriverAadharNumber; return newErrors; });
    }
  }, []);

  return {
    validateForm,
    validateBeforeSubmit,
    handleTripNumberChange,
    handleReplacementDriverNoChange,
    handleVendorNumberChange,
    handleDriverNumberChange,
    handleAadharNumberChange
  };
};
