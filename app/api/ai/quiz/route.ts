import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getReportsByIds } from "@/lib/reports";
import { getVertexAI, getVertexModel, quizResponseSchema } from "@/lib/vertex";
import { getAIProvider, getOpenRouter, getOpenRouterModel } from "@/lib/ai";
import { db } from "@/lib/db";
import { profiles, quizzes, quizQuestions } from "@/lib/db/schema";

const requestSchema = z.object({
  lessonIds: z.array(z.string()).min(1),
  count: z.number().int().min(1).max(20).default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

const outputSchema = z.object({
  title: z.string(),
  questions: z.array(z.object({
    type: z.enum(["multiple_choice", "short_answer"]),
    prompt: z.string(),
    options: z.array(z.string()).default([]),
    answer: z.string(),
    explanation: z.string(),
    sourceSection: z.string().optional(),
  })),
});

export async function POST(request: Request) {
  const user = await requireUser();
  const input = requestSchema.parse(await request.json());
  const reports = await getReportsByIds(input.lessonIds);
  if (!reports.length) return Response.json({ error: "ไม่พบรายงานที่เลือก" }, { status: 404 });
  const source = reports.map(({ item, content }) => `## ${item.title}\n${content}`).join("\n\n");
  const prompt = `คุณเป็นผู้ช่วยสร้างข้อสอบภาษาไทย สร้างข้อสอบ ${input.count} ข้อ ระดับ ${input.difficulty} จากรายงานที่แนบเท่านั้น ห้ามแต่งข้อมูลนอกแหล่งข้อมูล และให้ sourceSection เป็นชื่อหัวข้อในรายงาน\n\n${source}`;
  const provider = getAIProvider();
  let raw: string;
  if (provider === "vertex") {
    const response = await getVertexAI().models.generateContent({ model: getVertexModel(), contents: prompt, config: { temperature: 0.2, responseMimeType: "application/json", responseSchema: quizResponseSchema } });
    raw = response.text ?? "{}";
  } else {
    const response = await getOpenRouter().chat.completions.create({ model: getOpenRouterModel(), temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: "ตอบเป็น JSON ตาม schema: {title:string,questions:[{type:'multiple_choice'|'short_answer',prompt:string,options:string[],answer:string,explanation:string,sourceSection?:string}]}" }, { role: "user", content: prompt }] });
    raw = response.choices[0]?.message.content ?? "{}";
  }
  const result = outputSchema.parse(JSON.parse(raw));

  let savedQuizId: string | null = null;
  if (db && user.id) {
    try {
      // Ensure user profile exists for FK reference
      await db.insert(profiles).values({
        id: user.id,
        email: user.email || "user@example.com",
      }).onConflictDoUpdate({
        target: profiles.id,
        set: { email: user.email || "user@example.com", updatedAt: new Date() },
      });

      // Insert Quiz record
      const [savedQuiz] = await db.insert(quizzes).values({
        title: result.title,
        scopeType: input.lessonIds.length === 1 ? "lesson" : "multi_lesson",
        scopeId: input.lessonIds[0],
        difficulty: input.difficulty,
        questionCount: result.questions.length,
        createdBy: user.id,
      }).returning();

      if (savedQuiz && result.questions.length > 0) {
        savedQuizId = savedQuiz.id;
        const defaultLessonId = input.lessonIds.length === 1 ? input.lessonIds[0] : null;
        await db.insert(quizQuestions).values(
          result.questions.map((q, index) => ({
            quizId: savedQuiz.id,
            lessonId: defaultLessonId,
            type: q.type,
            prompt: q.prompt,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            sourceSection: q.sourceSection ?? null,
            sortOrder: index + 1,
          }))
        );
      }
    } catch (dbError) {
      console.error("Failed to save quiz to database:", dbError);
    }
  }

  return Response.json({
    ...result,
    quizId: savedQuizId,
    lessonIds: input.lessonIds,
    provider,
    model: provider === "vertex" ? getVertexModel() : getOpenRouterModel(),
  });
}
