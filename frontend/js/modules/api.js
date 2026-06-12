/**
 * api.js
 * Centralized API module for all backend communication.
 * Uses the Fetch API and returns parsed JSON or throws errors.
 */

const BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "";

const API = `${BASE_URL}/api`;

/**
 * Core fetch wrapper. Throws a descriptive error.
 */
const request = async (path, options = {}) => {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
};

// Auth

export const login = (email, password) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const register = (username, email, password) =>
  request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });

// Applications

export const getApplications = (
  userId,
  { status, search, page, limit, sortBy, sortDir } = {}
) => {
  const params = new URLSearchParams({ userId });
  if (status && status !== "all") params.append("status", status);
  if (search) params.append("search", search);
  if (page) params.append("page", page);
  if (limit) params.append("limit", limit);
  if (sortBy) params.append("sortBy", sortBy);
  if (sortDir) params.append("sortDir", sortDir);
  return request(`/applications?${params}`);
};

export const getMetrics = (userId) =>
  request(`/applications/metrics?${new URLSearchParams({ userId })}`);

export const createApplication = (payload) =>
  request("/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateApplication = (id, payload) =>
  request(`/applications/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteApplication = (id) =>
  request(`/applications/${id}`, { method: "DELETE" });
