const API_BASE = '/api';

export const api = {
  // Auth
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  async register(data) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  async getMe(token) {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  },

  // Users (Admin)
  async getUsers(token) {
    const res = await fetch(`${API_BASE}/users/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },

  async updateUser(userId, data, token) {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Inventory & Batches
  async getCategories() {
    const res = await fetch(`${API_BASE}/inventory/categories`);
    return res.json();
  },

  async getInventory(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/inventory/items?${query}`);
    return res.json();
  },

  async createInventoryItem(data, token) {
    const res = await fetch(`${API_BASE}/inventory/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getItemDetail(itemId) {
    const res = await fetch(`${API_BASE}/inventory/items/${itemId}`);
    return res.json();
  },

  async updateItem(itemId, data, token) {
    const res = await fetch(`${API_BASE}/inventory/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteItem(itemId, token) {
    const res = await fetch(`${API_BASE}/inventory/items/${itemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  },

  async getBatches(status = '') {
    const url = status ? `${API_BASE}/inventory/batches?inspection_status=${status}` : `${API_BASE}/inventory/batches`;
    const res = await fetch(url);
    return res.json();
  },

  async createBatch(data, token) {
    const res = await fetch(`${API_BASE}/inventory/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateBatch(batchId, data, token) {
    const res = await fetch(`${API_BASE}/inventory/batches/${batchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Storage & Telemetry
  async getStorageLocations() {
    const res = await fetch(`${API_BASE}/storage/locations`);
    return res.json();
  },

  async simulateTelemetry(data, token) {
    const res = await fetch(`${API_BASE}/storage/simulate-telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getReadings(locationId) {
    const res = await fetch(`${API_BASE}/storage/readings/${locationId}`);
    return res.json();
  },

  // ML Vision & Scanning
  async getModelInfo() {
    const res = await fetch(`${API_BASE}/ml/model-info`);
    return res.json();
  },

  async getSampleImages() {
    const res = await fetch(`${API_BASE}/ml/sample-images`);
    return res.json();
  },

  async scanImage(formData, token) {
    const res = await fetch(`${API_BASE}/ml/scan-image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Scan failed' }));
      throw new Error(err.detail || 'Scan failed');
    }
    return res.json();
  },

  // Freshness & Trends
  async getFreshnessTrend(itemId) {
    const res = await fetch(`${API_BASE}/freshness/trends/${itemId}`);
    return res.json();
  },

  async assessFreshness(data) {
    const res = await fetch(`${API_BASE}/freshness/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Shelf Life
  async predictShelfLife(data) {
    const res = await fetch(`${API_BASE}/shelf-life/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Recommendations
  async getRecommendations(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/recommendations/?${query}`);
    return res.json();
  },

  async actionRecommendation(recId, token) {
    const res = await fetch(`${API_BASE}/recommendations/${recId}/action`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },

  // Alerts
  async getAlerts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/alerts/?${query}`);
    return res.json();
  },

  async getAlertSummary() {
    const res = await fetch(`${API_BASE}/alerts/summary`);
    return res.json();
  },

  async markAlertRead(alertId, token) {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/read`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },

  async resolveAlert(alertId, token) {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },

  async markAllAlertsRead(token) {
    const res = await fetch(`${API_BASE}/alerts/mark-all-read`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },

  // Analytics
  async getDashboardMetrics(role = 'retail_manager') {
    const res = await fetch(`${API_BASE}/analytics/dashboard/${role}`);
    return res.json();
  },

  // Reports
  async getReportsSummary() {
    const res = await fetch(`${API_BASE}/reports/summary`);
    return res.json();
  },

  getExportPdfUrl(category = '') {
    return category ? `${API_BASE}/reports/export/pdf?category=${category}` : `${API_BASE}/reports/export/pdf`;
  },

  getExportExcelUrl() {
    return `${API_BASE}/reports/export/excel`;
  },

  getExportCsvUrl() {
    return `${API_BASE}/reports/export/csv`;
  },

  // Audit Logs
  async getAuditLogs(token) {
    const res = await fetch(`${API_BASE}/audit/logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  }
};
