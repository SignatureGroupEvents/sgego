import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const uploadInventoryCSV = (eventId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('eventId', eventId);
  return api.post('/inventory/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const fetchInventory = (eventId) => {
  return api.get(`/inventory/${eventId}`);
};

export const updateInventoryItem = (inventoryId, data) => {
  return api.put(`/inventory/${inventoryId}`, data);
};

export const deleteInventoryItem = (inventoryId) => {
  return api.delete(`/inventory/${inventoryId}`);
};

export const getCheckinContext = (eventId) => {
  return api.get(`/checkins/context/${eventId}`);
};

export const singleEventCheckin = (guestId, eventId, selectedGifts, notes = '') => {
  return api.post('/checkins/single', {
    guestId,
    eventId,
    selectedGifts,
    notes
  });
};

export const multiEventCheckin = (guestId, checkins, notes = '') => {
  // checkins: [{ eventId, selectedGifts: [{ inventoryId, quantity }] }]
  return api.post('/checkins/multi', {
    guestId,
    checkins,
    notes
  });
};

export const updateInventoryAllocation = (inventoryId, allocatedEvents) => {
  return api.put(`/inventory/${inventoryId}/allocation`, { allocatedEvents });
};

export const exportInventoryCSV = (eventId) => {
  return api.get(`/inventory/${eventId}/export/csv`, {
    responseType: 'blob'
  });
};

export const exportInventoryExcel = (eventId) => {
  return api.get(`/inventory/${eventId}/export/excel`, {
    responseType: 'blob'
  });
};