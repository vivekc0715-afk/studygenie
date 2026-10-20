import { api, buildQuery, getData, getPage } from '../lib/api';

/** Admin CRUD entity registry — mirrors the Express `admin.routes.js` registry. */
export const ADMIN_ENTITIES = [
  { path: 'universities', label: 'Universities', singular: 'University', icon: 'Building2', searchFields: ['name', 'code', 'city'] },
  { path: 'colleges', label: 'Colleges', singular: 'College', icon: 'School', searchFields: ['name', 'code', 'city'] },
  { path: 'programs', label: 'Programs', singular: 'Program', icon: 'GraduationCap', searchFields: ['name', 'code'] },
  { path: 'regulations', label: 'Regulations', singular: 'Regulation', icon: 'ScrollText', searchFields: ['name', 'code'] },
  { path: 'semesters', label: 'Semesters', singular: 'Semester', icon: 'CalendarRange', searchFields: ['title'] },
  { path: 'subjects', label: 'Subjects', singular: 'Subject', icon: 'BookOpen', searchFields: ['name', 'code'] },
  { path: 'units', label: 'Units', singular: 'Unit', icon: 'Layers', searchFields: ['title'] },
  { path: 'topics', label: 'Topics', singular: 'Topic', icon: 'ListTree', searchFields: ['title', 'keywords'] },
  { path: 'syllabi', label: 'Syllabi', singular: 'Syllabus', icon: 'Map', searchFields: ['title'] },
  { path: 'note-templates', label: 'Note Templates', singular: 'Note template', icon: 'FileText', searchFields: ['title'] },
  { path: 'learning-materials', label: 'Learning Materials', singular: 'Material', icon: 'Library', searchFields: ['title'] },
  { path: 'exercises', label: 'Coding Exercises', singular: 'Exercise', icon: 'Code2', searchFields: ['title', 'tags'] },
  { path: 'questions', label: 'Question Bank', singular: 'Question', icon: 'HelpCircle', searchFields: ['prompt', 'tags'] },
  { path: 'tests', label: 'Tests', singular: 'Test', icon: 'ClipboardCheck', searchFields: ['title'] },
  { path: 'videos', label: 'Curated Videos', singular: 'Video', icon: 'Youtube', searchFields: ['title', 'channelTitle', 'tags'] },
  { path: 'grading-schemes', label: 'Grading Schemes', singular: 'Grading scheme', icon: 'Award', searchFields: ['name', 'code'] },
];

export const adminService = {
  dashboard: () => getData('/admin/dashboard'),
  systemHealth: () => getData('/admin/system-health'),

  students: (params) => getPage(`/admin/students${buildQuery(params)}`),
  student: (id) => getData(`/admin/students/${id}`),
  updateStudent: (id, payload) => api.patch(`/admin/students/${id}`, payload).then((r) => r.data),
  setStudentStatus: (id, payload) => api.patch(`/admin/students/${id}/status`, payload).then((r) => r.data),
  deleteStudent: (id) => api.delete(`/admin/students/${id}`).then((r) => r.data),
  restoreStudent: (id) => api.post(`/admin/students/${id}/restore`).then((r) => r.data),

  list: (entity, params) => getPage(`/admin/${entity}${buildQuery(params)}`),
  create: (entity, payload) => api.post(`/admin/${entity}`, payload).then((r) => r.data),
  record: (entity, id) => getData(`/admin/${entity}/${id}`),
  update: (entity, id, payload) => api.put(`/admin/${entity}/${id}`, payload).then((r) => r.data),
  remove: (entity, id) => api.delete(`/admin/${entity}/${id}`).then((r) => r.data),
  restore: (entity, id) => api.post(`/admin/${entity}/${id}/restore`).then((r) => r.data),

  settings: () => getData('/admin/settings'),
  updateSettings: (key, payload) => api.put(`/admin/settings/${key}`, payload).then((r) => r.data),
  auditLogs: (params) => getPage(`/admin/audit-logs${buildQuery(params)}`),
};

export default adminService;
