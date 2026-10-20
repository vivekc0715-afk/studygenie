import { api, getData } from '../lib/api';

/** Predicted grades per subject with contributing factors and recommendations. */
export const predictionService = {
  meta: () => getData('/predictions/meta'),
  list: () => getData('/predictions'),
  computeAll: () => api.post('/predictions/recompute').then((r) => r.data),
  computeOne: (subjectId) => api.post(`/predictions/${subjectId}`).then((r) => r.data),
};

export default predictionService;
