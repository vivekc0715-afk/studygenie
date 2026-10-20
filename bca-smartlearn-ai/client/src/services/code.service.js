import { api, buildQuery, getData, getPage } from '../lib/api';

/** Online compiler (Judge0) + coding exercise library. */
export const codeService = {
  meta: () => getData('/code/meta'),
  languages: () => getData('/code/languages'),
  stats: () => getData('/code/stats'),

  exercises: (params) => getPage(`/code/exercises${buildQuery(params)}`),
  exercise: (id) => getData(`/code/exercises/${id}`),

  run: (payload) => api.post('/code/run', payload).then((r) => r.data),
  submit: (payload) => api.post('/code/submit', payload).then((r) => r.data),
  aiAssist: (payload) => api.post('/code/ai-assist', payload).then((r) => r.data?.data || r.data),

  submissions: (params) => getPage(`/code/submissions${buildQuery(params)}`),
  submission: (id) => getData(`/code/submissions/${id}`),
};

export default codeService;
