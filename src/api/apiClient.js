// src/api/apiClient.js

const BASE_URL = "https://carpulse-backend-eo6t.onrender.com"; // FastAPI backend

// Helper to build full URL from a relative path
export function buildURL(path) {
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  return `${BASE_URL}${path}`;
}

// Generic API request helper
export async function apiRequest(
  endpoint,
  { method = "GET", body = null, token = null } = {}
) {
  const url = buildURL(endpoint);

  const headers = {};

  // Add JSON header only if not FormData
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Add token if provided
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
    body: body
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined,
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      let msg = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        msg = errorData.detail || errorData.message || msg;
      } catch (_) {
        // ignore JSON parse error, keep generic message
      }
      throw new Error(msg);
    }

    // No content
    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    console.error("API ERROR:", error);
    throw error;
  }
}

// Convenience wrappers (optional, but handy)
export function apiGet(endpoint, token) {
  return apiRequest(endpoint, { method: "GET", token });
}

export function apiPost(endpoint, body, token) {
  return apiRequest(endpoint, { method: "POST", body, token });
}

export function apiPut(endpoint, body, token) {
  return apiRequest(endpoint, { method: "PUT", body, token });
}

export function apiDelete(endpoint, token) {
  return apiRequest(endpoint, { method: "DELETE", token });
}
