import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { problems, solveSessions } from "@/lib/db/schema";
import type { ProblemStatusValue } from "@/lib/db/schema";
import { analyze } from "@/lib/analysis/engine";
import { touchStreak } from "@/lib/streak";
import { recomputeTopic } from "@/lib/knowledge/update";
import { recomputeProblemStatus, nextAttemptNumber, setStatus } from "@/lib/status";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { action } = body as { action?: string };

  try {
    if (action === "upsert") return await upsert(body);
    if (action === "analyze") return await runAnalyze(body);
    if (action === "record") return await record(body);
    if (action === "status") return await status(body);
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[/api/solve]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

type UpsertBody = {
  sessionId?: number;
  problemId: string;
  language?: string;
  durationSec?: number;
  hintsUsed?: number;
  firstThought?: string;
  bruteForceIdea?: string;
  bruteForceBigO?: string;
  whyItWorks?: string;
  code?: string;
};

async function upsert(body: UpsertBody) {
  const fields = {
    problemId: body.problemId,
    language: body.language ?? "python",
    durationSec: body.durationSec ?? 0,
    hintsUsed: body.hintsUsed ?? 0,
    firstThought: body.firstThought ?? null,
    bruteForceIdea: body.bruteForceIdea ?? null,
    bruteForceBigO: body.bruteForceBigO ?? null,
    whyItWorks: body.whyItWorks ?? null,
    code: body.code ?? null,
  };

  if (body.sessionId) {
    await db
      .update(solveSessions)
      .set(fields)
      .where(eq(solveSessions.id, body.sessionId));
    return NextResponse.json({ sessionId: body.sessionId });
  }

  const attemptNumber = await nextAttemptNumber(body.problemId);
  const [row] = await db
    .insert(solveSessions)
    .values({ ...fields, attemptNumber })
    .returning({ id: solveSessions.id, attemptNumber: solveSessions.attemptNumber });
  return NextResponse.json({ sessionId: row.id, attemptNumber: row.attemptNumber });
}

async function runAnalyze(body: UpsertBody) {
  const saved = await upsert(body);
  const { sessionId } = (await saved.json()) as { sessionId: number };

  const [session] = await db
    .select()
    .from(solveSessions)
    .where(eq(solveSessions.id, sessionId));
  const [problem] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, session.problemId));

  const result = await analyze({
    language: session.language,
    code: session.code ?? "",
    problem: {
      title: problem.title,
      difficulty: problem.difficulty,
      topic: problem.topic,
      optimalComplexity: problem.optimalComplexity,
      patternTags: problem.patternTags,
      leetcodeUrl: problem.leetcodeUrl,
    },
    journal: {
      firstThought: session.firstThought,
      bruteForceIdea: session.bruteForceIdea,
      bruteForceBigO: session.bruteForceBigO,
      whyItWorks: session.whyItWorks,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ sessionId, error: result.error }, { status: 502 });
  }

  await db
    .update(solveSessions)
    .set({ analysis: result.result })
    .where(eq(solveSessions.id, sessionId));

  // An analysed attempt counts immediately — attempt count + last readiness show
  // on the dashboard / graph even before the candidate marks it solved.
  await recomputeProblemStatus(session.problemId);
  await recomputeTopic(problem.topic).catch(() => {});

  return NextResponse.json({ sessionId, analysis: result.result });
}

async function record(body: {
  sessionId: number;
  selfRating?: string;
  solved?: boolean;
  reviseAfter?: boolean;
}) {
  await db
    .update(solveSessions)
    .set({ selfRating: body.selfRating ?? null, solved: !!body.solved })
    .where(eq(solveSessions.id, body.sessionId));

  const [session] = await db
    .select()
    .from(solveSessions)
    .where(eq(solveSessions.id, body.sessionId));
  const [problem] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, session.problemId));

  const explicit: ProblemStatusValue | undefined = body.reviseAfter
    ? "revise"
    : body.solved
      ? "solved"
      : undefined;
  await recomputeProblemStatus(session.problemId, explicit);
  await recomputeTopic(problem.topic);
  const streakDays = body.solved ? await touchStreak() : undefined;

  return NextResponse.json({ ok: true, streakDays });
}

async function status(body: { problemId: string; status: ProblemStatusValue }) {
  if (!["unsolved", "solved", "revise"].includes(body.status)) {
    return NextResponse.json({ error: "Bad status" }, { status: 400 });
  }
  await setStatus(body.problemId, body.status);
  const [problem] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, body.problemId));
  if (problem) await recomputeTopic(problem.topic);
  return NextResponse.json({ ok: true, status: body.status });
}
