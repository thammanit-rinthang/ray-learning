"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  HelpCircle,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  BookMarked,
  Layers,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
import type { ReportIndexItem } from "@/lib/reports";

interface LessonListProps {
  initialReports: ReportIndexItem[];
}

interface CourseSummary {
  courseName: string;
  items: ReportIndexItem[];
  chapterCount: number;
  matchingLessonsCount?: number;
}

export function LessonList({ initialReports }: LessonListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"courses" | "flat">("courses");

  // Group all reports by course
  const coursesMap = useMemo<CourseSummary[]>(() => {
    const map = new Map<string, ReportIndexItem[]>();
    initialReports.forEach((report) => {
      const courseName = report.course || "วิชาทั่วไป";
      if (!map.has(courseName)) {
        map.set(courseName, []);
      }
      map.get(courseName)!.push(report);
    });

    const summaries: CourseSummary[] = [];
    map.forEach((items, courseName) => {
      const chapters = new Set(items.map((i) => i.chapter).filter(Boolean));
      summaries.push({
        courseName,
        items,
        chapterCount: chapters.size,
      });
    });

    // Sort courses alphabetically
    summaries.sort((a, b) => a.courseName.localeCompare(b.courseName));
    return summaries;
  }, [initialReports]);

  // Filtered courses based on search query
  const filteredCourses = useMemo<CourseSummary[]>(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return coursesMap;

    const result: CourseSummary[] = [];
    for (const c of coursesMap) {
      const matchCourseName = c.courseName.toLowerCase().includes(q);
      const matchingLessons = c.items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.chapter && item.chapter.toLowerCase().includes(q))
      );

      if (matchCourseName || matchingLessons.length > 0) {
        result.push({
          ...c,
          matchingLessonsCount: matchCourseName ? c.items.length : matchingLessons.length,
        });
      }
    }
    return result;
  }, [coursesMap, searchQuery]);

  // If a specific course is selected, get its lessons (with search filter applied)
  const currentCourseData = useMemo(() => {
    if (!selectedCourse) return null;
    const course = coursesMap.find((c) => c.courseName === selectedCourse);
    if (!course) return null;

    const q = searchQuery.toLowerCase().trim();
    const filteredItems = !q
      ? course.items
      : course.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            (item.chapter && item.chapter.toLowerCase().includes(q)) ||
            item.course.toLowerCase().includes(q)
        );

    return {
      courseName: course.courseName,
      totalItems: course.items,
      filteredItems,
      chapterCount: course.chapterCount,
    };
  }, [coursesMap, selectedCourse, searchQuery]);

  // Flat lessons search (for "All Lessons" view)
  const allFilteredLessons = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return initialReports;
    return initialReports.filter(
      (report) =>
        report.title.toLowerCase().includes(q) ||
        report.course.toLowerCase().includes(q) ||
        (report.chapter && report.chapter.toLowerCase().includes(q))
    );
  }, [initialReports, searchQuery]);

  // Render a single lesson card
  function renderLessonCard(report: ReportIndexItem) {
    return (
      <article key={report.id} className="card lesson-card">
        <Link
          href={`/lessons/${report.slug}`}
          className="lesson-card-main"
          aria-label={`เปิดบทเรียน ${report.title}`}
        >
          <div>
            <div className="card-header">
              <span className="badge badge-neutral">
                <Layers size={11} />
                {report.course}
              </span>
              {report.chapter && (
                <span className="badge badge-neutral lesson-card-chapter">
                  {report.chapter}
                </span>
              )}
            </div>
            <h3 className="card-title" style={{ fontSize: "var(--text-md)" }}>
              {report.title}
            </h3>
            <p className="lesson-card-hint">อ่านเนื้อหาบทเรียนและเอกสารประกอบ</p>
          </div>
          <div className="card-footer">
            <span>กดเพื่อเปิดบทเรียน</span>
            <span className="lesson-card-arrow">
              <ArrowRight size={15} />
            </span>
          </div>
        </Link>

        <div className="lesson-card-actions" aria-label="การทำงานเพิ่มเติม">
          <Link
            href={`/quiz?lesson=${report.id}&mode=existing`}
            className="btn btn-secondary btn-sm"
          >
            <HelpCircle size={14} />
            <span>Existing Quiz</span>
          </Link>
          <Link
            href={`/quiz?lesson=${report.id}&mode=generate`}
            className="btn btn-secondary btn-sm"
          >
            <Sparkles size={14} />
            <span>Generate Quiz</span>
          </Link>
          <Link
            href={`/chat?lesson=${report.id}`}
            className="btn btn-secondary btn-sm"
          >
            <MessageSquare size={14} />
            <span>ถาม AI</span>
          </Link>
        </div>
      </article>
    );
  }

  // If a course is selected: Show Course Detail View (List of Lessons in this course)
  if (selectedCourse && currentCourseData) {
    return (
      <div>
        {/* Navigation / Breadcrumb */}
        <div className="course-detail-nav">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSelectedCourse(null);
              setSearchQuery("");
            }}
            style={{
              paddingLeft: 0,
              gap: "6px",
              color: "var(--color-text-secondary)",
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            <span>กลับไปหน้ารวมหลักสูตร</span>
          </button>

          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-text-tertiary)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{ cursor: "pointer" }}
              onClick={() => {
                setSelectedCourse(null);
                setSearchQuery("");
              }}
            >
              หลักสูตรทั้งหมด
            </span>
            <span>/</span>
            <span style={{ color: "var(--color-text-primary)", fontWeight: 650 }}>
              {currentCourseData.courseName}
            </span>
          </div>
        </div>

        {/* Course Banner */}
        <section className="course-detail-banner">
          <div className="course-detail-info">
            <div className="course-detail-icon">
              <GraduationCap size={28} />
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <h2
                  style={{
                    fontSize: "var(--text-xl)",
                    fontWeight: 750,
                    color: "var(--color-text-primary)",
                    lineHeight: 1.3,
                  }}
                >
                  {currentCourseData.courseName}
                </h2>
                <span
                  className="badge badge-neutral"
                  style={{
                    color: "var(--color-pink-text)",
                    borderColor: "var(--color-pink-border)",
                  }}
                >
                  {currentCourseData.totalItems.length} บทเรียน
                </span>
              </div>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-secondary)",
                  marginTop: "4px",
                }}
              >
                รวมบทเรียนและเอกสารประกอบการศึกษาของหลักสูตร {currentCourseData.courseName}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {currentCourseData.totalItems[0] && (
              <Link
                href={`/chat?lesson=${currentCourseData.totalItems[0].id}`}
                className="btn btn-secondary btn-sm"
              >
                <MessageSquare size={15} />
                <span>ถาม AI เกี่ยวกับวิชานี้</span>
              </Link>
            )}
            {currentCourseData.totalItems[0] && (
              <Link
                href={`/quiz?lesson=${currentCourseData.totalItems[0].id}&mode=generate`}
                className="btn btn-primary btn-sm"
              >
                <Sparkles size={15} />
                <span>สร้าง Quiz วิชานี้</span>
              </Link>
            )}
          </div>
        </section>

        {/* Filter / Search within Course */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "var(--space-md)",
            justifyContent: "space-between",
            marginBottom: "var(--space-lg)",
          }}
        >
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
              placeholder={`ค้นหาบทเรียนใน ${currentCourseData.courseName}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-text-tertiary)",
                  cursor: "pointer",
                }}
                aria-label="ล้างคำค้นหา"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
            แสดง {currentCourseData.filteredItems.length} จาก {currentCourseData.totalItems.length} บทเรียน
          </span>
        </div>

        {/* Lessons Grid in Course */}
        {currentCourseData.filteredItems.length > 0 ? (
          <div className="card-grid">
            {currentCourseData.filteredItems.map((report) => renderLessonCard(report))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Search size={24} />
            </div>
            <h3>ไม่พบบทเรียนที่ค้นหาในหลักสูตรนี้</h3>
            <p className="description" style={{ textAlign: "center" }}>
              ลองเปลี่ยนคำค้นหา หรือล้างตัวกรอง
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSearchQuery("")}
            >
              ล้างคำค้นหา
            </button>
          </div>
        )}
      </div>
    );
  }

  // Top-Level Courses / All Lessons View
  return (
    <div>
      {/* Stats Summary Bar */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">หลักสูตรทั้งหมด (Courses)</span>
          <span className="stat-value">{coursesMap.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">บทเรียนทั้งหมด (Lessons)</span>
          <span className="stat-value">{initialReports.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ความพร้อมระบบ</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
            <CheckCircle2 size={15} style={{ color: "var(--color-success)" }} />
            <span
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: "var(--color-success-text)",
              }}
            >
              AI & Storage พร้อมใช้งาน
            </span>
          </div>
        </div>
      </div>

      {/* Search & View Mode Toolbar */}
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
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "var(--space-md)",
            justifyContent: "space-between",
          }}
        >
          {/* Search Input */}
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
              placeholder="ค้นหาชื่อหลักสูตร หรือชื่อบทเรียน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-text-tertiary)",
                  cursor: "pointer",
                }}
                aria-label="ล้างคำค้นหา"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* View Mode Switcher */}
          <div
            style={{
              display: "flex",
              background: "var(--color-surface-subtle)",
              padding: "3px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("courses")}
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
                background: viewMode === "courses" ? "var(--color-surface)" : "transparent",
                color:
                  viewMode === "courses"
                    ? "var(--color-pink-accent)"
                    : "var(--color-text-secondary)",
                boxShadow: viewMode === "courses" ? "var(--shadow-xs)" : "none",
                transition: "all var(--dur-fast)",
              }}
            >
              <LayoutGrid size={14} />
              <span>รายชื่อหลักสูตร ({coursesMap.length})</span>
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
                color:
                  viewMode === "flat"
                    ? "var(--color-pink-accent)"
                    : "var(--color-text-secondary)",
                boxShadow: viewMode === "flat" ? "var(--shadow-xs)" : "none",
                transition: "all var(--dur-fast)",
              }}
            >
              <List size={14} />
              <span>บทเรียนทั้งหมด ({initialReports.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering based on ViewMode */}
      {viewMode === "courses" ? (
        filteredCourses.length > 0 ? (
          <div className="card-grid">
            {filteredCourses.map((course) => (
              <div
                key={course.courseName}
                className="course-card"
                onClick={() => {
                  setSelectedCourse(course.courseName);
                  setSearchQuery("");
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedCourse(course.courseName);
                    setSearchQuery("");
                  }
                }}
                aria-label={`เปิดหลักสูตร ${course.courseName}`}
              >
                <div>
                  <div className="course-card-header">
                    <div className="course-card-icon">
                      <GraduationCap size={22} />
                    </div>
                    <span
                      className="badge badge-neutral"
                      style={{
                        color: "var(--color-pink-text)",
                        borderColor: "var(--color-pink-border)",
                        fontWeight: 600,
                      }}
                    >
                      {course.items.length} บทเรียน
                    </span>
                  </div>

                  <h3 className="course-card-title">{course.courseName}</h3>
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--color-text-tertiary)",
                      marginBottom: "var(--space-xs)",
                    }}
                  >
                    มีทั้งหมด {course.items.length} บทเรียน
                    {course.chapterCount > 0 ? ` · ${course.chapterCount} บท` : ""}
                  </p>

                  {/* Preview list of lessons */}
                  <ul className="course-card-preview-list">
                    {course.items.slice(0, 3).map((item) => (
                      <li key={item.id} className="course-card-preview-item">
                        <span className="course-card-preview-dot" />
                        <span>
                          {item.chapter ? `${item.chapter}: ` : ""}
                          {item.title}
                        </span>
                      </li>
                    ))}
                    {course.items.length > 3 && (
                      <li
                        className="course-card-preview-item"
                        style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}
                      >
                        <span>+ อีก {course.items.length - 3} บทเรียน</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="course-card-footer">
                  <span>คลิกเพื่อดูบทเรียนทั้งหมด</span>
                  <span className="course-card-arrow">
                    <ArrowRight size={15} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : initialReports.length > 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Search size={24} />
            </div>
            <h3>ไม่พบหลักสูตรที่ค้นหา</h3>
            <p className="description" style={{ textAlign: "center" }}>
              ลองเปลี่ยนคำค้นหา หรือดูบทเรียนทั้งหมด
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSearchQuery("")}
            >
              ล้างคำค้นหา
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <BookMarked size={24} />
            </div>
            <h3>ยังไม่มีบทเรียนในระบบ</h3>
            <p className="description" style={{ textAlign: "center" }}>
              ไปที่หน้า Manage เพื่ออัปโหลดไฟล์ <code>report.md</code> เข้าสู่ระบบ
            </p>
            <Link
              href="/manage"
              className="btn btn-primary"
              style={{ marginTop: "var(--space-sm)" }}
            >
              อัปโหลดบทเรียนแรก
            </Link>
          </div>
        )
      ) : (
        /* Flat View of All Lessons */
        allFilteredLessons.length > 0 ? (
          <div className="card-grid">
            {allFilteredLessons.map((report) => renderLessonCard(report))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Search size={24} />
            </div>
            <h3>ไม่พบบทเรียนที่ค้นหา</h3>
            <p className="description" style={{ textAlign: "center" }}>
              ลองเปลี่ยนคำค้นหา หรือเลือกดูหลักสูตรทั้งหมด
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSearchQuery("")}
            >
              ล้างคำค้นหา
            </button>
          </div>
        )
      )}
    </div>
  );
}
