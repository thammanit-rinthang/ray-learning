"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, BookOpen, HelpCircle, MessageSquare, ArrowRight, BookMarked, Layers } from "lucide-react";
import type { ReportIndexItem } from "@/lib/reports";

interface LessonListProps {
  initialReports: ReportIndexItem[];
}

export function LessonList({ initialReports }: LessonListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  const courses = useMemo(() => {
    const set = new Set<string>();
    initialReports.forEach((r) => {
      if (r.course) set.add(r.course);
    });
    return Array.from(set);
  }, [initialReports]);

  const filteredReports = useMemo(() => {
    return initialReports.filter((report) => {
      const matchCourse = selectedCourse === "all" || report.course === selectedCourse;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        report.title.toLowerCase().includes(q) ||
        report.course.toLowerCase().includes(q) ||
        (report.chapter && report.chapter.toLowerCase().includes(q));
      return matchCourse && matchQuery;
    });
  }, [initialReports, selectedCourse, searchQuery]);

  return (
    <div>
      {/* Stats Summary Bar */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">บทเรียนทั้งหมด</span>
          <span className="stat-value">{initialReports.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">หมวดหมู่วิชา</span>
          <span className="stat-value">{courses.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ความพร้อมระบบ</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--color-success)",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-success-text)" }}>
              AI & Storage พร้อมใช้งาน
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-md)",
          marginBottom: "var(--space-xl)",
          padding: "var(--space-md)",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ position: "relative", width: "100%" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-tertiary)",
            }}
          />
          <input
            type="search"
            className="form-input"
            style={{ paddingLeft: "42px" }}
            placeholder="ค้นหาชื่อบทเรียน, รหัสวิชา หรือหัวข้อ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {courses.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-xs)",
              overflowX: "auto",
              paddingBottom: "2px",
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${selectedCourse === "all" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSelectedCourse("all")}
            >
              ทั้งหมด ({initialReports.length})
            </button>
            {courses.map((course) => (
              <button
                key={course}
                type="button"
                className={`btn btn-sm ${selectedCourse === course ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSelectedCourse(course)}
              >
                {course}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lesson Grid */}
      {filteredReports.length > 0 ? (
        <div className="card-grid">
          {filteredReports.map((report) => (
            <div key={report.id} className="card">
              <div>
                <div className="card-header">
                  <span className="badge badge-neutral">
                    <Layers size={11} />
                    {report.course}
                  </span>
                  {report.chapter && (
                    <span className="badge badge-neutral" style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {report.chapter}
                    </span>
                  )}
                </div>
                <Link href={`/lessons/${report.slug}`} style={{ textDecoration: "none" }}>
                  <h2 className="card-title">{report.title}</h2>
                </Link>
              </div>

              <div>
                <div style={{ display: "flex", gap: "6px", marginTop: "var(--space-sm)" }}>
                  <Link
                    href={`/lessons/${report.slug}`}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <BookOpen size={14} />
                    <span>อ่านบทเรียน</span>
                  </Link>
                  <Link
                    href={`/quiz?lesson=${report.id}`}
                    className="btn btn-secondary btn-sm"
                    title="ทดสอบความเข้าใจ"
                    aria-label="ทดสอบความเข้าใจ"
                  >
                    <HelpCircle size={15} />
                  </Link>
                  <Link
                    href={`/chat?lesson=${report.id}`}
                    className="btn btn-secondary btn-sm"
                    title="ถาม AI บทนี้"
                    aria-label="ถาม AI บทนี้"
                  >
                    <MessageSquare size={15} />
                  </Link>
                </div>

                <div className="card-footer">
                  <span>เข้าถึงเอกสารได้ทันที</span>
                  <Link
                    href={`/lessons/${report.slug}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "var(--color-text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    <span>อ่าน</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : initialReports.length > 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search size={24} />
          </div>
          <h3>ไม่พบบทเรียนที่ค้นหา</h3>
          <p className="description" style={{ textAlign: "center" }}>
            ลองเปลี่ยนคำค้นหา หรือเลือกดูบทเรียนทั้งหมด
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedCourse("all");
            }}
          >
            ล้างตัวกรอง
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <BookMarked size={24} />
          </div>
          <h3>ยังไม่มีบทเรียนในระบบ</h3>
          <p className="description" style={{ textAlign: "center" }}>
            ไปที่หน้า Manage เพื่ออัปโหลดไฟล์ <code>report.md</code> เข้าสู่ Supabase Storage
          </p>
          <Link href="/manage" className="btn btn-primary" style={{ marginTop: "var(--space-sm)" }}>
            อัปโหลดบทเรียนแรก
          </Link>
        </div>
      )}
    </div>
  );
}
