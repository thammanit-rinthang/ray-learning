# Ray Learning Report Viewer

Standalone Next.js App Router application. The Python pipeline only generates `report.md`; it is not a runtime dependency of this app.

## Content flow

```text
Python -> report.md -> Manage upload -> Supabase Storage (private bucket)
                                      -> Supabase PostgreSQL lesson metadata
                                      -> Next.js reader and AI context
```

Upload a generated report from `/manage`. The app stores the Markdown in the `lesson-reports` bucket and stores its title, course, chapter, object path, hash, and timestamps in PostgreSQL. Reader and AI routes load content from Storage through the authenticated server session.

## Local setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run db:generate
npm run db:migrate
npm run dev
```

Run `supabase/storage.sql` once in the Supabase SQL Editor. Configure Supabase Auth email/password and Google OAuth. The callback URL is `http://localhost:3000/auth/callback` locally and `https://YOUR_DOMAIN/auth/callback` in production.

## Environment

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, and the private server-side AI variables described in `.env.example`.

AI defaults to Vertex AI locally and OpenRouter in production. Set `AI_PROVIDER=vertex` or `AI_PROVIDER=openrouter` to override the default. Never expose service-account JSON or AI API keys as `NEXT_PUBLIC_*` variables.

## Vercel

Set the Vercel project root to `report-viewer`, configure the variables from `.env.example`, run the Drizzle migration against Supabase PostgreSQL, and deploy. No parent `output/` directory or Python server is needed at runtime.

`scripts/sync-reports.ts` is retained only as a local migration/import helper for existing files. Production content is managed through `/manage` and Supabase Storage.
