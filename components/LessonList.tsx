"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  BookOpen,
  HelpCircle,
  MessageSquare,
  ArrowRight,
  BookMarked,
  Layers,
  GraduationCap,
  FolderTree,
  List,
  CheckCircle2,
  X,
} from "lucide-react";
import type { ReportIndexItem } from "@/lib/reports";

interface LessonListProps {
  initialReports: ReportIndexItem[];
}

export function LessonList({ initialReports }: LessonListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

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

  // Group filtered reports by course
  const groupedCourses = useMemo(() => {
    const map = new Map<string, ReportIndexItem[]>();
    filteredReports.forEach((report) => {
      const courseName = report.course || "วิชาทั่วไป";
      if (!map.has(courseName)) {
        map.set(courseName, []);
      }
      map.get(courseName)!.push(report);
    });

    return Array.from(map.entries()).map(([courseName, items]) => ({
      courseName,
      items,
    }));
  }, [filteredReports]);

  function renderLessonCard(report: ReportIndexItem) {
    return (
      <div key={report.id} className="card">
        <div>
          <div className="card-header">
            <span className="badge badge-neutral">
              <Layers size={11} />
              {report.course}
            </span>
            {report.chapter && (
              <span className="badge badge-neutral" style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" }}>
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
    );
  }

  return (
    <div>
      {/* Stats Summary Bar */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">หมวดหมู่วิชา (Courses)</span>
          <span className="stat-value">{courses.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">บทเรียนทั้งหมด (Lessons)</span>
          <span className="stat-value">{initialReports.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ความพร้อมระบบ</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
            <CheckCircle2 size={15} style={{ color: "var(--color-success)" }} />
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-success-text)" }}>
              AI & Storage พร้อมใช้งาน
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls Toolbar */}
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
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-md)", justifyContent: "space-between" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
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

          {/* View Mode Switcher */}
          <div style={{ display: "flex", background: "var(--color-surface-subtle)", padding: "3px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "var(--text-xs)",
                fontWeight: 650,
                borderRadius: "var(--radius-sm)",
                border: "none",
                cursor: "pointer",
                background: viewMode === "grouped" ? "var(--color-surface)" : "transparent",
                color: viewMode === "grouped" ? "var(--color-pink-accent)" : "var(--color-text-secondary)",
                boxShadow: viewMode === "grouped" ? "var(--shadow-xs)" : "none",
                transition: "all var(--dur-fast)",
              }}
            >
              <FolderTree size={14} />
              <span>แยกตามวิชา</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "var(--text-xs)",
                fontWeight: 650,
                borderRadius: "var(--radius-sm)",
                border: "none",
                cursor: "pointer",
                background: viewMode === "flat" ? "var(--color-surface)" : "transparent",
                color: viewMode === "flat" ? "var(--color-pink-accent)" : "var(--color-text-secondary)",
                boxShadow: viewMode === "flat" ? "var(--shadow-xs)" : "none",
                transition: "all var(--dur-fast)",
              }}
            >
              <List size={14} />
              <span>แสดงทั้งหมด</span>
            </button>
          </div>
        </div>

        {/* Course Filter Pills */}
        {courses.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-xs)",
              overflowX: "auto",
              paddingBottom: "2px",
              borderTop: "1px solid var(--color-border-subtle)",
              paddingTop: "var(--space-xs)",
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${selectedCourse === "all" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSelectedCourse("all")}
            >
              ทุกวิชา ({initialReports.length})
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

      {/* Lesson Content: Grouped by Course or Flat */}
      {filteredReports.length > 0 ? (
        viewMode === "grouped" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
            {groupedCourses.map((group) => (
              <section key={group.courseName} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                {/* Course Header Banner */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 18px",
                    background: "var(--color-surface-subtle)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: "32px",
                        height: "32px",
                        borderRadius: "var(--radius-md)",
                        background: "var(--color-primary)",
                        color: "var(--color-primary-text)",
                      }}
                    >
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: "var(--text-md)", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
                        {group.courseName}
                      </h2>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
                        หลักสูตรรายวิชา
                      </span>
                    </div>
                  </div>

                  <span className="badge badge-neutral" style={{ color: "var(--color-pink-text)", borderColor: "var(--color-pink-border)" }}>
                    {group.items.length} บทเรียน
                  </span>
                </div>

                {/* Course Lessons Grid */}
                <div className="card-grid">
                  {group.items.map((report) => renderLessonCard(report))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="card-grid">
            {filteredReports.map((report) => renderLessonCard(report))}
          </div>
        )
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
