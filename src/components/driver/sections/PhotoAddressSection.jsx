import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';
import AddressForm from '../../AddressForm';

const PhotoAddressSection = ({ driverData, handleFileChange, handleFileDelete, handleAddressChange, getAddressData, files, editingDriver, errors }) => (
  <FormSection title="Photo & Address" icon="📷">
    <FormField label="Driver Photo" name="DriverPhoto" type="file" value={files.DriverPhoto} onChange={handleFileChange} options={{ accept: 'image/*,.pdf,.doc,.docx', existingFileUrl: editingDriver ? driverData.DriverPhoto_url : null }} files={files} editingDriver={editingDriver} driverData={driverData} handleFileChange={handleFileChange} handleFileDelete={handleFileDelete} />

    <div className="form-field form-field-full-width">
      <AddressForm addressData={getAddressData()} onAddressChange={handleAddressChange} errors={errors} required={false} prefix="driver" title="Driver Address" />
    </div>
  </FormSection>
);

export default PhotoAddressSection;
