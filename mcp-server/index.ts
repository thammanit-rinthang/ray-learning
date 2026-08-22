#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, like, or } from "drizzle-orm";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as schema from "../lib/db/schema.js";

// Silent env loader (no stdout logs)
function loadEnvFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {
    // Ignore error
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));

// Credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const connectionString = process.env.DATABASE_URL;
const bucketName = process.env.SUPABASE_REPORT_BUCKET || "lesson-reports";

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const client = connectionString ? postgres(connectionString, { prepare: false, max: 2 }) : null;
const db = client ? drizzle({ client, schema }) : null;

// Helpers
function slugify(value: string): string {
  return (
    value
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "lesson"
  );
}

function lessonSlug(course: string, chapter: string | null | undefined, title: string): string {
  return [course, chapter, title].filter(Boolean).map((v) => slugify(v!)).join("-");
}

function storagePath(course: string, chapter: string | null | undefined, title: string): string {
  const readable = lessonSlug(course, chapter, title);
  const hash = crypto
    .createHash("sha1")
    .update(`${course}/${chapter ?? ""}/${title}`)
    .digest("hex")
    .slice(0, 10);
  return `${slugify(course)}/${slugify(chapter ?? "general")}/${readable}-${hash}.md`;
}

// MCP Server Instance
const server = new Server(
  {
    name: "ray-learning-admin",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register Available Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "upload_lesson",
        description:
          "Uploads a new lesson or updates an existing lesson by saving its Markdown content to Supabase Storage and recording metadata in the PostgreSQL database.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title of the lesson (e.g. 'Intro to Machine Learning')",
            },
            course: {
              type: "string",
              description: "Course or Subject name (e.g. 'Artificial Intelligence', 'Web Dev')",
            },
            chapter: {
              type: "string",
              description: "Optional chapter or module name (e.g. 'Chapter 1: Neural Networks')",
            },
            content: {
              type: "string",
              description: "Full lesson content formatted in Markdown (.md)",
            },
            lessonId: {
              type: "string",
              description: "Optional UUID of existing lesson if updating instead of creating a new one",
            },
          },
          required: ["title", "course", "content"],
        },
      },
      {
        name: "list_lessons",
        description: "Retrieves a list of all lessons currently stored in the system, with optional course filter.",
        inputSchema: {
          type: "object",
          properties: {
            course: {
              type: "string",
              description: "Optional course name filter",
            },
            search: {
              type: "string",
              description: "Optional search query matching title or chapter",
            },
          },
        },
      },
      {
        name: "get_lesson",
        description: "Fetches full lesson details and its Markdown content by lesson ID or slug.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "UUID of the lesson",
            },
            slug: {
              type: "string",
              description: "Slug of the lesson (e.g. 'ai-chapter-1-intro')",
            },
          },
        },
      },
      {
        name: "delete_lesson",
        description: "Deletes a lesson, removing its Markdown file from Storage and removing its database record.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "UUID of the lesson to delete",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "create_quiz",
        description: "Creates a pre-made quiz with questions and answers for a specific lesson directly in the database.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title of the quiz",
            },
            lessonId: {
              type: "string",
              description: "UUID of the lesson this quiz belongs to",
            },
            difficulty: {
              type: "string",
              enum: ["easy", "medium", "hard"],
              description: "Difficulty level",
            },
            questions: {
              type: "array",
              description: "List of multiple-choice questions",
              items: {
                type: "object",
                properties: {
                  prompt: { type: "string", description: "Question prompt" },
                  options: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of 4 answer options",
                  },
                  answer: { type: "string", description: "The correct option text" },
                  explanation: { type: "string", description: "Explanation of the correct answer" },
                  sourceSection: { type: "string", description: "Section name referenced from lesson" },
                },
                required: ["prompt", "options", "answer", "explanation"],
              },
            },
          },
          required: ["title", "lessonId", "difficulty", "questions"],
        },
      },
    ],
  };
});

