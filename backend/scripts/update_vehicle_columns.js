const fs = require('fs');
const path = 'd:/DKG MAIN/tms 1/Tms-azure/src/routes/VehicleForm.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add fields to vehicleColumns
content = content.replace(
  /const vehicleColumns = \[\s*\{ key: 'VehicleRegistrationNo',/,
  `const vehicleColumns = [
    { key: 'CustomerCompanyName', label: 'Company Name', sortable: true },
    { key: 'Project', label: 'Project', sortable: true },
    { key: 'Location', label: 'Location', sortable: true },
    { key: 'CustomerSite', label: 'Customer Site', sortable: true },
    { key: 'CogentEmployee', label: 'Cogent Employee', sortable: true },
    { key: 'VehicleRegistrationNo',`
);

fs.writeFileSync(path, content);
console.log('vehicleColumns updated successfully.');
