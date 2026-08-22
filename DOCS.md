# Ray Learning Viewer — Architecture and Operations

## Objective

`report-viewer` is a standalone Next.js application for reading lessons, generating source-grounded quizzes, attempting quizzes, and asking a lesson chatbot for explanations.

The Python system is a producer only. It generates a Markdown file. It does not run beside Next.js, is not imported by the Next.js runtime, and is not required by Vercel.

## Content contract

The single upload contract is:

1. Python produces a UTF-8 `report.md`.
2. An authenticated user opens `/manage` and uploads the file with course, chapter, and title.
3. Next.js uploads the bytes to the private Supabase Storage bucket `lesson-reports`.
4. Next.js records the lesson metadata and object path in PostgreSQL through Drizzle.
5. Reader and AI routes download the report from Storage using the authenticated server session.

`content/reports` is not a production source. The old `scripts/sync-reports.ts` command is retained only for local migration of existing files.

## Architecture

```text
Python producer
    | report.md (manual handoff)
    v
Next.js /manage -> POST /api/lessons/upload
    |                         |
    |                         +--> Supabase Storage: private lesson-reports/*.md
    +--> Drizzle -> Supabase PostgreSQL: lessons metadata

Browser -> Next.js Server Components / Route Handlers
                    |
                    +--> Supabase Auth (email/password, Google OAuth, SSR cookies)
                    +--> PostgreSQL via Drizzle
                    +--> private Storage via authenticated Supabase client
                    +--> Vertex AI locally OR OpenRouter in production
```

## Stack

| Layer | Choice |
|---|---|
| Web | Next.js 16 App Router, TypeScript |
| Authentication | Supabase Auth, `@supabase/ssr`, email/password and Google OAuth |
| Database | Supabase PostgreSQL |
| ORM | Drizzle ORM with `postgres` |
| Files | Supabase Storage, private `lesson-reports` bucket |
| AI local | Vertex AI Gemini through `@google/genai` |
| AI production | OpenRouter through the OpenAI-compatible SDK |
| Hosting | Vercel |

## Authentication and security

All management, AI, and lesson-content operations call `requireUser()` server-side. The Supabase Storage bucket is private; its policies are in `supabase/storage.sql`. The browser never receives a service-account credential, database credential, or AI API key.

The session is persisted in Supabase SSR cookies and refreshed by `proxy.ts`. Logout clears the Supabase session. “Remember this device forever” is not guaranteed: the browser may clear cookies and Supabase/provider session policies can revoke or expire sessions.

The current product has one authenticated role, so every authenticated user can manage lessons. Add an admin claim and Storage/database policies before introducing multiple roles.

## Database model

- `profiles`: application profile keyed by the Supabase Auth user UUID.
- `lessons`: title, course, chapter, stable slug, Storage object path, SHA-256 hash, and timestamps.
- `quizzes`: generated quiz metadata and scope.
- `quiz_questions`: question, options, answer, explanation, and source section.
- `quiz_attempts`: submitted answers, score, and timestamps.
- `chat_sessions`, `chat_messages`: lesson-scoped chatbot history.

Apply schema changes with:

```powershell
npm run db:generate
npm run db:migrate
```

Use `db:push` only for local prototyping when migration history is not yet important.

## Upload API

`POST /api/lessons/upload` accepts `multipart/form-data`:

- `title`: required
- `course`: required
- `chapter`: optional
- `lessonId`: optional; updates an existing lesson
- `file`: required `.md`, maximum 5 MB

`PATCH /api/lessons?id=...` changes metadata without replacing the report. `DELETE /api/lessons?id=...` removes the Storage object and then the database row.

## AI provider policy

Local default: Vertex AI using Application Default Credentials or optional `GOOGLE_SERVICE_ACCOUNT_JSON`.

Production default: OpenRouter using `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.

Set `AI_PROVIDER` explicitly when needed. The quiz and chat prompts receive only the selected lesson/course content returned by `getReportsByIds()` from private Storage.

## Supabase setup

Run `supabase/storage.sql` once. Then configure:

1. Auth URL configuration and redirect URLs.
2. Google provider client ID and secret.
3. PostgreSQL connection string in `DATABASE_URL`.
4. Storage policies from the SQL file.
5. Vercel environment variables.

## Verification boundary

Lint and build prove source-level correctness only. A complete deployment check additionally needs a real Supabase project, a migrated database, a configured private bucket, an authenticated browser session, an uploaded report, and a live AI provider. Verify those separately before claiming end-to-end success.
