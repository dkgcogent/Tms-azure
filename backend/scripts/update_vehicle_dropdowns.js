const fs = require('fs');
const filePath = 'd:/DKG MAIN/tms 1/Tms-azure/src/routes/VehicleForm.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update imports to add customerAPI, projectAPI, employeeAPI
content = content.replace(
  `import { vehicleAPI, vendorAPI, driverAPI, apiHelpers } from '../services/api';`,
  `import { vehicleAPI, vendorAPI, driverAPI, customerAPI, projectAPI, employeeAPI, apiHelpers } from '../services/api';`
);

// 2. Add dropdown state variables after the [vehiclePhotos, setVehiclePhotos] declaration
const afterVehiclePhotos = `  const [vehiclePhotos, setVehiclePhotos] = useState({});`;
const newStates = `  const [vehiclePhotos, setVehiclePhotos] = useState({});

  // Customer/Project/Employee dropdown data
  const [allCustomers, setAllCustomers] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [filteredSites, setFilteredSites] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);`;
content = content.replace(afterVehiclePhotos, newStates);

// 3. Add fetch functions and useEffect before the fetchVehicles function
const beforeFetchVehicles = `  const fetchVehicles = async () => {`;
const fetchFunctions = `  // Fetch customers, projects, employees for dropdown fields
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [custResp, empResp] = await Promise.all([
          customerAPI.getAll(),
          employeeAPI.getAll()
        ]);
        setAllCustomers(custResp.data?.data || custResp.data || []);
        setAllEmployees(empResp.data || []);
      } catch (err) {
        console.error('Error fetching dropdown data:', err);
      }
    };
    fetchDropdownData();
  }, []);

  // When CustomerCompanyName changes, load that customer's projects & sites
  useEffect(() => {
    const selectedCustomer = allCustomers.find(c => c.Name === vehicleData.CustomerCompanyName);
    if (!selectedCustomer) {
      setFilteredProjects([]);
      setFilteredSites([]);
      setVehicleData(prev => ({ ...prev, Project: '', Location: '', CustomerSite: '' }));
      return;
    }
    // Load projects for selected customer
    projectAPI.getByCustomer(selectedCustomer.CustomerID).then(resp => {
      setFilteredProjects(resp.data || []);
    }).catch(err => console.error('Error loading projects:', err));

    // Parse customer sites from CustomerSite field
    if (selectedCustomer.CustomerSite) {
      const sites = selectedCustomer.CustomerSite.split(',').map(s => s.trim()).filter(Boolean);
      setFilteredSites(sites);
    } else {
      setFilteredSites([]);
    }

    // Reset dependent fields when company changes
    setVehicleData(prev => ({ ...prev, Project: '', Location: '', CustomerSite: '' }));
  }, [vehicleData.CustomerCompanyName, allCustomers]);

  const fetchVehicles = async () => {`;
content = content.replace(beforeFetchVehicles, fetchFunctions);

// 4. Replace the 5 text input fields with dropdowns
const oldFields = `                {renderFormField('Customer Company Name', 'CustomerCompanyName', 'text', { placeholder: 'Enter company name' })}
                {renderFormField('Project', 'Project', 'text', { placeholder: 'Enter project' })}
                {renderFormField('Location', 'Location', 'text', { placeholder: 'Enter location' })}
                {renderFormField('Customer Site', 'CustomerSite', 'text', { placeholder: 'Enter customer site' })}
                {renderFormField('Cogent Employee', 'CogentEmployee', 'text', { placeholder: 'Enter employee' })}`;

const newFields = `                {/* Customer Company Name Dropdown */}
                <div className="form-field">
                  <label className="form-field-label">Customer Company Name</label>
                  <select
                    name="CustomerCompanyName"
                    value={vehicleData.CustomerCompanyName}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="">-- Select Customer --</option>
                    {allCustomers.map(c => (
                      <option key={c.CustomerID} value={c.Name}>{c.Name}</option>
                    ))}
                  </select>
                </div>

                {/* Project Dropdown (filtered by customer) */}
                <div className="form-field">
                  <label className="form-field-label">Project</label>
                  <select
                    name="Project"
                    value={vehicleData.Project}
                    onChange={(e) => {
                      const selected = filteredProjects.find(p => p.ProjectName === e.target.value);
                      setVehicleData(prev => ({
                        ...prev,
                        Project: e.target.value,
                        Location: selected ? (selected.Location || '') : ''
                      }));
                    }}
                    className="form-select"
                    disabled={!vehicleData.CustomerCompanyName}
                  >
                    <option value="">-- Select Project --</option>
                    {filteredProjects.map(p => (
                      <option key={p.ProjectID} value={p.ProjectName}>{p.ProjectName}</option>
                    ))}
                  </select>
                </div>

                {/* Location (auto-filled from project) */}
                <div className="form-field">
                  <label className="form-field-label">Location</label>
                  <input
                    type="text"
                    name="Location"
                    value={vehicleData.Location}
                    onChange={handleInputChange}
                    placeholder="Location (auto-filled from project)"
                    className="form-input"
                    readOnly={!!vehicleData.Project && !!vehicleData.Location}
                  />
                </div>

                {/* Customer Site Dropdown (filtered by customer) */}
                <div className="form-field">
                  <label className="form-field-label">Customer Site</label>
                  <select
                    name="CustomerSite"
                    value={vehicleData.CustomerSite}
                    onChange={handleInputChange}
                    className="form-select"
                    disabled={!vehicleData.CustomerCompanyName}
                  >
                    <option value="">-- Select Site --</option>
                    {filteredSites.map((site, idx) => (
                      <option key={idx} value={site}>{site}</option>
                    ))}
                  </select>
                </div>

                {/* Cogent Employee Dropdown */}
                <div className="form-field">
                  <label className="form-field-label">Cogent Employee</label>
                  <select
                    name="CogentEmployee"
                    value={vehicleData.CogentEmployee}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="">-- Select Employee --</option>
                    {allEmployees.map(emp => (
                      <option key={emp.id || emp.employee_id} value={emp.employee_id ? \`\${emp.employee_id}/\${emp.first_name} \${emp.last_name}\` : \`\${emp.first_name} \${emp.last_name}\`}>
                        {emp.employee_id ? \`\${emp.employee_id}/\${emp.first_name} \${emp.last_name}\` : \`\${emp.first_name} \${emp.last_name}\`}
                      </option>
                    ))}
                  </select>
                </div>`;

content = content.replace(oldFields, newFields);

// 5. Add the new fields to backendToFrontendMapping
content = content.replace(
  `VehicleID: 'VehicleID',`,
  `VehicleID: 'VehicleID',
        CustomerCompanyName: 'CustomerCompanyName',
        Project: 'Project',
        Location: 'Location',
        CustomerSite: 'CustomerSite',
        CogentEmployee: 'CogentEmployee',`
);

fs.writeFileSync(filePath, content);
console.log('VehicleForm.jsx updated with cascading dropdowns successfully!');
