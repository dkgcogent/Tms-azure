import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const SupervisorSection = ({
  supervisorData,
  onSupervisorDataChange
}) => {
  return (
    <FormSection title="🟠 ORANGE SECTION - Remark & Trip Close by Supervisor" className="supervisor-section">
      <FormField
        label="Remarks"
        name="Remarks"
        type="textarea"
        value={supervisorData.Remarks}
        onChange={onSupervisorDataChange}
        rows="4"
        placeholder="Enter any remarks or notes..."
        options={{ fullWidth: true }}
      />

      <FormField
        label="Trip Close"
        name="TripClose"
        type="checkbox"
        value={supervisorData.TripClose}
        onChange={onSupervisorDataChange}
      >
        Trip Close
      </FormField>
    </FormSection>
  );
};

export default SupervisorSection;
