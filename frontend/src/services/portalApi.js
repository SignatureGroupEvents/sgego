import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? (import.meta.env.VITE_API_URL.endsWith('/api')
      ? import.meta.env.VITE_API_URL
      : `${import.meta.env.VITE_API_URL}/api`)
  : 'http://localhost:3001/api';

const getPortalToken = () => localStorage.getItem('portalToken');

export const getPortalEventId = () => localStorage.getItem('portalEventId');

export const setPortalSession = (token, eventId) => {
  localStorage.setItem('portalToken', token);
  localStorage.setItem('portalEventId', eventId);
};

export const clearPortalSession = () => {
  localStorage.removeItem('portalToken');
  localStorage.removeItem('portalEventId');
};

export const hasPortalSession = () => !!getPortalToken() && !!getPortalEventId();

const portalApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

portalApi.interceptors.request.use((config) => {
  const token = getPortalToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.data?.code === 'PORTAL_CLOSED') {
      clearPortalSession();
    }
    return Promise.reject(error);
  }
);

export const portalLogin = async (eventId, email, password) => {
  const res = await portalApi.post(`/portal/${eventId}/login`, { email, password });
  return res.data;
};

export const getPortalEvent = async (eventId) => {
  const res = await portalApi.get(`/portal/${eventId}`);
  return res.data.event;
};

export const getPortalAnalytics = async (eventId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `/portal/${eventId}/analytics${query ? `?${query}` : ''}`;
  const res = await portalApi.get(url);
  return res.data;
};

export const getPortalGuests = async (eventId, includeInherited = true) => {
  const res = await portalApi.get(`/portal/${eventId}/guests`, {
    params: { includeInherited: includeInherited ? 'true' : 'false' }
  });
  return res.data;
};

export const getPortalInventory = async (eventId) => {
  const res = await portalApi.get(`/portal/${eventId}/inventory`);
  return res.data;
};

export default portalApi;
