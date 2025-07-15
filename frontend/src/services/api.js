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

export const addInventoryItem = (eventId, data) => {
  return api.post(`/inventory/${eventId}`, data);
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

// User Management API functions
export const getAllUsers = () => {
  return api.get('/users');
};

export const getUserProfile = (userId) => {
  return api.get(userId ? `/users/profile/${userId}` : '/users/profile');
};

export const updateUserProfile = (userId, data) => {
  return api.put(userId ? `/users/profile/${userId}` : '/users/profile', data);
};

export const createUser = (userData) => {
  return api.post('/users', userData);
};

export const updateUserRole = (userId, role) => {
  return api.put(`/users/${userId}/role`, { role });
};

export const assignUserToEvents = (userId, eventIds) => {
  return api.put(`/users/${userId}/assign-events`, { eventIds });
};

export const getUserAssignedEvents = (userId) => {
  return api.get(userId ? `/users/${userId}/assigned-events` : '/users/assigned-events');
};

export const getAvailableEvents = () => {
  return api.get('/users/available-events');
};

export const deactivateUser = (userId) => {
  return api.put(`/users/${userId}/deactivate`);
};

export const deleteUser = (userId) => {
  return api.delete(`/users/${userId}`);
};

// Invite User API function
export const inviteUser = (inviteData) => {
  return api.post('/users/invite', inviteData);
};

// Admin Actions API functions
export const resetUserPassword = (userId, newPassword) => {
  return api.put(`/users/${userId}/reset-password`, { newPassword });
};

export const resendUserInvite = (userId) => {
  return api.post(`/users/${userId}/resend-invite`);
};

export const sendPasswordResetLink = (userId) => {
  return api.post(`/auth/send-reset-link/${userId}`);
};

// Invite validation API function
export const validateInviteToken = (token) => {
  return api.get(`/auth/validate-invite/${token}`);
};

// Password reset API functions
export const validateResetToken = (token) => {
  return api.get(`/auth/validate-reset/${token}`);
};

export const resetPassword = (token, password) => {
  return api.post(`/auth/reset-password/${token}`, { password });
};

// Activity Feed API functions
export const getGlobalActivityFeed = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.user) params.append('user', filters.user);
  if (filters.limit) params.append('limit', filters.limit);
  
  return api.get(`/analytics/activity?${params.toString()}`);
};

export const getEventActivityFeed = (eventId, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.user) params.append('user', filters.user);
  if (filters.limit) params.append('limit', filters.limit);
  
  return api.get(`/analytics/events/${eventId}/activity?${params.toString()}`);
};

export const createTestActivityLog = (eventId = null) => {
  return api.post('/analytics/activity/test', { eventId });
};

// Guest Management API functions
export const getGuests = (eventId, includeInherited = true) => {
  return api.get(`/guests?eventId=${eventId}&includeInherited=${includeInherited}`);
};

export const createGuest = (guestData) => {
  return api.post('/guests', guestData);
};

export const deleteGuest = (guestId) => {
  return api.delete(`/guests/${guestId}`);
};

export const bulkAddGuests = (eventId, guests) => {
  return api.post('/guests/bulk-add', { eventId, guests });
};

export const bulkDeleteGuests = (eventId, guestIds) => {
  return api.post('/guests/bulk-delete', { eventId, guestIds });
};

// My Events API functions
export const getMyEvents = () => {
  return api.get('/users/my-events');
};

export const addToMyEvents = (eventId) => {
  return api.post('/users/my-events', { eventId });
};

export const removeFromMyEvents = (eventId) => {
  return api.delete(`/users/my-events/${eventId}`);
};

export const updateMyEventsPositions = (positions) => {
  return api.put('/users/my-events/positions', { positions });
};