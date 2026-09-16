/**
 * Axios instance for the platform API.
 *
 * Responsibilities:
 *  - attach the bearer access token
 *  - transparently refresh an expired access token once, then replay the request
 *  - normalise the backend's `{success:false, error:{code,message}}` envelope
 *    into a predictable `ApiError` so UI code never parses raw responses
 */
import axios from 'axios';

const STORAGE_KEY = 'ffm.auth';

export const TOKEN_STORAGE_KEY = STORAGE_KEY;

/** Normalised error the whole UI can rely on. */
export class ApiError extends Error {
  constructor({ message, code, status, details, fields }) {
    super(message);
    this.name = 'ApiError';
    this.code = code || 'UNKNOWN_ERROR';
    this.status = status ?? 0;
    this.details = details || null;
    this.fields = fields || null;
  }

  /** True when the user should be sent back to the login screen. */
  get isAuthError() {
    return this.status === 401;
  }

  get isPermissionError() {
    return this.status === 403;
  }

  get isValidationError() {
    return this.status === 422 || this.code === 'VALIDATION_ERROR';
  }
}

// ---------------------------------------------------------------- storage
export function readAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeAuth(payload) {
  try {
    if (payload) localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode) - the session simply won't persist */
  }
}

export function clearAuth() {
  writeAuth(null);
}

// ----------------------------------------------------------------- client
const baseURL = import.meta.env.VITE_API_BASE_URL || '';

export const api = axios.create({
  baseURL,
  timeout: 60000, // image analysis can legitimately take a few seconds
  headers: { Accept: 'application/json' },
});

export const API_PREFIX = '/api/v1';

api.interceptors.request.use((config) => {
  const auth = readAuth();
  if (auth?.accessToken && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

// --- single-flight refresh -------------------------------------------------
let refreshPromise = null;
let onUnauthorized = null;

/** Registered by AuthContext so the client can force a logout. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function refreshAccessToken() {
  const auth = readAuth();
  if (!auth?.refreshToken) throw new Error('no refresh token');

  const response = await axios.post(
    `${baseURL}${API_PREFIX}/auth/refresh`,
    { refresh_token: auth.refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  const tokens = response.data;
  const next = {
    ...auth,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expires_at,
  };
  writeAuth(next);
  return next.accessToken;
}

function toApiError(error) {
  const status = error.response?.status ?? 0;
  const body = error.response?.data;

  if (body && typeof body === 'object' && body.error) {
    return new ApiError({
      message: body.error.message || 'The request failed.',
      code: body.error.code,
      status,
      details: body.error.details,
      fields: body.error.details?.fields || null,
    });
  }
  // FastAPI default shape, or a non-JSON body.
  if (body && typeof body === 'object' && body.detail) {
    return new ApiError({
      message: typeof body.detail === 'string' ? body.detail : 'The request failed.',
      code: 'HTTP_ERROR',
      status,
    });
  }
  if (error.code === 'ECONNABORTED') {
    return new ApiError({
      message: 'The request timed out. The server may be busy - please try again.',
      code: 'TIMEOUT',
      status: 0,
    });
  }
  if (!error.response) {
    return new ApiError({
      message:
        'Cannot reach the API. Check that the backend is running and reachable.',
      code: 'NETWORK_ERROR',
      status: 0,
    });
  }
  return new ApiError({
    message: error.message || 'An unexpected error occurred.',
    code: 'UNKNOWN_ERROR',
    status,
  });
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;
    const isRefreshCall = config.url?.includes('/auth/refresh');
    const isLoginCall =
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/register') ||
      config.url?.includes('/auth/google');

    if (status === 401 && !config._retried && !isRefreshCall && !isLoginCall) {
      config._retried = true;
      try {
        refreshPromise = refreshPromise || refreshAccessToken();
        const token = await refreshPromise;
        refreshPromise = null;
        config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
        return api.request(config);
      } catch {
        refreshPromise = null;
        clearAuth();
        if (onUnauthorized) onUnauthorized();
      }
    }

    return Promise.reject(toApiError(error));
  },
);

// -------------------------------------------------------------- shortcuts
export const http = {
  get: (url, config) => api.get(`${API_PREFIX}${url}`, config).then((r) => r.data),
  post: (url, data, config) => api.post(`${API_PREFIX}${url}`, data, config).then((r) => r.data),
  put: (url, data, config) => api.put(`${API_PREFIX}${url}`, data, config).then((r) => r.data),
  patch: (url, data, config) => api.patch(`${API_PREFIX}${url}`, data, config).then((r) => r.data),
  delete: (url, config) => api.delete(`${API_PREFIX}${url}`, config).then((r) => r.data),
  /** Raw call outside the /api/v1 prefix (e.g. /health). */
  raw: (url, config) => api.get(url, config).then((r) => r.data),
  /** Binary download that returns a Blob. */
  blob: (url, config) =>
    api.get(`${API_PREFIX}${url}`, { ...config, responseType: 'blob' }),
};

/** Absolute URL for an API-served asset (images, overlays). */
export function assetUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${baseURL}${pathOrUrl}`;
}

/**
 * Fetch a protected image and return an object URL.
 * Image endpoints require the bearer token, so a plain <img src> would 401.
 */
export async function fetchImageObjectUrl(path) {
  if (!path) return null;
  const response = await api.get(path, { responseType: 'blob' });
  return URL.createObjectURL(response.data);
}
