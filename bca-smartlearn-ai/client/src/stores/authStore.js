import { create } from 'zustand';
import { api } from '../lib/api';
import { setAuthToken } from '../lib/api';

const EMPTY = {
  user: null,
  profile: null,
  csrfToken: null,
  status: 'idle', // idle | loading | authenticated | anonymous
  error: null,
};

/**
 * Session state. The JWT itself lives in an httpOnly cookie — this store only
 * mirrors the public user/profile payload returned by the API.
 * As a fallback for dev environments where cookie SameSite policies interfere,
 * the raw token is also stored in sessionStorage and sent as a Bearer header.
 */
export const useAuthStore = create((set, get) => ({
  ...EMPTY,

  get isAuthenticated() {
    return get().status === 'authenticated';
  },

  get isStudent() {
    return get().user?.role === 'student';
  },

  get isAdmin() {
    return get().user?.role === 'super_admin';
  },

  get isOnboarded() {
    return Boolean(get().profile?.onboardingCompleted);
  },

  setSession({ user, profile, csrfToken, token }) {
    // If the server included a raw token (e.g. from demo-login or explicit login),
    // cache it so the axios interceptor can attach it as a Bearer header.
    if (token) setAuthToken(token);
    set({
      user: user ?? null,
      profile: profile ?? null,
      csrfToken: csrfToken ?? get().csrfToken,
      status: user ? 'authenticated' : 'anonymous',
      error: null,
    });
  },

  setProfile(profile) {
    set({ profile: profile ?? null });
  },

  setUser(user) {
    set({ user: user ? { ...get().user, ...user } : null });
  },

  clear() {
    setAuthToken(null);
    set({ ...EMPTY, status: 'anonymous' });
  },

  /** Loads the current session on boot. Never throws. */
  async bootstrap() {
    if (get().status === 'loading') return get().user;
    set({ status: 'loading' });
    try {
      const { data } = await api.get('/auth/me');
      get().setSession(data);
      return data.user;
    } catch (error) {
      // 401 simply means "not signed in yet".
      set({ ...EMPTY, status: 'anonymous', error: error.status === 401 ? null : error.message });
      return null;
    }
  },

  async loginAsDemo(role = 'student') {
    set({ status: 'loading' });
    try {
      const { data } = await api.post('/auth/demo-login', { role });
      get().setSession(data);
      return data.user;
    } catch (error) {
      set({ status: 'anonymous', error: error.message });
      return null;
    }
  },

  async refresh() {
    try {
      const { data } = await api.get('/auth/me');
      get().setSession(data);
      return data;
    } catch {
      return null;
    }
  },
}));

export const selectUser = (state) => state.user;
export const selectProfile = (state) => state.profile;
export const selectRole = (state) => state.user?.role ?? null;
