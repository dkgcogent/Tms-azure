import React from 'react';

const FormSection = ({ title, children, className = '' }) => (
  <div className={`form-section ${className}`}>
    <h4>{title}</h4>
    <div className="form-grid">
      {children}
    </div>
  </div>
);

export default FormSection;
