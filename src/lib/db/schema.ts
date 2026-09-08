import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  date,
  serial,
} from "drizzle-orm/pg-core";
import type { AnalysisResult } from "@/lib/analysis/schema";

/**
 * Phase 1 schema. Single-user (no auth). Designed to extend into later phases
 * without breaking changes — add columns, don't rename.
 */

// The curated question bank.
export const problems = pgTable("problems", {
  id: text("id").primaryKey(), // e.g. "lc_001"
  title: text("title").notNull(),
  difficulty: text("difficulty").notNull(), // "Easy" | "Medium" | "Hard"
  topic: text("topic").notNull(), // "Arrays"
  subtopic: text("subtopic"),
  leetcodeUrl: text("leetcode_url").notNull(),
  statementMd: text("statement_md"), // optional short blurb; the real statement lives on LeetCode
  optimalComplexity: text("optimal_complexity"), // "O(n) time / O(n) space" — fed to the analyzer
  patternTags: text("pattern_tags").array().$type<string[]>().default([]),
  companyTags: text("company_tags").array().$type<string[]>().default([]),
  inBlind75: boolean("in_blind75").default(false),
  inNeetcode150: boolean("in_neetcode150").default(false),
  inGrind169: boolean("in_grind169").default(false),
  trackOrder: integer("track_order").notNull().default(0), // ordering within a topic
  source: text("source").notNull().default("seed"), // "seed" | "ai" | "user"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/**
 * One row per problem the user has touched — the tick/untick/revise state and
 * a rollup of attempts. `solve_sessions` stays the append-only log; this table
 * is the current status, maintained on every "record".
 */
export const problemStatus = pgTable("problem_status", {
  problemId: text("problem_id")
    .primaryKey()
    .references(() => problems.id),
  status: text("status").notNull().default("unsolved"), // "unsolved" | "solved" | "revise"
  attemptCount: integer("attempt_count").notNull().default(0),
  solvedCount: integer("solved_count").notNull().default(0),
  lastReadiness: integer("last_readiness"), // interviewReadiness from the latest analysis
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// One row per attempt at a problem.
export const solveSessions = pgTable("solve_sessions", {
  id: serial("id").primaryKey(),
  problemId: text("problem_id")
    .notNull()
    .references(() => problems.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  durationSec: integer("duration_sec").default(0),
  language: text("language").notNull().default("python"),

  // Stage 1 — Understand (written before coding)
  firstThought: text("first_thought"),
  bruteForceIdea: text("brute_force_idea"),
  bruteForceBigO: text("brute_force_big_o"),

  // Stage 2 — Solve
  whyItWorks: text("why_it_works"),
  code: text("code"),
  hintsUsed: integer("hints_used").default(0),

  // Stage 3 — Analysis (AI)
  analysis: jsonb("analysis").$type<AnalysisResult | null>(),

  // Stage 4 — Record
  selfRating: text("self_rating"), // "easy" | "ok" | "hard"
  solved: boolean("solved").default(false),
  attemptNumber: integer("attempt_number").notNull().default(1),
});

// Standalone "paste code & analyze" runs — no problem attached.
export const analysisSessions = pgTable("analysis_sessions", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  language: text("language").notNull().default("python"),
  intent: text("intent"), // "what problem is this / what were you thinking"
  code: text("code").notNull(),
  analysis: jsonb("analysis").$type<AnalysisResult | null>(),
});

// One row per topic — the knowledge graph.
export const knowledgeGraph = pgTable("knowledge_graph", {
  topic: text("topic").primaryKey(),
  solvedCount: integer("solved_count").notNull().default(0),
  attemptCount: integer("attempt_count").notNull().default(0),
  accuracyPct: integer("accuracy_pct").notNull().default(0),
  avgReadiness: integer("avg_readiness"), // mean interviewReadiness across analysed attempts
  reviseCount: integer("revise_count").notNull().default(0), // problems flagged "revise" in this topic
  confidence: text("confidence").notNull().default("low"), // "low" | "medium" | "high"
  lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }),
});

// Single denormalized row (id = 1) backing the dashboard header.
export const appState = pgTable("app_state", {
  id: integer("id").primaryKey().default(1),
  currentPhase: text("current_phase").notNull().default("Foundation"),
  currentTopic: text("current_topic").notNull().default("Arrays"),
  streakDays: integer("streak_days").notNull().default(0),
  lastActiveDate: date("last_active_date"),
});

export type Problem = typeof problems.$inferSelect;
export type SolveSession = typeof solveSessions.$inferSelect;
export type KnowledgeRow = typeof knowledgeGraph.$inferSelect;
export type AppState = typeof appState.$inferSelect;
export type ProblemStatus = typeof problemStatus.$inferSelect;

export type ProblemStatusValue = "unsolved" | "solved" | "revise";
