"use client";

import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  BookOpen,
  Layers,
  Plus,
  Trash2,
  History,
  Clock,
  ChevronRight,
  Filter,
} from "lucide-react";

type ReportIndexItem = { id: string; title: string; course: string; chapter?: string };
type Message = { role: "user" | "assistant"; content: string; timestamp: Date };
type ChatSession = {
  id: string;
  title: string;
  lessonIds: string[];
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

function ChatContent() {
  const searchParams = useSearchParams();
  const queryLesson = searchParams.get("lesson");

  const [lessonId, setLessonId] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reports, setReports] = useState<ReportIndexItem[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Sessions & History state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<"current" | "all">("current");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load list of reports/lessons
  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((items: ReportIndexItem[]) => {
        if (Array.isArray(items)) {
          setReports(items);
          if (queryLesson && items.some((item) => item.id === queryLesson)) {
            setLessonId(queryLesson);
          } else if (items.length > 0) {
            setLessonId((prev) => prev || items[0].id);
          }
        }
      })
      .catch(() => setError("ไม่สามารถดึงข้อมูลบทเรียนได้"));
  }, [queryLesson]);

  // Load chat sessions
  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const res = await fetch("/api/ai/chat/sessions");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSessions(data);
        }
      }
    } catch {
      // Ignore silently
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const activeLesson = reports.find((r) => r.id === lessonId);

  // Filter sessions based on "current lesson" vs "all"
  const filteredSessions = useMemo(() => {
    if (sessionFilter === "all") return sessions;
    if (!lessonId) return sessions;
    return sessions.filter((s) => Array.isArray(s.lessonIds) && s.lessonIds.includes(lessonId));
  }, [sessions, sessionFilter, lessonId]);

  // Select an existing chat session from history
  async function handleSelectSession(sessionId: string) {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ai/chat/sessions?id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.session && Array.isArray(data.messages)) {
          setActiveSessionId(data.session.id);
          if (data.session.lessonIds?.[0] && data.session.lessonIds[0] !== lessonId) {
            setLessonId(data.session.lessonIds[0]);
          }
          setMessages(
            data.messages.map((m: any) => ({
              role: m.role,
              content: m.content,
              timestamp: new Date(m.createdAt),
            }))
          );
        }
      }
    } catch {
      setError("ไม่สามารถโหลดประวัติการสนทนานี้ได้");
    } finally {
      setLoading(false);
    }
  }

  // Start a new chat
  function handleNewChat() {
    setActiveSessionId(null);
    setMessages([]);
    setError("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  // Delete a chat session
  async function handleDeleteSession(sessionIdToDelete: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!confirm("คุณต้องการลบบทสนทนานี้หรือไม่?")) return;

    try {
      const res = await fetch(`/api/ai/chat/sessions?id=${sessionIdToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionIdToDelete));
        if (activeSessionId === sessionIdToDelete) {
          handleNewChat();
        }
      }
    } catch {
      alert("ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  const quickPrompts = [
    "สรุป 3 ประเด็นสำคัญที่สุดของบทเรียนนี้",
    "อธิบายคำศัพท์และแนวคิดหลักในบทนี้",
    "ช่วยยกตัวอย่างการนำไปใช้จริงให้เห็นภาพ",
    "มีข้อควรระวังหรือจุดที่มักเข้าใจผิดอะไรบ้าง?",
  ];

  async function handleSend(textToSend?: string) {
    const text = textToSend || inputMessage;
    if (!text.trim() || !lessonId || loading) return;

    const newMsg: Message = { role: "user", content: text.trim(), timestamp: new Date() };
    const nextHistory = [...messages, newMsg];
    setMessages(nextHistory);
    setInputMessage("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonIds: [lessonId],
          message: text.trim(),
          sessionId: activeSessionId || undefined,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "ไม่สามารถรับคำตอบได้ กรุณาลองใหม่");
      } else {
        setMessages([
          ...nextHistory,
          { role: "assistant", content: data.answer ?? "ไม่มีคำตอบ", timestamp: new Date() },
        ]);
        if (data.sessionId) {
          setActiveSessionId(data.sessionId);
          loadSessions();
        }
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function copyToClipboard(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <section className="page-header" style={{ marginBottom: "var(--space-md)" }}>
        <div className="eyebrow">
          <span>AI Research Assistant</span>
        </div>
        <h1>สนทนากับเนื้อหาบทเรียน</h1>
        <p className="description">
          ถามคำถาม เจาะลึกประเด็นที่สงสัย พร้อมบันทึกประวัติการสนทนาแยกตามแต่ละบทเรียน
        </p>
      </section>

      {/* Main Grid Layout: Sidebar + Chat Thread */}
      <div className="chat-layout">
        {/* Left Sidebar: Lesson Selector & Chat History */}
        <aside className="chat-sidebar">
          {/* New Chat Action Button */}
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", gap: "8px" }}
            onClick={handleNewChat}
          >
            <Plus size={16} />
            <span>สร้างแชทใหม่ (+ New Chat)</span>
          </button>

          {/* Lesson Selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label className="form-label" style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: 0 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <BookOpen size={13} />
                เลือกบทเรียนที่ต้องการถาม
              </span>
            </label>
            <select
              className="form-select"
              style={{ padding: "8px 12px", fontSize: "var(--text-xs)" }}
              value={lessonId}
              onChange={(e) => {
                const newId = e.target.value;
                setLessonId(newId);
                handleNewChat();
              }}
            >
              {reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.title} ({report.course})
                </option>
              ))}
            </select>
          </div>

          {/* History Header & Tabs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-pink-text)", display: "flex", alignItems: "center", gap: "4px" }}>
                <History size={13} />
                <span>ประวัติการสนทนา</span>
              </div>
              <span className="badge badge-dark" style={{ fontSize: "10px", padding: "1px 6px" }}>
                {filteredSessions.length}
              </span>
            </div>

            {/* Filter tab: Current vs All */}
            <div style={{ display: "flex", background: "var(--color-surface-subtle)", padding: "2px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
              <button
                type="button"
                onClick={() => setSessionFilter("current")}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  background: sessionFilter === "current" ? "var(--color-surface)" : "transparent",
                  color: sessionFilter === "current" ? "var(--color-pink-accent)" : "var(--color-text-secondary)",
                  boxShadow: sessionFilter === "current" ? "var(--shadow-xs)" : "none",
                  transition: "all var(--dur-fast)",
                }}
              >
                บทเรียนนี้
              </button>
              <button
                type="button"
                onClick={() => setSessionFilter("all")}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  background: sessionFilter === "all" ? "var(--color-surface)" : "transparent",
                  color: sessionFilter === "all" ? "var(--color-pink-accent)" : "var(--color-text-secondary)",
                  boxShadow: sessionFilter === "all" ? "var(--shadow-xs)" : "none",
                  transition: "all var(--dur-fast)",
                }}
              >
                ทั้งหมด
              </button>
            </div>
          </div>

          {/* Sessions List */}
          <div className="chat-sessions-list">
            {loadingSessions ? (
              <div style={{ textAlign: "center", padding: "var(--space-md)", color: "var(--color-text-tertiary)", fontSize: "var(--text-xs)" }}>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite", margin: "0 auto 4px" }} />
                <span>กำลังโหลดประวัติ...</span>
              </div>
            ) : filteredSessions.length > 0 ? (
              filteredSessions.map((s) => {
                const isActive = s.id === activeSessionId;
                const formattedDate = new Date(s.updatedAt || s.createdAt).toLocaleDateString("th-TH", {
                  month: "short",
                  day: "numeric",
                });

                return (
                  <div
                    key={s.id}
                    className={`chat-session-item ${isActive ? "active" : ""}`}
                    onClick={() => handleSelectSession(s.id)}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: isActive ? 700 : 550,
                          color: isActive ? "var(--color-pink-text)" : "var(--color-text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "var(--color-text-tertiary)" }}>
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span>{s.messageCount} ข้อความ</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: "4px", color: "var(--color-danger-text)", opacity: isActive ? 1 : 0.7 }}
                      title="ลบแชทนี้"
                      onClick={(e) => handleDeleteSession(s.id, e)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: "center", padding: "var(--space-lg) var(--space-xs)", color: "var(--color-text-tertiary)", fontSize: "var(--text-xs)" }}>
                ยังไม่มีประวัติแชทในบทเรียนนี้
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Chat Area */}
        <div className="chat-main">
          {/* Top Bar inside chat thread */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 16px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              gap: "var(--space-sm)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "200px" }}>
              <span className="badge badge-neutral" style={{ color: "var(--color-pink-text)", borderColor: "var(--color-pink-border)" }}>
                <BookOpen size={11} />
                {activeLesson?.title || "บทเรียน"}
              </span>
              {activeSessionId && (
                <span className="badge badge-dark" style={{ fontSize: "11px" }}>
                  แชทที่กำลังสนทนา
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              {activeSessionId && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: "var(--color-danger-text)" }}
                  onClick={() => handleDeleteSession(activeSessionId)}
                >
                  <Trash2 size={14} />
                  <span>ลบแชทนี้</span>
                </button>
              )}
              {messages.length > 0 && !activeSessionId && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleNewChat}>
                  <RotateCcw size={14} />
                  <span>ล้างหน้าจอ</span>
                </button>
              )}
            </div>
          </div>

          {/* Message Thread */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-md)",
              minHeight: "420px",
            }}
          >
            {messages.length === 0 ? (
              <div className="empty-state" style={{ padding: "var(--space-2xl) var(--space-md)" }}>
                <div className="empty-state-icon">
                  <MessageSquare size={24} />
                </div>
                <h3>เริ่มบทสนทนาเกี่ยวกับ {activeLesson?.title || "บทเรียนนี้"}</h3>
                <p className="description" style={{ textAlign: "center", fontSize: "var(--text-sm)" }}>
                  พิมพ์คำถามของคุณ หรือเลือกหัวข้อคำถามแนะนำด้านล่าง (ระบบจะบันทึกประวัติให้อัตโนมัติ):
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "8px",
                    width: "100%",
                    maxWidth: "640px",
                    marginTop: "var(--space-sm)",
                  }}
                >
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{
                        justifyContent: "flex-start",
                        textAlign: "left",
                        whiteSpace: "normal",
                        padding: "10px 14px",
                        height: "auto",
                        lineHeight: 1.4,
                      }}
                      onClick={() => handleSend(prompt)}
                    >
                      <Sparkles size={14} style={{ flexShrink: 0, marginTop: "2px", color: "var(--color-pink-accent)" }} />
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                    width: "100%",
                  }}
                >
                  {msg.role === "user" ? (
                    <div className="chat-bubble-user">
                      <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                    </div>
                  ) : (
                    <div className="chat-card-assistant">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "var(--space-sm)",
                          paddingBottom: "var(--space-xs)",
                          borderBottom: "1px solid var(--color-border-subtle)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span className="badge badge-dark">
                            <Bot size={11} />
                            AI Assistant
                          </span>
                          {activeLesson && (
                            <span className="badge badge-neutral">
                              <Layers size={10} />
                              {activeLesson.title}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => copyToClipboard(msg.content, index)}
                          title="คัดลอกคำตอบ"
                        >
                          {copiedIndex === index ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                          <span style={{ fontSize: "var(--text-xs)" }}>
                            {copiedIndex === index ? "คัดลอกแล้ว" : "คัดลอก"}
                          </span>
                        </button>
                      </div>

                      <div className="prose-doc" style={{ padding: 0, border: "none", boxShadow: "none", background: "transparent" }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="chat-card-assistant" style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                  กำลังอ่านรายงานและเรียบเรียงคำตอบ...
                </span>
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              position: "sticky",
              bottom: "1rem",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              padding: "var(--space-sm)",
              boxShadow: "var(--shadow-md)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-xs)",
            }}
          >
            <textarea
              ref={textareaRef}
              className="form-textarea"
              rows={2}
              placeholder="พิมพ์คำถามของคุณที่นี่... (กด Enter เพื่อส่ง, Shift+Enter เพื่อขึ้นบรรทัดใหม่)"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                border: "none",
                boxShadow: "none",
                minHeight: "54px",
                maxHeight: "160px",
                padding: "8px 12px",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px" }}>
              <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-tertiary)" }}>
                บันทึกประวัติการแชทอัตโนมัติ
              </span>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!inputMessage.trim() || loading || !lessonId}
              >
                {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
                <span>ส่งคำถาม</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="shell" style={{ textAlign: "center", padding: "3rem" }}>กำลังโหลดบทเรียน...</div>}>
      <ChatContent />
    </Suspense>
  );
}
