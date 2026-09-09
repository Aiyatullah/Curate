import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { problems } from "@/lib/db/schema";
import { chatJson } from "@/lib/ai";

const LEVEL_BRIEF: Record<number, string> = {
  1: "A gentle nudge — point at what to notice about the problem, no technique named. One or two sentences.",
  2: "Name the data structure or technique that unlocks it, and why, but do NOT give the algorithm. Two or three sentences.",
  3: "Spell out the full approach in plain English — the pattern, the invariant, the steps — but still NO code. The candidate will implement it themselves.",
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { problemId, level, firstThought } = (body ?? {}) as {
    problemId?: string;
    level?: number;
    firstThought?: string;
  };
  const lvl = level === 2 ? 2 : level === 3 ? 3 : 1;
  if (!problemId) {
    return NextResponse.json({ error: "problemId required" }, { status: 400 });
  }

  const [problem] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, problemId));
  if (!problem) {
    return NextResponse.json({ error: "Unknown problem" }, { status: 404 });
  }

  const system = `You are a coding-interview coach giving a hint for a specific problem.
Never write code. Be encouraging. ${LEVEL_BRIEF[lvl]}
Return ONLY JSON: { "hint": string }`;

  const user = [
    `PROBLEM: ${problem.title} (${problem.difficulty}, ${problem.topic}).`,
    problem.optimalComplexity ? `Optimal: ${problem.optimalComplexity}.` : "",
    (problem.patternTags?.length ?? 0) > 0
      ? `Pattern(s): ${problem.patternTags!.join(", ")}.`
      : "",
    problem.leetcodeUrl ? `LeetCode: ${problem.leetcodeUrl}` : "",
    firstThought?.trim()
      ? `The candidate's current thinking: "${firstThought.trim()}". Meet them where they are.`
      : "The candidate is stuck and hasn't got an approach yet.",
    `Give the level-${lvl} hint.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await chatJson([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const parsed = JSON.parse(stripFence(raw) || "{}") as { hint?: string };
    if (parsed.hint) return NextResponse.json({ hint: parsed.hint, level: lvl });
  } catch (err) {
    console.error("[/api/hint]", err);
  }
  return NextResponse.json({ error: "Could not generate a hint." }, { status: 502 });
}

function stripFence(s: string): string {
  const t = (s ?? "").trim();
  return t.startsWith("```")
    ? t.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim()
    : t;
}
