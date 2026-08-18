// Small wrapper around fetch so we don't repeat auth headers / error
// handling everywhere. Nothing fancy - swap for axios later if it grows.

const TOKEN_KEY = "ffp_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, isFormData = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isFormData && body) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (!res.ok) {
    let detail = "Something went wrong";
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // response wasn't JSON, ignore
    }
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  me: () => request("/auth/me"),

  listFoodItems: (category) =>
    request(`/food-items${category ? `?category=${category}` : ""}`),
  getFoodItem: (id) => request(`/food-items/${id}`),
  createFoodItem: (formData) =>
    request("/food-items", { method: "POST", body: formData, isFormData: true }),
  rescanFoodItem: (id) => request(`/food-items/${id}/rescan`, { method: "POST" }),
  deleteFoodItem: (id) => request(`/food-items/${id}`, { method: "DELETE" }),
  dashboardStats: () => request("/food-items/stats/dashboard"),
};
