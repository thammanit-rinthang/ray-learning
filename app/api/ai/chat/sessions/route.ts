import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatSessions, chatMessages, profiles } from "@/lib/db/schema";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!db) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("id");
  const lessonId = searchParams.get("lessonId");

  // 1. Fetch single session with all its messages
  if (sessionId) {
    try {
      const [session] = await db
        .select()
        .from(chatSessions)
        .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, user.id)))
        .limit(1);

      if (!session) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(chatMessages.createdAt);

      return Response.json({ session, messages });
    } catch (error) {
      console.error("Error fetching chat session messages:", error);
      return Response.json({ error: "Failed to fetch session messages" }, { status: 500 });
    }
  }

  // 2. Fetch list of sessions for this user
  try {
    const database = db;
    const allSessions = await database
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, user.id))
      .orderBy(desc(chatSessions.updatedAt));

    // Filter by lessonId if requested
    const filteredSessions = lessonId && lessonId !== "all"
      ? allSessions.filter((s) => Array.isArray(s.lessonIds) && s.lessonIds.includes(lessonId))
      : allSessions;

    if (filteredSessions.length === 0) {
      return Response.json([]);
    }

    // Get message counts in a single fast query
    const sessionIds = filteredSessions.map((s) => s.id);
    const msgCounts = await database
      .select({
        sessionId: chatMessages.sessionId,
        count: sql<number>`count(${chatMessages.id})::int`,
      })
      .from(chatMessages)
      .where(inArray(chatMessages.sessionId, sessionIds))
      .groupBy(chatMessages.sessionId);

    const countMap = new Map<string, number>();
    msgCounts.forEach((m) => countMap.set(m.sessionId, Number(m.count)));

    const sessionsWithDetails = filteredSessions.map((session) => ({
      ...session,
      messageCount: countMap.get(session.id) || 0,
    }));

    return Response.json(sessionsWithDetails);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return Response.json({ error: "Failed to fetch chat sessions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!db) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { lessonId, title } = body;

    if (!lessonId) {
      return Response.json({ error: "lessonId is required" }, { status: 400 });
    }

    // Ensure user profile exists
    await db
      .insert(profiles)
      .values({
        id: user.id,
        email: user.email || "user@example.com",
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { email: user.email || "user@example.com", updatedAt: new Date() },
      });

    const [newSession] = await db
      .insert(chatSessions)
      .values({
        userId: user.id,
        title: title || "บทสนทนาใหม่",
        lessonIds: [lessonId],
      })
      .returning();

    return Response.json({ session: newSession });
  } catch (error) {
    console.error("Error creating chat session:", error);
    return Response.json({ error: "Failed to create chat session" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!db) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await db
      .delete(chatSessions)
      .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, user.id)));

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Error deleting chat session:", error);
    return Response.json({ error: "Failed to delete chat session" }, { status: 500 });
  }
}
