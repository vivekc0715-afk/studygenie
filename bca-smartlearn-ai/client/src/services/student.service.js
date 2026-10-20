import { api, buildQuery, getData } from '../lib/api';

/** Student profile, enrolments and the personalised subject tree. */
export const studentService = {
  getProfile: () => getData('/student/profile'),
  updateProfile: (payload) => api.patch('/student/profile', payload).then((r) => r.data),
  completeOnboarding: (payload) => api.post('/student/onboarding/complete', payload).then((r) => r.data),

  listEnrollments: (params) => getData(`/student/enrollments${buildQuery(params)}`),
  addEnrollments: (payload) => api.post('/student/enrollments', payload).then((r) => r.data),
  updateEnrollment: (id, payload) => api.patch(`/student/enrollments/${id}`, payload).then((r) => r.data),
  removeEnrollment: (id) => api.delete(`/student/enrollments/${id}`).then((r) => r.data),

  mySubjects: (params) => getData(`/student/subjects${buildQuery(params)}`),
  setTopicCompletion: (topicId, payload) =>
    api.post(`/student/topics/${topicId}/completion`, payload).then((r) => r.data),
};

export default studentService;
