const fs = require('fs');
const path = 'd:/DKG MAIN/tms 1/Tms-azure/backend/routes/vehicle.js';
let content = fs.readFileSync(path, 'utf8');

// 1. UPDATE fallbackQuery (INSERT INTO vehicle)
content = content.replace(
  /INSERT INTO vehicle \([\s\S]*?Status\s*\) VALUES \(/,
  `INSERT INTO vehicle (
            VehicleRegistrationNo, VehicleCode, VehicleChasisNo, VehicleModel, TypeOfBody, VehicleType,
            VehicleRegistrationDate, VehicleAge, VehicleKMS, VehicleInsuranceCompany, VehicleInsuranceDate, InsuranceExpiry,
            VehicleFitnessCertificateIssue, FitnessExpiry, VehiclePollutionDate, PollutionExpiry,
            StateTaxIssue, StateTaxExpiry, VehicleLoadingCapacity, LastServicing, VendorID, DriverID, GPS, GPSCompany, NoEntryPass, NoEntryPassStartDate, NoEntryPassExpiry,
            InsuranceInfo,
            RCUpload, VehicleKMSPhoto, VehiclePhoto,
            VehiclePhotoFront, VehiclePhotoBack, VehiclePhotoLeftSide, VehiclePhotoRightSide,
            VehiclePhotoInterior, VehiclePhotoEngine, VehiclePhotoRoof, VehiclePhotoDoor,
            ServiceBillPhoto, InsuranceCopy, FitnessCertificateUpload, PollutionPhoto, StateTaxPhoto, NoEntryPassCopy, Status,
            CustomerCompanyName, Project, Location, CustomerSite, CogentEmployee
          ) VALUES (`
);

// Add 5 more question marks to VALUES (?, ?, ..., ?)
content = content.replace(
  /(\?\)`;)\s*const fallbackValues = \[/,
  `?, ?, ?, ?, ?, ?)\`;\n\n        const fallbackValues = [`
);

// Add 5 values to fallbackValues array
content = content.replace(
  /filePaths\.NoEntryPassCopy \|\| null,\s*vehicle\.Status \|\| 'Active'\s*\];/,
  `filePaths.NoEntryPassCopy || null,
          vehicle.Status || 'active',
          vehicle.CustomerCompanyName || null,
          vehicle.Project || null,
          vehicle.Location || null,
          vehicle.CustomerSite || null,
          vehicle.CogentEmployee || null
        ];`
);

// 2. UPDATE vehicle query (PUT)
content = content.replace(
  /UPDATE Vehicle SET([\s\S]*?)VehiclePhotoDoor = \?,([\s\S]*?)Status = \?([\s\S]*?)WHERE VehicleID = \?`;/,
  `UPDATE Vehicle SET$1VehiclePhotoDoor = ?,$2Status = ?,
          CustomerCompanyName = ?, Project = ?, Location = ?, CustomerSite = ?, CogentEmployee = ?$3WHERE VehicleID = ?\`;`
);

// Add 5 values to updateValues array
content = content.replace(
  /filePaths\.NoEntryPassCopy !== undefined \? filePaths\.NoEntryPassCopy : existingVehicle\.NoEntryPassCopy,\s*vehicle\.Status \|\| existingVehicle\.Status \|\| 'Active'\s*,\s*id\s*\];/,
  `filePaths.NoEntryPassCopy !== undefined ? filePaths.NoEntryPassCopy : existingVehicle.NoEntryPassCopy,
          vehicle.Status || existingVehicle.Status || 'active',
          vehicle.CustomerCompanyName !== undefined ? vehicle.CustomerCompanyName : existingVehicle.CustomerCompanyName,
          vehicle.Project !== undefined ? vehicle.Project : existingVehicle.Project,
          vehicle.Location !== undefined ? vehicle.Location : existingVehicle.Location,
          vehicle.CustomerSite !== undefined ? vehicle.CustomerSite : existingVehicle.CustomerSite,
          vehicle.CogentEmployee !== undefined ? vehicle.CogentEmployee : existingVehicle.CogentEmployee,
          id
        ];`
);

fs.writeFileSync(path, content);
console.log('vehicle.js API routes updated successfully.');
