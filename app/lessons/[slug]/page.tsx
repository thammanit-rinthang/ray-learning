import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { requireUser } from "@/lib/auth";
import { getReport, getReportIndex } from "@/lib/reports";
import { ArrowLeft, HelpCircle, MessageSquare, BookOpen, Layers, Sparkles } from "lucide-react";

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser();
  const { slug } = await params;
  const report = await getReport(slug);
  if (!report) notFound();

  const courseLessons = (await getReportIndex()).filter((item) => item.course === report.item.course);
  const currentIndex = courseLessons.findIndex((item) => item.id === report.item.id);
  const previousLesson = currentIndex > 0 ? courseLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1] : null;

  return (
    <div className="reading-container">
      <div style={{ marginBottom: "var(--space-md)" }}>
        <Link href="/" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, color: "var(--color-text-secondary)" }}>
          <ArrowLeft size={16} />
          <span>กลับไปคลังบทเรียน</span>
        </Link>
      </div>

      <div className="reading-toolbar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span className="badge badge-dark"><Layers size={11} />{report.item.course}</span>
            {report.item.chapter && <span className="badge badge-neutral">{report.item.chapter}</span>}
          </div>
          <h1 style={{ fontSize: "var(--text-2xl)", marginTop: "0.25rem" }}>{report.item.title}</h1>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link href={`/quiz?lesson=${report.item.id}&mode=existing`} className="btn btn-secondary btn-sm">
            <HelpCircle size={15} />
            <span>Existing Quiz</span>
          </Link>
          <Link href={`/quiz?lesson=${report.item.id}&mode=generate`} className="btn btn-primary btn-sm">
            <Sparkles size={15} />
            <span>Generate Quiz</span>
          </Link>
          <Link href={`/chat?lesson=${report.item.id}`} className="btn btn-primary btn-sm">
            <MessageSquare size={15} />
            <span>ถาม AI บทนี้</span>
          </Link>
        </div>
      </div>

      <article className="prose-doc">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content}</ReactMarkdown>
      </article>

      <nav aria-label="Lesson navigation" style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-md)", marginTop: "var(--space-xl)", padding: "var(--space-md) 0", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
        {previousLesson ? <Link href={`/lessons/${previousLesson.slug}`} className="btn btn-secondary btn-sm"><ArrowLeft size={15} /><span>Previous: {previousLesson.title}</span></Link> : <span />}
        {nextLesson ? <Link href={`/lessons/${nextLesson.slug}`} className="btn btn-secondary btn-sm"><span>Next: {nextLesson.title}</span><ArrowLeft size={15} style={{ transform: "rotate(180deg)" }} /></Link> : <span />}
      </nav>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-xl)", paddingTop: "var(--space-lg)", borderTop: "1px solid var(--color-border)" }}>
        <Link href="/" className="btn btn-secondary"><BookOpen size={16} /><span>ดูบทเรียนทั้งหมด</span></Link>
        <Link href={`/quiz?lesson=${report.item.id}&mode=generate`} className="btn btn-primary"><Sparkles size={16} /><span>Generate Quiz จากบทนี้</span></Link>
      </div>
    </div>
  );
}