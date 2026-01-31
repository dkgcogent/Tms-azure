import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const VehiclePhotosSection = ({ vehicleData, handleInputChange, files, editingVehicle, errors, handleFileChange, handleFileDelete, getExpiryStatus }) => {
  const commonProps = { vehicleData, files, editingVehicle, errors, handleFileChange, handleFileDelete, getExpiryStatus };
  const photoField = (label, name) => <FormField label={label} name={name} type="file" value={vehicleData[name]} onChange={handleInputChange} options={{ accept: '.jpg,.jpeg,.png' }} error={errors[name]} {...commonProps} />;

  return (
    <FormSection title="Vehicle Photos 📷" icon="📷">
      <div className="form-field full-width">
        <label className="form-field-label">
          Vehicle Photos 📷 <span className="required-indicator">*</span>
        </label>
        <div className="vehicle-photos-grid">
          {photoField('Front View', 'VehiclePhotoFront')}
          {photoField('Back View', 'VehiclePhotoBack')}
          {photoField('Left Side View', 'VehiclePhotoLeftSide')}
          {photoField('Right Side View', 'VehiclePhotoRightSide')}
          {photoField('Interior/Dashboard', 'VehiclePhotoInterior')}
          {photoField('Engine Bay', 'VehiclePhotoEngine')}
          {photoField('Roof View', 'VehiclePhotoRoof')}
          {photoField('Door View', 'VehiclePhotoDoor')}
        </div>
        <small className="photo-hint">
          📸 Please upload clear, well-lit photos from all angles. At least front and back views are required.
        </small>
      </div>
    </FormSection>
  );
};

export default VehiclePhotosSection;
