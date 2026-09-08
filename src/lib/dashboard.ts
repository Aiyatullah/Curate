import { sql, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { solveSessions, knowledgeGraph, problems, problemStatus } from "@/lib/db/schema";
import { getAppState } from "@/lib/streak";
import { getWeakAreas } from "@/lib/knowledge/update";
import { recommendNext } from "@/lib/progression/recommend";

export async function getDashboard() {
  const [state, solvedRow, recent, weakAreas, recommendation, graph, bankRow, reviseRow] =
    await Promise.all([
      getAppState(),
      db
        .select({ n: sql<number>`count(*)` })
        .from(problemStatus)
        .where(eq(problemStatus.status, "solved")),
      db
        .select({
          id: solveSessions.id,
          problemId: solveSessions.problemId,
          solved: solveSessions.solved,
          attemptNumber: solveSessions.attemptNumber,
          analysis: solveSessions.analysis,
        })
        .from(solveSessions)
        .orderBy(desc(solveSessions.createdAt))
        .limit(6),
      getWeakAreas(),
      recommendNext(),
      db.select().from(knowledgeGraph).orderBy(desc(knowledgeGraph.attemptCount)),
      db.select({ n: sql<number>`count(*)` }).from(problems),
      db
        .select({ n: sql<number>`count(*)` })
        .from(problemStatus)
        .where(eq(problemStatus.status, "revise")),
    ]);

  return {
    state,
    problemsSolved: Number(solvedRow[0]?.n ?? 0),
    bankSize: Number(bankRow[0]?.n ?? 0),
    reviseCount: Number(reviseRow[0]?.n ?? 0),
    streakDays: state.streakDays,
    recent,
    weakAreas,
    recommendation,
    graph,
  };
}
