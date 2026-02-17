import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? (import.meta.env.VITE_API_URL.endsWith('/api') 
      ? import.meta.env.VITE_API_URL 
      : `${import.meta.env.VITE_API_URL}/api`)
  : 'http://localhost:3001/api';

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
      // Don't redirect to main app login when user is in the client portal
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/portal')) {
        window.location.href = '/auth?view=login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const uploadInventoryCSV = async (eventId, file, mapping = null) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('eventId', eventId);
  
  // Add mapping if provided
  if (mapping) {
    formData.append('mapping', JSON.stringify(mapping));
  }
  
  return api.post('/inventory/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
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

export const bulkDeleteInventory = (eventId, inventoryIds) => {
  return api.delete(`/inventory/bulk/${eventId}`, {
    data: { inventoryIds }
  });
};

export const getCheckinContext = (eventId) => {
  return api.get(`/checkins/context/${eventId}`);
};

export const singleEventCheckin = (guestId, eventId, selectedGifts, notes = '', pickupFieldPreferences = null) => {
  return api.post('/checkins/single', {
    guestId,
    eventId,
    selectedGifts,
    notes,
    ...(pickupFieldPreferences != null && { pickupFieldPreferences })
  });
};

export const multiEventCheckin = (guestId, checkins, notes = '') => {
  // checkins: [{ eventId, selectedGifts, pickupFieldPreferences? }]
  return api.post('/checkins/multi', {
    guestId,
    checkins,
    notes
  });
};

export const undoCheckin = (checkinId, reason = '', guestId = '', eventId = '') => {
  return api.put(`/checkins/${checkinId}/undo`, {
    reason,
    guestId,
    eventId
  });
};

export const updateCheckinGifts = (checkinId, newGifts, reason = '', guestId = '', eventId = '') => {
  return api.put(`/checkins/${checkinId}/gifts`, {
    newGifts,
    reason,
    guestId,
    eventId
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

// Event-based user assignment functions
export const getEventAssignedUsers = (eventId) => {
  return api.get(`/events/${eventId}/assigned-users`);
};

export const assignUsersToEvent = (eventId, userIds, allocatedToSecondaryEventId = null) => {
  return api.post(`/events/${eventId}/assign-users`, { 
    userIds, 
    allocatedToSecondaryEventId 
  });
};

export const removeUserFromEvent = (eventId, assignmentId) => {
  return api.delete(`/events/${eventId}/assigned-users/${assignmentId}`);
};

export const updateUserAssignment = (eventId, assignmentId, allocatedToSecondaryEventId = null) => {
  return api.put(`/events/${eventId}/assigned-users/${assignmentId}`, {
    allocatedToSecondaryEventId
  });
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

// Account removal request API functions
export const requestAccountRemoval = () => {
  return api.post('/users/request-account-removal');
};

export const cancelAccountRemovalRequest = () => {
  return api.post('/users/cancel-account-removal-request');
};

export const getPendingRemovalRequests = () => {
  return api.get('/users/pending-removal-requests');
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
  return api.delete('/guests/bulk', { data: { guestIds } });
};

// My Events API functions
export const getMyEvents = () => {
  return api.get('/users/my-events');
};

export const getMyCreatedEvents = (params = {}) => {
  return api.get('/users/my-created-events', { params });
};

export const getMyAssignedEvents = () => {
  return api.get('/users/my-assigned-events');
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