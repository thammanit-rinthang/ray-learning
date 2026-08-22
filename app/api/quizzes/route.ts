import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { quizzes, quizQuestions, quizAttempts } from "@/lib/db/schema";

export async function GET(request: Request) {
  await requireUser();
  if (!db) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const id = new URL(request.url).searchParams.get("id");

  if (id) {
    try {
      const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id)).limit(1);
      if (!quiz) {
        return Response.json({ error: "Quiz not found" }, { status: 404 });
      }

      const questions = await db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, id))
        .orderBy(quizQuestions.sortOrder);

      const attempts = await db
        .select()
        .from(quizAttempts)
        .where(eq(quizAttempts.quizId, id))
        .orderBy(desc(quizAttempts.createdAt));

      return Response.json({ quiz, questions, attempts });
    } catch (error) {
      console.error("Error fetching single quiz:", error);
      return Response.json({ error: "Failed to fetch quiz" }, { status: 500 });
    }
  }

  try {
    const allQuizzes = await db.select().from(quizzes).orderBy(desc(quizzes.createdAt));
    const allAttempts = await db.select().from(quizAttempts).orderBy(desc(quizAttempts.createdAt));

    const result = allQuizzes.map((quiz) => {
      const attempts = allAttempts.filter((a) => a.quizId === quiz.id);
      const latestAttempt = attempts[0] ?? null;
      const bestAttempt =
        attempts.length > 0
          ? [...attempts].sort(
              (a, b) => (b.score ?? 0) / (b.total || 1) - (a.score ?? 0) / (a.total || 1)
            )[0]
          : null;

      return {
        ...quiz,
        attemptCount: attempts.length,
        latestScore: latestAttempt?.score ?? null,
        latestTotal: latestAttempt?.total ?? null,
        latestAttemptAt: latestAttempt?.createdAt ?? null,
        bestScore: bestAttempt?.score ?? null,
        bestTotal: bestAttempt?.total ?? null,
        attempts: attempts.map((att) => ({
          id: att.id,
          score: att.score,
          total: att.total,
          submittedAt: att.submittedAt || att.createdAt,
          createdAt: att.createdAt,
        })),
      };
    });

    return Response.json(result);
  } catch (error) {
    console.error("Error fetching quizzes list:", error);
    return Response.json({ error: "Failed to fetch quizzes list" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await requireUser();
  if (!db) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await db.delete(quizzes).where(eq(quizzes.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    return Response.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}
