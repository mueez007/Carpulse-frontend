// src/api/chatApi.js

// src/pages/ChatPage.jsx
export const BASE_URL = "http://127.0.0.1:8080";
export const AGENT_NAME = "agent";

async function jsonOrThrow(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Chat API error:", res.status, text);
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function listSessions() {
  const res = await fetch(
    `${BASE_URL}/apps/${AGENT_NAME}/users/user/sessions`,
    {
      method: "GET",
    }
  );
  return jsonOrThrow(res);
}

export async function createSession() {
  const res = await fetch(
    `${BASE_URL}/apps/${AGENT_NAME}/users/user/sessions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }
  );
  return jsonOrThrow(res);
}

export async function deleteSession(id) {
  const res = await fetch(
    `${BASE_URL}/apps/${AGENT_NAME}/users/user/sessions/${id}`,
    {
      method: "DELETE",
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
}

export async function getSession(id) {
  const res = await fetch(
    `${BASE_URL}/apps/${AGENT_NAME}/users/user/sessions/${id}`,
    {
      method: "GET",
    }
  );
  return jsonOrThrow(res);
}

/**
 * Upload Excel/CSV to backend file processor.
 * This hits: /vehicle_service_logs/api/files/process-file
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

  return jsonOrThrow(res);
}

/**
 * Send message to agent with optional inlineData attachment.
 * inlineData must be: { data, mimeType, displayName }
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

  // Vehicle id extraction like your old code
  const vehicleIdMatch = text
    ? text.match(/(?:vehicle\s*id|id)[:\s]*([a-zA-Z0-9-]+)/i)
    : null;
  const vehicleId = vehicleIdMatch ? vehicleIdMatch[1] : null;

  const payload = {
    appName: AGENT_NAME,
    newMessage: { role: "user", parts },
    sessionId,
    stateDelta: vehicleId ? { vehicle_id: vehicleId } : null,
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
    console.error("run_sse error:", res.status, textRes);
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
        if (parsed && parsed.content) {
          contents.push(parsed.content);
        }
      } catch {
        console.warn("Failed to parse SSE chunk:", line);
      }
    }
  }

  return contents;
}
