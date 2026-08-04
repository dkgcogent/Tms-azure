const fs = require('fs');
const path = 'd:/DKG MAIN/tms 1/Tms-azure/src/routes/CustomerForm.jsx';
let content = fs.readFileSync(path, 'utf8');

// 2. Remove truncation in customerColumns for Locations
content = content.replace(
  /key: 'Locations',\s*label: 'Locations',\s*sortable: true,\s*minWidth: '140px',\s*render: \(value\) => value \|\| '-'/g,
  `key: 'Locations',\n      label: 'Locations',\n      sortable: true,\n      minWidth: '200px',\n      render: (value) => value ? <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: '200px' }}>{value}</div> : '-'`
);

// 3. Remove truncation in customerColumns for CustomerSite
content = content.replace(
  /key: 'CustomerSite',\s*label: 'Customer Site',\s*sortable: true,\s*minWidth: '250px',\s*render: \(value\) => value \|\| '-'/g,
  `key: 'CustomerSite',\n      label: 'Customer Site',\n      sortable: true,\n      minWidth: '250px',\n      render: (value) => value ? <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: '250px' }}>{value}</div> : '-'`
);

fs.writeFileSync(path, content);
console.log('Final fixes applied successfully.');
