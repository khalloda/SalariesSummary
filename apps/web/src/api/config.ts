/**
 * API Configuration
 * Handles different environments (development, XAMPP, production)
 */

// Determine the API base URL based on environment
const getApiBaseUrl = (): string => {
  // If running on salaries.local, use relative paths (Apache will proxy)
  if (window.location.hostname === 'salaries.local' || 
      window.location.hostname === 'www.salaries.local') {
    return '/api';
  }
  
  // Development mode - use proxy from vite.config.ts
  if (import.meta.env?.DEV) {
    return '/api';
  }
  
  // Production - can be configured via environment variable
  return (import.meta.env?.VITE_API_URL as string) || '/api';
};

export const API_BASE_URL = getApiBaseUrl();

export default {
  baseURL: API_BASE_URL,
  timeout: 30000
};

