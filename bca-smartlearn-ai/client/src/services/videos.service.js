import { api, buildQuery, getData, getPage } from '../lib/api';

/** YouTube-backed lesson recommendations plus the curated library. */
export const videoService = {
  meta: () => getData('/videos/meta'),
  curated: (params) => getPage(`/videos/curated${buildQuery(params)}`),
  syllabusChapters: (params) => getData(`/videos/syllabus${buildQuery(params)}`),
  search: (params) => getData(`/videos/search${buildQuery(params)}`),
  recommendations: () => getData('/videos/recommendations'),
  refresh: () => api.post('/videos/recommendations/refresh').then((r) => r.data),
  forTopic: (topicId) => getData(`/videos/topics/${topicId}`),
  updateStatus: (id, status) => api.patch(`/videos/recommendations/${id}`, { status }).then((r) => r.data),
};

export default videoService;
