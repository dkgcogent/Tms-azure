import React from 'react';
import FormField from '../FormField';
import ValidatedInput from '../../ValidatedInput';

const ProjectCommercialsBillingSection = ({
  projectData,
  handleInputChange,
  errors,
  isSubmitting
}) => {
  const renderFormField = (label, name, type = 'text', options = {}, required = false) => (
    <FormField
      label={label}
      name={name}
      type={type}
      value={projectData[name]}
      onChange={handleInputChange}
      options={options}
      required={required}
      error={errors[name]}
      isSubmitting={isSubmitting}
      projectData={projectData}
    />
  );

  return (
    <div className="form-section" style={{ marginTop: '24px' }}>
      <h4 style={{
        fontSize: '1.1rem',
        fontWeight: '600',
        color: '#2d3748',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        💰 3. Commercials & Billing
      </h4>

      <div className="form-grid">
        {/* GST No. */}
        <ValidatedInput
          name="GSTNo"
          value={projectData.GSTNo || ''}
          onChange={handleInputChange}
          validationRule="GST"
          required={false}
          label="GST No."
          placeholder="Enter GST number (optional)"
          showFormatHint={true}
          autoFormat={true}
          disabled={isSubmitting}
        />

        {/* Type of Billing */}
        <div className={`form-group ${errors.TypeOfBilling ? 'has-error' : ''}`}>
          <label className="form-group-label" style={{ fontWeight: '600', color: '#2d3748', fontSize: '0.95rem', marginBottom: '0.25rem', display: 'block' }}>
            Type of Billing <span className="required-indicator">*</span>
          </label>
          <select
            name="TypeOfBilling"
            value={projectData.TypeOfBilling || 'RCM'}
            onChange={handleInputChange}
            disabled={isSubmitting}
            style={{
              padding: '0.75rem 1rem',
              border: '2px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '1rem',
              backgroundColor: 'white',
              width: '100%'
            }}
          >
            <option value="RCM">RCM</option>
            <option value="GST">GST</option>
            <option value="Exempt">Exempt</option>
          </select>
          {errors.TypeOfBilling && <div className="error-message">{errors.TypeOfBilling}</div>}
        </div>

        {/* Conditional GST Rate field based on Type of Billing */}
        {projectData.TypeOfBilling === 'RCM' || projectData.TypeOfBilling === 'Exempt' ? (
          <div className="form-group">
            <label className="form-group-label" style={{ fontWeight: '600', color: '#2d3748', fontSize: '0.95rem', marginBottom: '0.25rem', display: 'block' }}>
              GST Rate (%)
            </label>
            <input
              type="number"
              name="GSTRate"
              value="0"
              readOnly
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '1rem',
                backgroundColor: '#f8fafc',
                cursor: 'not-allowed',
                width: '100%'
              }}
            />
          </div>
        ) : projectData.TypeOfBilling === 'GST' ? (
          <div className={`form-group ${errors.GSTRate ? 'has-error' : ''}`}>
            <label className="form-group-label" style={{ fontWeight: '600', color: '#2d3748', fontSize: '0.95rem', marginBottom: '0.25rem', display: 'block' }}>
              GST Rate (%) <span className="required-indicator">*</span>
            </label>
            <select
              name="GSTRate"
              value={projectData.GSTRate || '18'}
              onChange={handleInputChange}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '1rem',
                backgroundColor: 'white',
                width: '100%'
              }}
            >
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>
        ) : (
          renderFormField('GST Rate (%)', 'GSTRate', 'number', { placeholder: 'e.g., 18' })
        )}

        {/* Billing Tenure */}
        <div className="form-group">
          <label className="form-group-label" style={{ fontWeight: '600', color: '#2d3748', fontSize: '0.95rem', marginBottom: '0.25rem', display: 'block' }}>
            Billing Tenure
          </label>
          <select
            name="BillingTenure"
            value={projectData.BillingTenure || ''}
            onChange={handleInputChange}
            disabled={isSubmitting}
            style={{
              padding: '0.75rem 1rem',
              border: '2px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '1rem',
              backgroundColor: 'white',
              width: '100%'
            }}
          >
            <option value="">Select Billing Tenure</option>
            <option value="Monthly">Monthly</option>
            <option value="Specific Dates">Specific Dates</option>
          </select>
        </div>

        {/* Conditional date fields for Specific Dates billing tenure */}
        {projectData.BillingTenure === 'Specific Dates' && (
          <>
            {renderFormField('Billing From Date', 'BillingFromDate', 'date', { placeholder: 'Select from date' }, true)}
            {renderFormField('Billing To Date', 'BillingToDate', 'date', { placeholder: 'Select to date' }, true)}
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectCommercialsBillingSection;
