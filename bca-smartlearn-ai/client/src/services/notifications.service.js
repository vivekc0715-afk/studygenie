import { api, buildQuery, getPage } from '../lib/api';

export const notificationService = {
  unreadCount: () => api.get('/notifications/unread-count').then((r) => r.data),
  list: (params) => getPage(`/notifications${buildQuery(params)}`),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post('/notifications/read-all').then((r) => r.data),
  remove: (id) => api.delete(`/notifications/${id}`).then((r) => r.data),
  clearRead: () => api.delete('/notifications/read').then((r) => r.data),
};

export default notificationService;
