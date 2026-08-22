import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { REPORT_BUCKET } from "@/lib/storage-reports";
import { createClient } from "@/lib/supabase/server";

const metadataSchema = z.object({
  title: z.string().trim().min(1),
  course: z.string().trim().min(1),
  chapter: z.string().trim().nullable().optional(),
});

export async function GET() {
  await requireUser();
  if (!db) return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  return Response.json(await db.select().from(lessons));
}

export async function PATCH(request: Request) {
  await requireUser();
  if (!db) return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  const input = metadataSchema.parse(await request.json());
  const [lesson] = await db.update(lessons).set({ ...input, updatedAt: new Date() }).where(eq(lessons.id, id)).returning();
  if (!lesson) return Response.json({ error: "Lesson not found" }, { status: 404 });
  return Response.json({ lesson });
}

export async function DELETE(request: Request) {
  await requireUser();
  if (!db) return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!lesson) return Response.json({ error: "Lesson not found" }, { status: 404 });

  const supabase = await createClient();
  const { error: storageError } = await supabase.storage.from(REPORT_BUCKET).remove([lesson.reportPath]);
  if (storageError) return Response.json({ error: storageError.message }, { status: 502 });
  await db.delete(lessons).where(eq(lessons.id, id));
  return Response.json({ ok: true });
}
