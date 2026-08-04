const fs = require('fs');
const path = 'd:/DKG MAIN/tms 1/Tms-azure/src/routes/CustomerForm.jsx';
let content = fs.readFileSync(path, 'utf8');

// The issue was \r\n vs \n. Let's use [\r\n]+
content = content.replace(
  /useEffect\(\(\) => \{[\r\n\s]+loadCustomers\(\);[\r\n\s]+loadLocations\(\);[\r\n\s]+\}, \[\]\);/,
  `useEffect(() => {
    loadCustomers();
    loadLocations();
    loadEmployees();
  }, []);`
);

fs.writeFileSync(path, content);
console.log('CustomerForm.jsx useEffect updated successfully.');
