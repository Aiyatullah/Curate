# Self Curative Learning — Phase 1 Implementation Plan

> Scope: **Phase 1 only** — the "Problem Solving OS". Everything in Phases 2–6 of
> [`Curative-learner.md`](../Pompu%20OS/Curative-learner.md) is explicitly out of scope here and
> should not influence Phase 1 architecture decisions beyond keeping the schema extensible.

---

## 0. What Phase 1 actually is

A single-user (you) web app that makes daily DSA practice frictionless **and** forces you to
articulate your thinking before and after you code. The differentiator vs. a LeetCode tracker is
the **Thinking Journal + AI Reflection loop**: you write how you're approaching a problem, you
paste your code, and the system tells you where your *thinking* and your *code* fall short.

Phase 1 delivers five things:

1. **Dashboard** — streak, current topic, today's problem, weak areas.
2. **Question Bank + Smart Progression** — curated problems, recommended along a fixed track.
3. **Daily Practice Flow** — read → timer → editor (Monaco).
4. **Thinking Journal** — structured prompts before and after solving.
5. **Solution Analysis (AI)** — paste code + thoughts → scored, actionable feedback.
6. **Knowledge Graph** — per-topic solved count, accuracy, confidence.

---

## 1. Time estimate

Assumes: one developer, working with Claude Code as pair, ~3–4 focused hours/day, Next.js/TS
stack already familiar, no auth in Phase 1 (single user, local or single-tenant deploy).

| Block | Work | Solo + Claude | Notes |
|---|---|---|---|
| A | Project scaffold, DB schema, seed data (Blind 75 subset ~40 Qs) | **1–1.5 days** | Drizzle + Postgres (Supabase or local). Seeding is the slow part — curating problem metadata. |
| B | Dashboard + Knowledge Graph read views | **1 day** | Mostly queries + layout. |
| C | Daily Practice Flow (problem view, timer, Monaco editor, language switch) | **1.5–2 days** | Monaco integration + run-locally-or-not decision. No code *execution* in Phase 1 (see §6). |
| D | Thinking Journal (pre/post prompts, hint system, persistence) | **1 day** | Straightforward forms + state. |
| E | **Solution Analysis engine** (prompt design, LLM call, scoring schema, "paste code & analyze") | **2–3 days** | The hard, high-value part. Prompt iteration dominates. |
| F | Progression logic (track definition, "what's next" recommender) | **0.5–1 day** | Rules-based, not ML. |
| G | Polish: UI pass, empty/error/loading states, responsive, dark mode | **1.5–2 days** | Per your global design-quality rules — no template look. |
| H | Testing (unit for progression + scoring parsing, a couple E2E flows) | **1 day** | 80% on the logic modules; visual regression optional. |
| **Total** | | **~11–15 working days** (≈ **2.5–3 calendar weeks** part-time) | Matches the "build only Phase 1 for 2–3 weeks" recommendation in the source doc. |

**Fast path (MVP-of-the-MVP): ~5–6 days.** Cut: hint system, knowledge-graph confidence,
multi-language editor (Python only), seed only 15 problems. Keep: practice flow, thinking
journal, solution analysis. This is enough to use it daily.

**Risk multipliers:**
- Adding auth + multi-user now: **+2–3 days**.
- Adding real code execution (Judge0 / sandboxed runner): **+3–5 days** and ongoing cost/security.
- Chasing "perfect" AI feedback prompts: unbounded — timebox to 1 day of iteration, ship, refine from real usage.

---

## 2. Where the "Problem Solving" + reflection part lives

Your question: *where do we make the problem-solving part, plus a part where the system says —
based on your thoughts, how ready are you, how much are you brute-forcing vs. writing efficient
code, how are you thinking, how should you think, what's lacking from your code — and a
paste-code-and-analyze part.*

**Answer: it's one screen — the "Solve" screen — with the analysis as a distinct panel/step.**
The single source of truth is a `solve_sessions` (attempt) record. Structure the screen as a
4-stage vertical flow so the reflection is *forced* before code and *earned* after:

