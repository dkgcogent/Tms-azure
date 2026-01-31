import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const AdhocReplacementSection = ({
  transactionData,
  calculatedData,
  files,
  errors,
  editingTransaction,
  onTransactionDataChange,
  onVendorNumberChange,
  onDriverNumberChange,
  onAadharNumberChange,
  onFileChange
}) => {
  const paymentModeOptions = ['UPI', 'Bank Transfer'];

  return (
    <FormSection title="🔄 ADHOC/REPLACEMENT SECTION - Complete Transaction Details" className="adhoc-replacement-section">
      {/* Basic Transaction Details */}
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
        label="Trip No"
        name="TripNo"
        type="text"
        value={transactionData.TripNo}
        onChange={onTransactionDataChange}
        required
        error={errors.TripNo}
        placeholder="Enter trip number"
      />

      <FormField
        label="Vehicle Number"
        name="VehicleNumber"
        type="text"
        value={transactionData.VehicleNumber}
        onChange={onTransactionDataChange}
        required
        error={errors.VehicleNumber}
        placeholder="Enter vehicle number"
      />

      <FormField
        label="Vendor Name"
        name="VendorName"
        type="text"
        value={transactionData.VendorName}
        onChange={onTransactionDataChange}
        required
        error={errors.VendorName}
        placeholder="Enter vendor name"
      />

      <FormField
        label="Vendor Number"
        name="VendorNumber"
        type="text"
        value={transactionData.VendorNumber}
        onChange={onVendorNumberChange}
        error={errors.VendorNumber}
        maxLength="10"
        placeholder="Enter 10-digit vendor number"
      />

      <FormField
        label="Driver Name"
        name="DriverName"
        type="text"
        value={transactionData.DriverName}
        onChange={onTransactionDataChange}
        required
        error={errors.DriverName}
        placeholder="Enter driver name"
      />

      <FormField
        label="Driver Number"
        name="DriverNumber"
        type="text"
        value={transactionData.DriverNumber}
        onChange={onDriverNumberChange}
        required
        error={errors.DriverNumber}
        maxLength="10"
        placeholder="Enter 10-digit driver number"
      />

      <FormField
        label="Driver Aadhar Number"
        name="DriverAadharNumber"
        type="text"
        value={transactionData.DriverAadharNumber}
        onChange={onAadharNumberChange}
        error={errors.DriverAadharNumber}
        maxLength="12"
        placeholder="Enter 12-digit Aadhar number"
      />

      {/* Document Uploads */}
      <FormField
        label="Driver Aadhar Document"
        name="DriverAadharDoc"
        type="documentUpload"
        files={files}
        editingTransaction={editingTransaction}
        accept=".pdf,.jpg,.jpeg,.png"
        options={{
          onFileChange,
          entityType: "transactions"
        }}
      />

      <FormField
        label="Driver Licence Number"
        name="DriverLicenceNumber"
        type="text"
        value={transactionData.DriverLicenceNumber}
        onChange={onTransactionDataChange}
        placeholder="Enter driver licence number"
      />

      <FormField
        label="Driver Licence Document"
        name="DriverLicenceDoc"
        type="documentUpload"
        files={files}
        editingTransaction={editingTransaction}
        accept=".pdf,.jpg,.jpeg,.png"
        options={{
          onFileChange,
          entityType: "transactions"
        }}
      />

      {/* NEW: 6 Time Fields (Mandatory - Chronological Order) */}
      <FormField
        label="Vehicle Reporting at Hub/WH"
        name="VehicleReportingAtHub"
        type="timeInput"
        value={transactionData.VehicleReportingAtHub}
        onChange={onTransactionDataChange}
        required={true}
        error={errors?.VehicleReportingAtHub}
      />

      <FormField
        label="Vehicle Entry in Hub/WH"
        name="VehicleEntryInHub"
        type="timeInput"
        value={transactionData.VehicleEntryInHub}
        onChange={onTransactionDataChange}
        required={true}
        error={errors?.VehicleEntryInHub}
      />

      <FormField
        label="Vehicle Out from Hub/WH for Delivery"
        name="VehicleOutFromHubForDelivery"
        type="timeInput"
        value={transactionData.VehicleOutFromHubForDelivery}
        onChange={onTransactionDataChange}
        required={true}
        error={errors?.VehicleOutFromHubForDelivery}
      />

      <FormField
        label="Vehicle Return at Hub/WH"
        name="VehicleReturnAtHub"
        type="timeInput"
        value={transactionData.VehicleReturnAtHub}
        onChange={onTransactionDataChange}
        required={true}
        error={errors?.VehicleReturnAtHub}
      />

      <FormField
        label="Vehicle Entered at Hub/WH (Return)"
        name="VehicleEnteredAtHubReturn"
        type="timeInput"
        value={transactionData.VehicleEnteredAtHubReturn}
        onChange={onTransactionDataChange}
        required={true}
        error={errors?.VehicleEnteredAtHubReturn}
      />

      <FormField
        label="Vehicle Out from Hub Final (Trip Close)"
        name="VehicleOutFromHubFinal"
        type="timeInput"
        value={transactionData.VehicleOutFromHubFinal}
        onChange={onTransactionDataChange}
        required={true}
        error={errors?.VehicleOutFromHubFinal}
      />

      {/* KM Tracking */}
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
        label="Opening KM Image"
        name="OpeningKMImage"
        type="documentUpload"
        files={files}
        editingTransaction={editingTransaction}
        accept="image/*"
        options={{
          onFileChange,
          uploadLabel: ""
        }}
      />

      {/* Delivery Tracking */}
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

      <FormField
        label="Closing KM Image"
        name="ClosingKMImage"
        type="documentUpload"
        files={files}
        editingTransaction={editingTransaction}
        accept="image/*"
        options={{
          onFileChange,
          uploadLabel: ""
        }}
      />

      {/* Auto-calculated Total KM */}
      <FormField
        label="Total KM"
        name="TotalKM"
        type="calculated"
        value={calculatedData.TotalKM}
        readOnly
      />

      {/* Freight Calculations */}
      <FormField
        label="V.Freight (Fix)"
        name="VFreightFix"
        type="number"
        value={transactionData.VFreightFix}
        onChange={onTransactionDataChange}
        step="0.01"
        placeholder="Enter fixed freight amount"
      />

      <FormField
        label="Fix KM (if any)"
        name="FixKm"
        type="number"
        value={transactionData.FixKm}
        onChange={onTransactionDataChange}
        step="0.01"
        placeholder="Enter fixed KM"
      />

      <FormField
        label="V.Freight (Variable - Per KM)"
        name="VFreightVariable"
        type="number"
        value={transactionData.VFreightVariable}
        onChange={onTransactionDataChange}
        step="0.01"
        placeholder="Enter variable freight per KM"
      />

      {/* Expense Tracking */}
      <FormField
        label="Toll Expenses"
        name="TollExpenses"
        type="number"
        value={transactionData.TollExpenses}
        onChange={onTransactionDataChange}
        step="0.01"
        placeholder="Enter toll expenses"
      />

      <FormField
        label="Toll Expenses Document"
        name="TollExpensesDoc"
        type="documentUpload"
        files={files}
        editingTransaction={editingTransaction}
        accept=".pdf,.jpg,.jpeg,.png"
        options={{
          onFileChange,
          entityType: "transactions"
        }}
      />

      <FormField
        label="Parking Charges"
        name="ParkingCharges"
        type="number"
        value={transactionData.ParkingCharges}
        onChange={onTransactionDataChange}
        step="0.01"
        placeholder="Enter parking charges"
      />

      <FormField
        label="Parking Charges Document"
        name="ParkingChargesDoc"
        type="documentUpload"
        files={files}
        editingTransaction={editingTransaction}
        accept=".pdf,.jpg,.jpeg,.png"
        options={{
          onFileChange,
          entityType: "transactions"
        }}
      />

      <FormField
        label="Loading Charges"
        name="LoadingCharges"
        type="number"
        value={transactionData.LoadingCharges}
        onChange={onTransactionDataChange}
        step="0.01"
        placeholder="Enter loading charges"
      />

      <FormField
        label="Unloading Charges"
        name="UnloadingCharges"
        type="number"
        value={transactionData.UnloadingCharges}
        onChange={onTransactionDataChange}
        step="0.01"
        placeholder="Enter unloading charges"
      />

      <FormField
        label="Other Charges (if any)"
        name="OtherCharges"
        type="number"
        value={transactionData.OtherCharges}
        onChange={onTransactionDataChange}
        step="0.01"
        placeholder="Enter other charges"
      />

      <FormField
        label="Other Charges Remarks"
        name="OtherChargesRemarks"
        type="textarea"
        value={transactionData.OtherChargesRemarks}
        onChange={onTransactionDataChange}
        rows="2"
        placeholder="Enter remarks for other charges"
      />

      {/* Auto-calculated fields */}
      <FormField
        label="Total Duty Hours"
        name="TotalDutyHours"
        type="calculated"
        value={transactionData.TotalDutyHours}
        readOnly
      />

      <FormField
        label="Total Freight"
        name="TotalFreight"
        type="calculated"
        value={transactionData.TotalFreight}
        readOnly
      />

      {/* Advance Management */}
      <FormField
        label="Advance Request No"
        name="AdvanceRequestNo"
        type="readonly"
        value={transactionData.AdvanceRequestNo}
        placeholder="Auto-generated for Adhoc/Replacement"
      />

      <FormField
        label="Advance to Paid"
        name="AdvanceToPaid"
        type="number"
        value={transactionData.AdvanceToPaid}
        onChange={onTransactionDataChange}
        step="0.01"
        placeholder="Enter advance amount to be paid"
      />

      <FormField
        label="Advance Approved Amount"
        name="AdvanceApprovedAmount"
        type="number"
        value={transactionData.AdvanceApprovedAmount}
        onChange={onTransactionDataChange}
        step="0.01"
        placeholder="Enter approved advance amount"
      />

      <FormField
        label="Advance Approved By"
        name="AdvanceApprovedBy"
        type="text"
        value={transactionData.AdvanceApprovedBy}
        onChange={onTransactionDataChange}
        placeholder="Enter approver name"
      />

      <FormField
        label="Advance Paid"
        name="AdvancePaidAmount"
        type="number"
        value={transactionData.AdvancePaidAmount}
        onChange={onTransactionDataChange}
        step="0.01"
        placeholder="Enter advance paid amount"
      />

      <FormField
        label="Advance Paid Mode"
        name="AdvancePaidMode"
        type="select"
        value={transactionData.AdvancePaidMode}
        onChange={onTransactionDataChange}
        options={{ values: paymentModeOptions }}
        placeholder="Select Payment Mode"
      />

      <FormField
        label="Advance Paid Date"
        name="AdvancePaidDate"
        type="date"
        value={transactionData.AdvancePaidDate}
        onChange={onTransactionDataChange}
      />

      <FormField
        label="Advance Paid By"
        name="AdvancePaidBy"
        type="text"
        value={transactionData.AdvancePaidBy}
        onChange={onTransactionDataChange}
        placeholder="Enter payer name"
      />

      <FormField
        label="Employee Details (if advance paid by employee)"
        name="EmployeeDetailsAdvance"
        type="textarea"
        value={transactionData.EmployeeDetailsAdvance}
        onChange={onTransactionDataChange}
        rows="2"
        placeholder="Enter employee details"
      />

      {/* Balance Calculations */}
      <FormField
        label="Balance to be Paid"
        name="BalanceToBePaid"
        type="calculated"
        value={transactionData.BalanceToBePaid}
        readOnly
      />

      <FormField
        label="Balance Paid Amount"
        name="BalancePaidAmount"
        type="number"
        value={transactionData.BalancePaidAmount}
        onChange={onTransactionDataChange}
        step="0.01"
        placeholder="Enter balance paid amount"
      />

      <FormField
        label="Variance (if any)"
        name="Variance"
        type="calculated"
        value={transactionData.Variance}
        readOnly
      />

      <FormField
        label="Balance Paid Date"
        name="BalancePaidDate"
        type="date"
        value={transactionData.BalancePaidDate}
        onChange={onTransactionDataChange}
      />

      <FormField
        label="Balance Paid By"
        name="BalancePaidBy"
        type="text"
        value={transactionData.BalancePaidBy}
        onChange={onTransactionDataChange}
        placeholder="Enter balance payer name"
      />

      <FormField
        label="Employee Details (if balance paid by employee)"
        name="EmployeeDetailsBalance"
        type="textarea"
        value={transactionData.EmployeeDetailsBalance}
        onChange={onTransactionDataChange}
        rows="2"
        placeholder="Enter employee details"
      />

      {/* Financial Calculations */}
      <FormField
        label="Total Expenses"
        name="TotalExpenses"
        type="calculated"
        value={transactionData.TotalExpenses}
        readOnly
      />

      <FormField
        label="Revenue"
        name="Revenue"
        type="calculated"
        value={transactionData.Revenue}
        readOnly
      />

      <FormField
        label="Margin"
        name="Margin"
        type="calculated"
        value={transactionData.Margin}
        readOnly
      />

      <FormField
        label="Margin (%age)"
        name="MarginPercentage"
        type="calculated"
        value={transactionData.MarginPercentage}
        readOnly
      />

      {/* Trip Management */}
      <FormField
        label="Remarks"
        name="Remarks"
        type="textarea"
        value={transactionData.Remarks}
        onChange={onTransactionDataChange}
        rows="4"
        placeholder="Enter any remarks or notes..."
        options={{ fullWidth: true }}
      />

      <FormField
        label="Trip Close"
        name="TripClose"
        type="checkbox"
        value={transactionData.TripClose}
        onChange={(e) => onTransactionDataChange({ target: { name: 'TripClose', value: e.target.checked } })}
      >
        Mark trip as closed
      </FormField>
    </FormSection>
  );
};

export default AdhocReplacementSection;
