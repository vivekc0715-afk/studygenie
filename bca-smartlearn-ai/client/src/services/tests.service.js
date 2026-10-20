import { api, buildQuery, getData, getPage } from '../lib/api';

/** Adaptive tests, attempts and the in-test autosave lifecycle. */
export const testsService = {
  meta: () => getData('/tests/meta'),
  scope: () => getData('/tests/scope'),
  stats: () => getData('/tests/stats'),

  list: (params) => getPage(`/tests${buildQuery(params)}`),
  create: (payload) => api.post('/tests', payload).then((r) => r.data),
  get: (id) => getData(`/tests/${id}`),
  start: (id) => api.post(`/tests/${id}/start`).then((r) => r.data),

  attempts: (params) => getPage(`/tests/attempts${buildQuery(params)}`),
  attempt: (id) => getData(`/tests/attempts/${id}`),
  autosave: (id, payload) => api.patch(`/tests/attempts/${id}`, payload).then((r) => r.data),
  submit: (id, payload) => api.post(`/tests/attempts/${id}/submit`, payload ?? {}).then((r) => r.data),
  abandon: (id) => api.post(`/tests/attempts/${id}/abandon`).then((r) => r.data),
};

export default testsService;