```
/practice/[problemId]   →  one SolveSession per attempt

┌── Stage 1 · Understand ─────────────────────────────┐
│ Problem statement (read-only)                       │
│ "First thought?"            → journal.firstThought  │
│ "Brute force idea + its Big-O?" → journal.bruteForce│
│ [Start Timer]  (25:00 default, editable)            │
└────────────────────────────────────────────────────┘
┌── Stage 2 · Solve ─────────────────────────────────┐
│ Monaco editor (Python / Java / JS / Go)            │
│ Hints (progressive, 3 levels, collapsed)          │
│ "Why does this work?"       → journal.whyItWorks   │
│ [Submit for Analysis]                              │
└────────────────────────────────────────────────────┘
┌── Stage 3 · Analysis (AI) ─────────────────────────┐   ← THE REFLECTION PART
│ Reads: problem meta + your journal + your code     │
│ Returns structured JSON → rendered as scorecards   │
│  • Correctness            n/10  + note             │
│  • Complexity (vs optimal) n/10 + your Big-O vs real│
│  • Code Quality           n/10  + specific lines   │
│  • Interview Readiness    n/10                     │
│  • Thinking review: "You jumped to code without a  │
│    brute-force baseline" / "Good: you named the    │
│    space-time tradeoff"                            │
│  • "What's lacking": bullet list of concrete gaps  │
│  • "How you should think next time": 2–3 steps     │
└────────────────────────────────────────────────────┘
┌── Stage 4 · Record ────────────────────────────────┐
│ Self-rating (Easy/OK/Hard), mark solved            │
│ Updates knowledge_graph + streak                  │
└────────────────────────────────────────────────────┘
```

### Standalone "Paste Code & Analyze" mode

Same Stage-3 engine, no problem required. Route: `/analyze`.
Inputs: code (Monaco) + optional "what problem is this / what were you thinking" textarea +
language. Output: the same scorecard, minus problem-specific correctness (it evaluates against
your stated intent). This lets you throw *any* snippet at it — interview post-mortems, old
solutions, work code. Store as `analysis_sessions` (no `problemId`).

**Design decision:** one analysis engine, two entry points. The engine is a pure function
`analyze({ problem?, intent, journal?, code, language }) → AnalysisResult`. Keep it in
`src/lib/analysis/` so it's independently testable and Phase 2 (voice) can reuse it.

---

## 3. Data model (Phase 1)

Drizzle / Postgres. Keep it small; design for extension.

```ts
// problems — the question bank
problems: {
  id: text (pk),           // "lc_001"
  title, difficulty, topic, subtopic,
  leetcodeUrl, statementMd,           // markdown body shown in Stage 1
  optimalComplexity: text,            // "O(n) time / O(n) space" — used by analysis
  patternTags: text[],                // ["hashmap","complement"]
  inBlind75, inNeetcode150, inGrind169: boolean,
  trackOrder: integer,                // position in progression
}

// solve_sessions — one per attempt on a problem
solveSessions: {
  id, problemId (fk), createdAt, durationSec,
  language,
  firstThought, bruteForceIdea, bruteForceBigO,   // Stage 1 journal
  whyItWorks,                                      // Stage 2 journal
  code: text,
  hintsUsed: integer,
  analysis: jsonb,          // AnalysisResult (see §4)
  selfRating: text,         // "easy" | "ok" | "hard"
  solved: boolean,
}

// analysis_sessions — standalone /analyze runs (no problem)
analysisSessions: {
  id, createdAt, language, intent: text, code: text,
  analysis: jsonb,
}

// knowledge_graph — one row per topic
knowledgeGraph: {
  topic: text (pk),
  solvedCount, attemptCount: integer,
  accuracyPct: integer,      // derived: solved / attempt
  confidence: text,          // "low" | "medium" | "high" — rule from accuracy + recency
  lastPracticedAt,
}

// app_state — single row, denormalized dashboard cache
appState: {
  id: 1,
  currentPhase, currentTopic: text,
  streakDays: integer,
  lastActiveDate: date,
}
```

Weak areas on the dashboard = `knowledgeGraph` rows where `confidence = 'low'` OR
`accuracyPct < 60`, ordered by `attemptCount desc`.

---

## 4. Analysis engine contract

```ts
type AnalysisResult = {
  scores: {
    correctness: number;        // 0-10
    complexity: number;         // 0-10, vs problem.optimalComplexity
    codeQuality: number;        // 0-10
    interviewReadiness: number; // 0-10
  };
  detectedComplexity: { time: string; space: string };   // what the LLM thinks the code is
  claimedVsActual: string;      // compares journal.bruteForceBigO / whyItWorks to detectedComplexity
  thinkingReview: {
    good: string[];             // what you did right in your journal
    gaps: string[];             // "no brute-force baseline stated", "didn't consider edge cases"
  };
  codeIssues: Array<{ severity: "high"|"med"|"low"; line?: number; note: string }>;
  whatsLacking: string[];       // concrete, e.g. "no handling for empty input"
  howToThinkNextTime: string[]; // 2-3 ordered steps
  readinessVerdict: string;     // one-line: "Close — tighten tradeoff articulation"
};
```

