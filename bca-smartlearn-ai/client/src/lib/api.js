import axios from 'axios';

export const CSRF_COOKIE = 'bca_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/** Normalised error thrown by every request wrapper. */
export class ApiError extends Error {
  constructor({ message, code, status, details }) {
    super(message || 'Something went wrong. Please try again.');
    this.name = 'ApiError';
    this.code = code || 'request_failed';
    this.status = status || 0;
    this.details = details ?? null;
  }

  /** True when a backend feature is missing its credentials (HTTP 503). */
  get notConfigured() {
    return this.code === 'service_not_configured';
  }

  /** Environment variable the operator still needs to supply. */
  get envKey() {
    return this.details?.envKey || null;
  }

  get isAuthError() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isValidation() {
    return this.code === 'validation_error' || this.status === 422;
  }

  /** Field errors keyed by path, ready for react-hook-form `setError`. */
  get fieldErrors() {
    const list = Array.isArray(this.details) ? this.details : this.details?.issues;
    if (!Array.isArray(list)) return {};
    return list.reduce((acc, issue) => {
      const path = Array.isArray(issue.path) ? issue.path.join('.') : issue.field;
      if (path) acc[path] = issue.message || 'Invalid value';
      return acc;
    }, {});
  }
}

export function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

/* ----------------------------------------------------- token management --- */

const SESSION_KEY = 'bca_auth_token';
let _authToken = sessionStorage.getItem(SESSION_KEY) || null;

/** Store / clear the raw JWT for Bearer fallback auth. */
export function setAuthToken(token) {
  _authToken = token || null;
  if (token) {
    sessionStorage.setItem(SESSION_KEY, token);
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

/* ------------------------------------------------------------ interceptors --- */

http.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = readCookie(CSRF_COOKIE);
    if (token) config.headers[CSRF_HEADER] = token;
  }
  // Attach Bearer token as fallback for environments where cookies are blocked.
  if (_authToken && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${_authToken}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_CANCELED') return Promise.reject(error);

    const response = error.response;
    if (!response) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      return Promise.reject(
        new ApiError({
          message: offline
            ? 'You appear to be offline. Reconnect and try again.'
            : 'Cannot reach the server. Is the API running?',
          code: 'network_error',
          status: 0,
        })
      );
    }

    const payload = response.data || {};
    const shape = payload.error || {};
    return Promise.reject(
      new ApiError({
        message: shape.message || payload.message || error.message,
        code: shape.code || `http_${response.status}`,
        status: response.status,
        details: shape.details ?? null,
      })
    );
  }
);

/* --------------------------------------------------------------- helpers --- */

/** Unwraps `{ success, data, meta }` into `{ data, meta }`. */
export async function request(config) {
  const response = await http.request(config);
  const body = response.data;
  if (!body || typeof body !== 'object') return { data: body, meta: undefined };
  return { data: body.data, meta: body.meta, status: response.status };
}

export const api = {
  get: (url, config) => request({ ...config, url, method: 'get' }),
  post: (url, data, config) => request({ ...config, url, method: 'post', data }),
  put: (url, data, config) => request({ ...config, url, method: 'put', data }),
  patch: (url, data, config) => request({ ...config, url, method: 'patch', data }),
  delete: (url, config) => request({ ...config, url, method: 'delete' }),
};

/** GET that returns only `data` (most read hooks). */
export async function getData(url, config) {
  const { data } = await api.get(url, config);
  return data;
}

/** GET that returns `{ data, meta }` (paginated lists). */
export const getPage = (url, config) => api.get(url, config);

/** Serialises a params object, dropping empty values so URLs stay tidy. */
export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (!value.length) return;
      search.set(key, value.join(','));
      return;
    }
    if (typeof value === 'boolean') {
      search.set(key, String(value));
      return;
    }
    search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export default api;
