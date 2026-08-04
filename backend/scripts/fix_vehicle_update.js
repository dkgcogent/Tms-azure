const fs = require('fs');
const path = 'd:/DKG MAIN/tms 1/Tms-azure/backend/routes/vehicle.js';
let content = fs.readFileSync(path, 'utf8');

// ============================================================
// FIX 1: Corrupt freight block in CREATE route (around line 1022-1026)
// Find the corrupt section: 
//   "if (vehicle.FixRate || vehicle.FuelRate || vehicle.HandlingCharges) {\r\n          const freightQuery = 'INSERT..."
// which is missing the existingFreight check
// ============================================================
const corruptCreate = `      if (vehicle.FixRate || vehicle.FuelRate || vehicle.HandlingCharges) {\r\n          const freightQuery = 'INSERT INTO vehicle_freight (VehicleID, FixRate, FuelRate, HandlingCharges) VALUES (?, ?, ?, ?)';\r\n          await pool.query(freightQuery, [vehicleId, vehicle.FixRate, vehicle.FuelRate, vehicle.HandlingCharges]);\r\n        }\r\n      }`;

const fixedCreate = `      if (vehicle.FixRate || vehicle.FuelRate || vehicle.HandlingCharges) {
        const [existingFreightC] = await pool.query('SELECT * FROM vehicle_freight WHERE VehicleID = ?', [vehicleId]);
        if (existingFreightC.length > 0) {
          const freightQuery = 'UPDATE vehicle_freight SET FixRate = ?, FuelRate = ?, HandlingCharges = ? WHERE VehicleID = ?';
          await pool.query(freightQuery, [vehicle.FixRate, vehicle.FuelRate, vehicle.HandlingCharges, vehicleId]);
        } else {
          const freightQuery = 'INSERT INTO vehicle_freight (VehicleID, FixRate, FuelRate, HandlingCharges) VALUES (?, ?, ?, ?)';
          await pool.query(freightQuery, [vehicleId, vehicle.FixRate, vehicle.FuelRate, vehicle.HandlingCharges]);
        }
      }`;

if (content.includes(corruptCreate)) {
  content = content.replace(corruptCreate, fixedCreate);
  console.log('FIX 1 applied: CREATE route freight block fixed');
} else {
  console.log('FIX 1 SKIP: corrupt CREATE freight block not found, checking alternate...');
  // Try without \r\n
  const alt = `      if (vehicle.FixRate || vehicle.FuelRate || vehicle.HandlingCharges) {\n          const freightQuery = 'INSERT INTO vehicle_freight (VehicleID, FixRate, FuelRate, HandlingCharges) VALUES (?, ?, ?, ?)';\n          await pool.query(freightQuery, [vehicleId, vehicle.FixRate, vehicle.FuelRate, vehicle.HandlingCharges]);\n        }\n      }`;
  if (content.includes(alt)) {
    content = content.replace(alt, fixedCreate);
    console.log('FIX 1 applied (alt): CREATE route freight block fixed');
  } else {
    console.log('FIX 1 FAILED: Could not find corrupt block');
  }
}

// ============================================================
// FIX 2: Corrupt values array in UPDATE route  
// The array ends at filePaths.VehiclePhotoEngine, then jumps to freight query
// ============================================================
const corruptUpdate = `        filePaths.VehiclePhotoInterior, filePaths.VehiclePhotoEngine,\r\n          const freightQuery = 'UPDATE vehicle_freight SET FixRate = ?, FuelRate = ?, HandlingCharges = ? WHERE VehicleID = ?';\r\n          await pool.query(freightQuery, [vehicle.FixRate, vehicle.FuelRate, vehicle.HandlingCharges, id]);\r\n        } else {\r\n          const freightQuery = 'INSERT INTO vehicle_freight (VehicleID, FixRate, FuelRate, HandlingCharges) VALUES (?, ?, ?, ?)';\r\n          await pool.query(freightQuery, [id, vehicle.FixRate, vehicle.FuelRate, vehicle.HandlingCharges]);\r\n        }\r\n      }\r\n`;

const fixedUpdate = `        filePaths.VehiclePhotoInterior, filePaths.VehiclePhotoEngine,
        filePaths.VehiclePhotoRoof, filePaths.VehiclePhotoDoor,
        filePaths.ServiceBillPhoto, filePaths.InsuranceCopy,
        filePaths.FitnessCertificateUpload, filePaths.PollutionPhoto,
        filePaths.StateTaxPhoto, filePaths.NoEntryPassCopy,
        vehicle.InsuranceInfo || null,
        vehicle.VehicleInsuranceCompany || null,
        vehicle.VehicleInsuranceDate || null,
        vehicle.InsuranceExpiry || null,
        vehicle.VehicleFitnessCertificateIssue || null,
        vehicle.FitnessExpiry || null,
        vehicle.VehiclePollutionDate || null,
        vehicle.PollutionExpiry || null,
        vehicle.StateTaxIssue || null,
        vehicle.StateTaxExpiry || null,
        vehicle.Status || 'Active',
        vehicle.CustomerCompanyName || null,
        vehicle.Project || null,
        vehicle.Location || null,
        vehicle.CustomerSite || null,
        vehicle.CogentEmployee || null,
        id
      ];

      const [result] = await pool.query(updateQuery, values);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      // Update vehicle freight details
      if (vehicle.FixRate || vehicle.FuelRate || vehicle.HandlingCharges) {
        const [existingFreight] = await pool.query('SELECT * FROM vehicle_freight WHERE VehicleID = ?', [id]);
        if (existingFreight.length > 0) {
          const freightQuery = 'UPDATE vehicle_freight SET FixRate = ?, FuelRate = ?, HandlingCharges = ? WHERE VehicleID = ?';
          await pool.query(freightQuery, [vehicle.FixRate, vehicle.FuelRate, vehicle.HandlingCharges, id]);
        } else {
          const freightQuery = 'INSERT INTO vehicle_freight (VehicleID, FixRate, FuelRate, HandlingCharges) VALUES (?, ?, ?, ?)';
          await pool.query(freightQuery, [id, vehicle.FixRate, vehicle.FuelRate, vehicle.HandlingCharges]);
        }
      }

`;

if (content.includes(corruptUpdate)) {
  content = content.replace(corruptUpdate, fixedUpdate);
  console.log('FIX 2 applied: UPDATE route values array fixed');
} else {
  console.log('FIX 2 SKIP: corrupt UPDATE values not found');
  // Show what's around that area
  const idx = content.indexOf("filePaths.VehiclePhotoEngine,");
  if (idx >= 0) {
    console.log('Found VehiclePhotoEngine at:', idx);
    console.log('Content after it:', JSON.stringify(content.substring(idx, idx + 300)));
  }
}

fs.writeFileSync(path, content);
console.log('\nFile written. Running syntax check...');
