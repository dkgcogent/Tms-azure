import React from 'react';

const FormSection = ({ title, className = '', children, style = {} }) => {
  return (
    <div className={`form-section ${className}`} style={style}>
      {title && <h3 className="section-title">{title}</h3>}
      <div className="form-grid">
        {children}
      </div>
    </div>
  );
};

export default FormSection;
