import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { quizAttempts, profiles } from "@/lib/db/schema";

const attemptSchema = z.object({
  quizId: z.string().uuid(),
  score: z.number().int().min(0),
  total: z.number().int().min(1),
  answers: z.record(z.string(), z.string()).default({}),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!db) {
    return Response.json({ error: "Database is not configured" }, { status: 503 });
  }

  const input = attemptSchema.parse(await request.json());

  try {
    // Ensure profile exists
    await db.insert(profiles).values({
      id: user.id,
      email: user.email || "user@example.com",
    }).onConflictDoUpdate({
      target: profiles.id,
      set: { email: user.email || "user@example.com", updatedAt: new Date() },
    });

    const [attempt] = await db.insert(quizAttempts).values({
      quizId: input.quizId,
      userId: user.id,
      score: input.score,
      total: input.total,
      answers: input.answers,
      submittedAt: new Date(),
    }).returning();

    return Response.json({ success: true, attemptId: attempt?.id });
  } catch (error) {
    console.error("Failed to save quiz attempt:", error);
    return Response.json({
      error: error instanceof Error ? error.message : "Failed to record quiz attempt",
    }, { status: 500 });
  }
}
