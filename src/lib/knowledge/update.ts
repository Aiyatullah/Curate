import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  problems,
  solveSessions,
  knowledgeGraph,
  problemStatus,
  interviewSessions,
} from "@/lib/db/schema";

/**
 * Recompute the knowledge_graph row for a topic from raw solve_sessions +
 * problem_status. The row aggregates: how many distinct problems solved, attempt
 * accuracy, the mean AI interview-readiness of your analysed attempts (this is
 * where first-thought + code quality actually feed the graph), and how many
 * problems in the topic you've flagged for revision.
 *
 * Cheap enough to run on every attempt in a single-user app.
 */
export async function recomputeTopic(topic: string): Promise<void> {
  const rows = await db
    .select({
      problemId: solveSessions.problemId,
      solved: solveSessions.solved,
      createdAt: solveSessions.createdAt,
      analysis: solveSessions.analysis,
    })
    .from(solveSessions)
    .innerJoin(problems, eq(problems.id, solveSessions.problemId))
    .where(eq(problems.topic, topic));

  const attemptCount = rows.length;
  const solvedAttempts = rows.filter((r) => r.solved).length;

  // "solved" = the user-facing status (set by the record step OR by ticking the
  // box on /problems), not just whether a session was marked solved.
  const [solvedRow] = await db
    .select({ n: sql<number>`count(*)` })
    .from(problemStatus)
    .innerJoin(problems, eq(problems.id, problemStatus.problemId))
    .where(sql`${problems.topic} = ${topic} and ${problemStatus.status} = 'solved'`);
  const solvedCount = Number(solvedRow?.n ?? 0);
  const accuracyPct =
    attemptCount === 0 ? 0 : Math.round((solvedAttempts / attemptCount) * 100);

  const readinessScores = rows
    .map((r) => r.analysis?.scores.interviewReadiness)
    .filter((n): n is number => typeof n === "number");
  const avgReadiness =
    readinessScores.length === 0
      ? null
      : Math.round(
          (readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length) *
            10,
        ) / 10;

  const lastPracticedAt =
    rows.reduce<Date | null>((max, r) => {
      const d = r.createdAt ? new Date(r.createdAt) : null;
      return d && (!max || d > max) ? d : max;
    }, null) ?? null;

  const [reviseRow] = await db
    .select({ n: sql<number>`count(*)` })
    .from(problemStatus)
    .innerJoin(problems, eq(problems.id, problemStatus.problemId))
    .where(sql`${problems.topic} = ${topic} and ${problemStatus.status} = 'revise'`);
  const reviseCount = Number(reviseRow?.n ?? 0);

  const interviews = await db
    .select({ score: interviewSessions.score })
    .from(interviewSessions)
    .innerJoin(problems, eq(problems.id, interviewSessions.problemId))
    .where(eq(problems.topic, topic));
  const interviewOveralls = interviews
    .map((r) => r.score?.overall)
    .filter((n): n is number => typeof n === "number");
  const avgInterviewScore =
    interviewOveralls.length === 0
      ? null
      : Math.round(
          interviewOveralls.reduce((a, b) => a + b, 0) / interviewOveralls.length,
        );

  const confidence = deriveConfidence(solvedCount, accuracyPct, avgReadiness);

  const values = {
    topic,
    solvedCount,
    attemptCount,
    accuracyPct,
    avgReadiness: avgReadiness === null ? null : Math.round(avgReadiness),
    avgInterviewScore,
    reviseCount,
    confidence,
    lastPracticedAt,
  };

  await db
    .insert(knowledgeGraph)
    .values(values)
    .onConflictDoUpdate({ target: knowledgeGraph.topic, set: values });
}

function deriveConfidence(
  solved: number,
  accuracy: number,
  avgReadiness: number | null,
): string {
  const ready = avgReadiness ?? 0;
  if (solved >= 5 && accuracy >= 75 && ready >= 7) return "high";
  if (solved >= 2 && accuracy >= 50 && ready >= 5) return "medium";
  return "low";
}

export async function getWeakAreas(limit = 4): Promise<string[]> {
  const rows = await db
    .select()
    .from(knowledgeGraph)
    .where(sql`${knowledgeGraph.attemptCount} > 0`);

  return rows
    .filter(
      (r) =>
        r.confidence === "low" ||
        r.accuracyPct < 60 ||
        (r.avgReadiness ?? 10) < 6 ||
        r.reviseCount > 0,
    )
    .sort((a, b) => b.attemptCount - a.attemptCount || b.reviseCount - a.reviseCount)
    .slice(0, limit)
    .map((r) => r.topic);
}
