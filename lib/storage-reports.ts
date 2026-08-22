import { eq, inArray } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";

export const REPORT_BUCKET = process.env.SUPABASE_REPORT_BUCKET ?? "lesson-reports";

export type ReportIndexItem = {
  id: string;
  slug: string;
  course: string;
  chapter?: string | null;
  title: string;
  file: string;
  updatedAt?: string;
};

function toIndexItem(lesson: typeof lessons.$inferSelect): ReportIndexItem {
  return { id: lesson.id, slug: lesson.slug, course: lesson.course, chapter: lesson.chapter, title: lesson.title, file: lesson.reportPath, updatedAt: lesson.reportUpdatedAt?.toISOString() ?? lesson.updatedAt.toISOString() };
}

export async function getReportIndex() {
  if (!db) return [];
  try {
    const rows = await db.select().from(lessons).orderBy(lessons.course, lessons.chapter, lessons.title);
    return rows.map(toIndexItem);
  } catch (error) {
    console.warn("Could not load lesson index", error);
    return [];
  }
}

async function downloadReport(reportPath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(REPORT_BUCKET).download(reportPath);
  if (error || !data) throw new Error(error?.message ?? "ไม่สามารถอ่าน report ได้");
  return data.text();
}

export async function getReport(slug: string) {
  if (!db) return null;
  const [lesson] = await db.select().from(lessons).where(eq(lessons.slug, slug)).limit(1);
  if (!lesson) return null;
  return { item: toIndexItem(lesson), content: await downloadReport(lesson.reportPath) };
}

export async function getReportsByIds(ids: string[]) {
  if (!db || ids.length === 0) return [];
  const rows = await db.select().from(lessons).where(inArray(lessons.id, ids));
  return Promise.all(rows.map(async (lesson) => ({ item: toIndexItem(lesson), content: await downloadReport(lesson.reportPath) })));
}
