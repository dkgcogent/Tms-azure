const fs = require('fs');
const path = 'd:/DKG MAIN/tms 1/Tms-azure/src/routes/VehicleForm.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add fields to getInitialState
content = content.replace(
  /VehicleRegistrationNo: '',\s*VehicleCode: '',/,
  `VehicleRegistrationNo: '',
    VehicleCode: '',
    CustomerCompanyName: '',
    Project: '',
    Location: '',
    CustomerSite: '',
    CogentEmployee: '',`
);

// 2. Add fields to UI inside Vehicle Information section
content = content.replace(
  /<div className="form-section">\s*<h4>🚗 Vehicle Information<\/h4>\s*<div className="form-grid">/,
  `<div className="form-section">
              <h4>🚗 Vehicle Information</h4>
              <div className="form-grid">
                {renderFormField('Customer Company Name', 'CustomerCompanyName', 'text', { placeholder: 'Enter company name' })}
                {renderFormField('Project', 'Project', 'text', { placeholder: 'Enter project' })}
                {renderFormField('Location', 'Location', 'text', { placeholder: 'Enter location' })}
                {renderFormField('Customer Site', 'CustomerSite', 'text', { placeholder: 'Enter customer site' })}
                {renderFormField('Cogent Employee', 'CogentEmployee', 'text', { placeholder: 'Enter employee' })}`
);

fs.writeFileSync(path, content);
console.log('VehicleForm.jsx updated successfully with 5 new fields.');
