import { useCallback } from 'react';

const patterns = {
  mobile: /^[6-9]\d{9}$/,
  aadhar: /^\d{12}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
};

export const useVendorValidation = () => {
  const validateForm = useCallback((vendorData, files) => {
    const newErrors = {};

    !vendorData.vendor_name?.trim() && (newErrors.vendor_name = 'Vendor name is required');
    
    if (!vendorData.vendor_mobile_no?.trim()) {
      newErrors.vendor_mobile_no = 'Mobile number is required';
    } else if (!patterns.mobile.test(vendorData.vendor_mobile_no.trim())) {
      newErrors.vendor_mobile_no = 'Enter valid 10-digit mobile number starting with 6-9';
    }

    vendorData.pin_code?.trim() && !/^\d{6}$/.test(vendorData.pin_code.trim()) && (newErrors.pin_code = 'Pin Code must be exactly 6 digits');

    const hasAnyAddressField = vendorData.house_flat_no?.trim() || vendorData.street_locality?.trim() || vendorData.city?.trim() || vendorData.state?.trim() || vendorData.pin_code?.trim();
    if (hasAnyAddressField) {
      !vendorData.city?.trim() && (newErrors.city = 'City is required when address is provided');
      !vendorData.state?.trim() && (newErrors.state = 'State is required when address is provided');
    }

    Object.keys(files).forEach(fileKey => {
      files[fileKey]?.size > 20 * 1024 * 1024 && (newErrors[fileKey] = 'File size must be less than 20MB');
    });

    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  }, []);

  return { validateForm };
};
