// src/api/logsApi.js
// Uses the shared apiRequest helper and FastAPI's /vehicle_service_logs routes

import { apiRequest } from "./apiClient";

// GET /vehicle_service_logs/
export function getAllLogs(token) {
  return apiRequest("/vehicle_service_logs/", {
    method: "GET",
    token,
  });
}

// POST /vehicle_service_logs/
export function createLog(logData, token) {
  return apiRequest("/vehicle_service_logs/", {
    method: "POST",
    body: logData,
    token,
  });
}

// PUT /vehicle_service_logs/{id}
export function updateLog(id, logData, token) {
  return apiRequest(`/vehicle_service_logs/${id}`, {
    method: "PUT",
    body: logData,
    token,
  });
}

// DELETE /vehicle_service_logs/{id}
export function deleteLog(id, token) {
  return apiRequest(`/vehicle_service_logs/${id}`, {
    method: "DELETE",
    token,
  });
}

// GET /vehicle_service_logs/api/mechanics/
export function getMechanics(token) {
  return apiRequest("/vehicle_service_logs/api/mechanics/", {
    method: "GET",
    token,
  });
}
