import { api, buildQuery, getData, getPage } from '../lib/api';

/** Progress analytics: mastery, weak topics, subject performance, recommendations. */
export const analyticsService = {
  overview: () => getData('/analytics/overview'),
  subjects: () => getData('/analytics/subjects'),
  filterSubjects: () => getData('/analytics/filter-subjects'),
  topics: (params) => getPage(`/analytics/topics${buildQuery(params)}`),
  recompute: () => api.post('/analytics/recompute').then((r) => r.data),
};

export default analyticsService;
