import OpenAI from "openai";

export type AIProvider = "vertex" | "openrouter";

export function getAIProvider(): AIProvider {
  const configured = process.env.AI_PROVIDER?.toLowerCase();
  if (configured === "vertex" || configured === "openrouter") return configured;
  return process.env.NODE_ENV === "production" ? "openrouter" : "vertex";
}

export function getOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      ...(process.env.NEXT_PUBLIC_SITE_URL ? { "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL } : {}),
      ...(process.env.OPENROUTER_SITE_NAME ? { "X-OpenRouter-Title": process.env.OPENROUTER_SITE_NAME } : {}),
    },
  });
}

export function getOpenRouterModel() {
  return process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";
}
