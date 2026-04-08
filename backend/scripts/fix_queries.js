const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../backend/routes/dailyVehicleTransactions.js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix fixedQuery select list and DisplayDriver
content = content.replace(
    /v\.VehicleType,\s+d\.DriverName,\s+d\.DriverMobileNo,\s+vend\.VendorName,/g,
    `v.VehicleType,
          COALESCE(ft.DriverName, d.DriverName) as DriverName,
          COALESCE(ft.DriverNumber, d.DriverMobileNo) as DriverNumber,
          COALESCE(ft.VendorName, vend.VendorName) as VendorName,
          COALESCE(ft.VendorNumber, vend.VendorCode) as VendorNumber,`
);

content = content.replace(
    /CONCAT\(d\.DriverName, ' \(\+', JSON_LENGTH\(ft\.DriverIDs\) - 1, ' more\)'\)\s+ELSE d\.DriverName/g,
    "CONCAT(COALESCE(ft.DriverName, d.DriverName), ' (+', JSON_LENGTH(ft.DriverIDs) - 1, ' more)')\n            ELSE COALESCE(ft.DriverName, d.DriverName)"
);

// Fix adhocQuery select list
content = content.replace(
    /at\.VehicleNumber as VehicleRegistrationNo,\s+at\.VehicleType,\s+at\.DriverName,\s+at\.DriverNumber as DriverMobileNo,\s+at\.VendorName,/g,
    `at.VehicleNumber as VehicleRegistrationNo,
          at.VehicleType,
          at.DriverName,
          at.DriverNumber,
          at.VendorName,
          at.VendorNumber,`
);

fs.writeFileSync(filePath, content);
console.log('✅ Queries fixed successfully');
