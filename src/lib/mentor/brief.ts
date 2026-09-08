import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  knowledgeGraph,
  solveSessions,
  interviewSessions,
  challengeSessions,
  systemDesigns,
  problemStatus,
  mentorBriefs,
} from "@/lib/db/schema";
import { chatJson } from "@/lib/ai";
import { recommendNext } from "@/lib/progression/recommend";
import { getAppState } from "@/lib/streak";
import { mentorBriefSchema, type MentorBrief } from "./schema";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function gatherContext() {
  const [state, graph, rec, revise, recentIv, chDone, sdDone, recentAnalyses] =
    await Promise.all([
      getAppState(),
      db.select().from(knowledgeGraph),
      recommendNext(),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(problemStatus)
        .where(eq(problemStatus.status, "revise")),
      db
        .select({ score: interviewSessions.score })
        .from(interviewSessions)
        .where(sql`${interviewSessions.score} is not null`)
        .orderBy(desc(interviewSessions.createdAt))
        .limit(3),
      db
        .select({ n: sql<number>`count(distinct ${challengeSessions.challengeId})::int` })
        .from(challengeSessions)
        .where(eq(challengeSessions.solved, true)),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(systemDesigns)
        .where(sql`${systemDesigns.score} is not null`),
      db
        .select({ analysis: solveSessions.analysis })
        .from(solveSessions)
        .where(
          and(
            sql`${solveSessions.analysis} is not null`,
            gte(
              solveSessions.createdAt,
              sql`now() - interval '7 days'`,
            ),
          ),
        )
        .limit(10),
    ]);

  const weak = graph
    .filter(
      (g) =>
        g.attemptCount > 0 &&
        (g.confidence === "low" || (g.avgReadiness ?? 10) < 6 || g.reviseCount > 0),
    )
    .map((g) => `${g.topic} (conf ${g.confidence}, readiness ${g.avgReadiness ?? "n/a"}, ${g.reviseCount} to revise)`);
  const strong = graph
    .filter((g) => g.confidence === "high")
    .map((g) => g.topic);

  const ivFlags = recentIv
    .flatMap((i) => i.score?.redFlags ?? [])
    .slice(0, 5);
  const analysisGaps = recentAnalyses
    .flatMap((a) => a.analysis?.whatsLacking ?? [])
    .slice(0, 6);

  return {
    streakDays: state.streakDays,
    weak,
    strong,
    reviseCount: Number(revise[0]?.n ?? 0),
    challengesDone: Number(chDone[0]?.n ?? 0),
    systemDesignsDone: Number(sdDone[0]?.n ?? 0),
    recommended: rec.problem
      ? { id: rec.problem.id, title: rec.problem.title, topic: rec.problem.topic, kind: rec.kind }
      : null,
    recentInterviewFlags: ivFlags,
    recentCodeGaps: analysisGaps,
  };
}

export async function getOrCreateBrief(refresh = false): Promise<MentorBrief | null> {
  const forDate = today();
  if (!refresh) {
    const [existing] = await db
      .select()
      .from(mentorBriefs)
      .where(eq(mentorBriefs.forDate, forDate))
      .limit(1);
    if (existing?.brief) return existing.brief;
  }

  const ctx = await gatherContext();
  const system = `You are a calm, direct engineering interview mentor who has followed this
candidate for weeks. You know their history. Give them today's brief: name the ONE thing to
work on, tie it to a concrete action, and be honest but encouraging. No fluff, no lists of
ten things.

Return ONLY JSON:
{
  "greeting": string,        // e.g. "Welcome back. Graphs are still shaky."
  "focus": string,           // the single skill/theme for today
  "todaysMove": { "kind": "problem"|"challenge"|"system-design"|"interview"|"revise", "ref": string|null, "label": string, "why": string },
  "strengths": string[],
  "weaknesses": string[],
  "encouragement": string
}
Prefer setting todaysMove.ref to the recommended problem id when kind is "problem".`;

  const user = `CANDIDATE STATE:
- Streak: ${ctx.streakDays} days
- Strong topics: ${ctx.strong.join(", ") || "none yet"}
- Weak topics: ${ctx.weak.join("; ") || "none flagged"}
- Problems flagged to revise: ${ctx.reviseCount}
- Engineering challenges completed: ${ctx.challengesDone}
- System designs reviewed: ${ctx.systemDesignsDone}
- Recommended next problem: ${ctx.recommended ? `${ctx.recommended.title} [${ctx.recommended.id}] (${ctx.recommended.topic}, ${ctx.recommended.kind})` : "none"}
- Recent mock-interview red flags: ${ctx.recentInterviewFlags.join("; ") || "none"}
- Recent code-review gaps: ${ctx.recentCodeGaps.join("; ") || "none"}

Write today's brief.`;

  let brief: MentorBrief;
  try {
    const raw = await chatJson([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const parsed = mentorBriefSchema.safeParse(JSON.parse(stripFence(raw) || "{}"));
    if (!parsed.success) return fallbackBrief(ctx);
    brief = parsed.data;
  } catch {
    return fallbackBrief(ctx);
  }

  try {
    await db
      .insert(mentorBriefs)
      .values({ forDate, brief })
      .onConflictDoUpdate({ target: mentorBriefs.forDate, set: { brief } });
  } catch (err) {
    console.warn("[mentor] could not cache brief:", err);
  }
  return brief;
}

function fallbackBrief(ctx: Awaited<ReturnType<typeof gatherContext>>): MentorBrief {
  return {
    greeting:
      ctx.weak.length > 0
        ? `Welcome back. ${ctx.weak[0].split(" (")[0]} still needs work.`
        : "Welcome back.",
    focus: ctx.weak[0]?.split(" (")[0] ?? ctx.recommended?.topic ?? "Daily practice",
    todaysMove: ctx.recommended
      ? {
          kind: "problem",
          ref: ctx.recommended.id,
          label: `Solve: ${ctx.recommended.title}`,
          why: `Keeps your ${ctx.recommended.topic} track moving.`,
        }
      : {
          kind: "revise",
          ref: null,
          label: "Revisit a flagged problem",
          why: "Close out your revise queue.",
        },
    strengths: ctx.strong,
    weaknesses: ctx.weak.map((w) => w.split(" (")[0]),
    encouragement: `Streak: ${ctx.streakDays} days. Keep showing up.`,
  };
}

function stripFence(s: string): string {
  const t = (s ?? "").trim();
  return t.startsWith("```")
    ? t.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim()
    : t;
}
