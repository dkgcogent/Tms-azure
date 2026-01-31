import { useState, useEffect } from 'react';
import axios from 'axios';

function useExpiryAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        setLoading(true);
        const response = await axios.get('/api/notifications/expiry-alerts');
        setAlerts(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
  }, []);

  return { alerts, loading, error };
}

export { useExpiryAlerts };
export default useExpiryAlerts;
