// src/api/authApi.js

import { apiRequest } from "./apiClient";

export async function loginRequest(email, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: {
      email,
      password,
    },
  });
}

export async function registerRequest(email, password, fullName) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: {
      email,
      password,
      full_name: fullName,
    },
  });
}

export async function fetchCurrentUser(token) {
  return apiRequest("/auth/me", {
    method: "GET",
    token,
  });
}
