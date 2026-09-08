import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  knowledgeGraph,
  challenges,
  challengeSessions,
  systemDesigns,
  companies,
} from "@/lib/db/schema";
import { TOPIC_MASTERY_THRESHOLD } from "@/lib/progression/track";

export type CompanyReadiness = {
  slug: string;
  name: string;
  tags: string[];
  focusAreas: string[];
  priority: number;
  targetDate: string | null;
  dsaPct: number;
  engineeringPct: number;
  systemDesignPct: number;
  overallPct: number;
};

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Readiness is derived, never stored:
 *   DSA           — how the company's focus topics are going (solved ratio + accuracy + AI readiness)
 *   Engineering   — share of engineering challenges completed
 *   System Design — mean of your reviewed designs
 */
export async function getCompanyReadiness(): Promise<CompanyReadiness[]> {
  const [cos, graph, chRows, sdRow, chTotalRow] = await Promise.all([
    db.select().from(companies).where(eq(companies.archived, false)),
    db.select().from(knowledgeGraph),
    db
      .select({ n: sql<number>`count(distinct ${challengeSessions.challengeId})::int` })
      .from(challengeSessions)
      .where(eq(challengeSessions.solved, true)),
    db
      .select({ avg: sql<number | null>`avg(${systemDesigns.score})` })
      .from(systemDesigns)
      .where(sql`${systemDesigns.score} is not null`),
    db.select({ n: sql<number>`count(*)::int` }).from(challenges),
  ]);

  const graphByTopic = new Map(graph.map((g) => [g.topic, g]));
  const challengesDone = Number(chRows[0]?.n ?? 0);
  const challengeTotal = Number(chTotalRow[0]?.n ?? 0) || 22;
  const engineeringPct = clampPct((challengesDone / challengeTotal) * 100);
  const sdAvg = sdRow[0]?.avg;
  const systemDesignPct = sdAvg == null ? 0 : clampPct((Number(sdAvg) / 10) * 100);

  return cos
    .map((c) => {
      const focus = c.focusAreas ?? [];
      const perTopic = focus.map((t) => {
        const g = graphByTopic.get(t);
        if (!g || g.attemptCount === 0) return 0;
        const solvedRatio = Math.min(1, g.solvedCount / TOPIC_MASTERY_THRESHOLD);
        const acc = g.accuracyPct / 100;
        const ready = (g.avgReadiness ?? 0) / 10;
        return (solvedRatio * 0.5 + acc * 0.25 + ready * 0.25) * 100;
      });
      const dsaPct = clampPct(
        perTopic.length ? perTopic.reduce((a, b) => a + b, 0) / perTopic.length : 0,
      );
      const overallPct = clampPct(
        dsaPct * 0.5 + engineeringPct * 0.3 + systemDesignPct * 0.2,
      );
      return {
        slug: c.slug,
        name: c.name,
        tags: c.tags ?? [],
        focusAreas: focus,
        priority: c.priority,
        targetDate: c.targetDate,
        dsaPct,
        engineeringPct,
        systemDesignPct,
        overallPct,
      };
    })
    .sort((a, b) => a.priority - b.priority || b.overallPct - a.overallPct);
}
