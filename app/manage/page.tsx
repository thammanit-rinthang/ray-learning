"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Edit2,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Search,
  BookOpen,
} from "lucide-react";

type Lesson = {
  id: string;
  slug: string;
  course: string;
  chapter?: string | null;
  title: string;
  reportPath: string;
};

type FormState = {
  title: string;
  course: string;
  chapter: string;
  file: File | null;
};

const emptyForm: FormState = { title: "", course: "", chapter: "", file: null };

export default function ManagePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const response = await fetch("/api/lessons", { cache: "no-store" });
    if (response.ok) {
      setLessons(await response.json());
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/lessons", { cache: "no-store" }).then(async (response) => {
      if (active && response.ok) setLessons(await response.json());
    });
    return () => {
      active = false;
    };
  }, []);

  function reset() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(false);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      let response: Response;
      if (form.file) {
        const body = new FormData();
        body.set("title", form.title.trim());
        body.set("course", form.course.trim());
        body.set("chapter", form.chapter.trim());
        body.set("file", form.file);
        if (editingId) body.set("lessonId", editingId);
        response = await fetch("/api/lessons/upload", { method: "POST", body });
      } else if (editingId) {
        response = await fetch(`/api/lessons?id=${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            course: form.course.trim(),
            chapter: form.chapter.trim() || null,
          }),
        });
      } else {
        setMessage({ type: "error", text: "กรุณาเลือกไฟล์ .md ก่อนอัปโหลดบทเรียนใหม่" });
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: "error", text: data.error ?? "บันทึกไม่สำเร็จ" });
        return;
      }
      setMessage({
        type: "success",
        text: editingId ? "อัปเดตข้อมูลบทเรียนเรียบร้อยแล้ว" : "อัปโหลดบทเรียนเข้าสู่ระบบเรียบร้อยแล้ว",
      });
      reset();
      await load();
    } catch {
      setMessage({ type: "error", text: "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
    } finally {
      setBusy(false);
    }
  }

  function handleEdit(lesson: Lesson) {
    setEditingId(lesson.id);
    setForm({
      title: lesson.title,
      course: lesson.course,
      chapter: lesson.chapter ?? "",
      file: null,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string, title: string) {
    if (!confirm(`คุณต้องการลบ "${title}" และไฟล์เอกสารออกจาก Storage หรือไม่?`)) return;
    const response = await fetch(`/api/lessons?id=${id}`, { method: "DELETE" });
    if (response.ok) {
      setMessage({ type: "success", text: "ลบบทเรียนเรียบร้อยแล้ว" });
      await load();
    } else {
      const data = await response.json();
      setMessage({ type: "error", text: data.error ?? "ลบไม่สำเร็จ" });
    }
  }

  const filteredLessons = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return lessons;
    return lessons.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.course.toLowerCase().includes(q) ||
        (l.chapter && l.chapter.toLowerCase().includes(q)),
    );
  }, [lessons, searchQuery]);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header */}
      <section className="page-header-row">
        <div>
          <div className="eyebrow">
            <span>Storage & Database</span>
          </div>
          <h1 style={{ marginTop: "0.4rem" }}>จัดการบทเรียนและรายงาน</h1>
          <p className="description" style={{ marginTop: "0.5rem" }}>
            อัปโหลดไฟล์ Markdown (<code>report.md</code>) เข้าสู่ Supabase Storage และจัดการรายการบทเรียน
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              reset();
              setShowForm(true);
            }}
          >
            <Plus size={16} />
            <span>เพิ่มบทเรียนใหม่</span>
          </button>
        )}
      </section>

      {/* Global Alert Notification */}
      {message && (
        <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`} style={{ marginBottom: "var(--space-lg)" }}>
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            style={{ marginLeft: "auto", color: "inherit" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload & Edit Form Card */}
      {showForm && (
        <div className="form-panel" style={{ maxWidth: "100%", marginBottom: "var(--space-2xl)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
            <h2>{editingId ? "แก้ไขข้อมูลบทเรียน" : "อัปโหลดบทเรียนใหม่"}</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-md)" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <span>ชื่อบทเรียน (Title) *</span>
                </label>
                <input
                  required
                  className="form-input"
                  placeholder="เช่น บทที่ 1 ความรู้เบื้องต้นเกี่ยวกับการบัญชี"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <span>วิชา / หลักสูตร (Course) *</span>
                </label>
                <input
                  required
                  className="form-input"
                  placeholder="เช่น AC101 การบัญชีเบื้องต้น"
                  value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>บท / ตอน (Chapter - ไม่บังคับ)</span>
              </label>
              <input
                className="form-input"
                placeholder="เช่น บทที่ 1 หรือ ตอนที่ 2"
                value={form.chapter}
                onChange={(e) => setForm({ ...form, chapter: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>ไฟล์ Markdown ({editingId ? "เลือกเมื่อต้องการอัปเดตไฟล์เนื้อหา" : "ไฟล์ .md ต้นฉบับ *"})</span>
              </label>
              <label className="file-dropzone">
                <Upload size={24} style={{ color: "var(--color-text-secondary)" }} />
                <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                  {form.file ? form.file.name : "คลิกเพื่อเลือกไฟล์ หรือลากไฟล์ .md มาวางที่นี่"}
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
                  รองรับไฟล์ .md ขนาดไม่เกิน 5 MB
                </span>
                <input
                  type="file"
                  accept=".md,text/markdown"
                  required={!editingId}
                  style={{ display: "none" }}
                  onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end", marginTop: "var(--space-sm)" }}>
              <button type="button" className="btn btn-secondary" onClick={reset}>
                ยกเลิก
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <span>{editingId ? "บันทึกการแก้ไข" : "อัปโหลดและบันทึก"}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lesson Catalog / Table */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-sm)",
            marginBottom: "var(--space-md)",
          }}
        >
          <h2>รายการบทเรียน ({lessons.length})</h2>
          <div style={{ position: "relative", width: "min(100%, 300px)" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-tertiary)",
              }}
            />
            <input
              type="search"
              className="form-input"
              style={{ paddingLeft: "32px", fontSize: "var(--text-sm)", padding: "6px 12px 6px 32px" }}
              placeholder="ค้นหารายการบทเรียน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredLessons.length > 0 ? (
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(200px, 1fr) auto",
                padding: "var(--space-sm) var(--space-md)",
                background: "var(--color-surface-subtle)",
                borderBottom: "1px solid var(--color-border)",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "var(--color-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <span>บทเรียน / วิชา</span>
              <span>การดำเนินการ</span>
            </div>

            {filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-md)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                  gap: "var(--space-md)",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: "220px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span className="badge badge-neutral">
                      <Layers size={10} />
                      {lesson.course}
                    </span>
                    {lesson.chapter && <span className="badge badge-neutral">{lesson.chapter}</span>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--color-text-primary)" }}>
                    {lesson.title}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    {lesson.reportPath}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEdit(lesson)}
                  >
                    <Edit2 size={14} />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => void remove(lesson.id, lesson.title)}
                  >
                    <Trash2 size={14} />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={24} />
            </div>
            <h3>{searchQuery ? "ไม่พบบทเรียนที่ค้นหา" : "ยังไม่มีบทเรียนในระบบ"}</h3>
            <p className="description" style={{ textAlign: "center" }}>
              {searchQuery
                ? "ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง"
                : "เพิ่มบทเรียนแรกโดยคลิกปุ่ม 'เพิ่มบทเรียนใหม่' ด้านบน"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

