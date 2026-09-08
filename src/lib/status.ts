import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { problems, solveSessions, problemStatus } from "@/lib/db/schema";
import type { ProblemStatusValue } from "@/lib/db/schema";

/**
 * Recompute the problem_status row for one problem from its solve_sessions.
 * `explicitStatus` wins when the user ticks / unticks / flags-for-revision by hand;
 * otherwise the status is derived (any solved attempt => "solved", else "unsolved").
 */
export async function recomputeProblemStatus(
  problemId: string,
  explicitStatus?: ProblemStatusValue,
): Promise<void> {
  const sessions = await db
    .select()
    .from(solveSessions)
    .where(eq(solveSessions.problemId, problemId))
    .orderBy(desc(solveSessions.createdAt));

  const attemptCount = sessions.length;
  const solvedCount = sessions.filter((s) => s.solved).length;
  const latest = sessions[0];
  const lastReadiness = latest?.analysis?.scores.interviewReadiness ?? null;
  const lastAttemptAt = latest?.createdAt ?? null;

  const [existing] = await db
    .select()
    .from(problemStatus)
    .where(eq(problemStatus.problemId, problemId));

  let status: ProblemStatusValue;
  if (explicitStatus) {
    status = explicitStatus;
  } else if (existing?.status === "revise") {
    status = "revise"; // sticky until the user clears it
  } else {
    status = solvedCount > 0 ? "solved" : "unsolved";
  }

  const values = {
    problemId,
    status,
    attemptCount,
    solvedCount,
    lastReadiness,
    lastAttemptAt,
    updatedAt: new Date(),
  };

  await db
    .insert(problemStatus)
    .values(values)
    .onConflictDoUpdate({ target: problemStatus.problemId, set: values });
}

/** Next attempt number for a problem (1-based). */
export async function nextAttemptNumber(problemId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(solveSessions)
    .where(eq(solveSessions.problemId, problemId));
  return Number(row?.n ?? 0) + 1;
}

export async function setStatus(
  problemId: string,
  status: ProblemStatusValue,
): Promise<void> {
  await recomputeProblemStatus(problemId, status);
}

export type ProblemWithStatus = {
  problem: typeof problems.$inferSelect;
  status: ProblemStatusValue;
  attemptCount: number;
  lastReadiness: number | null;
};

/** All problems in a topic with their current status, ordered by trackOrder. */
export async function problemsInTopicWithStatus(
  topic: string,
): Promise<ProblemWithStatus[]> {
  const rows = await db
    .select()
    .from(problems)
    .leftJoin(problemStatus, eq(problemStatus.problemId, problems.id))
    .where(eq(problems.topic, topic))
    .orderBy(problems.trackOrder, problems.id);

  return rows.map((r) => ({
    problem: r.problems,
    status: (r.problem_status?.status as ProblemStatusValue) ?? "unsolved",
    attemptCount: r.problem_status?.attemptCount ?? 0,
    lastReadiness: r.problem_status?.lastReadiness ?? null,
  }));
}

export async function reviseList(): Promise<string[]> {
  const rows = await db
    .select({ id: problemStatus.problemId })
    .from(problemStatus)
    .where(eq(problemStatus.status, "revise"));
  return rows.map((r) => r.id);
}
