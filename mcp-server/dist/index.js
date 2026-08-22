#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// mcp-server/index.ts
import crypto from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, like, or } from "drizzle-orm";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// lib/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  chatMessages: () => chatMessages,
  chatSessions: () => chatSessions,
  lessons: () => lessons,
  profiles: () => profiles,
  quizAttempts: () => quizAttempts,
  quizDifficulty: () => quizDifficulty,
  quizQuestionType: () => quizQuestionType,
  quizQuestions: () => quizQuestions,
  quizzes: () => quizzes
});
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";
var quizDifficulty = pgEnum("quiz_difficulty", ["easy", "medium", "hard"]);
var quizQuestionType = pgEnum("quiz_question_type", ["multiple_choice", "short_answer"]);
var profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var lessons = pgTable("lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  course: text("course").notNull(),
  chapter: text("chapter"),
  title: text("title").notNull(),
  reportPath: text("report_path").notNull(),
  reportHash: text("report_hash"),
  reportUpdatedAt: timestamp("report_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var quizzes = pgTable("quizzes", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  scopeType: text("scope_type").notNull(),
  scopeId: text("scope_id"),
  difficulty: quizDifficulty("difficulty").notNull(),
  questionCount: integer("question_count").notNull(),
  createdBy: uuid("created_by").notNull().references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var quizQuestions = pgTable("quiz_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
  type: quizQuestionType("type").notNull(),
  prompt: text("prompt").notNull(),
  options: jsonb("options").$type().default([]).notNull(),
  answer: text("answer").notNull(),
  explanation: text("explanation").notNull(),
  sourceSection: text("source_section"),
  sortOrder: integer("sort_order").notNull()
});
var quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => profiles.id),
  score: integer("score"),
  total: integer("total").notNull(),
  answers: jsonb("answers").$type().default({}).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var chatSessions = pgTable("chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id),
  title: text("title").notNull(),
  lessonIds: jsonb("lesson_ids").$type().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

// mcp-server/index.ts
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
var connectionString = process.env.DATABASE_URL;
var bucketName = process.env.SUPABASE_REPORT_BUCKET || "lesson-reports";
if (!supabaseUrl || !supabaseKey) {
  console.error("Warning: Supabase credentials are not fully configured in environment.");
}
var supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
var client = connectionString ? postgres(connectionString, { prepare: false, max: 2 }) : null;
var db = client ? drizzle({ client, schema: schema_exports }) : null;
function slugify(value) {
  return value.normalize("NFKC").trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "lesson";
}
function lessonSlug(course, chapter, title) {
  return [course, chapter, title].filter(Boolean).map((v) => slugify(v)).join("-");
}
function storagePath(course, chapter, title) {
  const readable = lessonSlug(course, chapter, title);
  const hash = crypto.createHash("sha1").update(`${course}/${chapter ?? ""}/${title}`).digest("hex").slice(0, 10);
  return `${slugify(course)}/${slugify(chapter ?? "general")}/${readable}-${hash}.md`;
}
var server = new Server(
  {
    name: "ray-learning-admin",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "upload_lesson",
        description: "Uploads a new lesson or updates an existing lesson by saving its Markdown content to Supabase Storage and recording metadata in the PostgreSQL database.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title of the lesson (e.g. 'Intro to Machine Learning')"
            },
            course: {
              type: "string",
              description: "Course or Subject name (e.g. 'Artificial Intelligence', 'Web Dev')"
            },
            chapter: {
              type: "string",
              description: "Optional chapter or module name (e.g. 'Chapter 1: Neural Networks')"
            },
            content: {
              type: "string",
              description: "Full lesson content formatted in Markdown (.md)"
            },
            lessonId: {
              type: "string",
              description: "Optional UUID of existing lesson if updating instead of creating a new one"
            }
          },
          required: ["title", "course", "content"]
        }
      },
      {
        name: "list_lessons",
        description: "Retrieves a list of all lessons currently stored in the system, with optional course filter.",
        inputSchema: {
          type: "object",
          properties: {
            course: {
              type: "string",
              description: "Optional course name filter"
            },
            search: {
              type: "string",
              description: "Optional search query matching title or chapter"
            }
          }
        }
      },
      {
        name: "get_lesson",
        description: "Fetches full lesson details and its Markdown content by lesson ID or slug.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "UUID of the lesson"
            },
            slug: {
              type: "string",
              description: "Slug of the lesson (e.g. 'ai-chapter-1-intro')"
            }
          }
        }
      },
      {
        name: "delete_lesson",
        description: "Deletes a lesson, removing its Markdown file from Storage and removing its database record.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "UUID of the lesson to delete"
            }
          },
          required: ["id"]
        }
      },
      {
        name: "create_quiz",
        description: "Creates a pre-made quiz with questions and answers for a specific lesson directly in the database.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title of the quiz"
            },
            lessonId: {
              type: "string",
              description: "UUID of the lesson this quiz belongs to"
            },
            difficulty: {
              type: "string",
              enum: ["easy", "medium", "hard"],
              description: "Difficulty level"
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
                    description: "List of 4 answer options"
                  },
                  answer: { type: "string", description: "The correct option text" },
                  explanation: { type: "string", description: "Explanation of the correct answer" },
                  sourceSection: { type: "string", description: "Section name referenced from lesson" }
                },
                required: ["prompt", "options", "answer", "explanation"]
              }
            }
          },
          required: ["title", "lessonId", "difficulty", "questions"]
        }
      }
    ]
  };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (!db || !supabase) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: "Database or Supabase is not configured. Please verify DATABASE_URL and Supabase keys in .env"
        }
      ]
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
            content: [{ type: "text", text: "title, course and content are required." }]
          };
        }
        const buffer = Buffer.from(content, "utf-8");
        const reportHash = crypto.createHash("sha256").update(buffer).digest("hex");
        const [existing] = lessonId ? await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1) : [];
        if (lessonId && !existing) {
          return {
            isError: true,
            content: [{ type: "text", text: `Lesson with ID '${lessonId}' not found.` }]
          };
        }
        const slug = existing?.slug ?? lessonSlug(course, chapter, title);
        const reportPath = existing?.reportPath ?? storagePath(course, chapter, title);
        const now = /* @__PURE__ */ new Date();
        const { error: uploadError } = await supabase.storage.from(bucketName).upload(reportPath, buffer, {
          contentType: "text/markdown; charset=utf-8",
          upsert: true
        });
        if (uploadError) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Supabase Storage upload failed: ${uploadError.message}. Make sure bucket '${bucketName}' exists.`
              }
            ]
          };
        }
        const [saved] = existing ? await db.update(lessons).set({
          title,
          course,
          chapter,
          reportPath,
          reportHash,
          reportUpdatedAt: now,
          updatedAt: now
        }).where(eq(lessons.id, existing.id)).returning() : await db.insert(lessons).values({
          slug,
          title,
          course,
          chapter,
          reportPath,
          reportHash,
          reportUpdatedAt: now,
          updatedAt: now
        }).returning();
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
                    viewUrl: `/lessons/${saved.slug}`
                  }
                },
                null,
                2
              )
            }
          ]
        };
      }
      case "list_lessons": {
        const courseFilter = args?.course ? String(args.course).trim() : null;
        const searchQuery = args?.search ? String(args.search).trim() : null;
        let query = db.select().from(lessons);
        const conditions = [];
        if (courseFilter) {
          conditions.push(eq(lessons.course, courseFilter));
        }
        if (searchQuery) {
          conditions.push(
            or(
              like(lessons.title, `%${searchQuery}%`),
              like(lessons.chapter, `%${searchQuery}%`)
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
                  updatedAt: r.updatedAt
                })),
                null,
                2
              )
            }
          ]
        };
      }
      case "get_lesson": {
        const id = args?.id ? String(args.id).trim() : null;
        const slug = args?.slug ? String(args.slug).trim() : null;
        if (!id && !slug) {
          return {
            isError: true,
            content: [{ type: "text", text: "Either 'id' or 'slug' must be provided." }]
          };
        }
        const [lesson] = id ? await db.select().from(lessons).where(eq(lessons.id, id)).limit(1) : await db.select().from(lessons).where(eq(lessons.slug, slug)).limit(1);
        if (!lesson) {
          return {
            isError: true,
            content: [{ type: "text", text: "Lesson not found." }]
          };
        }
        const { data, error } = await supabase.storage.from(bucketName).download(lesson.reportPath);
        if (error || !data) {
          return {
            isError: true,
            content: [{ type: "text", text: `Failed to download lesson content: ${error?.message}` }]
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
                  content: contentText
                },
                null,
                2
              )
            }
          ]
        };
      }
      case "delete_lesson": {
        const id = String(args?.id ?? "").trim();
        if (!id) {
          return {
            isError: true,
            content: [{ type: "text", text: "id is required." }]
          };
        }
        const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
        if (!lesson) {
          return {
            isError: true,
            content: [{ type: "text", text: "Lesson not found." }]
          };
        }
        await supabase.storage.from(bucketName).remove([lesson.reportPath]);
        await db.delete(lessons).where(eq(lessons.id, id));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, deletedLessonId: id, title: lesson.title }, null, 2)
            }
          ]
        };
      }
      case "create_quiz": {
        const title = String(args?.title ?? "").trim();
        const lessonId = String(args?.lessonId ?? "").trim();
        const difficulty = args?.difficulty ?? "medium";
        const questionsList = Array.isArray(args?.questions) ? args?.questions : [];
        if (!title || !lessonId || questionsList.length === 0) {
          return {
            isError: true,
            content: [{ type: "text", text: "title, lessonId and non-empty questions array are required." }]
          };
        }
        const [profile] = await db.select().from(profiles).limit(1);
        let creatorId = profile?.id;
        if (!creatorId) {
          const [newProfile] = await db.insert(profiles).values({
            id: crypto.randomUUID(),
            email: "admin-mcp@system.local",
            displayName: "MCP AI Agent"
          }).returning();
          creatorId = newProfile.id;
        }
        const [createdQuiz] = await db.insert(quizzes).values({
          title,
          scopeType: "lesson",
          scopeId: lessonId,
          difficulty,
          questionCount: questionsList.length,
          createdBy: creatorId
        }).returning();
        if (createdQuiz) {
          await db.insert(quizQuestions).values(
            questionsList.map((q, idx) => ({
              quizId: createdQuiz.id,
              lessonId,
              type: "multiple_choice",
              prompt: String(q.prompt),
              options: Array.isArray(q.options) ? q.options : [],
              answer: String(q.answer),
              explanation: String(q.explanation || ""),
              sourceSection: q.sourceSection ? String(q.sourceSection) : null,
              sortOrder: idx + 1
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
                  questionsCount: questionsList.length
                },
                null,
                2
              )
            }
          ]
        };
      }
      default:
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown tool: ${name}` }]
        };
    }
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error executing tool '${name}': ${err instanceof Error ? err.message : String(err)}`
        }
      ]
    };
  }
});
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ray Learning Admin MCP Server running on stdio");
}
main().catch((error) => {
  console.error("Fatal error in MCP Server:", error);
  process.exit(1);
});
