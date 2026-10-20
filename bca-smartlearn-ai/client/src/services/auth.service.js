import { api, getData } from '../lib/api';

export const authService = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }).then((r) => r.data),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  demoLogin: (role = 'student') => api.post('/auth/demo-login', { role }).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => getData('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (payload) => api.post('/auth/reset-password', payload).then((r) => r.data),
  changePassword: (payload) => api.post('/auth/change-password', payload).then((r) => r.data),
  updateAccount: (payload) => api.patch('/auth/account', payload).then((r) => r.data),
};

export default authService;
