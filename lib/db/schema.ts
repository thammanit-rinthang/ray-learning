import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const quizDifficulty = pgEnum("quiz_difficulty", ["easy", "medium", "hard"]);
export const quizQuestionType = pgEnum("quiz_question_type", ["multiple_choice", "short_answer"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  course: text("course").notNull(),
  chapter: text("chapter"),
  title: text("title").notNull(),
  reportPath: text("report_path").notNull(),
  reportHash: text("report_hash"),
  reportUpdatedAt: timestamp("report_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quizzes = pgTable("quizzes", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  scopeType: text("scope_type").notNull(),
  scopeId: text("scope_id"),
  difficulty: quizDifficulty("difficulty").notNull(),
  questionCount: integer("question_count").notNull(),
  createdBy: uuid("created_by").notNull().references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
  type: quizQuestionType("type").notNull(),
  prompt: text("prompt").notNull(),
  options: jsonb("options").$type<string[]>().default([]).notNull(),
  answer: text("answer").notNull(),
  explanation: text("explanation").notNull(),
  sourceSection: text("source_section"),
  sortOrder: integer("sort_order").notNull(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => profiles.id),
  score: integer("score"),
  total: integer("total").notNull(),
  answers: jsonb("answers").$type<Record<string, string>>().default({}).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id),
  title: text("title").notNull(),
  lessonIds: jsonb("lesson_ids").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
