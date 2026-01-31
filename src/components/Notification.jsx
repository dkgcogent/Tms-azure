import React, { useState, useEffect } from 'react';
import './Notification.css';

const Notification = ({ message, type, duration = 4000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose();
      }, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div className={`notification ${type} ${isVisible ? 'show' : 'hide'}`}>
      <div className="notification-content">
        <div className="notification-icon">
          {type === 'success' && '✓'}
          {type === 'error' && '✕'}
          {type === 'warning' && '⚠'}
          {type === 'info' && 'ℹ'}
        </div>
        <div className="notification-message">{message}</div>
        <button className="notification-close" onClick={handleClose}>
          ×
        </button>
      </div>
    </div>
  );
};

// Notification Manager Component
import useExpiryAlerts from '../hooks/useExpiryAlerts';

export const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  const { alerts, loading, error } = useExpiryAlerts();

  useEffect(() => {
    // Listen for notification events
    const handleNotification = (event) => {
      const { message, type } = event.detail;
      const id = Date.now() + Math.random();
      
      setNotifications(prev => [...prev, { id, message, type }]);
    };

    window.addEventListener('show-notification', handleNotification);
    
    return () => {
      window.removeEventListener('show-notification', handleNotification);
    };
  }, []);

  useEffect(() => {
    if (!loading && alerts.length > 0) {
      alerts.forEach(alert => {
        const message = `${alert.expiryType} for ${alert.itemName} ${alert.status === 'expired' ? 'has expired' : 'expires soon'} (in ${alert.daysUntilExpiry} days)`;
        if (alert.projectName && alert.projectName !== 'N/A') {
          showWarning(`${message} - Project: ${alert.projectName} (${alert.projectCode})`);
        } else {
          showWarning(message);
        }
      });
    }
  }, [alerts, loading]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

// Helper functions to show notifications
export const showNotification = (message, type = 'info') => {
  const event = new CustomEvent('show-notification', {
    detail: { message, type }
  });
  window.dispatchEvent(event);
};

export const showSuccess = (message) => showNotification(message, 'success');
export const showError = (message) => showNotification(message, 'error');
export const showWarning = (message) => showNotification(message, 'warning');
export const showInfo = (message) => showNotification(message, 'info');

export default Notification;
