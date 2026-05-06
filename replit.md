# ClaudeLearn

An AI-powered study companion that transforms any material into quizzes, flashcards, summaries, study plans, and chat tutor sessions using Claude AI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/claudelearn run dev` — run the frontend (port 21351, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas (then manually fix `lib/api-zod/src/index.ts` to only export `./generated/api`)
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
- `lib/api-spec/orval.config.ts` — codegen config (no `schemas` key; avoids duplicate exports)
- `lib/api-zod/src/index.ts` — manually maintained barrel (`export * from "./generated/api"` only)
- `lib/db/src/schema/` — Drizzle schemas: conversations, messages, studySessions
- `artifacts/api-server/src/routes/` — anthropic.ts, study.ts, health.ts
- `artifacts/claudelearn/src/` — React app: pages/, components/, hooks/, lib/sounds.ts

## Architecture decisions

- Chat uses streaming SSE: the `/api/anthropic/conversations/:id/messages` endpoint streams tokens via `text/event-stream` and saves the full response to DB at the end.
- Hover sounds use Web Audio API (no sound files needed) — `lib/sounds.ts` generates tones procedurally.
- All AI calls go through `@workspace/integrations-anthropic-ai` which uses Replit-provisioned API keys.
- The `api-zod/src/index.ts` barrel must be kept to `export * from "./generated/api"` only — codegen regenerates it with extra invalid exports that must be removed.
- Study sessions are saved to DB after quiz completion for progress tracking.

## Product

- **Chat Tutor**: Streaming chat with Claude, persisted conversation history
- **Quiz Generator**: AI-generated MCQs from any material with explanations and difficulty levels
- **Flashcards**: Flip cards with mastered/review tracking and hints
- **Summary Generator**: Structured summaries with key points, concept definitions, exam tips
- **Pomodoro Timer**: Focus timer with configurable durations and session tracking
- **Study Plan**: AI-generated multi-day study roadmap with day completion tracking
- **Progress Dashboard**: Session history, scores, streaks, top topics

## User preferences

- Dark purple UI, always dark mode, no light mode toggle
- No emojis in UI or code
- Hover sounds via Web Audio API (no files)
- Fun and interactive

## Gotchas

- After running codegen, `lib/api-zod/src/index.ts` gets regenerated with invalid exports (`./generated/types`, `./generated/api.schemas`). Always reset it to `export * from "./generated/api";` only.
- Never call service ports directly in curl — always use `localhost:80/api/...` (the shared proxy).
- `pnpm run typecheck:libs` must pass before `pnpm --filter @workspace/api-server run typecheck` will see updated lib types.

## Pointers

- See `.local/skills/pnpm-workspace/` for workspace structure, TS, and codegen details
- See `.local/skills/ai-integrations-anthropic/` for Anthropic integration setup
