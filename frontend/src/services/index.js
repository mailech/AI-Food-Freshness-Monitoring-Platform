/**
 * Thin, typed-ish wrappers around every backend endpoint the UI uses.
 * Components never build URLs or query strings themselves.
 */
import { http } from './apiClient';

const qs = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) value.forEach((v) => v !== '' && search.append(key, v));
    else search.append(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

// ------------------------------------------------------------------ system
export const systemApi = {
  health: () => http.raw('/health'),
  meta: () => http.get('/meta'),
  models: () => http.get('/system/models'),
};

// -------------------------------------------------------------------- auth
export const authApi = {
  register: (payload) => http.post('/auth/register', payload),
  login: (username, password) => http.post('/auth/login', { username, password }),
  googleLogin: (credential) => http.post('/auth/google', { credential }),
  refresh: (refreshToken) => http.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: (refreshToken) => http.post('/auth/logout', { refresh_token: refreshToken }),
  me: () => http.get('/users/me'),
  updateMe: (payload) => http.put('/users/me', payload),
  changePassword: (currentPassword, newPassword) =>
    http.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
  oauthConfig: () => http.get('/auth/oauth/config'),
};

// --------------------------------------------------------------- catalogue
export const catalogueApi = {
  categories: (params) => http.get(`/categories${qs(params)}`),
  category: (slug) => http.get(`/categories/${slug}`),
  products: (params) => http.get(`/products${qs(params)}`),
  product: (id) => http.get(`/products/${id}`),
  createProduct: (payload) => http.post('/products', payload),
  updateProduct: (id, payload) => http.put(`/products/${id}`, payload),
  deleteProduct: (id) => http.delete(`/products/${id}`),
};

// ----------------------------------------------------------------- batches
export const batchApi = {
  list: (params) => http.get(`/batches${qs(params)}`),
  get: (id) => http.get(`/batches/${id}`),
  create: (payload) => http.post('/batches', payload),
  update: (id, payload) => http.put(`/batches/${id}`, payload),
  adjustQuantity: (id, delta, reason) =>
    http.patch(`/batches/${id}/quantity`, { delta, reason }),
  remove: (id, hard = false) => http.delete(`/batches/${id}${qs({ hard })}`),
  assessments: (id, limit = 30) => http.get(`/batches/${id}/assessments${qs({ limit })}`),
  rotation: (params) => http.get(`/batches/rotation${qs(params)}`),
};

// --------------------------------------------------------------- inventory
export const inventoryApi = {
  list: (params) => http.get(`/inventory${qs(params)}`),
  get: (id) => http.get(`/inventory/${id}`),
  create: (payload) => http.post('/inventory', payload),
  update: (id, payload) => http.put(`/inventory/${id}`, payload),
  consume: (id, quantity) => http.post(`/inventory/${id}/consume${qs({ quantity })}`),
  discard: (id, reason) => http.post(`/inventory/${id}/discard${qs({ reason })}`),
  remove: (id) => http.delete(`/inventory/${id}`),
  locations: () => http.get('/inventory/locations'),
  summary: () => http.get('/inventory/summary'),
};

// ------------------------------------------------------------------ images
export const imageApi = {
  config: () => http.get('/images/config'),
  list: (params) => http.get(`/images${qs(params)}`),
  get: (id) => http.get(`/images/${id}`),
  upload: (file, { batchId, caption, onProgress } = {}) => {
    const form = new FormData();
    form.append('file', file);
    if (batchId) form.append('batch_id', String(batchId));
    if (caption) form.append('caption', caption);
    return http.post('/images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  remove: (id) => http.delete(`/images/${id}`),
};

// ---------------------------------------------------------------- analysis
export const analysisApi = {
  /** One-shot: upload the image and run the full pipeline. */
  analyzeImage: ({ file, batchId, temperature, humidity, airCirculation, lightExposure,
                   packaging, storageDurationDays, notes, onProgress }) => {
    const form = new FormData();
    if (file) form.append('file', file);
    form.append('batch_id', String(batchId));
    if (temperature !== undefined && temperature !== null && temperature !== '')
      form.append('temperature_c', String(temperature));
    if (humidity !== undefined && humidity !== null && humidity !== '')
      form.append('humidity_pct', String(humidity));
    if (airCirculation) form.append('air_circulation', airCirculation);
    if (lightExposure) form.append('light_exposure', lightExposure);
    if (packaging) form.append('packaging_type', packaging);
    if (storageDurationDays !== undefined && storageDurationDays !== null && storageDurationDays !== '')
      form.append('storage_duration_days', String(storageDurationDays));
    if (notes) form.append('notes', notes);

    return http.post('/analysis/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  runOnExisting: (payload) => http.post('/analysis/run', payload),
  get: (id) => http.get(`/analysis/${id}`),
  recent: (params) => http.get(`/analysis${qs(params)}`),
  freshness: (batchId) => http.get(`/freshness/${batchId}`),
  freshnessTrend: (batchId) => http.get(`/freshness/${batchId}/trend`),
  shelfLife: (batchId, refresh = false) => http.get(`/shelf-life/${batchId}${qs({ refresh })}`),
  shelfLifeProjection: (batchId, days = 14) => http.get(`/shelf-life/${batchId}/projection${qs({ days })}`),
};

// ----------------------------------------------------------------- storage
export const storageApi = {
  overview: (params) => http.get(`/storage/overview${qs(params)}`),
  locations: () => http.get('/storage/locations'),
  trends: (params) => http.get(`/storage/trends${qs(params)}`),
  readings: (params) => http.get(`/storage/readings${qs(params)}`),
  createReading: (payload) => http.post('/storage/readings', payload),
  batch: (batchId) => http.get(`/storage/${batchId}`),
  updateBatch: (batchId, payload) => http.put(`/storage/${batchId}`, payload),
  sensorProvider: () => http.get('/storage/sensors/provider'),
  readSensors: () => http.get('/storage/sensors/read'),
  ingestSensors: () => http.post('/storage/sensors/ingest'),
};

// --------------------------------------------------------- recommendations
export const recommendationApi = {
  forBatch: (batchId, params) => http.get(`/recommendations/${batchId}${qs(params)}`),
  acknowledge: (id) => http.post(`/recommendations/${id}/acknowledge`),
  engineInfo: () => http.get('/recommendations/rules'),
};

// ------------------------------------------------------------------ alerts
export const alertApi = {
  list: (params) => http.get(`/alerts${qs(params)}`),
  summary: () => http.get('/alerts/summary'),
  types: () => http.get('/alerts/types'),
  get: (id) => http.get(`/alerts/${id}`),
  update: (id, payload) => http.patch(`/alerts/${id}`, payload),
  markAllRead: () => http.post('/alerts/read-all'),
  scan: () => http.post('/alerts/scan'),
};

// ----------------------------------------------------------- notifications
export const notificationApi = {
  list: (params) => http.get(`/notifications${qs(params)}`),
  unreadCount: () => http.get('/notifications/unread-count'),
  markRead: (id) => http.patch(`/notifications/${id}/read`),
  markAllRead: () => http.post('/notifications/read-all'),
  remove: (id) => http.delete(`/notifications/${id}`),
  broadcast: (payload) => http.post('/notifications/broadcast', payload),
};

// --------------------------------------------------------------- analytics
export const analyticsApi = {
  dashboard: () => http.get('/analytics/dashboard'),
  full: (days = 30) => http.get(`/analytics${qs({ days })}`),
  freshnessDistribution: () => http.get('/analytics/freshness-distribution'),
  freshnessTrend: (days = 30) => http.get(`/analytics/freshness-trend${qs({ days })}`),
  spoilage: () => http.get('/analytics/spoilage'),
  shelfLifeDistribution: () => http.get('/analytics/shelf-life-distribution'),
  inventoryHealth: () => http.get('/analytics/inventory-health'),
  categoryQuality: () => http.get('/analytics/category-quality'),
  wasteRisk: () => http.get('/analytics/waste-risk'),
  storageCompliance: () => http.get('/analytics/storage-compliance'),
  environmentTrends: (days = 14) => http.get(`/analytics/environment-trends${qs({ days })}`),
  alertTrends: (days = 30) => http.get(`/analytics/alert-trends${qs({ days })}`),
  indicators: (days = 30) => http.get(`/analytics/indicators${qs({ days })}`),
  inspectionQueue: (limit = 20) => http.get(`/analytics/inspection-queue${qs({ limit })}`),
  platform: () => http.get('/analytics/platform'),
};

// ----------------------------------------------------------------- reports
const REPORT_PATHS = {
  FRESHNESS: 'freshness',
  SHELF_LIFE: 'shelf-life',
  INVENTORY_QUALITY: 'inventory',
  WASTE_REDUCTION: 'waste-reduction',
  STORAGE_COMPLIANCE: 'storage-compliance',
};

export const reportApi = {
  types: () => http.get('/reports/types'),
  list: (params) => http.get(`/reports${qs(params)}`),
  get: (id) => http.get(`/reports/${id}`),
  generate: (reportType, payload) => {
    const path = REPORT_PATHS[reportType];
    if (!path) throw new Error(`Unknown report type: ${reportType}`);
    return http.post(`/reports/${path}`, payload);
  },
  download: (id) => http.blob(`/reports/${id}/download`),
  remove: (id) => http.delete(`/reports/${id}`),
  paths: REPORT_PATHS,
};

// ------------------------------------------------------------------- admin
export const adminApi = {
  roles: () => http.get('/admin/roles'),
  users: (params) => http.get(`/admin/users${qs(params)}`),
  user: (id) => http.get(`/admin/users/${id}`),
  createUser: (payload) => http.post('/admin/users', payload),
  updateUser: (id, payload) => http.put(`/admin/users/${id}`, payload),
  resetPassword: (id, newPassword) =>
    http.post(`/admin/users/${id}/password`, { new_password: newPassword }),
  deactivateUser: (id, hard = false) => http.delete(`/admin/users/${id}${qs({ hard })}`),
  auditLogs: (params) => http.get(`/admin/audit-logs${qs(params)}`),
  auditActions: () => http.get('/admin/audit-logs/actions'),
  settings: () => http.get('/admin/system/settings'),
  health: () => http.get('/admin/system/health'),
  errors: (limit = 25) => http.get(`/admin/system/errors${qs({ limit })}`),
  roleMatrix: () => http.get('/admin/system/role-matrix'),
  reloadModels: () => http.post('/admin/system/reload-models'),
};

/** Trigger a browser download from a Blob response. */
export function downloadBlob(response, fallbackName = 'report') {
  const disposition = response.headers?.['content-disposition'] || '';
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match ? match[1] : fallbackName;

  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