// Tool Call Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!db || !supabase) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: "Database or Supabase is not configured. Please verify DATABASE_URL and Supabase keys in .env",
        },
      ],
    };
  }

  try {
    switch (name) {
      case "upload_lesson": {
        const title = String(args?.title ?? "").trim();
        const course = String(args?.course ?? "").trim();
        const chapter = args?.chapter ? String(args.chapter).trim() : null;
        const content = String(args?.content ?? "").trim();
        const lessonId = args?.lessonId ? String(args.lessonId).trim() : null;

        if (!title || !course || !content) {
          return {
            isError: true,
            content: [{ type: "text", text: "title, course and content are required." }],
          };
        }

        const buffer = Buffer.from(content, "utf-8");
        const reportHash = crypto.createHash("sha256").update(buffer).digest("hex");

        const [existing] = lessonId
          ? await db.select().from(schema.lessons).where(eq(schema.lessons.id, lessonId)).limit(1)
          : [];

        if (lessonId && !existing) {
          return {
            isError: true,
            content: [{ type: "text", text: `Lesson with ID '${lessonId}' not found.` }],
          };
        }

        const slug = existing?.slug ?? lessonSlug(course, chapter, title);
        const reportPath = existing?.reportPath ?? storagePath(course, chapter, title);
        const now = new Date();

        // Upload Markdown to Supabase Storage
        const { error: uploadError } = await supabase.storage.from(bucketName).upload(reportPath, buffer, {
          contentType: "text/markdown; charset=utf-8",
          upsert: true,
        });

        if (uploadError) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Supabase Storage upload failed: ${uploadError.message}. Make sure bucket '${bucketName}' exists.`,
              },
            ],
          };
        }

        // Save or update in PostgreSQL database
        const [saved] = existing
          ? await db
              .update(schema.lessons)
              .set({
                title,
                course,
                chapter,
                reportPath,
                reportHash,
                reportUpdatedAt: now,
                updatedAt: now,
              })
              .where(eq(schema.lessons.id, existing.id))
              .returning()
          : await db
              .insert(schema.lessons)
              .values({
                slug,
                title,
                course,
                chapter,
                reportPath,
                reportHash,
                reportUpdatedAt: now,
                updatedAt: now,
              })
              .returning();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  action: existing ? "updated" : "created",
                  lesson: {
                    id: saved.id,
                    slug: saved.slug,
                    title: saved.title,
                    course: saved.course,
                    chapter: saved.chapter,
                    reportPath: saved.reportPath,
                    viewUrl: `/lessons/${saved.slug}`,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_lessons": {
        const courseFilter = args?.course ? String(args.course).trim() : null;
        const searchQuery = args?.search ? String(args.search).trim() : null;

        let query = db.select().from(schema.lessons);
        const conditions = [];

        if (courseFilter) {
          conditions.push(eq(schema.lessons.course, courseFilter));
        }
        if (searchQuery) {
          conditions.push(
            or(
              like(schema.lessons.title, `%${searchQuery}%`),
              like(schema.lessons.chapter, `%${searchQuery}%`)
            )
          );
        }

        const rows = conditions.length > 0 ? await query.where(conditions[0]) : await query;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                rows.map((r) => ({
                  id: r.id,
                  slug: r.slug,
                  course: r.course,
                  chapter: r.chapter,
                  title: r.title,
                  reportPath: r.reportPath,
                  updatedAt: r.updatedAt,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_lesson": {
        const id = args?.id ? String(args.id).trim() : null;
        const slug = args?.slug ? String(args.slug).trim() : null;

        if (!id && !slug) {
          return {
            isError: true,
            content: [{ type: "text", text: "Either 'id' or 'slug' must be provided." }],
          };
        }

        const [lesson] = id
          ? await db.select().from(schema.lessons).where(eq(schema.lessons.id, id)).limit(1)
          : await db.select().from(schema.lessons).where(eq(schema.lessons.slug, slug!)).limit(1);

        if (!lesson) {
          return {
            isError: true,
            content: [{ type: "text", text: "Lesson not found." }],
          };
        }

        const { data, error } = await supabase.storage.from(bucketName).download(lesson.reportPath);
        if (error || !data) {
          return {
            isError: true,
            content: [{ type: "text", text: `Failed to download lesson content: ${error?.message}` }],
          };
        }

        const contentText = await data.text();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  lesson,
                  content: contentText,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "delete_lesson": {
        const id = String(args?.id ?? "").trim();
        if (!id) {
          return {
            isError: true,
            content: [{ type: "text", text: "id is required." }],
          };
        }

        const [lesson] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, id)).limit(1);
        if (!lesson) {
          return {
            isError: true,
            content: [{ type: "text", text: "Lesson not found." }],
          };
        }

        await supabase.storage.from(bucketName).remove([lesson.reportPath]);
        await db.delete(schema.lessons).where(eq(schema.lessons.id, id));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, deletedLessonId: id, title: lesson.title }, null, 2),
            },
          ],
        };
      }

      case "create_quiz": {
        const title = String(args?.title ?? "").trim();
        const lessonId = String(args?.lessonId ?? "").trim();
        const difficulty = (args?.difficulty ?? "medium") as "easy" | "medium" | "hard";
        const questionsList = Array.isArray(args?.questions) ? args?.questions : [];

        if (!title || !lessonId || questionsList.length === 0) {
          return {
            isError: true,
            content: [{ type: "text", text: "title, lessonId and non-empty questions array are required." }],
          };
        }

        // Get first user profile or create admin system profile for FK
        const [profile] = await db.select().from(schema.profiles).limit(1);
        let creatorId = profile?.id;

        if (!creatorId) {
          const [newProfile] = await db
            .insert(schema.profiles)
            .values({
              id: crypto.randomUUID(),
              email: "admin-mcp@system.local",
              displayName: "MCP AI Agent",
            })
            .returning();
          creatorId = newProfile.id;
        }

        const [createdQuiz] = await db
          .insert(schema.quizzes)
          .values({
            title,
            scopeType: "lesson",
            scopeId: lessonId,
            difficulty,
            questionCount: questionsList.length,
            createdBy: creatorId,
          })
          .returning();

        if (createdQuiz) {
          await db.insert(schema.quizQuestions).values(
            questionsList.map((q: any, idx: number) => ({
              quizId: createdQuiz.id,
              lessonId,
              type: "multiple_choice" as const,
              prompt: String(q.prompt),
              options: Array.isArray(q.options) ? q.options : [],
              answer: String(q.answer),
              explanation: String(q.explanation || ""),
              sourceSection: q.sourceSection ? String(q.sourceSection) : null,
              sortOrder: idx + 1,
            }))
          );
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  quiz: createdQuiz,
                  questionsCount: questionsList.length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
        };
    }
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error executing tool '${name}': ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
    };
  }
});

// Run server using stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in MCP Server:", error);
  process.exit(1);
});
