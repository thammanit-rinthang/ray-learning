import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { lessonSlug, storagePath } from "@/lib/lesson-path";
import { REPORT_BUCKET } from "@/lib/storage-reports";
import { createClient } from "@/lib/supabase/server";

const MAX_REPORT_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await requireUser();
  if (!db) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const course = String(form.get("course") ?? "").trim();
  const chapter = String(form.get("chapter") ?? "").trim() || null;
  const lessonId = String(form.get("lessonId") ?? "").trim() || null;
  const file = form.get("file");

  if (!title || !course || !(file instanceof File)) {
    return NextResponse.json({ error: "title, course and a Markdown file are required" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".md") || file.size > MAX_REPORT_BYTES) {
    return NextResponse.json({ error: "Only .md files up to 5 MB are supported" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const reportHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const supabase = await createClient();
  const [existing] = lessonId
    ? await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1)
    : [];
  if (lessonId && !existing) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const slug = existing?.slug ?? lessonSlug(course, chapter, title);
  const reportPath = existing?.reportPath ?? storagePath(course, chapter, title);
  const now = new Date();

  const { error: uploadError } = await supabase.storage.from(REPORT_BUCKET).upload(reportPath, buffer, {
    contentType: "text/markdown; charset=utf-8",
    upsert: true,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 502 });

  try {
    const [lesson] = existing
      ? await db.update(lessons).set({ title, course, chapter, reportPath, reportHash, reportUpdatedAt: now, updatedAt: now }).where(eq(lessons.id, existing.id)).returning()
      : await db.insert(lessons).values({ slug, title, course, chapter, reportPath, reportHash, reportUpdatedAt: now, updatedAt: now }).returning();

    if (existing && existing.reportPath !== reportPath) {
      await supabase.storage.from(REPORT_BUCKET).remove([existing.reportPath]);
    }
    return NextResponse.json({ lesson });
  } catch (error) {
    await supabase.storage.from(REPORT_BUCKET).remove([reportPath]);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save lesson metadata" }, { status: 500 });
  }
}
