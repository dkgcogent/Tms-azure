/**
 * Time Validation Utilities
 * Provides chronological time validation for the 6 new time fields
 */

/**
 * Convert 12-hour time format (e.g., "09:30 AM") to minutes since midnight
 * @param {string} time12h - Time in 12-hour format with AM/PM
 * @returns {number|null} - Minutes since midnight, or null if invalid
 */
export const convertTimeToMinutes = (time12h) => {
  if (!time12h || typeof time12h !== 'string') return null;
  
  try {
    // Handle both "HH:MM AM/PM" and "HHMM" formats
    const trimmed = time12h.trim();
    
    // Check if it contains AM/PM
    if (trimmed.includes('AM') || trimmed.includes('PM') || trimmed.includes('am') || trimmed.includes('pm')) {
      // Format: "09:30 AM" or "9:30 PM"
      const parts = trimmed.split(' ');
      if (parts.length !== 2) return null;
      
      const [time, modifier] = parts;
      const [hoursStr, minutesStr] = time.split(':');
      
      if (!hoursStr || !minutesStr) return null;
      
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      if (isNaN(hours) || isNaN(minutes)) return null;
      if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
      
      // Convert to 24-hour format
      if (modifier.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
      } else if (modifier.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return hours * 60 + minutes;
    } else {
      // Assume 24-hour format: "09:30" or "21:30"
      const [hoursStr, minutesStr] = trimmed.split(':');
      
      if (!hoursStr || !minutesStr) return null;
      
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      if (isNaN(hours) || isNaN(minutes)) return null;
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
      
      return hours * 60 + minutes;
    }
  } catch (error) {
    console.error('Error converting time to minutes:', error);
    return null;
  }
};

/**
 * Validate chronological order of 6 time fields
 * Each time must be equal to or later than the previous time
 * 
 * @param {Object} timeData - Object containing the 6 time fields
 * @returns {Object} - Object with errors for each invalid field
 */
export const validateChronologicalTimes = (timeData) => {
  const errors = {};
  
  // Define time fields in chronological order
  const timeFields = [
    { name: 'VehicleReportingAtHub', label: 'Vehicle Reporting at Hub/WH' },
    { name: 'VehicleEntryInHub', label: 'Vehicle Entry in Hub/WH' },
    { name: 'VehicleOutFromHubForDelivery', label: 'Vehicle Out from Hub/WH for Delivery' },
    { name: 'VehicleReturnAtHub', label: 'Vehicle Return at Hub/WH' },
    { name: 'VehicleEnteredAtHubReturn', label: 'Vehicle Entered at Hub/WH (Return)' },
    { name: 'VehicleOutFromHubFinal', label: 'Vehicle Out from Hub Final (Trip Close)' }
  ];
  
  let previousTime = null;
  let previousField = null;
  
  for (const field of timeFields) {
    const currentTimeStr = timeData[field.name];
    
    if (currentTimeStr) {
      const currentTime = convertTimeToMinutes(currentTimeStr);
      
      if (currentTime === null) {
        errors[field.name] = `${field.label} has an invalid time format`;
        continue;
      }
      
      if (previousTime !== null && currentTime < previousTime) {
        errors[field.name] = `${field.label} cannot be earlier than ${previousField.label}`;
      }
      
      previousTime = currentTime;
      previousField = field;
    }
  }
  
  return errors;
};

/**
 * Calculate duty hours from start time to end time
 * @param {string} startTime - Start time (VehicleReportingAtHub)
 * @param {string} endTime - End time (VehicleOutFromHubFinal)
 * @returns {number|null} - Duty hours as decimal, or null if invalid
 */
export const calculateDutyHours = (startTime, endTime) => {
  if (!startTime || !endTime) return null;
  
  const startMinutes = convertTimeToMinutes(startTime);
  const endMinutes = convertTimeToMinutes(endTime);
  
  if (startMinutes === null || endMinutes === null) return null;
  
  let diffMinutes = endMinutes - startMinutes;
  
  // Handle overnight shifts (end time is next day)
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Add 24 hours
  }
  
  const dutyHours = diffMinutes / 60;
  return parseFloat(dutyHours.toFixed(2));
};

/**
 * Get field metadata for the 6 time fields
 * @returns {Array} - Array of field metadata objects
 */
export const getTimeFieldsMetadata = () => {
  return [
    { name: 'VehicleReportingAtHub', label: 'Vehicle Reporting at Hub/WH', required: true },
    { name: 'VehicleEntryInHub', label: 'Vehicle Entry in Hub/WH', required: true },
    { name: 'VehicleOutFromHubForDelivery', label: 'Vehicle Out from Hub/WH for Delivery', required: true },
    { name: 'VehicleReturnAtHub', label: 'Vehicle Return at Hub/WH', required: true },
    { name: 'VehicleEnteredAtHubReturn', label: 'Vehicle Entered at Hub/WH (Return)', required: true },
    { name: 'VehicleOutFromHubFinal', label: 'Vehicle Out from Hub Final (Trip Close)', required: true }
  ];
};

