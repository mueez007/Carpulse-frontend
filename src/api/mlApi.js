import { apiPost } from "./apiClient";

export function estimateServiceCost(token, body) {
  return apiPost("/vehicle_service_logs/estimate-cost", body, token);
}
