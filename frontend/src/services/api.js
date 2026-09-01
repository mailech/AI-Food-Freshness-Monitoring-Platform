const API_BASE = "http://127.0.0.1:8000/api";

export const api = {
  // Auth
  login: async (email, password, role) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      if (!res.ok) throw new Error("Login failed");
      return await res.json();
    } catch (e) {
      // Fallback mock
      return {
        id: "demo-user-1",
        name: email.split("@")[0].replace(".", " ") || "Demo User",
        email,
        role: role || "Food Quality Inspector",
        token: "demo-token"
      };
    }
  },

  register: async (name, email, password, role) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      return await res.json();
    } catch (e) {
      return { id: "demo-user-2", name, email, role, token: "demo-token" };
    }
  },

  // Dashboard
  getDashboard: async () => {
    const res = await fetch(`${API_BASE}/dashboard`);
    if (!res.ok) throw new Error("Failed to fetch dashboard data");
    return await res.json();
  },

  // Foods
  getFoods: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.category && params.category !== "All") query.append("category", params.category);
    if (params.status && params.status !== "All") query.append("status", params.status);
    if (params.search) query.append("search", params.search);
    if (params.sort_by) query.append("sort_by", params.sort_by);

    const res = await fetch(`${API_BASE}/foods?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch foods");
    return await res.json();
  },

  getFoodById: async (id) => {
    const res = await fetch(`${API_BASE}/foods/${id}`);
    if (!res.ok) throw new Error("Failed to fetch food details");
    return await res.json();
  },

  createFood: async (foodData) => {
    const res = await fetch(`${API_BASE}/foods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(foodData),
    });
    if (!res.ok) throw new Error("Failed to create food item");
    return await res.json();
  },

  updateFood: async (id, foodData) => {
    const res = await fetch(`${API_BASE}/foods/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(foodData),
    });
    if (!res.ok) throw new Error("Failed to update food item");
    return await res.json();
  },

  deleteFood: async (id) => {
    const res = await fetch(`${API_BASE}/foods/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete food item");
    return await res.json();
  },

  // AI Analysis
  analyzeFood: async (formData) => {
    const res = await fetch(`${API_BASE}/food/analyze`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("AI Analysis request failed");
    return await res.json();
  },

  // Storage
  getStorageConditions: async () => {
    const res = await fetch(`${API_BASE}/storage`);
    if (!res.ok) throw new Error("Failed to fetch storage conditions");
    return await res.json();
  },

  getStorageTrends: async () => {
    const res = await fetch(`${API_BASE}/storage/trends`);
    if (!res.ok) throw new Error("Failed to fetch storage trends");
    return await res.json();
  },

  // Recommendations
  getRecommendations: async (category = "All", type = "All") => {
    const query = new URLSearchParams();
    if (category && category !== "All") query.append("category", category);
    if (type && type !== "All") query.append("rec_type", type);
    const res = await fetch(`${API_BASE}/recommendations?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch recommendations");
    return await res.json();
  },

  // Alerts
  getAlerts: async (type = "All", unreadOnly = false) => {
    const query = new URLSearchParams();
    if (type && type !== "All") query.append("alert_type", type);
    if (unreadOnly) query.append("unread_only", "true");
    const res = await fetch(`${API_BASE}/alerts?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch alerts");
    return await res.json();
  },

  markAlertRead: async (id) => {
    const res = await fetch(`${API_BASE}/alerts/${id}/read`, { method: "PUT" });
    return await res.json();
  },

  markAllAlertsRead: async () => {
    const res = await fetch(`${API_BASE}/alerts/read-all`, { method: "PUT" });
    return await res.json();
  },

  // Reports
  getReports: async (reportType = "All") => {
    const query = new URLSearchParams();
    if (reportType && reportType !== "All") query.append("report_type", reportType);
    const res = await fetch(`${API_BASE}/reports?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch reports");
    return await res.json();
  },

  generateReport: async (payload) => {
    const res = await fetch(`${API_BASE}/reports/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to generate report");
    return await res.json();
  }
};
