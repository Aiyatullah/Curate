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
import type {
  InterviewScore,
  InterviewConfig,
  InterviewPlan,
} from "@/lib/interview/schema";
import type { SystemDesignReview } from "@/lib/systemdesign/schema";
import type { MentorBrief } from "@/lib/mentor/schema";

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

/**
 * Phase 2 — Interview Thinking OS. One row per mock-interview session. The AI
 * plays the interviewer; the transcript is the full back-and-forth; `score` is
 * filled in when the session is graded.
 */
export const interviewSessions = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  problemId: text("problem_id").references(() => problems.id), // set for the quick "interview on this problem" path
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  config: jsonb("config").$type<InterviewConfig | null>(), // role / seniority / sections (configured interviews)
  plan: jsonb("plan").$type<InterviewPlan | null>(), // resolved ordered sections
  transcript: jsonb("transcript")
    .$type<{ role: "interviewer" | "candidate"; text: string }[]>()
    .notNull()
    .default([]),
  score: jsonb("score").$type<InterviewScore | null>(),
  feedback: text("feedback"),
  durationSec: integer("duration_sec").default(0),
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
  avgInterviewScore: integer("avg_interview_score"), // mean mock-interview overall for this topic
  reviseCount: integer("revise_count").notNull().default(0), // problems flagged "revise" in this topic
  confidence: text("confidence").notNull().default("low"), // "low" | "medium" | "high"
  lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }),
});

/* ─────────────────────────  Phase 3 — Engineering Interview OS  ───────────────────────── */

// Non-DSA challenges: build-a-component, design-a-system-lite, API design.
export const challenges = pgTable("challenges", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(), // "frontend" | "backend" | "api-design"
  title: text("title").notNull(),
  difficulty: text("difficulty").notNull(), // "Easy" | "Medium" | "Hard"
  prompt: text("prompt").notNull(), // the full task statement (markdown)
  requirements: text("requirements").array().$type<string[]>().default([]),
  evalRubric: text("eval_rubric"), // what a strong answer covers — fed to the evaluator
  companyTags: text("company_tags").array().$type<string[]>().default([]),
  referenceUrl: text("reference_url"),
  trackOrder: integer("track_order").notNull().default(0),
  source: text("source").notNull().default("seed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const challengeSessions = pgTable("challenge_sessions", {
  id: serial("id").primaryKey(),
  challengeId: text("challenge_id")
    .notNull()
    .references(() => challenges.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  language: text("language").notNull().default("typescript"),
  approach: text("approach"), // written plan before coding
  code: text("code"),
  notes: text("notes"),
  analysis: jsonb("analysis").$type<AnalysisResult | null>(),
  solved: boolean("solved").default(false),
  attemptNumber: integer("attempt_number").notNull().default(1),
});

/* ─────────────────────────  Phase 4 — System Design OS  ───────────────────────── */

export const systemDesigns = pgTable("system_designs", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  prompt: text("prompt").notNull(), // "Design WhatsApp"
  requirements: text("requirements"), // functional + non-functional
  scaleEstimates: text("scale_estimates"), // QPS, storage, bandwidth
  dataModel: text("data_model"),
  apiDesign: text("api_design"),
  highLevelDesign: text("high_level_design"),
  deepDives: text("deep_dives"), // caching, sharding, queues, etc.
  tradeoffs: text("tradeoffs"),
  review: jsonb("review").$type<SystemDesignReview | null>(),
  score: integer("score"),
});

/* ─────────────────────────  Phase 5 — Career OS  ───────────────────────── */

export const companies = pgTable("companies", {
  slug: text("slug").primaryKey(), // "stripe"
  name: text("name").notNull(),
  tags: text("tags").array().$type<string[]>().default([]), // "payments", "infra"
  focusAreas: text("focus_areas").array().$type<string[]>().default([]), // topics they lean on
  notes: text("notes"),
  targetDate: date("target_date"),
  priority: integer("priority").notNull().default(3), // 1 = highest
  archived: boolean("archived").notNull().default(false),
});

export const resumeItems = pgTable("resume_items", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // "project" | "oss" | "blog" | "application" | "referral"
  title: text("title").notNull(),
  url: text("url"),
  status: text("status"), // free text: "shipped", "applied", "interviewing", "rejected", "offer"
  company: text("company"), // for applications/referrals
  notes: text("notes"),
  happenedOn: date("happened_on"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* ─────────────────────────  Phase 6 — AI Mentor  ───────────────────────── */

export const mentorBriefs = pgTable("mentor_briefs", {
  id: serial("id").primaryKey(),
  forDate: date("for_date").notNull().unique(), // one brief per day
  brief: jsonb("brief").$type<MentorBrief | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
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
export type InterviewSession = typeof interviewSessions.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type ChallengeSession = typeof challengeSessions.$inferSelect;
export type SystemDesign = typeof systemDesigns.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type ResumeItem = typeof resumeItems.$inferSelect;
export type MentorBriefRow = typeof mentorBriefs.$inferSelect;

export type ProblemStatusValue = "unsolved" | "solved" | "revise";
