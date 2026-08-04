const fs = require('fs');
const path = 'd:/DKG MAIN/tms 1/Tms-azure/src/routes/CustomerForm.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Import employeeAPI
content = content.replace(
  /import \{ customerAPI, locationAPI, apiHelpers \} from '\.\.\/services\/api';/,
  "import { customerAPI, locationAPI, employeeAPI, apiHelpers } from '../services/api';"
);

// 2. Add employees state
content = content.replace(
  /const \[locations, setLocations\] = useState\(\[\]\);/,
  "const [locations, setLocations] = useState([]);\n  const [employees, setEmployees] = useState([]);"
);

// 3. Add loadEmployees function before validateField
content = content.replace(
  /const validateField =/,
  `const loadEmployees = async () => {
    try {
      const response = await employeeAPI.getAll();
      setEmployees(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const validateField =`
);

// 4. Call loadEmployees on mount
content = content.replace(
  /useEffect\(\(\) => \{\n    loadCustomers\(\);\n    loadLocations\(\);\n  \}, \[\]\);/,
  `useEffect(() => {
    loadCustomers();
    loadLocations();
    loadEmployees();
  }, []);`
);

// 5. Update UI for the site input
const uiRegex = /<input\s+type="text"\s+value=\{typeof site === 'object' \? site\.name : site\}[\s\S]*?className="multiple-input"[\s\S]*?\/>/;
const newUi = `<div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
                      <input
                        type="text"
                        value={typeof site === 'object' ? site.name : site}
                        onChange={(e) => handleSiteChange(locationIndex, siteIndex, 'name', e.target.value)}
                        placeholder="Enter customer site (e.g., Dwarka Sec 21)"
                        className="multiple-input"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                      />
                      <select
                        value={typeof site === 'object' ? (site.employee_id || '') : ''}
                        onChange={(e) => handleSiteChange(locationIndex, siteIndex, 'employee_id', e.target.value)}
                        className="multiple-input"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: '13px',
                          backgroundColor: '#fff'
                        }}
                      >
                        <option value="">-- Assign Employee --</option>
                        {employees.map(emp => (
                          <option key={emp.id || emp.employee_id || emp.employee_code} value={emp.employee_code || emp.id}>
                            {emp.employee_name} {emp.employee_code ? \`(\${emp.employee_code})\` : ''}
                          </option>
                        ))}
                      </select>
                    </div>`;

content = content.replace(uiRegex, newUi);

fs.writeFileSync(path, content);
console.log('CustomerForm.jsx updated successfully.');
