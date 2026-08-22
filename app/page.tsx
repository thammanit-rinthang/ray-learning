import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getReportIndex } from "@/lib/reports";
import { LessonList } from "@/components/LessonList";
import { MessageSquare, PlusCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireUser();
  const reports = await getReportIndex();

  return (
    <>
      <section className="page-header-row">
        <div>
          <div className="eyebrow">
            <span>Learning Dashboard</span>
          </div>
          <h1 style={{ marginTop: "0.4rem" }}>คลังบทเรียนและรายงาน</h1>
          <p className="description" style={{ marginTop: "0.5rem" }}>
            อ่านเอกสารเนื้อหาจริง สร้างแบบฝึกหัดทดสอบความเข้าใจ และสนทนากับ AI เพื่อเจาะลึกเฉพาะจุด
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href="/manage" className="btn btn-secondary">
            <PlusCircle size={16} />
            <span>จัดการเนื้อหา</span>
          </Link>
          <Link href="/chat" className="btn btn-primary">
            <MessageSquare size={16} />
            <span>ถาม AI</span>
          </Link>
        </div>
      </section>

      <LessonList initialReports={reports} />
    </>
  );
}
