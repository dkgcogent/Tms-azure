import React, { useState } from 'react';
import './AddressForm.css';

const AddressForm = ({ 
  addressData, 
  onAddressChange, 
  errors = {}, 
  required = true,
  prefix = '',
  title = 'Address'
}) => {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());
  const [autoFillMessage, setAutoFillMessage] = useState('');

  // No longer need to load states and cities since we're using input fields

  const handlePinCodeLookup = async (pincode) => {
    console.log('🔍 PIN Code Lookup triggered for:', pincode);
    console.log('🔍 Current addressData:', addressData);
    console.log('🔍 onAddressChange function:', typeof onAddressChange);

    if (!/^\d{6}$/.test(pincode)) {
      console.log('❌ Invalid PIN code format:', pincode);
      return;
    }

    console.log('✅ Valid PIN code, starting lookup...');
    setIsLookingUp(true);
    setAutoFillMessage('🔍 Looking up PIN code...');

    try {
      console.log('🌐 Making API call to:', `/api/pincode/lookup/${pincode}`);
      const response = await fetch(`/api/pincode/lookup/${pincode}`);
      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📡 API Response:', data);

      if (data.success && data.data) {
        const locationData = data.data;

        console.log(`📍 Auto-filling address from ${data.data.source}:`, locationData);

        const updatedAddressData = {
          ...addressData,
          pin_code: pincode,
          city: locationData.city || locationData.district, // Use district as city from postal API
          state: locationData.state,
          country: locationData.country || 'India'
        };

        console.log('📤 Sending updated address data to parent:', updatedAddressData);
        onAddressChange(updatedAddressData);

        // Mark fields as auto-filled for visual feedback
        setAutoFilledFields(new Set(['city', 'state', 'country']));

        // Show success message
        const source = data.data.source === 'cache' ? 'local cache' : 'India Postal API';
        setAutoFillMessage(`✅ Address auto-filled from ${source}`);
        console.log(`✅ Address auto-filled from ${source}`);

        // Clear message after 3 seconds
        setTimeout(() => setAutoFillMessage(''), 3000);
      } else {
        setAutoFillMessage(`❌ PIN code ${pincode} not found`);
        setTimeout(() => setAutoFillMessage(''), 3000);
        console.log(`❌ PIN code ${pincode} not found`);
      }
    } catch (error) {
      console.error('❌ PIN code lookup failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setAutoFillMessage(`❌ Lookup failed: ${error.message}`);
      setTimeout(() => setAutoFillMessage(''), 5000);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleInputChange = (field, value) => {
    console.log('📝 Input change:', field, '=', value);
    console.log('📝 Current addressData before change:', addressData);

    const newAddressData = {
      ...addressData,
      [field]: value
    };

    console.log('📝 New addressData after change:', newAddressData);

    // Clear auto-fill indicator when user manually edits
    if (autoFilledFields.has(field)) {
      const newAutoFilledFields = new Set(autoFilledFields);
      newAutoFilledFields.delete(field);
      setAutoFilledFields(newAutoFilledFields);
      console.log('🧹 Cleared auto-fill indicator for field:', field);
    }

    // Trigger pin code lookup when pin code is complete
    if (field === 'pin_code' && value.length === 6) {
      console.log('🎯 PIN code complete, triggering lookup for:', value);
      console.log('🎯 PIN code validation test:', /^\d{6}$/.test(value));
      handlePinCodeLookup(value);
    } else if (field === 'pin_code' && value.length < 6) {
      // Clear auto-fill indicators when PIN code is incomplete
      setAutoFilledFields(new Set());
      setAutoFillMessage('');
      console.log('🧹 Cleared auto-fill indicators - PIN code incomplete');
    }

    console.log('📤 Calling onAddressChange with:', newAddressData);
    onAddressChange(newAddressData);
  };

  const getFieldName = (field) => prefix ? `${prefix}_${field}` : field;

  return (
    <div className="address-form-container">
      <h4 className="address-form-title">
        {title} {required && <span className="required-indicator">*</span>}
      </h4>

      {/* Auto-fill Status Message */}
      {autoFillMessage && (
        <div className={`auto-fill-message ${autoFillMessage.includes('✅') ? 'success' : 'error'}`}>
          {autoFillMessage}
        </div>
      )}

      <div className="address-grid">
        {/* House/Flat No. */}
        <div className="address-field">
          <label className="address-label">
            House / Flat No. {required && <span className="required-indicator">*</span>}
          </label>
          <input
            type="text"
            value={addressData.house_flat_no || ''}
            onChange={(e) => handleInputChange('house_flat_no', e.target.value)}
            placeholder="Enter house/flat number"
            required={required}
            className={errors[getFieldName('house_flat_no')] ? 'error' : ''}
          />
          {errors[getFieldName('house_flat_no')] && (
            <div className="address-error">{errors[getFieldName('house_flat_no')]}</div>
          )}
        </div>

        {/* Street/Locality */}
        <div className="address-field">
          <label className="address-label">
            Street / Locality {required && <span className="required-indicator">*</span>}
          </label>
          <input
            type="text"
            value={addressData.street_locality || ''}
            onChange={(e) => handleInputChange('street_locality', e.target.value)}
            placeholder="Enter street/locality"
            required={required}
            className={errors[getFieldName('street_locality')] ? 'error' : ''}
          />
          {errors[getFieldName('street_locality')] && (
            <div className="address-error">{errors[getFieldName('street_locality')]}</div>
          )}
        </div>

        {/* Pin Code */}
        <div className="address-field">
          <label className="address-label">
            Pin Code {required && <span className="required-indicator">*</span>}
          </label>
          <div className="pin-code-container">
            <input
              type="text"
              value={addressData.pin_code || ''}
              onChange={(e) => handleInputChange('pin_code', e.target.value)}
              placeholder="Enter 6-digit PIN code"
              maxLength={6}
              pattern="[0-9]{6}"
              required={required}
              className={`${errors[getFieldName('pin_code')] ? 'error' : ''} ${addressData.pin_code && addressData.pin_code.length === 6 ? 'pin-complete' : ''}`}
            />
            {isLookingUp && <div className="lookup-indicator">🔍 Looking up...</div>}
          </div>
          {errors[getFieldName('pin_code')] && (
            <div className="address-error">{errors[getFieldName('pin_code')]}</div>
          )}
        </div>

        {/* City */}
        <div className="address-field">
          <label className="address-label">
            City {required && <span className="required-indicator">*</span>}
          </label>
          <input
            type="text"
            value={addressData.city || ''}
            onChange={(e) => handleInputChange('city', e.target.value)}
            placeholder="Enter city"
            required={required}
            className={`${errors[getFieldName('city')] ? 'error' : ''} ${autoFilledFields.has('city') ? 'auto-filled' : ''}`}
          />
          {errors[getFieldName('city')] && (
            <div className="address-error">{errors[getFieldName('city')]}</div>
          )}
        </div>

        {/* State */}
        <div className="address-field">
          <label className="address-label">
            State {required && <span className="required-indicator">*</span>}
          </label>
          <input
            type="text"
            value={addressData.state || ''}
            onChange={(e) => handleInputChange('state', e.target.value)}
            placeholder="Enter state"
            required={required}
            className={`${errors[getFieldName('state')] ? 'error' : ''} ${autoFilledFields.has('state') ? 'auto-filled' : ''}`}
          />
          {errors[getFieldName('state')] && (
            <div className="address-error">{errors[getFieldName('state')]}</div>
          )}
        </div>

        {/* Country */}
        <div className="address-field">
          <label className="address-label">Country</label>
          <input
            type="text"
            value={addressData.country || 'India'}
            onChange={(e) => handleInputChange('country', e.target.value)}
            placeholder="Enter country"
            className={`${errors[getFieldName('country')] ? 'error' : ''} ${autoFilledFields.has('country') ? 'auto-filled' : ''}`}
          />
          {errors[getFieldName('country')] && (
            <div className="address-error">{errors[getFieldName('country')]}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddressForm;
