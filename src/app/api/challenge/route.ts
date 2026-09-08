import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { challenges, challengeSessions } from "@/lib/db/schema";
import { evaluateChallenge } from "@/lib/challenges/evaluate";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { action } = (body ?? {}) as { action?: string };
  try {
    if (action === "upsert") return await upsert(body);
    if (action === "evaluate") return await evaluate(body);
    if (action === "record") return await record(body);
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[/api/challenge]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

type Body = {
  sessionId?: number;
  challengeId: string;
  language?: string;
  approach?: string;
  code?: string;
  notes?: string;
};

async function nextAttempt(challengeId: string) {
  const [r] = await db
    .select({ n: sql<number>`count(*)` })
    .from(challengeSessions)
    .where(eq(challengeSessions.challengeId, challengeId));
  return Number(r?.n ?? 0) + 1;
}

async function upsert(body: Body) {
  const fields = {
    challengeId: body.challengeId,
    language: body.language ?? "typescript",
    approach: body.approach ?? null,
    code: body.code ?? null,
    notes: body.notes ?? null,
  };
  if (body.sessionId) {
    await db
      .update(challengeSessions)
      .set(fields)
      .where(eq(challengeSessions.id, body.sessionId));
    return NextResponse.json({ sessionId: body.sessionId });
  }
  const attemptNumber = await nextAttempt(body.challengeId);
  const [row] = await db
    .insert(challengeSessions)
    .values({ ...fields, attemptNumber })
    .returning({ id: challengeSessions.id, attemptNumber: challengeSessions.attemptNumber });
  return NextResponse.json({ sessionId: row.id, attemptNumber: row.attemptNumber });
}

async function evaluate(body: Body) {
  const saved = await upsert(body);
  const { sessionId } = (await saved.json()) as { sessionId: number };

  const [session] = await db
    .select()
    .from(challengeSessions)
    .where(eq(challengeSessions.id, sessionId));
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, session.challengeId));

  const result = await evaluateChallenge({
    title: challenge.title,
    kind: challenge.kind,
    prompt: challenge.prompt,
    requirements: challenge.requirements ?? [],
    evalRubric: challenge.evalRubric,
    language: session.language,
    approach: session.approach,
    code: session.code ?? "",
    notes: session.notes,
  });

  if (!result.ok) {
    return NextResponse.json({ sessionId, error: result.error }, { status: 502 });
  }
  await db
    .update(challengeSessions)
    .set({ analysis: result.result })
    .where(eq(challengeSessions.id, sessionId));
  return NextResponse.json({ sessionId, analysis: result.result });
}

async function record(body: { sessionId: number; solved?: boolean }) {
  await db
    .update(challengeSessions)
    .set({ solved: !!body.solved })
    .where(eq(challengeSessions.id, body.sessionId));
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const rows = await db
    .select()
    .from(challengeSessions)
    .orderBy(desc(challengeSessions.createdAt))
    .limit(50);
  return NextResponse.json({ sessions: rows });
}
