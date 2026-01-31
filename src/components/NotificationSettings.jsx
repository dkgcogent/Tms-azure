import React, { useState, useEffect } from 'react';
import { fetchNotificationSettings, updateNotificationSettings } from '../services/notificationService';
import { showSuccess, showError } from './Notification';
import './NotificationSettings.css';

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: false,
    reminderDays: [1, 7, 30],
    enablePopupAlerts: true,
    enableSoundAlerts: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await fetchNotificationSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleReminderDaysChange = (day, checked) => {
    setSettings(prev => ({
      ...prev,
      reminderDays: checked
        ? [...prev.reminderDays, day].sort((a, b) => a - b)
        : prev.reminderDays.filter(d => d !== day)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationSettings(settings);
      showSuccess('Notification settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="notification-settings-loading">Loading settings...</div>;
  }

  return (
    <div className="notification-settings">
      <h2>Notification Settings</h2>

      <div className="settings-section">
        <h3>Notification Types</h3>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => handleChange('emailNotifications', e.target.checked)}
            />
            Email Notifications
          </label>
        </div>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.smsNotifications}
              onChange={(e) => handleChange('smsNotifications', e.target.checked)}
            />
            SMS Notifications
          </label>
        </div>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.whatsappNotifications}
              onChange={(e) => handleChange('whatsappNotifications', e.target.checked)}
            />
            WhatsApp Notifications
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Reminder Days</h3>
        <p>Send reminders before expiry on these days:</p>
        {[1, 7, 30, 60, 90].map(day => (
          <div key={day} className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.reminderDays.includes(day)}
                onChange={(e) => handleReminderDaysChange(day, e.target.checked)}
              />
              {day} day{day !== 1 ? 's' : ''} before expiry
            </label>
          </div>
        ))}
      </div>

      <div className="settings-section">
        <h3>UI Alerts</h3>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.enablePopupAlerts}
              onChange={(e) => handleChange('enablePopupAlerts', e.target.checked)}
            />
            Show popup alerts on app open
          </label>
        </div>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.enableSoundAlerts}
              onChange={(e) => handleChange('enableSoundAlerts', e.target.checked)}
            />
            Enable sound alerts
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button
          className="save-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
