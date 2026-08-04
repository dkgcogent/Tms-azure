const fs = require('fs');
const content = fs.readFileSync('d:/DKG MAIN/tms 1/Tms-azure/src/routes/VehicleForm.jsx', 'utf8');
const checks = [
  ['parsedSiteData state', 'const [parsedSiteData, setParsedSiteData] = useState([])'],
  ['filteredLocations state', 'const [filteredLocations, setFilteredLocations] = useState([])'],
  ['parseSiteString function', 'const parseSiteString = (siteStr)'],
  ['Emp regex in parser', 'Emp:\\\\s*([^)]+)'],
  ['Unique locations extracted', '[...new Set(parsed.map(e => e.location))]'],
  ['Location useEffect', 'parsedSiteData.filter(e => e.location === vehicleData.Location)'],
  ['Site auto-fills employee', 'CogentEmployee: selectedSiteObj ? selectedSiteObj.employee'],
  ['Location dropdown', 'Select Location'],
  ['Site filters by location', 'filteredSites.find(s => s.site === e.target.value)'],
  ['Employee is read-only', 'Auto-filled when site is selected'],
];
checks.forEach(([label, str]) => {
  console.log((content.includes(str) ? 'PASS' : 'FAIL') + ' - ' + label);
});
