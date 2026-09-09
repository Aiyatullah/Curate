import { chatJson } from "@/lib/ai";
import {
  interviewTurnSchema,
  interviewScoreSchema,
  type InterviewTurn,
  type InterviewScore,
  type TranscriptEntry,
  type InterviewContext,
} from "./schema";

const MAX_QUESTIONS_QUICK = 6;

function contextBlock(ctx: InterviewContext): string {
  const parts: string[] = [];
  if (ctx.config) {
    parts.push(
      `ROLE: ${ctx.config.seniority} — ${ctx.config.role}. Calibrate difficulty and expectations to this.`,
    );
  }
  if (ctx.plan?.sections.length) {
    parts.push(
      "INTERVIEW PLAN (work through these in order, ~2-3 questions each, then move on; wrap after the last):\n" +
        ctx.plan.sections
          .map((s, i) => `  ${i + 1}. [${s.label}] ${s.brief}`)
          .join("\n"),
    );
  }
  if (ctx.problem) {
    parts.push(
      `PROBLEM: ${ctx.problem.title} (${ctx.problem.difficulty}, ${ctx.problem.topic})`,
    );
    if (ctx.problem.optimalComplexity)
      parts.push(`Known optimal: ${ctx.problem.optimalComplexity}`);
  }
  if (ctx.journal) {
    if (ctx.journal.firstThought)
      parts.push(`Candidate's first thought (written earlier): ${ctx.journal.firstThought}`);
    if (ctx.journal.bruteForceIdea)
      parts.push(`Candidate's brute-force note: ${ctx.journal.bruteForceIdea}`);
    if (ctx.journal.whyItWorks)
      parts.push(`Candidate's "why it works" note: ${ctx.journal.whyItWorks}`);
  }
  if (ctx.code) {
    parts.push(`CANDIDATE'S SUBMITTED CODE (${ctx.language ?? "?"}):\n${ctx.code}`);
  }
  return parts.join("\n");
}

function transcriptText(t: TranscriptEntry[]): string {
  return t
    .map((e) => `${e.role === "interviewer" ? "INTERVIEWER" : "CANDIDATE"}: ${e.text}`)
    .join("\n");
}

/**
 * Produce the interviewer's next turn. When `force` is true (candidate hit "end")
 * or the question budget is spent, the interviewer wraps up.
 */
export async function nextInterviewerTurn(
  ctx: InterviewContext,
  transcript: TranscriptEntry[],
  force = false,
): Promise<InterviewTurn> {
  const asked = transcript.filter((e) => e.role === "interviewer").length;
  const planned = ctx.plan?.sections.length ?? 0;
  const budget = planned ? Math.min(4 + planned * 3, 22) : MAX_QUESTIONS_QUICK;
  const shouldWrap = force || asked >= budget;

  const system = `You are a senior engineer running a ${
    planned ? "structured mock interview" : "coding interview debrief"
  }. You are warm but probing. You ask ONE focused question at a time and keep each
turn to 1-3 sentences. ${
    planned
      ? "Follow the INTERVIEW PLAN: cover each section with ~2-3 questions, signpost when you move to a new section, then wrap after the last section."
      : "Make the candidate state the brute force and its complexity, justify the optimal approach, analyse time/space out loud, and discuss tradeoffs and edge cases."
  } Push on vague answers ("why is that O(1)?", "what breaks on empty input?"). Never
give the answer away.

Return ONLY JSON: { "mode": "question" | "wrap", "message": string }.
- "question": your next single question (signpost a section change inside it if you're moving on).
- "wrap": ${
    shouldWrap
      ? "REQUIRED now — thank them, say the interview is complete. No new question."
      : "only when every planned section has been covered (or, for a debrief, approach + complexity + tradeoffs + edge cases)."
  }`;

  const opener = planned
    ? "(not started — greet them, name the format briefly, then ask the first question of section 1.)"
    : "(not started — open with 'Walk me through your approach.')";
  const user = `${contextBlock(ctx)}

--- INTERVIEW SO FAR ---
${transcript.length ? transcriptText(transcript) : opener}

Produce the interviewer's next turn.`;

  try {
    const raw = await chatJson([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const parsed = interviewTurnSchema.safeParse(JSON.parse(stripFence(raw)));
    if (parsed.success) {
      // honour a forced wrap even if the model tries to keep going
      if (shouldWrap) return { mode: "wrap", message: parsed.data.message };
      return parsed.data;
    }
  } catch {
    /* fall through */
  }

  return shouldWrap
    ? { mode: "wrap", message: "Thanks — that's a good place to stop. Let me pull together the feedback." }
    : { mode: "question", message: "Can you walk me through the time and space complexity of your solution?" };
}

/** Grade a finished interview. */
export async function gradeInterview(
  ctx: InterviewContext,
  transcript: TranscriptEntry[],
): Promise<
  { ok: true; score: InterviewScore } | { ok: false; error: string }
> {
  const roleLine = ctx.config
    ? `This was a ${ctx.config.seniority} interview for: ${ctx.config.role}. Grade against that bar.\n`
    : "";
  const system = `${roleLine}You grade a mock interview. Score each 0-10:
- communication: structure, signposting, not rambling, checking in with the interviewer
- clarity: precise language, correct terminology, easy to follow
- tradeoffDiscussion: did they compare approaches, name what they gave up, discuss alternatives
- complexityExplanation: did they analyse complexity / scale / cost correctly and out loud

Reward stating a baseline first and thinking out loud. Penalise jumping to a solution,
hand-waving complexity or scale, ignoring edge cases, needing answers dragged out.

Return ONLY JSON:
{ "scores": {"communication":n,"clarity":n,"tradeoffDiscussion":n,"complexityExplanation":n},
  "overall": n, "greenFlags": string[], "redFlags": string[], "feedback": string,
  "hireVerdict": "strong-no"|"no"|"lean-no"|"lean-yes"|"yes"|"strong-yes" }
feedback: 2-4 sentences, direct, addressed to the candidate as "you".`;

  const user = `${contextBlock(ctx)}

--- FULL TRANSCRIPT ---
${transcriptText(transcript)}

Grade this interview.`;

  let raw: string;
  try {
    raw = await chatJson([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "AI failed" };
  }

  const parsed = interviewScoreSchema.safeParse(JSON.parse(stripFence(raw) || "{}"));
  if (!parsed.success) return { ok: false, error: "Malformed grade." };
  return { ok: true, score: parsed.data };
}

function stripFence(s: string): string {
  const t = (s ?? "").trim();
  return t.startsWith("```")
    ? t.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim()
    : t;
}

export { MAX_QUESTIONS_QUICK };
