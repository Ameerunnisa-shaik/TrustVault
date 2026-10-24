import axios from 'axios';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Authorization Bearer token & active company ID header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('trustvault_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const activeCompanyId = localStorage.getItem('trustvault_active_company_id');
  if (activeCompanyId) {
    config.headers['x-company-id'] = activeCompanyId;
  }

  return config;
});

// Interceptor to handle unauthorized / token expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('trustvault_token');
      localStorage.removeItem('trustvault_active_company_id');
      // Redirect to login only if not already navigating to an unauthenticated page
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register') &&
        window.location.pathname !== '/'
      ) {
        window.location.href = '/login?session_expired=true';
      }
    }
    return Promise.reject(error);
  }
);
