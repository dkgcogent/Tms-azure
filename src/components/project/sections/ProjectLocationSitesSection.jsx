import React from 'react';
import FormSection from '../FormSection';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", 
  "Ladakh", "Lakshadweep", "Puducherry"
];

const ProjectLocationSitesSection = ({
  projectData,
  employees = [],
  errors = {},
  addLocation,
  removeLocation,
  handleLocationStateChange,
  handleLocationNameChange,
  addSiteToLocation,
  removeSiteFromLocation,
  handleSiteChange
}) => {
  const customerSites = projectData.CustomerSite || [];

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
        📍 2. Location & Customer Sites <span className="required-indicator">*</span>
      </h4>

      {errors.CustomerSite && (
        <div className="error-message" style={{ marginBottom: '16px' }}>
          {errors.CustomerSite}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {customerSites.map((locationGroup, locationIndex) => (
          <div
            key={locationIndex}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '18px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Card Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#475569',
                backgroundColor: '#f1f5f9',
                padding: '3px 10px',
                borderRadius: '6px'
              }}>
                Location #{locationIndex + 1}
              </span>
              {customerSites.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLocation(locationIndex)}
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Remove this location"
                >
                  ✕ Remove Location
                </button>
              )}
            </div>

            {/* State Selection */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px', display: 'block' }}>
                State
              </label>
              <select
                value={locationGroup.state || ''}
                onChange={(e) => handleLocationStateChange(locationIndex, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b'
                }}
              >
                <option value="">-- Select State --</option>
                {INDIAN_STATES.map(stateName => (
                  <option key={stateName} value={stateName}>
                    {stateName}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Input */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px', display: 'block' }}>
                Location / City
              </label>
              <input
                type="text"
                value={locationGroup.location || ''}
                onChange={(e) => handleLocationNameChange(locationIndex, e.target.value)}
                placeholder="Enter location (e.g., Delhi, Lucknow)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#1e293b'
                }}
              />
            </div>

            {/* Customer Sites Header */}
            <div style={{ marginTop: '6px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#64748b',
                display: 'block',
                marginBottom: '8px'
              }}>
                Customer Sites for {locationGroup.location || 'this location'}:
              </label>

              {/* Sites List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(locationGroup.sites || []).map((site, siteIndex) => (
                  <div
                    key={siteIndex}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '8px',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <input
                        type="text"
                        value={typeof site === 'object' ? site.name : site}
                        onChange={(e) => handleSiteChange(locationIndex, siteIndex, 'name', e.target.value)}
                        placeholder="Enter customer site (e.g., Dwarka Sec 21)"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '13px',
                          backgroundColor: '#ffffff'
                        }}
                      />
                      <select
                        value={typeof site === 'object' ? (site.employee_id || '') : ''}
                        onChange={(e) => handleSiteChange(locationIndex, siteIndex, 'employee_id', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '13px',
                          backgroundColor: '#ffffff',
                          color: '#334155'
                        }}
                      >
                        <option value="">-- Assign Employee --</option>
                        {employees.map(emp => (
                          <option key={emp.id || emp.employee_id || emp.employee_code} value={emp.employee_code ? `${emp.employee_code}/${emp.employee_name}` : emp.employee_name}>
                            {emp.employee_code ? `${emp.employee_code}/` : ''}{emp.employee_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(locationGroup.sites || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSiteFromLocation(locationIndex, siteIndex)}
                        style={{
                          background: '#fee2e2',
                          color: '#ef4444',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          flexShrink: 0
                        }}
                        title="Remove site"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Site Button */}
              <button
                type="button"
                onClick={() => addSiteToLocation(locationIndex)}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  background: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px dashed #86efac',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                + Add Site to this location
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Location Button */}
      <button
        type="button"
        onClick={addLocation}
        style={{
          background: '#28a745',
          color: '#ffffff',
          border: 'none',
          padding: '10px 18px',
          borderRadius: '6px',
          fontWeight: '600',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 4px rgba(40,167,69,0.2)'
        }}
      >
        + Add New Location
      </button>
    </div>
  );
};

export default ProjectLocationSitesSection;
