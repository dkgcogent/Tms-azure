import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const CalculationsSection = ({
  calculatedData,
  transactionData,
  masterData,
  onCalculatedDataChange
}) => {
  return (
    <FormSection title="🟡 YELLOW SECTION - System Calculation" className="calculation-section">
      <FormField
        label="TOTAL KM"
        name="TotalKM"
        type="calculated"
        value={calculatedData.TotalKM}
        readOnly
      />

      <FormField
        label="V. FREIGHT (FIX)"
        name="VFreightFix"
        type="number"
        value={calculatedData.VFreightFix}
        onChange={onCalculatedDataChange}
        step="0.01"
      />

      <FormField
        label="Toll Expenses"
        name="TollExpenses"
        type="number"
        value={calculatedData.TollExpenses}
        onChange={onCalculatedDataChange}
        step="0.01"
      />

      <FormField
        label="Parking Charges"
        name="ParkingCharges"
        type="number"
        value={calculatedData.ParkingCharges}
        onChange={onCalculatedDataChange}
        step="0.01"
      />

      <FormField
        label="Handling Charges"
        name="HandlingCharges"
        type="number"
        value={calculatedData.HandlingCharges}
        onChange={onCalculatedDataChange}
        step="0.01"
      />

      <FormField
        label="Total Duty Hours"
        name="TotalDutyHours"
        type="calculated"
        value={calculatedData.TotalDutyHours}
        readOnly
      />

      {/* Total Expenses - Auto Calculated for Fixed transactions */}
      {masterData.TypeOfTransaction === 'Fixed' && (
        <FormField
          label="Total Expenses"
          name="TotalExpenses"
          type="calculated"
          value={transactionData.TotalExpenses}
          readOnly
          placeholder="Auto-calculated: Toll + Parking + Loading + Unloading + Other + Handling + KM Charges"
        />
      )}
    </FormSection>
  );
};

export default CalculationsSection;
