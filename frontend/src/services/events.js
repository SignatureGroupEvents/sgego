import api from './api';

export const getEvents = async (status = null, includeArchived = false) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (includeArchived) params.append('includeArchived', 'true');
  
  const res = await api.get(`/events?${params.toString()}`);
  return res.data;
};

export const getArchivedEvents = async () => {
  const res = await api.get('/events?includeArchived=true&status=archived');
  return res.data;
};

export const deleteEvent = async (eventId) => {
  return api.delete(`/events/${eventId}`);
};

export const getEvent = async (eventId) => {
  const res = await api.get(`/events/${eventId}`);
  return res.data.event;
};

export const updateEvent = async (eventId, eventData) => {
  const res = await api.put(`/events/${eventId}`, eventData);
  return res.data;
};

export const updateEventStatus = async (eventId, status) => {
  const res = await api.put(`/events/${eventId}/status`, { status });
  return res.data;
};

export const archiveEvent = async (eventId) => {
  const res = await api.put(`/events/${eventId}/archive`);
  return res.data;
};

export const unarchiveEvent = async (eventId) => {
  const res = await api.put(`/events/${eventId}/unarchive`);
  return res.data;
};

export const getEventAnalytics = async (eventId) => {
  const res = await api.get(`/events/${eventId}/analytics`);
  return res.data.analytics;
};

export const getUserAssignedEvents = async () => {
  const res = await api.get('/users/assigned-events');
  return res.data.assignedEvents;
}; 