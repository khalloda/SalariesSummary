import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

/**
 * Hook to check if bonus halves should be shown (from server config)
 * Defaults to false (halves hidden)
 */
export function useBonusHalfSwitch(): boolean {
  const [showHalves, setShowHalves] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch config from server
    axios.get(`${API_BASE_URL}/config/bonus-halves`)
      .then(res => {
        setShowHalves(res.data.showHalves || false);
      })
      .catch(err => {
        console.error('Error fetching bonus halves config:', err);
        // Default to false on error
        setShowHalves(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return showHalves;
}

