import React from 'react';
import { FormButton } from './FormComponents';
import './FormLayout.css';

const FormLayout = ({
  title,
  subtitle,
  children,
  onSubmit,
  submitText = "Submit",
  isSubmitting = false,
  editMode = false,
  editingItem = null,
  onCancelEdit = null,
  actions = null,
  className = ""
}) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}

        {/* Edit Mode Notice */}
        {editMode && editingItem && (
          <div className="edit-notice">
            <div className="edit-notice-content">
              <span className="edit-notice-icon">✏️</span>
              <span className="edit-notice-text">
                Editing: <strong>{editingItem}</strong>
              </span>
            </div>
            {onCancelEdit && (
              <FormButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={onCancelEdit}
                icon="✕"
              >
                Cancel Edit
              </FormButton>
            )}
          </div>
        )}
      </div>

      <div className={`form-layout-container ${className}`}>
        <div className="form-layout-card">
          {/* Form Content */}
          <form onSubmit={onSubmit} className="form-content">
            {/* Form Fields Grid */}
            <div className="form-fields-grid">
              {children}
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              {actions}
              <FormButton
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                loading={isSubmitting}
                icon={isSubmitting ? null : "💾"}
              >
                {submitText}
              </FormButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FormLayout;
