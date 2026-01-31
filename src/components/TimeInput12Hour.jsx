import React, { useState, useEffect } from 'react';
import './TimeInput12Hour.css';

const TimeInput12Hour = ({ name, value, onChange, placeholder = "--:--", className = "" }) => {
  const [timeInput, setTimeInput] = useState('');
  const [period, setPeriod] = useState('AM');

  // Convert 24-hour format to 12-hour format for display
  const convertTo12Hour = (time24) => {
    if (!time24 || time24.trim() === '') {
      return { hour: '', minute: '', period: 'AM' };
    }

    // Handle different time formats (HH:MM or HH:MM:SS)
    const timeParts = time24.split(':');
    if (timeParts.length < 2) {
      return { hour: '', minute: '', period: 'AM' };
    }

    const hours = timeParts[0];
    const minutes = timeParts[1];

    // Validate hours and minutes
    const hour24 = parseInt(hours, 10);
    const minute24 = parseInt(minutes, 10);

    if (isNaN(hour24) || isNaN(minute24) || hour24 < 0 || hour24 > 23 || minute24 < 0 || minute24 > 59) {
      return { hour: '', minute: '', period: 'AM' };
    }

    const minute12 = minute24.toString().padStart(2, '0');

    if (hour24 === 0) {
      return { hour: '12', minute: minute12, period: 'AM' };
    } else if (hour24 < 12) {
      return { hour: hour24.toString(), minute: minute12, period: 'AM' };
    } else if (hour24 === 12) {
      return { hour: '12', minute: minute12, period: 'PM' };
    } else {
      return { hour: (hour24 - 12).toString(), minute: minute12, period: 'PM' };
    }
  };

  // Convert 12-hour format to 24-hour format for storage
  const convertTo24Hour = (hour12, minute12, period12) => {
    if (!hour12 || !minute12) return '';
    
    let hour24 = parseInt(hour12, 10);
    
    if (period12 === 'AM') {
      if (hour24 === 12) hour24 = 0;
    } else {
      if (hour24 !== 12) hour24 += 12;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minute12.padStart(2, '0')}`;
  };

  // Initialize from value prop (24-hour format from backend)
  useEffect(() => {
    if (value && value.trim() !== '') {
      const { hour: h, minute: m, period: p } = convertTo12Hour(value);
      if (h && m !== undefined) {
        setPeriod(p);
        // Ensure proper formatting with leading zeros
        const formattedHour = h.toString();
        const formattedMinute = m.toString().padStart(2, '0');
        const formattedTime = `${formattedHour}:${formattedMinute}`;
        setTimeInput(formattedTime);
      } else {
        setPeriod('AM');
        setTimeInput('');
      }
    } else {
      setPeriod('AM');
      setTimeInput('');
    }
  }, [value]);



  // Handle period change (AM/PM)
  const handlePeriodChange = (e) => {
    const newPeriod = e.target.value;
    setPeriod(newPeriod);

    // If we have a valid time input, update the parent with new period
    if (timeInput) {
      const timeRegex = /^(\d{1,2}):(\d{2})$/;
      const match = timeInput.match(timeRegex);

      if (match) {
        const [, h, m] = match;
        const hour = parseInt(h, 10);
        const minute = parseInt(m, 10);

        if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
          const time24 = convertTo24Hour(h, m, newPeriod);

          if (onChange) {
            onChange({
              target: {
                name,
                value: time24
              }
            });
          }
        }
      }
    }
  };

  // Format input as user types for 12-hour format
  const formatTimeInput = (value) => {
    // Remove any non-digit characters
    const digits = value.replace(/\D/g, '');

    if (digits.length === 0) return '';
    if (digits.length === 1) return digits;
    if (digits.length === 2) {
      // If hour is > 12, treat as HM format (e.g., 13 becomes 1:3)
      const hour = parseInt(digits);
      if (hour > 12) {
        return digits[0] + ':' + digits[1];
      }
      return digits;
    }
    if (digits.length === 3) {
      // Format as H:MM or HH:M
      const hour = parseInt(digits.substring(0, 2));
      if (hour > 12) {
        // 13X becomes 1:3X
        return digits[0] + ':' + digits.substring(1);
      } else {
        // 12X becomes 12:X
        return digits.substring(0, 2) + ':' + digits.substring(2);
      }
    }
    if (digits.length >= 4) {
      // Format as HH:MM, but ensure hour is valid for 12-hour format
      let hour = parseInt(digits.substring(0, 2));
      let minute = parseInt(digits.substring(2, 4));

      // Cap minutes at 59
      if (minute > 59) {
        minute = 59;
      }

      if (hour > 12) {
        // Convert to 12-hour format: 13XX becomes 1:XX
        hour = hour - 12;
        if (hour === 0) hour = 12;
      } else if (hour === 0) {
        hour = 12;
      }

      // Format with leading zero for minutes
      const formattedMinute = minute.toString().padStart(2, '0');
      return hour.toString() + ':' + formattedMinute;
    }

    return digits;
  };

  // Handle input change with proper 12-hour formatting
  const handleInputChange = (e) => {
    let inputValue = e.target.value;
    let newPeriod = period;

    // Check if user typed a time that suggests AM/PM
    const digits = inputValue.replace(/\D/g, '');
    if (digits.length >= 3) {
      const originalHour = parseInt(digits.substring(0, 2));
      if (originalHour > 12) {
        // If user typed 13-23, set to PM
        newPeriod = 'PM';
        setPeriod('PM');
      }
    }

    // Format the input for 12-hour format
    const formattedValue = formatTimeInput(inputValue);
    setTimeInput(formattedValue);

    // Validate and convert to 24-hour format
    const timeRegex = /^(\d{1,2}):(\d{2})$/;
    const match = formattedValue.match(timeRegex);

    if (match) {
      const [, h, m] = match;
      let hour = parseInt(h, 10);
      let minute = parseInt(m, 10);

      // Cap minutes at 59 if they exceed
      if (minute > 59) {
        minute = 59;
        // Update the display with corrected minute
        const correctedTime = `${hour}:${minute.toString().padStart(2, '0')}`;
        setTimeInput(correctedTime);
      }

      // Validate 12-hour format (1-12 hours, 0-59 minutes)
      if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
        const time24 = convertTo24Hour(hour.toString(), minute.toString().padStart(2, '0'), newPeriod);

        if (onChange) {
          onChange({
            target: {
              name,
              value: time24
            }
          });
        }
      }
    }
  };


  return (
    <div className={`time-input-12hour ${className}`}>
      <div className="time-input-container">
        <input
          type="text"
          className="time-display-input"
          value={timeInput}
          onChange={handleInputChange}
          placeholder={placeholder}
          autoComplete="off"
        />
        <div className="time-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        </div>
        <select
          className="period-select"
          value={period}
          onChange={handlePeriodChange}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
};

export default TimeInput12Hour;
