# Self Curative Learning — Phase 1

A personal problem-solving OS for interview prep. No code editor: you solve on
LeetCode, paste your code + your reasoning here, and an AI reviews **both**.

See [`phase-1-plan.md`](./phase-1-plan.md) for scope and rationale.

## Stack

Next.js 16 (App Router) · Drizzle ORM · Supabase Postgres · OpenRouter (AI) · Tailwind v4

## Setup

```bash
npm install
npm run db:push     # create tables in Supabase
npm run db:seed     # load the question bank (src/lib/db/seed-data.json)
npm run dev
```

Config lives in `.env.local`:

| Var | Notes |
|---|---|
| `DATABASE_URL` | Supabase Postgres connection string (password URL-encoded) |
| `OPENROUTER_API_KEY` | OpenRouter key |
| `OPENROUTER_MODEL` | Tried first. Default `deepseek/deepseek-chat-v3-0324:free`. |
| `OPENROUTER_FALLBACK_MODEL` | Tried if the primary errors. Default `google/gemini-2.5-flash`. |
| `ANTHROPIC_API_KEY` | Final fallback (`claude-sonnet-5`). Set. |

> **Provider chain:** free OpenRouter model → `google/gemini-2.5-flash` → Anthropic.
> This OpenRouter account can't use the free tier (it 404s in ~1s and the chain
> falls straight through to gemini, ~5s). Top up at
> <https://openrouter.ai/settings/credits> to make the free/cheap models work,
> or the Anthropic key covers everything anyway.

## Routes

| Path | What |
|---|---|
| `/` | Dashboard — streak, today's problem, track progress, recent attempts |
| `/practice/[problemId]` | 4-stage solve flow (Understand → Solve → Analysis → Record); shows "Attempt #N" on re-attempts |
| `/interview/[problemId]` | **Phase 2** — mock interview: AI plays interviewer, up to ~6 adaptive questions on your code + reasoning, voice or text input, then an interview scorecard |
| `/analyze` | Standalone "paste any code & analyze" |
| `/problems` | Question bank grouped by track topic |
| `/graph` | Per-topic knowledge graph (solved / accuracy / AI readiness / interview score / revise / confidence) |

## Phases 3–6

| Phase | Route(s) | What |
|---|---|---|
| **3 — Engineering Interview OS** | `/challenges`, `/challenges/[id]` | 22 non-DSA challenges (frontend / backend / API design). Tick requirements, write an approach, submit code/design → staff-engineer review (`src/data/challenges/*.json`, `lib/challenges/evaluate.ts`). |
| **4 — System Design OS** | `/design`, `/design/[id]` | Seven-pass design studio (requirements → scale → data model → API → high-level → deep dives → trade-offs) → principal-engineer review listing what you *missed* and the follow-ups you'd get (`lib/systemdesign/*`). |
| **5 — Career OS** | `/career` | Company readiness (DSA / engineering / system-design %, all **computed live** from the other phases — `lib/career/readiness.ts`), add custom targets, resume tracker (projects / OSS / blogs / applications / referrals). |
| **6 — AI Mentor** | dashboard top card | One brief per day: names the single thing to work on, the concrete next move with a CTA, your strengths/weaknesses, drawn from the knowledge graph + interview red flags + code-review gaps (`lib/mentor/*`, cached in `mentor_briefs`). |

## Accessibility

Skip-to-content link, semantic landmarks (`<header>`/`<nav aria-label>`/`<main id>`/`<footer>`),
`aria-current` on the active nav item, visible `:focus-visible` outlines everywhere,
`role="progressbar"` meters, `prefers-reduced-motion` honoured, icon buttons labelled.

## Phase 2 — Interview Thinking OS

`/interview/[problemId]` (also linked from Stage 4 of a solve and the dashboard).

- The AI interviewer opens with "walk me through your approach", then asks up to
  6 adaptive follow-ups probing complexity, tradeoffs and edge cases — it has
  your latest submitted code + journal for that problem.
- Answer by **typing or speaking** (browser Web Speech API — Chrome/Edge; typing
  works everywhere, no Whisper/server needed).
- "End & grade" (or the interviewer wrapping up) produces an **interview
  scorecard**: communication / clarity / tradeoff discussion / complexity
  explanation, an overall score, a hire verdict, and green/red flags.
- Scores roll into the knowledge graph as a per-topic `Interview` column.
- Stored in `interview_sessions` (transcript + score jsonb).

## Question bank

218 problems across 19 topics live in `src/data/topics/*.json` — one file per
topic (`arrays.json`, `graphs.json`, `dp.json`, …). Each file:

```json
{ "topic": "Arrays", "problems": [
  { "id": "lc_1", "title": "Two Sum", "difficulty": "Easy", "subtopic": "Hashing",
    "leetcodeUrl": "https://leetcode.com/problems/two-sum/",
    "optimalComplexity": "O(n) time / O(n) space",
    "patternTags": ["hashmap"], "companyTags": ["Amazon","Google"],
    "lists": ["blind75","neetcode150"], "trackOrder": 1 }
] }
```

Add problems by appending to a file (or adding a new `<topic>.json`) and running
`npm run db:seed` — it upserts by `id` and never touches your history/status.
Topic strings must match `TRACK` in `src/lib/progression/track.ts`.

**"Find me another problem"** on the dashboard: recommends the next unsolved
problem (revise queue first, then current track topic); when the bank has nothing
unsolved left it asks the AI for a fresh real LeetCode problem and adds it
(`source = "ai"`).

## Status, attempts, revision

- Every practice run appends a `solve_sessions` row (`attempt_number` 1, 2, 3 …) — old attempts are kept.
- `problem_status` holds the current state per problem: `unsolved | solved | revise`.
- Tick / untick / flag-to-revise from the **Problem Bank** page, or from Stage 4 of a solve.
- The **knowledge graph** rolls up per topic: solved count, accuracy, mean AI
  interview-readiness (this is how your first-thought + pasted code feed the
  graph), revise count, and a derived confidence.

## Utilities

```bash
node --env-file=.env.local scripts/reset-progress.mjs   # wipe attempts + analytics, keep the bank
```

## Key modules

- `src/lib/analysis/` — the AI review engine (`engine.ts` is the pure entry point; `prompt.ts` is the interviewer prompt; `schema.ts` is the Zod contract)
- `src/lib/progression/` — the fixed learning track + "what's next" recommender
- `src/lib/knowledge/update.ts` — recomputes a topic's graph row from raw attempts
- `src/lib/ai.ts` — provider plumbing with OpenRouter → fallback → Anthropic
