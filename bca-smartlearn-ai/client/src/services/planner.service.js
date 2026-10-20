import { api, buildQuery, getData } from '../lib/api';

/** Study timetable / daily task planner. */
export const plannerService = {
  stats: () => getData('/planner/stats'),
  today: () => getData('/planner/today'),
  current: (params) => getData(`/planner${buildQuery(params)}`),
  generate: (payload) => api.post('/planner/generate', payload ?? {}).then((r) => r.data),
  updateTask: (id, payload) => api.patch(`/planner/tasks/${id}`, payload).then((r) => r.data),
  rescheduleTask: (id, date) => api.patch(`/planner/tasks/${id}/date`, { date }).then((r) => r.data),
};

export default plannerService;