**Implementation:**
- Single LLM call, `response_format` JSON (or tool-call) to force the schema.
- Model: start with Claude via API (`claude-sonnet-5`) — quality matters here more than cost;
  fall back to OpenRouter free tier only if budget forces it.
- Prompt gets: problem statement + `optimalComplexity` + `patternTags`, the full journal, the
  code, the language. System prompt frames it as a **senior interviewer reviewing both the
  reasoning and the code**, required to be specific (cite lines, name the missing step).
- Validate the response with Zod; on parse failure, one retry, then show a graceful "analysis
  unavailable" state — never block marking the problem solved.
- Cache nothing in Phase 1 (attempts are unique); log token usage to console for now.

---

## 5. Suggested structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── practice/[problemId]/page.tsx   # 4-stage solve flow
│   ├── analyze/page.tsx            # standalone paste-code
│   ├── problems/page.tsx           # question bank browser
│   ├── graph/page.tsx             # knowledge graph
│   └── api/
│       ├── analyze/route.ts        # POST → AnalysisResult
│       ├── sessions/route.ts       # CRUD solve_sessions
│       └── progression/route.ts    # GET next recommended problem
├── lib/
│   ├── analysis/
│   │   ├── engine.ts               # analyze() — the pure function
│   │   ├── prompt.ts               # prompt builder
│   │   └── schema.ts               # Zod schema for AnalysisResult
│   ├── progression/
│   │   ├── track.ts                # Arrays → HashMaps → Two Pointers → Sliding Window
│   │   └── recommend.ts            # next problem given history
│   ├── knowledge/update.ts         # recompute graph row + confidence after an attempt
│   └── streak.ts
├── components/
│   ├── solve/  (StageUnderstand, StageSolve, StageAnalysis, StageRecord, HintPanel, Timer)
│   ├── editor/MonacoEditor.tsx
│   ├── analysis/Scorecard.tsx
│   └── dashboard/ ...
├── db/ (schema.ts, seed.ts, client.ts)
└── data/problems/blind75.json      # seed source
```

---

## 6. Explicit non-goals for Phase 1

- **No code execution / test runner.** Analysis is static (LLM reads code). Add Judge0 later if needed.
- **No auth, no multi-user.** Single `app_state` row. Deploy private.
- **No voice / mock interview** (Phase 2).
- **No spaced repetition scheduler.** Progression is linear along the track.
- **No mobile-first** — desktop practice tool; just don't let it break on tablet.

---

## 7. Build order (dependency-ordered)

1. Scaffold (Next 15, TS, Tailwind, shadcn, Drizzle, Postgres) + `schema.ts` + `seed.ts`.
2. Seed 15–40 problems (`data/problems/blind75.json`) with `optimalComplexity` filled in.
3. `progression/track.ts` + `recommend.ts` + `/api/progression`.
4. Dashboard reading `app_state` + `knowledge_graph` + recommended problem.
5. `/practice/[problemId]` Stages 1–2 (journal + Monaco + timer + hints), persist `solve_sessions`.
6. **Analysis engine** — `lib/analysis/*`, `/api/analyze`, Zod validation, Scorecard UI. Stage 3.
7. Stage 4 record → `knowledge/update.ts` + `streak.ts`.
8. `/analyze` standalone (reuses engine).
9. `/problems` bank browser, `/graph` knowledge view.
10. UI polish pass (design-quality rules), states, tests on `analysis` + `progression` + `knowledge`.

---

## 8. What I need from you to start building

1. **Stack confirmation** — Next.js app-router + Drizzle + Supabase Postgres OK? Or local Postgres / SQLite for now?
2. **AI provider** — Claude API key available, or must it be OpenRouter free tier?
3. **Naming** — repo/app name. Folder is `SelfCurativeLearning`; the source doc calls it "Self Curative Learning". Pick a product name (affects package name, titles, metadata).
4. **Seed scope** — start with Blind 75 (~75) or a 15-problem subset for week 1?
5. **Editor scope** — all four languages (Python/Java/JS/Go) day one, or Python-only for the MVP?
6. **Deploy target** — Vercel private, or local-only for now?
7. **Timer** — hard stop at 0:00, or just a stopwatch that keeps counting?

Answer these and I can start at step 1.
