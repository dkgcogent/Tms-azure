import React from 'react';

const FormSection = ({ title, icon, children, className = '' }) => (
  <div className={`form-section ${className}`}>
    <div className="form-section-header">
      <h3 className="form-section-title">{icon} {title}</h3>
    </div>
    <div className="form-fields-grid">
      {children}
    </div>
  </div>
);

export default FormSection;
