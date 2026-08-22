import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getReportsByIds } from "@/lib/reports";
import { getVertexAI, getVertexModel } from "@/lib/vertex";
import { getAIProvider, getOpenRouter, getOpenRouterModel } from "@/lib/ai";
import { db } from "@/lib/db";
import { chatSessions, chatMessages, profiles } from "@/lib/db/schema";

const schema = z.object({
  lessonIds: z.array(z.string()).min(1),
  message: z.string().min(1).max(4000),
  sessionId: z.string().optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).default([]),
});

export async function POST(request: Request) {
  const user = await requireUser();
  const input = schema.parse(await request.json());
  const reports = await getReportsByIds(input.lessonIds);
  if (!reports.length) return Response.json({ error: "ไม่พบรายงานที่เลือก" }, { status: 404 });
  const source = reports.map(({ item, content }) => `## ${item.title}\n${content}`).join("\n\n");
  const history = input.history.map((entry) => `${entry.role === "user" ? "ผู้ใช้" : "ผู้ช่วย"}: ${entry.content}`).join("\n");
  const prompt = `ตอบภาษาไทยอย่างชัดเจน อ้างอิงเฉพาะรายงานที่แนบ ถ้าไม่มีข้อมูลให้บอกว่าไม่พบในรายงาน และถ้าทำได้ให้ระบุชื่อบท/หัวข้อที่อ้างอิง\n\nรายงาน:\n${source}\n\nประวัติการสนทนา:\n${history}\n\nคำถามล่าสุดจากผู้ใช้:\n${input.message}`;
  const provider = getAIProvider();
  
  let answer: string;
  let model: string;
  if (provider === "vertex") {
    model = getVertexModel();
    const response = await getVertexAI().models.generateContent({ model, contents: prompt, config: { temperature: 0.3 } });
    answer = response.text ?? "ไม่สามารถสร้างคำตอบได้";
  } else {
    model = getOpenRouterModel();
    const response = await getOpenRouter().chat.completions.create({ model, temperature: 0.3, messages: [{ role: "user", content: prompt }] });
    answer = response.choices[0]?.message.content ?? "ไม่สามารถสร้างคำตอบได้";
  }

  let activeSessionId = input.sessionId || null;

  // Persist session and messages in database if available
  if (db && user.id) {
    try {
      // Ensure user profile
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

      if (activeSessionId) {
        // Verify session belongs to user
        const [existing] = await db
          .select()
          .from(chatSessions)
          .where(and(eq(chatSessions.id, activeSessionId), eq(chatSessions.userId, user.id)))
          .limit(1);

        if (!existing) {
          activeSessionId = null;
        }
      }

      if (!activeSessionId) {
        // Create a new session with title derived from user query
        const autoTitle = input.message.length > 35 ? `${input.message.slice(0, 35)}...` : input.message;
        const [newSession] = await db
          .insert(chatSessions)
          .values({
            userId: user.id,
            title: autoTitle,
            lessonIds: input.lessonIds,
          })
          .returning();
        if (newSession) {
          activeSessionId = newSession.id;
        }
      }

      if (activeSessionId) {
        // Insert User message
        await db.insert(chatMessages).values({
          sessionId: activeSessionId,
          role: "user",
          content: input.message,
        });

        // Insert Assistant response
        await db.insert(chatMessages).values({
          sessionId: activeSessionId,
          role: "assistant",
          content: answer,
        });

        // Update session timestamp
        await db
          .update(chatSessions)
          .set({ updatedAt: new Date() })
          .where(eq(chatSessions.id, activeSessionId));
      }
    } catch (dbErr) {
      console.error("Failed to save chat history to database:", dbErr);
    }
  }

  return Response.json({
    answer,
    sessionId: activeSessionId,
    provider,
    model,
  });
}

