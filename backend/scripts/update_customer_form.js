const fs = require('fs');
const path = 'd:/DKG MAIN/tms 1/Tms-azure/src/routes/CustomerForm.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Initial State
content = content.replace(
  /CustomerSite: \[\{ location: '', sites: \[''\] \}\],/,
  "CustomerSite: [{ location: '', sites: [{ name: '', employee_id: '' }] }],"
);

// 2. handleSiteChange
content = content.replace(
  /const handleSiteChange = \(locationIndex, siteIndex, value\) => \{[\s\S]*?sites: item\.sites\.map\(\(site, si\) => \(si === siteIndex \? value : site\)\)[\s\S]*?\};/,
  `const handleSiteChange = (locationIndex, siteIndex, field, value) => {
    setCustomerData(prev => ({
      ...prev,
      CustomerSite: prev.CustomerSite.map((item, i) =>
        i === locationIndex
          ? {
            ...item,
            sites: item.sites.map((site, si) => (si === siteIndex ? { ...site, [field]: value } : site))
          }
          : item
      )
    }));
  };`
);

// 3. addSiteToLocation
content = content.replace(
  /const addSiteToLocation = \(locationIndex\) => \{[\s\S]*?sites: \[\.\.\.item\.sites, ''\][\s\S]*?\};/,
  `const addSiteToLocation = (locationIndex) => {
    setCustomerData(prev => ({
      ...prev,
      CustomerSite: prev.CustomerSite.map((item, i) =>
        i === locationIndex ? { ...item, sites: [...item.sites, { name: '', employee_id: '' }] } : item
      )
    }));
  };`
);

// 4. In handleEdit, update parsing
content = content.replace(
  /sites: sites\.length > 0 \? sites : \[''\]/,
  `sites: sites.length > 0 ? sites.map(siteName => {
              let name = siteName;
              let employee_id = '';
              const empMatch = siteName.match(/\\(Emp: ([^)]+)\\)/);
              if (empMatch) {
                employee_id = empMatch[1];
                name = siteName.replace(empMatch[0], '').trim();
              }
              return { name, employee_id };
            }) : [{ name: '', employee_id: '' }]`
);

content = content.replace(
  /editableCustomerData\[key\] = \[\{ location: '', sites: \[''\] \}\];/,
  `editableCustomerData[key] = [{ location: '', sites: [{ name: '', employee_id: '' }] }];`
);

// 5. In submitCustomerData, update formatting
content = content.replace(
  /locationGroup\.sites\s*\.filter\(site => site\?\.trim\(\)\)\s*\.map\(site => \`\$\{locationGroup\.location\.trim\(\)\} - \$\{site\.trim\(\)\}\`\)/,
  `locationGroup.sites
              .filter(site => site && (typeof site === 'object' ? site.name?.trim() : site?.trim()))
              .map(site => {
                const siteName = typeof site === 'object' ? site.name.trim() : site.trim();
                const empStr = (typeof site === 'object' && site.employee_id) ? \` (Emp: \${site.employee_id})\` : '';
                return \`\${locationGroup.location.trim()} - \${siteName}\${empStr}\`;
              })`
);

// 6. Fix UI rendering
content = content.replace(
  /value=\{site\}/g,
  `value={typeof site === 'object' ? site.name : site}`
);

content = content.replace(
  /onChange=\{\(e\) => handleSiteChange\(locationIndex, siteIndex, e\.target\.value\)\}/g,
  `onChange={(e) => handleSiteChange(locationIndex, siteIndex, 'name', e.target.value)}`
);

fs.writeFileSync(path, content);
console.log('Modifications completed.');
