// src/pages/ChatPage.jsx
import { useEffect, useState } from "react";
import {
  listSessions,
  createSession,
  deleteSession,
  getSession,
  sendMessageStream,
  uploadFile,
  BASE_URL,
} from "../api/chatApi";

function mapEventsToMessages(events = []) {
  const msgs = [];
  for (const ev of events) {
    const content = ev.content;
    if (!content) continue;
    const role = content.role || "model";
    const parts = content.parts || [];

    const text = parts
      .map((p) => p.text || "")
      .join(" ")
      .trim();

    const attachments = parts
      .filter((p) => p.inlineData)
      .map((p) => p.inlineData);

    if (!text && attachments.length === 0) continue;

    msgs.push({ role, text, attachments });
  }
  return msgs;
}

function isExcelLike(file) {
  if (!file) return false;
  const t = file.type || "";
  const name = file.name || "";
  return (
    t.includes("excel") ||
    t.includes("spreadsheet") ||
    t.includes("csv") ||
    name.toLowerCase().endsWith(".xlsx") ||
    name.toLowerCase().endsWith(".xls") ||
    name.toLowerCase().endsWith(".csv")
  );
}

async function fileToInlineData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result; // data URL
      const base64 = String(result).split(",")[1] || "";
      resolve({
        data: base64,
        displayName: file.name,
        mimeType: file.type || "application/octet-stream",
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
// imports...

function ChatMessageText({ text }) {
  if (!text) return null;

  // Detect URLs like: /service_images/xxxxx.png
  const imageRegex = /\/service_images\/\S+\.(png|jpg|jpeg|gif|webp)/gi;
  const matches = text.match(imageRegex) || [];

  // Remove URLs from plain text so they don’t show as raw strings
  const cleanedText = text.replace(imageRegex, "").trim();

  const toAbsoluteUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    // path like /service_images/xxx.png
    return `${BASE_URL}${path}`;
  };

  return (
    <div className="chat-bubble-text">
      {cleanedText && <p>{cleanedText}</p>}

      {matches.length > 0 && (
        <div className="chat-inline-images">
          {matches.map((src, idx) => (
            <img
              key={idx}
              src={toAbsoluteUrl(src)}
              alt={`Service Image ${idx + 1}`}
              className="chat-inline-image"
            />
          ))}
        </div>
      )}
    </div>
  );
}


export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [currentFile, setCurrentFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const [recognition, setRecognition] = useState(null);
  const [isListening, setIsListening] = useState(false);

  // Load sessions + first session
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const sess = await listSessions();
        if (cancelled) return;

        setSessions(sess || []);

        if (sess && sess.length > 0) {
          const firstId = sess[0].id;
          setActiveSessionId(firstId);
          const full = await getSession(firstId);
          if (!cancelled) {
            setMessages(mapEventsToMessages(full.events));
          }
        }
      } catch (err) {
        console.error("Failed to load sessions:", err);
        if (!cancelled) setErrorMsg("Failed to load chat sessions.");
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // Init voice recognition
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      (!("webkitSpeechRecognition" in window) &&
        !("SpeechRecognition" in window))
    ) {
      return;
    }

    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) =>
        prev ? `${prev.trim()} ${transcript}` : transcript
      );
      setIsListening(false);
    };

    rec.onerror = () => {
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    setRecognition(rec);
  }, []);

  async function handleSelectSession(id) {
    if (id === activeSessionId) return;
    setActiveSessionId(id);
    setMessages([]);
    setErrorMsg("");

    try {
      const full = await getSession(id);
      setMessages(mapEventsToMessages(full.events));
    } catch (err) {
      console.error("Failed to load session:", err);
      setErrorMsg("Failed to load this session.");
    }
  }

  async function handleNewSession() {
    setErrorMsg("");
    try {
      const session = await createSession();
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
    } catch (err) {
      console.error("Failed to create session:", err);
      setErrorMsg("Failed to create a new session.");
    }
  }

  async function handleDeleteSession(id, e) {
    e.stopPropagation();
    setErrorMsg("");
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));

      if (id === activeSessionId) {
        const remaining = sessions.filter((s) => s.id !== id);
        if (remaining.length > 0) {
          const newId = remaining[0].id;
          setActiveSessionId(newId);
          const full = await getSession(newId);
          setMessages(mapEventsToMessages(full.events));
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
      setErrorMsg("Failed to delete session.");
    }
  }

  function handleVoiceClick() {
    if (!recognition) return;
    setIsListening(true);
    recognition.start();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFilePreview({
          type: "image",
          src: ev.target?.result,
          name: file.name,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview({
        type: "file",
        name: file.name,
      });
    }

    // Excel / CSV → auto process via backend
    if (isExcelLike(file)) {
      processAndSendFile(file);
    }
  }

  function clearFile() {
    setCurrentFile(null);
    setFilePreview(null);
  }

  async function processAndSendFile(file) {
    try {
      setLoading(true);
      setErrorMsg("");
      const result = await uploadFile(file);

      if (!result) {
        throw new Error("Empty response from file processor");
      }

      const message = `I've uploaded a file: ${result.filename}\n\n${result.content}\n\nPlease analyze this service data and help me add it to the system.`;

      await sendUserMessage(message, null);
      clearFile();
    } catch (err) {
      console.error("File processing error:", err);
      setErrorMsg("Failed to process file.");
    } finally {
      setLoading(false);
    }
  }

  async function sendUserMessage(text, fileForInline) {
    if (!activeSessionId) {
      setErrorMsg("No active session.");
      return;
    }
    if (!text && !fileForInline) return;

    const userMessage = {
      role: "user",
      text: text || (fileForInline ? `Sent file: ${fileForInline.name}` : ""),
      attachments: fileForInline
        ? [
            {
              displayName: fileForInline.name,
              mimeType: fileForInline.type,
            },
          ]
        : [],
    };

    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);
    setErrorMsg("");

    try {
      let inlineData = null;
      if (fileForInline && !isExcelLike(fileForInline)) {
        inlineData = await fileToInlineData(fileForInline);
      }

      const contents = await sendMessageStream({
        sessionId: activeSessionId,
        text,
        inlineData,
      });

      const replyText = contents
        .flatMap((c) => c.parts || [])
        .map((p) => p.text || "")
        .join(" ")
        .trim();

      const replyAttachments = contents
        .flatMap((c) => c.parts || [])
        .filter((p) => p.inlineData)
        .map((p) => p.inlineData);

      if (replyText || replyAttachments.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: replyText || "[No text response]",
            attachments: replyAttachments,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: "No response content from agent.",
            attachments: [],
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Error talking to agent. Check backend logs.",
          attachments: [],
        },
      ]);
      setErrorMsg("Chat request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text && !currentFile) return;

    // If file is excel-like, it's already processed via processAndSendFile
    const nonExcelFile =
      currentFile && isExcelLike(currentFile) ? null : currentFile;

    setInput("");

    await sendUserMessage(text, nonExcelFile);

    if (nonExcelFile) {
      clearFile();
    }
  }

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div>
            <h3>Agent Sessions</h3>
            <p>Each session keeps its own service context.</p>
          </div>
          <button
            type="button"
            className="btn-primary btn-small"
            onClick={handleNewSession}
          >
            + New
          </button>
        </div>

        <div className="chat-sessions-list">
          {sessions.length === 0 ? (
            <div className="chat-sessions-empty">
              No sessions yet. Create one to start.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={
                  "chat-session-item" +
                  (s.id === activeSessionId ? " active" : "")
                }
                onClick={() => handleSelectSession(s.id)}
              >
                <div className="chat-session-id" title={s.id}>
                  {s.id}
                </div>
                <button
                  type="button"
                  className="chat-session-delete"
                  onClick={(e) => handleDeleteSession(s.id, e)}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat panel */}
      <section className="chat-main">
        {errorMsg && <div className="chat-banner-error">{errorMsg}</div>}

        <div className="chat-messages">
         {messages.length === 0 ? (
  <div className="chat-empty">
    <h4>Start a conversation</h4>
    <p>
      Ask the agent to analyze logs, detect anomalies, or help you 
      record new service entries.
    </p>
  </div>
) : (
  messages.map((m, idx) => (
    <div
      key={idx}
      className={
        "chat-message-row chat-message-" +
        (m.role === "user" ? "user" : "model")
      }
    >
      <div className="chat-avatar">
        {m.role === "user" ? "You" : "AI"}
      </div>

      <div className="chat-bubble">
        {/* ✅ TEXT + IMAGES */}
        {m.text && <ChatMessageText text={m.text} />}

        {/* ✅ ATTACHMENTS */}
        {m.attachments &&
          m.attachments.map((att, i) => {
            const mime = att.mimeType || "";
            const name = att.displayName || att.name || "attachment";
            return (
              <div key={i} className="chat-attachment-chip">
                📎 {name}
              </div>
            );
          })}
      </div>
    </div>
  ))
)}

        </div>

        {filePreview && (
          <div className="chat-file-preview">
            <div className="chat-file-preview-inner">
              {filePreview.type === "image" ? (
                <img
                  src={filePreview.src}
                  alt={filePreview.name}
                  className="chat-file-preview-image"
                />
              ) : (
                <div className="chat-file-preview-icon">
                  📄 {filePreview.name}
                </div>
              )}
              <button
                type="button"
                className="chat-file-preview-remove"
                onClick={clearFile}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <form className="chat-input-row" onSubmit={handleSubmit}>
          <div className="chat-input-shell">
            <label className="chat-file-button">
              📎
              <input
                type="file"
                onChange={handleFileChange}
                hidden
              />
            </label>
            <button
              type="button"
              className={
                "chat-voice-button" +
                (isListening ? " listening" : "")
              }
              onClick={handleVoiceClick}
              disabled={!recognition}
            >
              🎙
            </button>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              className="chat-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !activeSessionId}
            className="btn-primary"
          >
            {loading ? "Sending…" : "Send"}
          </button>
        </form>
      </section>
    </div>
  );
}
