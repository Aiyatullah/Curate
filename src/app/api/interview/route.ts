import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { problems, solveSessions, interviewSessions } from "@/lib/db/schema";
import {
  nextInterviewerTurn,
  gradeInterview,
} from "@/lib/interview/engine";
import type { InterviewContext, TranscriptEntry } from "@/lib/interview/schema";
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

async function loadContext(problemId?: string): Promise<InterviewContext> {
  if (!problemId) return {};
  const [problem] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, problemId));
  const [session] = await db
    .select()
    .from(solveSessions)
    .where(eq(solveSessions.problemId, problemId))
    .orderBy(desc(solveSessions.createdAt))
    .limit(1);

  return {
    problem: problem
      ? {
          title: problem.title,
          difficulty: problem.difficulty,
          topic: problem.topic,
          optimalComplexity: problem.optimalComplexity,
        }
      : null,
    code: session?.code ?? null,
    language: session?.language ?? null,
    journal: session
      ? {
          firstThought: session.firstThought,
          bruteForceIdea: session.bruteForceIdea,
          whyItWorks: session.whyItWorks,
        }
      : null,
  };
}

async function start(body: { problemId?: string }) {
  const ctx = await loadContext(body.problemId);
  const turn = await nextInterviewerTurn(ctx, []);
  const transcript: TranscriptEntry[] = [
    { role: "interviewer", text: turn.message },
  ];
  const [row] = await db
    .insert(interviewSessions)
    .values({ problemId: body.problemId ?? null, transcript })
    .returning({ id: interviewSessions.id });
  return NextResponse.json({ sessionId: row.id, turn });
}

async function reply(body: { sessionId: number; text: string; durationSec?: number }) {
  const [session] = await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.id, body.sessionId));
  if (!session) return NextResponse.json({ error: "No session" }, { status: 404 });

  const ctx = await loadContext(session.problemId ?? undefined);
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

  if (turn.mode === "wrap") {
    return finalize(body.sessionId, ctx, transcript, turn.message);
  }
  return NextResponse.json({ turn });
}

async function end(body: {
  sessionId: number;
  durationSec?: number;
  text?: string;
}) {
  const [session] = await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.id, body.sessionId));
  if (!session) return NextResponse.json({ error: "No session" }, { status: 404 });

  const ctx = await loadContext(session.problemId ?? undefined);
  const transcript: TranscriptEntry[] = [...(session.transcript ?? [])];
  if (body.text?.trim()) {
    transcript.push({ role: "candidate", text: body.text.trim() });
  }
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

  if (ctx.problem?.topic) {
    await recomputeTopic(ctx.problem.topic).catch(() => {});
  }

  return NextResponse.json({
    turn: { mode: "wrap", message: wrapMessage },
    score: graded.score,
  });
}
