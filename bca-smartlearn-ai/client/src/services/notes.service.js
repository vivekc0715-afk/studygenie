import { api, buildQuery, getData, getPage } from '../lib/api';

/** AI note generation, saved notes library and study material import. */
export const notesService = {
  meta: () => getData('/notes/meta'),
  list: (params) => getPage(`/notes${buildQuery(params)}`),
  getOne: (id) => getData(`/notes/${id}`),
  create: (payload) => api.post('/notes', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/notes/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/notes/${id}`).then((r) => r.data),
  toggleBookmark: (id) => api.post(`/notes/${id}/bookmark`).then((r) => r.data),

  generate: (payload) => api.post('/notes/generate', payload).then((r) => r.data),
  exportNote: (id, format) => getData(`/notes/${id}/export${buildQuery({ format })}`),

  subjects: () => getData('/notes/subjects'),
  topics: (params) => getData(`/notes/topics${buildQuery(params)}`),
  materials: (params) => getData(`/notes/materials${buildQuery(params)}`),
  importMaterial: (id, payload) => api.post(`/notes/materials/${id}/import`, payload ?? {}).then((r) => r.data),
  listGfg: (params) => getData(`/notes/gfg${buildQuery(params)}`),
  importGfg: (payload) => api.post('/notes/gfg/import', payload).then((r) => r.data),
};

export default notesService;
