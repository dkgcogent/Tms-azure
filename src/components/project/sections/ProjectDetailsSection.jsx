import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const ProjectDetailsSection = ({ projectData, handleInputChange, handleCustomerChange, handleLocationChange, customers, locations, errors, isSubmitting }) => {
  const field = (label, name, type = 'text', options = {}, required = false) => <FormField label={label} name={name} type={type} value={projectData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} customers={customers} locations={locations} isSubmitting={isSubmitting} projectData={projectData} handleCustomerChange={handleCustomerChange} handleLocationChange={handleLocationChange} />;

  return (
    <FormSection title="1. Project Details">
      {field('Customer', 'CustomerID', 'select', {}, true)}
      {field('Project Name', 'ProjectName', 'text', { placeholder: 'Enter project name' }, true)}
      {field('Location', 'LocationID', 'select', {}, false)}
      {field('Project Code', 'ProjectCode', 'text', { placeholder: 'Auto-generated', readOnly: true })}
      {field('Project Description', 'ProjectDescription', 'textarea', { placeholder: 'Enter project description' })}
      {field('Project Value (₹)', 'ProjectValue', 'number', { placeholder: 'Enter project value' }, true)}
      {field('Status', 'Status', 'select', {}, true)}
    </FormSection>
  );
};

export default ProjectDetailsSection;
