import api from './api';

export const getEvents = async () => {
  const res = await api.get('/events');
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

export const getEventAnalytics = async (eventId) => {
  const res = await api.get(`/events/${eventId}/analytics`);
  return res.data.analytics;
};

export const getUserAssignedEvents = async () => {
  const res = await api.get('/users/assigned-events');
  return res.data.assignedEvents;
}; 