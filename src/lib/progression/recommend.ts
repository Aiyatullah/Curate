import { and, eq, notInArray, asc, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { problems, solveSessions, problemStatus } from "@/lib/db/schema";
import { nextTopic } from "./track";
import { generateNewProblem } from "@/lib/analysis/generateProblem";

export type Recommendation = {
  topic: string;
  problem: (typeof problems.$inferSelect) | null;
  reason: string;
  kind: "revise" | "next" | "fallback" | "ai" | "none";
};

async function solvedIds(): Promise<Set<string>> {
  const [sessions, statuses] = await Promise.all([
    db
      .select({ problemId: solveSessions.problemId })
      .from(solveSessions)
      .where(eq(solveSessions.solved, true)),
    db
      .select({ problemId: problemStatus.problemId })
      .from(problemStatus)
      .where(eq(problemStatus.status, "solved")),
  ]);
  return new Set([
    ...sessions.map((r) => r.problemId),
    ...statuses.map((r) => r.problemId),
  ]);
}

async function solvedByTopic(): Promise<Record<string, number>> {
  const ids = await solvedIds();
  if (ids.size === 0) return {};
  const all = await db
    .select({ topic: problems.topic, id: problems.id })
    .from(problems);
  const counts: Record<string, number> = {};
  for (const p of all) {
    if (ids.has(p.id)) counts[p.topic] = (counts[p.topic] ?? 0) + 1;
  }
  return counts;
}

/**
 * Pick the next problem to work on:
 *   1. anything flagged "revise" (oldest flag first)
 *   2. the next unsolved problem in the current track topic
 *   3. any unsolved problem
 */
export async function recommendNext(): Promise<Recommendation> {
  // 1. revise queue
  const [revise] = await db
    .select()
    .from(problems)
    .innerJoin(problemStatus, eq(problemStatus.problemId, problems.id))
    .where(eq(problemStatus.status, "revise"))
    .orderBy(asc(problemStatus.updatedAt))
    .limit(1);
  if (revise) {
    return {
      topic: revise.problems.topic,
      problem: revise.problems,
      reason: "You flagged this for revision — take another pass.",
      kind: "revise",
    };
  }

  const counts = await solvedByTopic();
  const ids = await solvedIds();
  const topic = nextTopic(counts);
  const exclude = ids.size ? [...ids] : ["__none__"];

  // 2. current topic, unsolved, lowest trackOrder
  const [candidate] = await db
    .select()
    .from(problems)
    .where(and(eq(problems.topic, topic), notInArray(problems.id, exclude)))
    .orderBy(asc(problems.trackOrder), asc(problems.id))
    .limit(1);
  if (candidate) {
    return {
      topic,
      problem: candidate,
      reason: `Next unsolved problem in your current topic: ${topic}.`,
      kind: "next",
    };
  }

  // 3. any unsolved
  const [any] = await db
    .select()
    .from(problems)
    .where(notInArray(problems.id, exclude))
    .orderBy(sql`random()`)
    .limit(1);
  return {
    topic,
    problem: any ?? null,
    reason: any
      ? `Every ${topic} problem in the bank is done — here's another unsolved one.`
      : "You've solved everything in the bank. Generate a fresh one.",
    kind: any ? "fallback" : "none",
  };
}

/**
 * "Find me more" — used by the dashboard button. If there is still an unsolved
 * bank problem it behaves like recommendNext; otherwise it asks the AI for a new
 * real LeetCode problem in the weakest topic and adds it to the bank.
 */
export async function findMore(): Promise<Recommendation> {
  const next = await recommendNext();
  if (next.problem && next.kind !== "none") return next;

  const counts = await solvedByTopic();
  const topic = nextTopic(counts);
  const generated = await generateNewProblem(topic);
  if (generated) {
    return {
      topic,
      problem: generated,
      reason: `Fresh problem generated for ${topic} and added to your bank.`,
      kind: "ai",
    };
  }
  return { topic, problem: null, reason: "Could not generate a new problem.", kind: "none" };
}

/** Recently attempted, for the dashboard. */
export async function recentAttempts(limit = 6) {
  return db
    .select()
    .from(solveSessions)
    .orderBy(desc(solveSessions.createdAt))
    .limit(limit);
}
