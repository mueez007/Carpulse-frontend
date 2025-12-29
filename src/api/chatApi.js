// src/api/chatApi.js

// 🔴 IMPORTANT: LIVE BACKEND URL (Render)
export const BASE_URL = "https://carpulse-backend-eo6t.onrender.com";

// Agent name used by Google ADK
export const AGENT_NAME = "agent";

/**
 * Helper: parse JSON safely
 * Do NOT throw hard errors for demo UX
 */
async function safeJson(res) {
  if (res.status === 204) return null;

  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * -----------------------------
 * CHAT SESSIONS
 * -----------------------------
 */

/**
 * List chat sessions
 * Demo-safe behavior:
 * - If backend returns 401 / 404 / 500 → return []
 * - No red error banners
 */
export async function listSessions() {
  try {
    const res = await fetch(
      `${BASE_URL}/apps/${AGENT_NAME}/users/user/sessions`,
      { method: "GET" }
    );

    if (!res.ok) {
      // Treat as "no sessions yet"
      return [];
    }

    return (await safeJson(res)) || [];
  } catch (err) {
    // Backend sleeping / network issue
    return [];
  }
}

/**
 * Create a new chat session
 */
export async function createSession() {
  const res = await fetch(
    `${BASE_URL}/apps/${AGENT_NAME}/users/user/sessions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  return safeJson(res);
}

/**
 * Delete a chat session
 */
export async function deleteSession(id) {
  const res = await fetch(
    `${BASE_URL}/apps/${AGENT_NAME}/users/user/sessions/${id}`,
    { method: "DELETE" }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
}

/**
 * Get a single session
 */
export async function getSession(id) {
  const res = await fetch(
    `${BASE_URL}/apps/${AGENT_NAME}/users/user/sessions/${id}`,
    { method: "GET" }
  );

  if (!res.ok) return null;
  return safeJson(res);
}

/**
 * -----------------------------
 * FILE UPLOAD (LOG PROCESSING)
 * -----------------------------
 * Hits:
 * /vehicle_service_logs/api/files/process-file
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${BASE_URL}/vehicle_service_logs/api/files/process-file`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  return safeJson(res);
}

/**
 * -----------------------------
 * CHAT MESSAGE (STREAMING)
 * -----------------------------
 */
export async function sendMessageStream({
  sessionId,
  text,
  inlineData = null,
}) {
  if (!sessionId) throw new Error("No active session id");
  if (!text && !inlineData) throw new Error("Message empty");

  const parts = [];
  if (text && text.trim()) {
    parts.push({ text });
  }
  if (inlineData) {
    parts.push({ inlineData });
  }

  // Extract vehicle ID (same logic as before)
  const vehicleIdMatch = text
    ? text.match(/(?:vehicle\s*id|id)[:\s]*([a-zA-Z0-9-]+)/i)
    : null;

  const payload = {
    appName: AGENT_NAME,
    newMessage: { role: "user", parts },
    sessionId,
    stateDelta: vehicleIdMatch ? { vehicle_id: vehicleIdMatch[1] } : null,
    streaming: false,
    userId: "user",
  };

  const res = await fetch(`${BASE_URL}/run_sse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const textRes = await res.text().catch(() => "");
    throw new Error(textRes || `HTTP ${res.status}`);
  }

  if (!res.body) {
    throw new Error("Streaming not supported in this browser.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const contents = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      line = line.trim();
      if (!line) continue;

      const jsonPart = line.startsWith("data:")
        ? line.slice(5).trim()
        : line;

      try {
        const parsed = JSON.parse(jsonPart);
        if (parsed?.content) {
          contents.push(parsed.content);
        }
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }

  return contents;
}
