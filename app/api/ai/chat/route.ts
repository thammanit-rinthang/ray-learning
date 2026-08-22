import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getReportsByIds } from "@/lib/reports";
import { getVertexAI, getVertexModel } from "@/lib/vertex";
import { getAIProvider, getOpenRouter, getOpenRouterModel } from "@/lib/ai";

const schema = z.object({
  lessonIds: z.array(z.string()).min(1),
  message: z.string().min(1).max(4000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).default([]),
});

export async function POST(request: Request) {
  await requireUser();
  const input = schema.parse(await request.json());
  const reports = await getReportsByIds(input.lessonIds);
  if (!reports.length) return Response.json({ error: "ไม่พบรายงานที่เลือก" }, { status: 404 });
  const source = reports.map(({ item, content }) => `## ${item.title}\n${content}`).join("\n\n");
  const history = input.history.map((entry) => `${entry.role === "user" ? "ผู้ใช้" : "ผู้ช่วย"}: ${entry.content}`).join("\n");
  const prompt = `ตอบภาษาไทยอย่างชัดเจน อ้างอิงเฉพาะรายงานที่แนบ ถ้าไม่มีข้อมูลให้บอกว่าไม่พบในรายงาน และถ้าทำได้ให้ระบุชื่อบท/หัวข้อที่อ้างอิง\n\nรายงาน:\n${source}\n\nประวัติการสนทนา:\n${history}\n\nคำถามล่าสุดจากผู้ใช้:\n${input.message}`;
  const provider = getAIProvider();
  if (provider === "vertex") {
    const response = await getVertexAI().models.generateContent({ model: getVertexModel(), contents: prompt, config: { temperature: 0.3 } });
    return Response.json({ answer: response.text ?? "ไม่สามารถสร้างคำตอบได้", provider, model: getVertexModel() });
  }
  const response = await getOpenRouter().chat.completions.create({ model: getOpenRouterModel(), temperature: 0.3, messages: [{ role: "user", content: prompt }] });
  return Response.json({ answer: response.choices[0]?.message.content ?? "ไม่สามารถสร้างคำตอบได้", provider, model: getOpenRouterModel() });
}
