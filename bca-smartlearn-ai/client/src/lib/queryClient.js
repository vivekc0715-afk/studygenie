import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry(failureCount, error) {
        // Never retry auth/permission/validation problems or unconfigured services.
        if (error instanceof ApiError) {
          if (error.status === 401 || error.status === 403 || error.status === 404) return false;
          if (error.status === 503 || error.status === 422 || error.status === 400) return false;
        }
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

/** Query keys — one source of truth so invalidation never drifts. */
export const qk = {
  me: ['auth', 'me'],
  profile: ['student', 'profile'],
  enrollments: ['student', 'enrollments'],
  mySubjects: (params) => ['student', 'subjects', params],
  catalogue: (params) => ['academic', 'catalogue', params],
  semesters: (params) => ['academic', 'semesters', params],
  academicSubjects: (params) => ['academic', 'subjects', params],
  academicSubject: (id) => ['academic', 'subject', id],
  units: (params) => ['academic', 'units', params],
  topics: (params) => ['academic', 'topics', params],
  notes: (params) => ['notes', 'list', params],
  noteMeta: ['notes', 'meta'],
  note: (id) => ['notes', 'detail', id],
  noteSubjects: ['notes', 'subjects'],
  noteTopics: (params) => ['notes', 'topics', params],
  materials: (params) => ['notes', 'materials', params],
  codeMeta: ['code', 'meta'],
  codeLanguages: ['code', 'languages'],
  codeStats: ['code', 'stats'],
  exercises: (params) => ['code', 'exercises', params],
  exercise: (id) => ['code', 'exercise', id],
  submissions: (params) => ['code', 'submissions', params],
  testMeta: ['tests', 'meta'],
  testScope: ['tests', 'scope'],
  testStats: ['tests', 'stats'],
  tests: (params) => ['tests', 'list', params],
  test: (id) => ['tests', 'detail', id],
  attempts: (params) => ['tests', 'attempts', params],
  attempt: (id) => ['tests', 'attempt', id],
  analyticsOverview: ['analytics', 'overview'],
  analyticsSubjects: ['analytics', 'subjects'],
  analyticsFilterSubjects: ['analytics', 'filter-subjects'],
  analyticsTopics: (params) => ['analytics', 'topics', params],
  predictionMeta: ['predictions', 'meta'],
  predictions: ['predictions', 'list'],
  prediction: (subjectId) => ['predictions', 'subject', subjectId],
  videoMeta: ['videos', 'meta'],
  videoRecommendations: ['videos', 'recommendations'],
  videoCurated: (params) => ['videos', 'curated', params],
  videoSearch: (params) => ['videos', 'search', params],
  videoTopic: (topicId) => ['videos', 'topic', topicId],
  planner: (params) => ['planner', 'current', params],
  plannerToday: ['planner', 'today'],
  plannerStats: ['planner', 'stats'],
  notifications: (params) => ['notifications', 'list', params],
  unreadCount: ['notifications', 'unread'],
  bookmarks: (params) => ['bookmarks', 'list', params],
  bookmarksSummary: ['bookmarks', 'summary'],
  bookmarkStatus: (entityType, entityId) => ['bookmarks', 'status', entityType, entityId],
  adminDashboard: ['admin', 'dashboard'],
  adminHealth: ['admin', 'system-health'],
  adminStudents: (params) => ['admin', 'students', params],
  adminStudent: (id) => ['admin', 'student', id],
  adminEntity: (entity, params) => ['admin', entity, 'list', params],
  adminRecord: (entity, id) => ['admin', entity, 'detail', id],
  adminSettings: ['admin', 'settings'],
  adminAuditLogs: (params) => ['admin', 'audit-logs', params],
};
