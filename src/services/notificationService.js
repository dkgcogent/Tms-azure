import axios from 'axios';

const API_BASE_URL = 'http://localhost:3004/api/notifications';

export const fetchExpiryAlerts = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/expiry-alerts`);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching expiry alerts:', error);
    return [];
  }
};

export const fetchNotificationSettings = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/settings`);
    return response.data || {};
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return {};
  }
};

export const updateNotificationSettings = async (settings) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/settings`, settings);
    return response.data;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
};
