import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  problems,
  solveSessions,
  interviewSessions,
  type InterviewSession,
} from "@/lib/db/schema";
import { nextInterviewerTurn, gradeInterview } from "@/lib/interview/engine";
import { buildPlan } from "@/lib/interview/plan";
import {
  SECTION_KINDS,
  type InterviewConfig,
  type InterviewContext,
  type TranscriptEntry,
} from "@/lib/interview/schema";
import { recomputeTopic } from "@/lib/knowledge/update";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { action } = (body ?? {}) as { action?: string };
  try {
    if (action === "start") return await start(body);
    if (action === "reply") return await reply(body);
    if (action === "end") return await end(body);
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[/api/interview]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** Context for a session — from a linked solve session and/or the configured plan. */
async function contextFor(session: {
  problemId: string | null;
  config: InterviewSession["config"];
  plan: InterviewSession["plan"];
}): Promise<InterviewContext> {
  const ctx: InterviewContext = {
    config: session.config ?? null,
    plan: session.plan ?? null,
  };
  if (session.problemId) {
    const [problem] = await db
      .select()
      .from(problems)
      .where(eq(problems.id, session.problemId));
    const [solve] = await db
      .select()
      .from(solveSessions)
      .where(eq(solveSessions.problemId, session.problemId))
      .orderBy(desc(solveSessions.createdAt))
      .limit(1);
    ctx.problem = problem
      ? {
          title: problem.title,
          difficulty: problem.difficulty,
          topic: problem.topic,
          optimalComplexity: problem.optimalComplexity,
        }
      : null;
    ctx.code = solve?.code ?? null;
    ctx.language = solve?.language ?? null;
    ctx.journal = solve
      ? {
          firstThought: solve.firstThought,
          bruteForceIdea: solve.bruteForceIdea,
          whyItWorks: solve.whyItWorks,
        }
      : null;
  }
  return ctx;
}

function sanitizeConfig(raw: unknown): InterviewConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const role = typeof c.role === "string" ? c.role.slice(0, 200).trim() : "";
  if (!role) return null;
  const seniority = ["junior", "mid", "senior", "staff"].includes(c.seniority as string)
    ? (c.seniority as InterviewConfig["seniority"])
    : "mid";
  const sections = Array.isArray(c.sections)
    ? (c.sections.filter((s) => SECTION_KINDS.includes(s)) as InterviewConfig["sections"])
    : [];
  return { role, seniority, sections, surprise: c.surprise !== false };
}

async function start(body: { problemId?: string; config?: unknown }) {
  const config = sanitizeConfig(body.config);
  const plan = config ? await buildPlan(config) : null;

  const session = {
    problemId: body.problemId ?? null,
    config,
    plan,
  };
  const ctx = await contextFor(session);
  const turn = await nextInterviewerTurn(ctx, []);
  const transcript: TranscriptEntry[] = [{ role: "interviewer", text: turn.message }];

  const [row] = await db
    .insert(interviewSessions)
    .values({ ...session, transcript })
    .returning({ id: interviewSessions.id });
  return NextResponse.json({ sessionId: row.id, turn, plan });
}

async function loadSession(id: number) {
  const [s] = await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.id, id));
  return s ?? null;
}

async function reply(body: { sessionId: number; text: string; durationSec?: number }) {
  const session = await loadSession(body.sessionId);
  if (!session) return NextResponse.json({ error: "No session" }, { status: 404 });

  const ctx = await contextFor(session);
  const transcript: TranscriptEntry[] = [
    ...(session.transcript ?? []),
    { role: "candidate", text: body.text },
  ];
  const turn = await nextInterviewerTurn(ctx, transcript);
  transcript.push({ role: "interviewer", text: turn.message });

  await db
    .update(interviewSessions)
    .set({ transcript, durationSec: body.durationSec ?? session.durationSec ?? 0 })
    .where(eq(interviewSessions.id, body.sessionId));

  if (turn.mode === "wrap") return finalize(body.sessionId, ctx, transcript, turn.message);
  return NextResponse.json({ turn });
}

async function end(body: { sessionId: number; durationSec?: number; text?: string }) {
  const session = await loadSession(body.sessionId);
  if (!session) return NextResponse.json({ error: "No session" }, { status: 404 });

  const ctx = await contextFor(session);
  const transcript: TranscriptEntry[] = [...(session.transcript ?? [])];
  if (body.text?.trim()) transcript.push({ role: "candidate", text: body.text.trim() });

  const wrap = await nextInterviewerTurn(ctx, transcript, true);
  const full: TranscriptEntry[] = [
    ...transcript,
    { role: "interviewer", text: wrap.message },
  ];
  await db
    .update(interviewSessions)
    .set({ transcript: full, durationSec: body.durationSec ?? session.durationSec ?? 0 })
    .where(eq(interviewSessions.id, body.sessionId));
  return finalize(body.sessionId, ctx, full, wrap.message);
}

async function finalize(
  sessionId: number,
  ctx: InterviewContext,
  transcript: TranscriptEntry[],
  wrapMessage: string,
) {
  const graded = await gradeInterview(ctx, transcript);
  if (!graded.ok) {
    return NextResponse.json({
      turn: { mode: "wrap", message: wrapMessage },
      error: graded.error,
    });
  }
  await db
    .update(interviewSessions)
    .set({ score: graded.score, feedback: graded.score.feedback })
    .where(eq(interviewSessions.id, sessionId));

  if (ctx.problem?.topic) await recomputeTopic(ctx.problem.topic).catch(() => {});

  return NextResponse.json({
    turn: { mode: "wrap", message: wrapMessage },
    score: graded.score,
  });
}
