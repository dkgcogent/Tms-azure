import React from 'react';
import FormField from '../FormField';
import FormSection from '../FormSection';

const ProjectTimelineSection = ({ projectData, handleInputChange, errors, isSubmitting }) => {
  const field = (label, name, type = 'text', options = {}, required = false) => <FormField label={label} name={name} type={type} value={projectData[name]} onChange={handleInputChange} options={options} required={required} error={errors[name]} isSubmitting={isSubmitting} projectData={projectData} />;

  return (
    <FormSection title="2. Project Timeline">
      {field('Start Date', 'StartDate', 'date', {}, true)}
      {field('End Date', 'EndDate', 'date', {}, true)}
    </FormSection>
  );
};

export default ProjectTimelineSection;
