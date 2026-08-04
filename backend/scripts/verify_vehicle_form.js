const fs = require('fs');
const content = fs.readFileSync('d:/DKG MAIN/tms 1/Tms-azure/src/routes/VehicleForm.jsx', 'utf8');
const checks = [
  ['Import APIs', 'customerAPI, projectAPI, employeeAPI'],
  ['Customer state', 'allCustomers, setAllCustomers'],
  ['Projects state', 'filteredProjects, setFilteredProjects'],
  ['Sites state', 'filteredSites, setFilteredSites'],
  ['Employees state', 'allEmployees, setAllEmployees'],
  ['Customer fetch', 'customerAPI.getAll()'],
  ['Employee fetch', 'employeeAPI.getAll()'],
  ['Employee fix', 'empResp.data?.data || empResp.data'],
  ['Project fetch', 'projectAPI.getByCustomer(selectedCustomer.CustomerID)'],
  ['Project fix', 'resp.data?.data || resp.data'],
  ['Employee display', 'emp.employee_code'],
  ['Customer dropdown', 'Select Customer'],
  ['Project dropdown', 'Select Project'],
  ['Site dropdown', 'Select Site'],
  ['Employee dropdown', 'Select Employee'],
];
checks.forEach(([label, str]) => {
  console.log((content.includes(str) ? 'PASS' : 'FAIL') + ' - ' + label);
});
