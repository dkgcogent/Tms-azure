import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const MasterDataSection = ({
  masterData,
  customers,
  projects,
  vehicles,
  vendors,
  availableProjects,
  errors,
  onMasterDataChange,
  onVehicleAutoPopulate,
  onCompanySelect
}) => {
  const transactionTypeOptions = ['Fixed', 'Adhoc', 'Replacement'];
  const vehicleTypeOptions = ['Tata Ace', 'Mahindra Bolero Pickup', 'Ashok Leyland Dost', 'Force Traveller', 'Mahindra Bolero Camper', 'Tata 407', 'Eicher 14 Feet', 'Eicher 17 Feet', 'Eicher 19 Feet', 'Tata 709', 'Ashok Leyland 1618', 'Tata 1109', 'Ashok Leyland 1918', 'Tata 1518', 'Ashok Leyland 2518', 'Tata 2518', 'Ashok Leyland 3118', 'Tata 3118', 'Ashok Leyland 4018', 'Tata 4018', 'Trailer'];
  const vehiclePlacementOptions = ['Dedicated', 'Shared'];

  return (
    <FormSection title="🔘 GREY SECTION - Master Data" className="master-section">
      <FormField
        label="Type of Transaction"
        name="TypeOfTransaction"
        type="select"
        value={masterData.TypeOfTransaction}
        onChange={onMasterDataChange}
        options={{ values: transactionTypeOptions }}
        required
        error={errors.TypeOfTransaction}
      />

      {(masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') ? (
        <FormField
          label="Company Name"
          name="Customer"
          type="customerDropdown"
          value={masterData.Customer}
          customers={customers}
          onSpecialChange={onCompanySelect}
          required
          error={errors.Customer}
        />
      ) : (
        <FormField
          label="Vehicle No"
          name="VehicleNo"
          type="vehicleDropdown"
          value={masterData.VehicleNo}
          vehicles={vehicles}
          onSpecialChange={onVehicleAutoPopulate}
          required
          error={errors.VehicleNo}
        />
      )}

      <FormField
        label="Company Name"
        name="CompanyName"
        type="readonly"
        value={masterData.CompanyName}
        placeholder="Auto-populated"
      />

      <FormField
        label="GST No"
        name="GSTNo"
        type="readonly"
        value={masterData.GSTNo}
        placeholder="Auto-populated"
      />

      <FormField
        label="Project"
        name="Project"
        type="projectDropdown"
        value={masterData.Project}
        availableProjects={availableProjects}
        onSpecialChange={onMasterDataChange}
        required
        error={errors.Project}
      />

      <FormField
        label="Location"
        name="CustSite"
        type="text"
        value={masterData.CustSite}
        onChange={onMasterDataChange}
        required
        error={errors.CustSite}
        placeholder="Enter location"
      />

      <FormField
        label="Vehicle Placement Type"
        name="VehiclePlacementType"
        type="select"
        value={masterData.VehiclePlacementType}
        onChange={onMasterDataChange}
        options={{ values: vehiclePlacementOptions }}
        placeholder="Select placement type"
      />

      <FormField
        label="Vehicle Type"
        name="VehicleType"
        type="select"
        value={masterData.VehicleType}
        onChange={onMasterDataChange}
        options={{ values: vehicleTypeOptions }}
        placeholder="Select vehicle type"
      />

      <FormField
        label="Vendor Name"
        name="VendorName"
        type="readonly"
        value={masterData.VendorName}
        placeholder="Auto-populated"
      />

      <FormField
        label="Vendor Code"
        name="VendorCode"
        type="readonly"
        value={masterData.VendorCode}
        placeholder="Auto-populated"
      />
    </FormSection>
  );
};

export default MasterDataSection;
