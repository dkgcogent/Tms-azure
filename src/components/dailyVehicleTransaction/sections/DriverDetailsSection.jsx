import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const DriverDetailsSection = ({
  transactionData,
  drivers,
  errors,
  onTransactionDataChange,
  onReplacementDriverNoChange
}) => {
  return (
    <FormSection title="🔵 BLUE SECTION - Driver Details" className="driver-section">
      <FormField
        label="Driver"
        name="DriverID"
        type="driverDropdown"
        value={transactionData.DriverID}
        drivers={drivers}
        onSpecialChange={onTransactionDataChange}
        required
        error={errors.DriverID}
      />

      <FormField
        label="Driver Mobile No"
        name="DriverMobileNo"
        type="readonly"
        value={transactionData.DriverMobileNo}
        placeholder="Auto-populated"
      />

      <FormField
        label="Trip Number"
        name="TripNo"
        type="number"
        value={transactionData.TripNo}
        onChange={onTransactionDataChange}
        required
        error={errors.TripNo}
        placeholder="Enter trip number"
        options={{ helpText: "Must be a positive integer" }}
      />

      <FormField
        label="Replacement Driver Name"
        name="ReplacementDriverName"
        type="text"
        value={transactionData.ReplacementDriverName}
        onChange={onTransactionDataChange}
        placeholder="Enter replacement driver name or NA"
      />

      <FormField
        label="Replacement Driver No"
        name="ReplacementDriverNo"
        type="text"
        value={transactionData.ReplacementDriverNo}
        onChange={onReplacementDriverNoChange}
        error={errors.ReplacementDriverNo}
        maxLength="10"
        placeholder="Enter 10-digit mobile number or NA"
      />

      <FormField
        label="Date"
        name="Date"
        type="date"
        value={transactionData.Date}
        onChange={onTransactionDataChange}
        required
        error={errors.Date}
      />

      <FormField
        label="Out Time from Hub"
        name="OutTimeFromHub"
        type="timeInput"
        value={transactionData.OutTimeFromHub}
        onChange={onTransactionDataChange}
      />

      <FormField
        label="In Time by Customer"
        name="InTimeByCust"
        type="timeInput"
        value={transactionData.InTimeByCust}
        onChange={onTransactionDataChange}
      />

      <FormField
        label="Return Reporting Time"
        name="ReturnReportingTime"
        type="timeInput"
        value={transactionData.ReturnReportingTime}
        onChange={onTransactionDataChange}
      />

      <FormField
        label="Arrival Time at Hub"
        name="ArrivalTimeAtHub"
        type="timeInput"
        value={transactionData.ArrivalTimeAtHub}
        onChange={onTransactionDataChange}
      />

      <FormField
        label="Opening KM"
        name="OpeningKM"
        type="number"
        value={transactionData.OpeningKM}
        onChange={onTransactionDataChange}
        required
        error={errors.OpeningKM}
        step="0.01"
        placeholder="Enter opening KM"
      />

      <FormField
        label="Total Shipments for Deliveries"
        name="TotalShipmentsForDeliveries"
        type="number"
        value={transactionData.TotalShipmentsForDeliveries}
        onChange={onTransactionDataChange}
        step="1"
      />

      <FormField
        label="Total Shipment Deliveries Attempted"
        name="TotalShipmentDeliveriesAttempted"
        type="number"
        value={transactionData.TotalShipmentDeliveriesAttempted}
        onChange={onTransactionDataChange}
        step="1"
      />

      <FormField
        label="Total Shipment Deliveries Done"
        name="TotalShipmentDeliveriesDone"
        type="number"
        value={transactionData.TotalShipmentDeliveriesDone}
        onChange={onTransactionDataChange}
        step="1"
      />

      <FormField
        label="Closing KM"
        name="ClosingKM"
        type="number"
        value={transactionData.ClosingKM}
        onChange={onTransactionDataChange}
        required
        error={errors.ClosingKM}
        step="0.01"
        placeholder="Enter closing KM"
      />
    </FormSection>
  );
};

export default DriverDetailsSection;
