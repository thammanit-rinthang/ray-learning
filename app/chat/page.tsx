"use client";

import { useEffect, useState, useRef, Suspense } from "react";
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
} from "lucide-react";

type ReportIndexItem = { id: string; title: string; course: string; chapter?: string };
type Message = { role: "user" | "assistant"; content: string; timestamp: Date };

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const activeLesson = reports.find((r) => r.id === lessonId);

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

  function clearConversation() {
    setMessages([]);
    setError("");
  }

  return (
    <div className="chat-container">
      {/* Header */}
      <section className="page-header">
        <div className="eyebrow">
          <span>AI Research Assistant</span>
        </div>
        <h1>สนทนากับเนื้อหาบทเรียน</h1>
        <p className="description">
          ถามคำถาม ขอคำอธิบาย หรือเจาะลึกประเด็นที่สงสัย โดย AI จะอ้างอิงจากรายงานต้นฉบับ
        </p>
      </section>

      {/* Lesson Selector Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-sm)",
          padding: "var(--space-md)",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flex: 1, minWidth: "260px" }}>
          <BookOpen size={18} style={{ color: "var(--color-text-secondary)" }} />
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ fontSize: "var(--text-xs)", marginBottom: "2px" }}>
              แหล่งข้อมูลอ้างอิง
            </label>
            <select
              className="form-select"
              style={{ padding: "6px 12px", fontSize: "var(--text-sm)" }}
              value={lessonId}
              onChange={(e) => {
                setLessonId(e.target.value);
                setMessages([]);
              }}
            >
              {reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.title} ({report.course})
                </option>
              ))}
            </select>
          </div>
        </div>

        {messages.length > 0 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearConversation}>
            <RotateCcw size={14} />
            <span>ล้างการสนทนา</span>
          </button>
        )}
      </div>

      {/* Message Thread */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-md)",
          minHeight: "360px",
        }}
      >
        {messages.length === 0 ? (
          <div className="empty-state" style={{ padding: "var(--space-2xl) var(--space-md)" }}>
            <div className="empty-state-icon">
              <MessageSquare size={24} />
            </div>
            <h3>เริ่มบทสนทนาเกี่ยวกับ {activeLesson?.title || "บทเรียนนี้"}</h3>
            <p className="description" style={{ textAlign: "center", fontSize: "var(--text-sm)" }}>
              พิมพ์คำถามของคุณ หรือเลือกหัวข้อคำถามแนะนำด้านล่าง:
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
                  <Sparkles size={14} style={{ flexShrink: 0, marginTop: "2px", color: "var(--color-primary)" }} />
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
            คำตอบอ้างอิงจากบทเรียนที่เลือกเท่านั้น
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
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="shell" style={{ textAlign: "center", padding: "3rem" }}>กำลังโหลดบทเรียน...</div>}>
      <ChatContent />
    </Suspense>
  );
}

