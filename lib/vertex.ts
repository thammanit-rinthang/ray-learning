import { GoogleGenAI, Type } from "@google/genai";

type ServiceAccount = { project_id?: string; client_email: string; private_key: string };

export const quizResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["multiple_choice", "short_answer"] },
          prompt: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          answer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          sourceSection: { type: Type.STRING },
        },
        required: ["type", "prompt", "options", "answer", "explanation"],
      },
    },
  },
  required: ["title", "questions"],
};

function readServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return undefined;
  try {
    return JSON.parse(raw.replace(/\\n/g, "\n")) as ServiceAccount;
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
}

export function getVertexAI() {
  const serviceAccount = readServiceAccount();
  const project = process.env.GOOGLE_CLOUD_PROJECT ?? serviceAccount?.project_id;
  if (!project) throw new Error("GOOGLE_CLOUD_PROJECT is not configured");
  return new GoogleGenAI({
    vertexai: true,
    project,
    location: process.env.GOOGLE_CLOUD_LOCATION ?? "global",
    ...(serviceAccount ? {
      googleAuthOptions: {
        credentials: serviceAccount,
        clientOptions: { transporterOptions: { fetchImplementation: globalThis.fetch } },
      },
    } : {}),
  });
}

export function getVertexModel() {
  return process.env.VERTEX_MODEL ?? "gemini-2.5-flash";
}
