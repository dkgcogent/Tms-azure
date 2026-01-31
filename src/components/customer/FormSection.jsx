import React from 'react';

const FormSection = ({ title, children, className = '', gridClassName = 'form-grid' }) => (
  <div className={`form-section ${className}`}>
    <h4>{title}</h4>
    <div className={gridClassName}>{children}</div>
  </div>
);

export default FormSection;
