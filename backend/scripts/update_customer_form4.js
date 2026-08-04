const fs = require('fs');
const path = 'd:/DKG MAIN/tms 1/Tms-azure/src/routes/CustomerForm.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update dropdown option to save name in database
content = content.replace(
  /<option key=\{emp\.id \|\| emp\.employee_id \|\| emp\.employee_code\} value=\{emp\.employee_code \|\| emp\.id\}>\s*\{emp\.employee_name\} \{emp\.employee_code \? `\(\$\{emp\.employee_code\}\)` : ''\}\s*<\/option>/,
  `<option key={emp.id || emp.employee_id || emp.employee_code} value={emp.employee_code ? \`\${emp.employee_code}/\${emp.employee_name}\` : emp.employee_name}>
                            {emp.employee_code ? \`\${emp.employee_code}/\` : ''}{emp.employee_name}
                          </option>`
);

// 2. Remove truncation in customerColumns for Locations
content = content.replace(
  /key: 'Locations',\s*label: 'Locations',\s*sortable: true,\s*minWidth: '140px',\s*render: \(value\) => value \? \(value\.length > 30 \? value\.substring\(0, 30\) \+ '\.\.\.' : value\) : '-'/g,
  `key: 'Locations',\n      label: 'Locations',\n      sortable: true,\n      minWidth: '140px',\n      render: (value) => value || '-'`
);

// 3. Remove truncation in customerColumns for CustomerSite
content = content.replace(
  /key: 'CustomerSite',\s*label: 'Customer Site',\s*sortable: true,\s*minWidth: '120px',\s*render: \(value\) => value \? \(value\.length > 25 \? value\.substring\(0, 25\) \+ '\.\.\.' : value\) : '-'/g,
  `key: 'CustomerSite',\n      label: 'Customer Site',\n      sortable: true,\n      minWidth: '250px',\n      render: (value) => value || '-'`
);

fs.writeFileSync(path, content);
console.log('Final fixes applied successfully.');
