"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckSquare,
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  Search,
  Award,
  BookOpen,
} from "lucide-react";

type Report = { id: string; title: string; course: string; chapter?: string };
type Question = {
  type: "multiple_choice" | "short_answer";
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  sourceSection?: string;
};

type QuizAttemptItem = {
  id: string;
  score: number | null;
  total: number;
  submittedAt?: string | null;
  createdAt: string;
};

type SavedQuiz = {
  id: string;
  title: string;
  scopeType: string;
  scopeId?: string | null;
  difficulty: "easy" | "medium" | "hard";
  questionCount: number;
  createdAt: string;
  attemptCount: number;
  latestScore?: number | null;
  latestTotal?: number | null;
  latestAttemptAt?: string | null;
  bestScore?: number | null;
  bestTotal?: number | null;
  attempts?: QuizAttemptItem[];
};

function QuizContent() {
  const searchParams = useSearchParams();
  const queryLesson = searchParams.get("lesson");

  // Mode: "list" (catalog of all quizzes), "create" (AI generator), "take" (answering questions)
  const [mode, setMode] = useState<"list" | "create" | "take">(queryLesson ? "create" : "list");

  // Quizzes list state
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [quizSearch, setQuizSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [expandedHistoryQuizId, setExpandedHistoryQuizId] = useState<string | null>(null);

  // Create Quiz state
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [filterCourse, setFilterCourse] = useState("all");

  // Active Quiz Taker state
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizAttemptsHistory, setQuizAttemptsHistory] = useState<QuizAttemptItem[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load all saved quizzes
  async function loadQuizzes() {
    setLoadingQuizzes(true);
    try {
      const response = await fetch("/api/quizzes", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setSavedQuizzes(data);
        }
      }
    } catch {
      // Fallback silently
    } finally {
      setLoadingQuizzes(false);
    }
  }

  // Initial loads
  useEffect(() => {
    let active = true;
    fetch("/api/quizzes", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active && Array.isArray(data)) setSavedQuizzes(data);
      })
      .catch(() => {});

    fetch("/api/reports")
      .then((r) => r.json())
      .then((items: Report[]) => {
        if (active && Array.isArray(items)) {
          setReports(items);
          if (queryLesson && items.some((item) => item.id === queryLesson)) {
            setSelectedLessons([queryLesson]);
            setMode("create");
          }
        }
      })
      .catch(() => {
        if (active) setError("ไม่สามารถดึงข้อมูลบทเรียนได้");
      });

    return () => {
      active = false;
    };
  }, [queryLesson]);

  const courses = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => set.add(r.course));
    return Array.from(set);
  }, [reports]);

  const filteredReports = useMemo(() => {
    if (filterCourse === "all") return reports;
    return reports.filter((r) => r.course === filterCourse);
  }, [reports, filterCourse]);

  const filteredSavedQuizzes = useMemo(() => {
    return savedQuizzes.filter((q) => {
      const matchDiff = difficultyFilter === "all" || q.difficulty === difficultyFilter;
      const term = quizSearch.toLowerCase().trim();
      const matchSearch = !term || q.title.toLowerCase().includes(term);
      return matchDiff && matchSearch;
    });
  }, [savedQuizzes, difficultyFilter, quizSearch]);

  function toggleAllLessons() {
    if (selectedLessons.length === filteredReports.length) {
      setSelectedLessons([]);
    } else {
      setSelectedLessons(filteredReports.map((r) => r.id));
    }
  }

  // Generate new quiz with AI
  async function handleGenerate() {
    if (!selectedLessons.length) return;
    setLoading(true);
    setError("");
    setScore(null);
    setAnswers({});
    setActiveQuizId(null);
    setQuizAttemptsHistory([]);
    try {
      const response = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonIds: selectedLessons,
          count: questionCount,
          difficulty,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "สร้างแบบทดสอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      } else {
        setQuestions(data.questions ?? []);
        setQuizTitle(data.title ?? "แบบทดสอบความเข้าใจ");
        setActiveQuizId(data.quizId ?? null);
        setMode("take");
        loadQuizzes();
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการติดต่อกับเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  }

  // Start taking an existing quiz from database
  async function handleStartQuiz(quizIdToLoad: string) {
    setLoading(true);
    setError("");
    setScore(null);
    setAnswers({});
    try {
      const response = await fetch(`/api/quizzes?id=${quizIdToLoad}`);
      const data = await response.json();
      if (response.ok && data.quiz && Array.isArray(data.questions)) {
        setActiveQuizId(data.quiz.id);
        setQuizTitle(data.quiz.title);
        setQuizAttemptsHistory(Array.isArray(data.attempts) ? data.attempts : []);
        setQuestions(
          data.questions.map((q: any) => ({
            type: q.type,
            prompt: q.prompt,
            options: Array.isArray(q.options) ? q.options : [],
            answer: q.answer,
            explanation: q.explanation,
            sourceSection: q.sourceSection ?? undefined,
          }))
        );
        setMode("take");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError("ไม่สามารถโหลดข้อสอบชุดนี้ได้");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการโหลดข้อสอบ");
    } finally {
      setLoading(false);
    }
  }

  // Delete saved quiz
  async function handleDeleteQuiz(quizIdToDelete: string, title: string) {
    if (!confirm(`คุณต้องการลบแบบทดสอบ "${title}" หรือไม่?`)) return;
    try {
      const response = await fetch(`/api/quizzes?id=${quizIdToDelete}`, { method: "DELETE" });
      if (response.ok) {
        setSavedQuizzes(savedQuizzes.filter((q) => q.id !== quizIdToDelete));
      }
    } catch {
      alert("ลบไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  // Submit answers & grade
  async function handleSubmit() {
    let correct = 0;
    questions.forEach((question, index) => {
      const userAnswer = (answers[index] ?? "").trim().toLowerCase();
      const correctAnswer = question.answer.trim().toLowerCase();
      if (userAnswer === correctAnswer) {
        correct++;
      }
    });
    setScore(correct);

    // Save attempt to database if quizId exists
    if (activeQuizId) {
      const formattedAnswers: Record<string, string> = {};
      Object.entries(answers).forEach(([k, v]) => {
        formattedAnswers[k] = v;
      });
      fetch("/api/ai/quiz/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: activeQuizId,
          score: correct,
          total: questions.length,
          answers: formattedAnswers,
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          loadQuizzes();
          // Add this new attempt to local history
          setQuizAttemptsHistory((prev) => [
            {
              id: res.attemptId || Math.random().toString(),
              score: correct,
              total: questions.length,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        })
        .catch((err) => console.error("Could not save attempt:", err));
    }
  }

  function getDifficultyBadge(diff: string) {
    switch (diff) {
      case "easy":
        return <span className="badge badge-success">ง่าย (Easy)</span>;
      case "hard":
        return <span className="badge badge-warning">ท้าทาย (Hard)</span>;
      default:
        return <span className="badge badge-neutral">ปานกลาง (Medium)</span>;
    }
  }

  return (
    <div className="quiz-container" style={{ maxWidth: "920px", margin: "0 auto" }}>
      {/* 1. VIEW: ALL SAVED QUIZZES CATALOG */}
      {mode === "list" && (
        <div>
          {/* Header */}
          <section className="page-header-row">
            <div>
              <div className="eyebrow">
                <span>Assessment Hub</span>
              </div>
              <h1 style={{ marginTop: "0.4rem" }}>คลังแบบทดสอบทั้งหมด</h1>
              <p className="description" style={{ marginTop: "0.4rem" }}>
                เลือกทำแบบทดสอบที่เคยสร้างไว้ ดูประวัติคะแนนย้อนหลัง หรือกดสร้างชุดข้อสอบใหม่ด้วย AI
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setError("");
                setMode("create");
              }}
            >
              <Sparkles size={16} />
              <span>สร้างแบบทดสอบใหม่ด้วย AI</span>
            </button>
          </section>

          {/* Stats Bar */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">แบบทดสอบทั้งหมด</span>
              <span className="stat-value">{savedQuizzes.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">บทเรียนที่พร้อมทดสอบ</span>
              <span className="stat-value">{reports.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">ประวัติการทำแบบทดสอบ</span>
              <span className="stat-value">
                {savedQuizzes.reduce((acc, q) => acc + (q.attemptCount || 0), 0)} ครั้ง
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-md)",
              marginBottom: "var(--space-xl)",
              padding: "var(--space-md)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-text-tertiary)",
                }}
              />
              <input
                type="search"
                className="form-input"
                style={{ paddingLeft: "36px", fontSize: "var(--text-sm)" }}
                placeholder="ค้นหาชื่อแบบทดสอบ..."
                value={quizSearch}
                onChange={(e) => setQuizSearch(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)", marginRight: "4px" }}>
                ความยาก:
              </span>
              <button
                type="button"
                className={`btn btn-sm ${difficultyFilter === "all" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setDifficultyFilter("all")}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                className={`btn btn-sm ${difficultyFilter === "easy" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setDifficultyFilter("easy")}
              >
                ง่าย
              </button>
              <button
                type="button"
                className={`btn btn-sm ${difficultyFilter === "medium" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setDifficultyFilter("medium")}
              >
                ปานกลาง
              </button>
              <button
                type="button"
                className={`btn btn-sm ${difficultyFilter === "hard" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setDifficultyFilter("hard")}
              >
                ท้าทาย
              </button>
            </div>
          </div>

          {/* Quizzes List */}
          {loadingQuizzes ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-tertiary)" }}>
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
              <div>กำลังโหลดรายการแบบทดสอบ...</div>
            </div>
          ) : filteredSavedQuizzes.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              {filteredSavedQuizzes.map((quiz) => {
                const isExpanded = expandedHistoryQuizId === quiz.id;
                const createdDate = new Date(quiz.createdAt).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                const attemptsList = quiz.attempts || [];

                return (
                  <div
                    key={quiz.id}
                    className="card"
                    style={{
                      minHeight: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-sm)",
                      padding: "var(--space-lg)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "var(--space-md)",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: "260px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                          {getDifficultyBadge(quiz.difficulty)}
                          <span className="badge badge-dark">
                            {quiz.questionCount} ข้อ
                          </span>
                          {quiz.attemptCount > 0 && quiz.latestScore !== null && quiz.latestTotal !== null && (
                            <span
                              className="badge badge-neutral"
                              style={{
                                color: "var(--color-pink-text)",
                                borderColor: "var(--color-pink-border)",
                              }}
                            >
                              <Award size={11} />
                              คะแนนล่าสุด: {quiz.latestScore}/{quiz.latestTotal} ({Math.round(((quiz.latestScore || 0) / (quiz.latestTotal || 1)) * 100)}%)
                            </span>
                          )}
                          {quiz.attemptCount > 1 && quiz.bestScore !== null && quiz.bestTotal !== null && (
                            <span
                              className="badge badge-success"
                              style={{ fontSize: "var(--text-xs)" }}
                            >
                              สูงสุด: {quiz.bestScore}/{quiz.bestTotal}
                            </span>
                          )}
                        </div>

                        <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "4px" }}>
                          {quiz.title}
                        </h2>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)", flexWrap: "wrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={12} />
                            สร้างเมื่อ {createdDate}
                          </span>
                          {quiz.attemptCount > 0 && (
                            <span>ทำแล้วทั้งหมด {quiz.attemptCount} ครั้ง</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {quiz.attemptCount > 0 && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setExpandedHistoryQuizId(isExpanded ? null : quiz.id)}
                            style={{ gap: "4px" }}
                          >
                            <Award size={13} />
                            <span>{isExpanded ? "ซ่อนประวัติ" : `ดูประวัติ (${quiz.attemptCount})`}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleStartQuiz(quiz.id)}
                        >
                          <HelpCircle size={14} />
                          <span>{quiz.attemptCount > 0 ? "ทำอีกครั้ง" : "เริ่มทำข้อสอบ"}</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--color-danger-text)" }}
                          title="ลบแบบทดสอบ"
                          onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Attempts History Table */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: "var(--space-sm)",
                          paddingTop: "var(--space-md)",
                          borderTop: "1px solid var(--color-border-subtle)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-pink-text)" }}>
                            ประวัติคะแนนของข้อสอบชุดนี้ ({attemptsList.length} ครั้ง)
                          </div>
                        </div>

                        <div
                          style={{
                            background: "var(--color-pink-soft)",
                            border: "1px solid var(--color-pink-border)",
                            borderRadius: "var(--radius-md)",
                            overflow: "hidden",
                          }}
                        >
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-xs)" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--color-pink-border)", background: "rgba(255, 255, 255, 0.7)" }}>
                                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 650 }}>ครั้งที่</th>
                                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 650 }}>วันที่ทำ</th>
                                <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 650 }}>คะแนนที่ได้</th>
                                <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 650 }}>ผลลัพธ์</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attemptsList.map((att, idx) => {
                                const attemptDate = new Date(att.submittedAt || att.createdAt).toLocaleString("th-TH", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });
                                const percent = Math.round(((att.score || 0) / (att.total || 1)) * 100);
                                const isPassed = percent >= 80;

                                return (
                                  <tr key={att.id} style={{ borderBottom: idx < attemptsList.length - 1 ? "1px solid rgba(244, 114, 182, 0.2)" : "none" }}>
                                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                                      ครั้งที่ {attemptsList.length - idx} {idx === 0 && <span style={{ color: "var(--color-pink-text)", fontSize: "10px" }}>(ล่าสุด)</span>}
                                    </td>
                                    <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)" }}>
                                      {attemptDate}
                                    </td>
                                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>
                                      {att.score} / {att.total}
                                    </td>
                                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                      <span
                                        className={`badge ${isPassed ? "badge-success" : "badge-neutral"}`}
                                        style={{ fontSize: "11px", padding: "2px 6px" }}
                                      >
                                        {percent}% {isPassed ? "ยอดเยี่ยม" : "ผ่าน"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <HelpCircle size={24} />
              </div>
              <h3>{quizSearch || difficultyFilter !== "all" ? "ไม่พบแบบทดสอบที่ค้นหา" : "ยังไม่มีแบบทดสอบในระบบ"}</h3>
              <p className="description" style={{ textAlign: "center" }}>
                {quizSearch || difficultyFilter !== "all"
                  ? "ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองระดับความยากทั้งหมด"
                  : "สร้างแบบทดสอบชุดแรกของคุณได้ทันที โดยเลือกบทเรียนที่ต้องการ"}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: "var(--space-sm)" }}
                onClick={() => {
                  setQuizSearch("");
                  setDifficultyFilter("all");
                  setMode("create");
                }}
              >
                <Sparkles size={16} />
                <span>สร้างแบบทดสอบใหม่</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. VIEW: CREATE NEW QUIZ WITH AI */}
      {mode === "create" && (
        <div>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ paddingLeft: 0, color: "var(--color-text-secondary)" }}
              onClick={() => {
                setError("");
                setMode("list");
              }}
            >
              <ArrowLeft size={16} />
              <span>กลับไปคลังแบบทดสอบทั้งหมด</span>
            </button>
          </div>

          <section className="page-header">
            <div className="eyebrow">
              <span>AI Quiz Generator</span>
            </div>
            <h1>สร้างแบบทดสอบใหม่</h1>
            <p className="description">
              เลือก 1 บทเรียนขึ้นไป แล้วกำหนดจำนวนข้อและระดับความยาก AI จะสร้างข้อสอบและบันทึกลงระบบทันที
            </p>
          </section>

          <div className="form-panel" style={{ maxWidth: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-md)" }}>
              <div>
                <h2>1. เลือกเนื้อหาบทเรียน</h2>
                <p className="description" style={{ fontSize: "var(--text-sm)" }}>
                  เลือกบทเรียนที่จะใช้เป็นแหล่งข้อมูลในการออกข้อสอบ
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={toggleAllLessons}>
                <CheckSquare size={14} />
                <span>{selectedLessons.length === filteredReports.length ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}</span>
              </button>
            </div>

            {courses.length > 1 && (
              <div style={{ display: "flex", gap: "6px", overflowX: "auto", marginBottom: "var(--space-md)" }}>
                <button
                  type="button"
                  className={`btn btn-sm ${filterCourse === "all" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setFilterCourse("all")}
                >
                  ทุกวิชา
                </button>
                {courses.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`btn btn-sm ${filterCourse === c ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setFilterCourse(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <div
              style={{
                maxHeight: "280px",
                overflowY: "auto",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-xs)",
                background: "var(--color-surface-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {filteredReports.map((report) => {
                const isChecked = selectedLessons.includes(report.id);
                return (
                  <label
                    key={report.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-sm)",
                      padding: "10px 12px",
                      background: isChecked ? "var(--color-surface)" : "transparent",
                      borderRadius: "var(--radius-md)",
                      border: isChecked ? "1px solid var(--color-pink-border)" : "1px solid transparent",
                      cursor: "pointer",
                      transition: "all var(--dur-fast) var(--ease-out)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLessons([...selectedLessons, report.id]);
                        } else {
                          setSelectedLessons(selectedLessons.filter((id) => id !== report.id));
                        }
                      }}
                      style={{ accentColor: "var(--color-pink-accent)" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 650, fontSize: "var(--text-sm)" }}>{report.title}</div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
                        {report.course} {report.chapter ? `· ${report.chapter}` : ""}
                      </div>
                    </div>
                  </label>
                );
              })}
              {filteredReports.length === 0 && (
                <div style={{ padding: "var(--space-lg)", textAlign: "center", color: "var(--color-text-tertiary)" }}>
                  ยังไม่มีบทเรียนในหมวดหมู่นี้
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "var(--space-md)",
                marginTop: "var(--space-lg)",
                paddingTop: "var(--space-md)",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <span>จำนวนข้อสอบ</span>
                </label>
                <select
                  className="form-select"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                >
                  <option value={3}>3 ข้อ (แบบกระชับ)</option>
                  <option value={5}>5 ข้อ (มาตรฐาน)</option>
                  <option value={10}>10 ข้อ (ครอบคลุม)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <span>ระดับความยาก</span>
                </label>
                <select
                  className="form-select"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                >
                  <option value="easy">พื้นฐาน (Easy)</option>
                  <option value="medium">ปานกลาง (Medium)</option>
                  <option value="hard">ประยุกต์ / ท้าทาย (Hard)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="alert alert-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-lg)" }}
              disabled={!selectedLessons.length || loading}
              onClick={handleGenerate}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  <span>กำลังสร้างแบบทดสอบและบันทึกลง Database...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>สร้างแบบทดสอบ ({selectedLessons.length} บทเรียนที่เลือก)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. VIEW: ACTIVE QUIZ TAKER */}
      {mode === "take" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          {/* Top Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "var(--space-md) var(--space-lg)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div>
              <span className="badge badge-dark" style={{ marginBottom: "4px" }}>
                แบบทดสอบ
              </span>
              <h2 style={{ fontSize: "var(--text-lg)" }}>{quizTitle}</h2>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setMode("list");
                loadQuizzes();
              }}
            >
              <ArrowLeft size={14} />
              <span>กลับไปคลังแบบทดสอบ</span>
            </button>
          </div>

          {/* Questions Stream */}
          {questions.map((question, index) => {
            const userAnswer = answers[index];
            const isEvaluated = score !== null;
            const isCorrect =
              isEvaluated &&
              (userAnswer ?? "").trim().toLowerCase() === question.answer.trim().toLowerCase();

            return (
              <div
                key={index}
                className="form-panel"
                style={{
                  maxWidth: "100%",
                  border: isEvaluated
                    ? isCorrect
                      ? "1px solid var(--color-success)"
                      : "1px solid var(--color-danger)"
                    : "1px solid var(--color-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-sm)" }}>
                  <span className="eyebrow">
                    คำถามข้อที่ {index + 1} จาก {questions.length}
                  </span>
                  {isEvaluated && (
                    <span className={`badge ${isCorrect ? "badge-success" : "badge-warning"}`}>
                      {isCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {isCorrect ? "ถูกต้อง" : "ยังไม่ถูกต้อง"}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-md)", lineHeight: 1.4 }}>
                  {question.prompt}
                </h3>

                {question.options && question.options.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {question.options.map((option, optIdx) => {
                      const isSelected = userAnswer === option;
                      return (
                        <label
                          key={optIdx}
                          className={`quiz-option-card ${isSelected ? "selected" : ""}`}
                          style={{
                            borderColor:
                              isEvaluated && option === question.answer
                                ? "var(--color-success)"
                                : undefined,
                          }}
                        >
                          <input
                            type="radio"
                            name={`question-${index}`}
                            value={option}
                            checked={isSelected}
                            disabled={isEvaluated}
                            onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })}
                          />
                          <span style={{ fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
                            {option}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="form-input"
                    placeholder="พิมพ์คำตอบของคุณที่นี่..."
                    value={userAnswer || ""}
                    disabled={isEvaluated}
                    onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })}
                  />
                )}

                {/* Explanation Card */}
                {isEvaluated && (
                  <div
                    style={{
                      marginTop: "var(--space-md)",
                      padding: "var(--space-md)",
                      background: "var(--color-pink-soft)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-pink-border)",
                      fontSize: "var(--text-sm)",
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                      เฉลย: {question.answer}
                    </div>
                    <p style={{ color: "var(--color-text-secondary)" }}>{question.explanation}</p>
                    {question.sourceSection && (
                      <div style={{ marginTop: "6px", fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
                        อ้างอิงจากหัวข้อ: <strong>{question.sourceSection}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Submission Bar / Score Result */}
          {score === null ? (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={Object.keys(answers).length === 0}
              >
                <span>ส่งคำตอบเพื่อตรวจคะแนน</span>
                <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: "var(--space-xl)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-sm)",
              }}
            >
              <div
                style={{
                  fontSize: "var(--text-4xl)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color:
                    score / questions.length >= 0.8
                      ? "var(--color-success-text)"
                      : "var(--color-text-primary)",
                }}
              >
                {score} / {questions.length} คะแนน
              </div>
              <p className="description">
                คุณตอบถูกคิดเป็น {Math.round((score / questions.length) * 100)}% ของแบบทดสอบทั้งหมด
              </p>
              {activeQuizId && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "var(--text-xs)", color: "var(--color-pink-text)", background: "var(--color-pink-soft)", padding: "4px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--color-pink-border)", marginTop: "4px" }}>
                  <CheckCircle2 size={13} />
                  <span>บันทึกผลการทดสอบลงในฐานข้อมูลเรียบร้อยแล้ว</span>
                </div>
              )}

              {/* Attempt History on this Quiz */}
              {quizAttemptsHistory.length > 0 && (
                <div
                  style={{
                    width: "100%",
                    maxWidth: "600px",
                    marginTop: "var(--space-md)",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-pink-text)", marginBottom: "6px" }}>
                    ประวัติการทำแบบทดสอบชุดนี้ ({quizAttemptsHistory.length} ครั้ง)
                  </div>
                  <div
                    style={{
                      background: "var(--color-pink-soft)",
                      border: "1px solid var(--color-pink-border)",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-xs)" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--color-pink-border)", background: "rgba(255, 255, 255, 0.7)" }}>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 650 }}>ครั้งที่</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 650 }}>เวลาที่ทำ</th>
                          <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 650 }}>คะแนน</th>
                          <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 650 }}>ร้อยละ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quizAttemptsHistory.map((att, idx) => {
                          const dateStr = new Date(att.submittedAt || att.createdAt).toLocaleString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          const pct = Math.round(((att.score || 0) / (att.total || 1)) * 100);
                          return (
                            <tr key={att.id} style={{ borderBottom: idx < quizAttemptsHistory.length - 1 ? "1px solid rgba(244, 114, 182, 0.2)" : "none" }}>
                              <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                                ครั้งที่ {quizAttemptsHistory.length - idx} {idx === 0 && <span style={{ color: "var(--color-pink-text)", fontSize: "10px" }}>(รอบนี้)</span>}
                              </td>
                              <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)" }}>
                                {dateStr}
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>
                                {att.score} / {att.total}
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                <span className={`badge ${pct >= 80 ? "badge-success" : "badge-neutral"}`} style={{ fontSize: "11px", padding: "2px 6px" }}>
                                  {pct}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-md)", flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setScore(null);
                    setAnswers({});
                  }}
                >
                  <RotateCcw size={15} />
                  <span>ทำใหม่อีกครั้ง</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setMode("list");
                    loadQuizzes();
                  }}
                >
                  <BookOpen size={15} />
                  <span>กลับไปคลังแบบทดสอบทั้งหมด</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setMode("create");
                    setScore(null);
                    setAnswers({});
                  }}
                >
                  <Sparkles size={15} />
                  <span>สร้างชุดข้อสอบใหม่</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="shell" style={{ textAlign: "center", padding: "3rem" }}>กำลังโหลดข้อมูลแบบทดสอบ...</div>}>
      <QuizContent />
    </Suspense>
  );
}


