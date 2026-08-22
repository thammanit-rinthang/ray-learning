import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { requireUser } from "@/lib/auth";
import { getReport } from "@/lib/reports";
import { ArrowLeft, HelpCircle, MessageSquare, BookOpen, Layers } from "lucide-react";

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser();
  const { slug } = await params;
  const report = await getReport(slug);
  if (!report) notFound();

  return (
    <div className="reading-container">
      {/* Top Breadcrumb & Back Action */}
      <div style={{ marginBottom: "var(--space-md)" }}>
        <Link
          href="/"
          className="btn btn-ghost btn-sm"
          style={{ paddingLeft: 0, color: "var(--color-text-secondary)" }}
        >
          <ArrowLeft size={16} />
          <span>กลับไปคลังบทเรียน</span>
        </Link>
      </div>

      {/* Header & Quick Actions */}
      <div className="reading-toolbar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span className="badge badge-dark">
              <Layers size={11} />
              {report.item.course}
            </span>
            {report.item.chapter && (
              <span className="badge badge-neutral">
                {report.item.chapter}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: "var(--text-2xl)", marginTop: "0.25rem" }}>{report.item.title}</h1>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link
            href={`/quiz?lesson=${report.item.id}`}
            className="btn btn-secondary btn-sm"
          >
            <HelpCircle size={15} />
            <span>ทำแบบทดสอบ</span>
          </Link>
          <Link
            href={`/chat?lesson=${report.item.id}`}
            className="btn btn-primary btn-sm"
          >
            <MessageSquare size={15} />
            <span>ถาม AI บทนี้</span>
          </Link>
        </div>
      </div>

      {/* Main Document Content */}
      <article className="prose-doc">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content}</ReactMarkdown>
      </article>

      {/* Bottom Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "var(--space-xl)",
          paddingTop: "var(--space-lg)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <Link href="/" className="btn btn-secondary">
          <BookOpen size={16} />
          <span>ดูบทเรียนทั้งหมด</span>
        </Link>
        <Link href={`/quiz?lesson=${report.item.id}`} className="btn btn-primary">
          <HelpCircle size={16} />
          <span>ทดสอบความเข้าใจบทนี้</span>
        </Link>
      </div>
    </div>
  );
}
