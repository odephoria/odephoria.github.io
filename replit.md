# Odephoria

An AI-powered study companion that transforms any material into quizzes, flashcards, summaries, study plans, exam mode, and chat tutor sessions using Claude AI. Organised around persistent "study spaces" where the user pastes material once.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/claudelearn run dev` — run the frontend (port 21351, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod schemas (then manually reset `lib/api-zod/src/index.ts` to only `export * from "./generated/api"`)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (Tailwind, Radix UI, shadcn/ui, Wouter, TanStack Query)
- API: Express 5 with streaming SSE for chat
- AI: Anthropic Claude via Replit AI Integrations (`@workspace/integrations-anthropic-ai`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI source of truth
- `lib/db/src/schema/` — Drizzle schemas: conversations, messages, studySessions, studySpaces
- `artifacts/api-server/src/routes/` — anthropic.ts, study.ts, health.ts, spaces.ts
- `artifacts/claudelearn/src/` — React app: pages/, components/, context/SpaceContext.tsx
- `artifacts/claudelearn/src/context/SpaceContext.tsx` — active study space state
- `artifacts/claudelearn/src/components/StudyLayout.tsx` — main study wrapper (nav+chat sidebar)
- `artifacts/claudelearn/src/components/ChatSidebar.tsx` — right-side streaming chat panel
- `artifacts/claudelearn/src/components/MarkdownRenderer.tsx` — custom markdown → JSX

## Architecture decisions

- **Study spaces**: each space stores materialText + optional youtubeUrl + lastVisitedPage. Creating a space auto-creates a dedicated conversation.
- **Chat uses streaming SSE**: `/api/anthropic/conversations/:id/messages` streams tokens via `text/event-stream` and saves full response to DB at end.
- **SpaceContext**: active space held in React context (no URL param duplication). StudyLayout reads `/space/:id/:page` and loads space from API.
- **No emojis**: AI system prompt forbids emojis; UI uses Lucide icons; MarkdownRenderer handles `**bold**`, headers, lists, code.
- **Paper theme**: warm cream light mode (`index.css`). No dark mode. CSS vars: `--background 38 35% 96%`, `--primary 248 52% 40%`.
- **Codegen gotcha**: after `pnpm --filter @workspace/api-spec run codegen`, manually reset `lib/api-zod/src/index.ts` to `export * from "./generated/api"` only.

## Product

- **Study Spaces**: persistent rooms; paste material + optional YouTube video once
- **Tutor Chat**: streaming chat sidebar always on right in all study tools; full-screen chat page
- **Quiz**: AI MCQs from space material; shuffle + extend (add more) buttons
- **Exam Mode**: hidden answers; submit all → AI gap analysis + improvement plan
- **Flashcards**: flip cards with mastered/review tracking, shuffle
- **Summary**: key points, concept definitions, exam tips, full summary tabs
- **Pomodoro Timer**: focus timer with configurable durations
- **Study Plan**: multi-day roadmap with day completion tracking
- **Progress Dashboard**: session history, scores, streaks

## User preferences

- Paper style (warm cream light mode), no dark mode
- No emojis anywhere in UI or AI responses
- Use Lucide icons instead of emoji
- AI must use **bold** for important terms, proper markdown
- Tutor chat sidebar visible on right of all study tools
- Fun and interactive, hover sounds via Web Audio API

## Gotchas

- Never call service ports directly in curl — always use `localhost:80/api/...`
- `pnpm run typecheck:libs` must pass before `pnpm --filter @workspace/api-server run typecheck`
- `lib/api-zod/src/index.ts` gets overwritten by codegen with invalid exports; always reset to `export * from "./generated/api";`
- Model: `"claude-sonnet-4-6"` throughout
