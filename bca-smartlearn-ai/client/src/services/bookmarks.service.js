import { api, buildQuery, getData, getPage } from '../lib/api';

export const ENTITY_TYPES = ['note', 'question', 'exercise', 'video', 'test', 'topic'];

export const bookmarkService = {
  summary: () => getData('/bookmarks/summary'),
  list: (params) => getPage(`/bookmarks${buildQuery(params)}`),
  status: (entityType, entityId) => getData(`/bookmarks/status${buildQuery({ entityType, entityId })}`),
  toggle: (payload) => api.post('/bookmarks/toggle', payload).then((r) => r.data),
  remove: (id) => api.delete(`/bookmarks/${id}`).then((r) => r.data),
};

export default bookmarkService;
