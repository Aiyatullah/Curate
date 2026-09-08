import { chatJson } from "@/lib/ai";
import {
  analysisResultSchema,
  type AnalysisResult,
} from "@/lib/analysis/schema";

export type ChallengeEvalInput = {
  title: string;
  kind: string; // frontend | backend | api-design
  prompt: string;
  requirements: string[];
  evalRubric?: string | null;
  language: string;
  approach?: string | null;
  code: string;
  notes?: string | null;
};

const SYSTEM = `You are a staff engineer reviewing a take-home / interview solution to an
engineering challenge (component build, backend service, or API design). You judge it
against the stated requirements and rubric, not against LeetCode-style complexity.

Return ONLY a JSON object matching this type (no prose, no fence):

{
  "scores": { "correctness": n, "complexity": n, "codeQuality": n, "interviewReadiness": n },  // each 0-10
  "detectedComplexity": { "time": string, "space": string },   // for API-design tasks put "n/a" and use notes
  "claimedVsActual": string,   // does the solution actually meet the requirements it claims to?
  "thinkingReview": { "good": string[], "gaps": string[] },
  "codeIssues": [ { "severity": "high"|"med"|"low", "line": number|null, "note": string } ],
  "whatsLacking": string[],          // requirements not met, missing edge cases, missing accessibility, etc.
  "howToThinkNextTime": string[],    // 2-4 ordered steps
  "readinessVerdict": string
}

Interpretation for this challenge type:
- correctness: does it satisfy the functional requirements and handle the stated edge cases?
- complexity: efficiency / avoiding needless re-work / re-renders / N+1 queries (0-10; "n/a" tasks -> score the algorithmic soundness of the design)
- codeQuality: structure, naming, idiom, testability, immutability where relevant
- interviewReadiness: would this pass the bar at a strong company? Reward stating an approach first,
  naming trade-offs, and covering accessibility / failure modes / scale as the task demands.`;

export async function evaluateChallenge(
  input: ChallengeEvalInput,
): Promise<
  { ok: true; result: AnalysisResult } | { ok: false; error: string }
> {
  if (!input.code?.trim())
    return { ok: false, error: "Nothing submitted." };

  const parts = [
    `CHALLENGE (${input.kind}): ${input.title}`,
    input.prompt,
    `REQUIREMENTS:\n- ${input.requirements.join("\n- ")}`,
  ];
  if (input.evalRubric) parts.push(`RUBRIC (what a strong answer covers): ${input.evalRubric}`);
  if (input.approach) parts.push(`CANDIDATE'S WRITTEN APPROACH:\n${input.approach}`);
  parts.push(`SUBMISSION (${input.language}):\n${numberLines(input.code)}`);
  if (input.notes) parts.push(`CANDIDATE NOTES:\n${input.notes}`);

  let raw: string;
  try {
    raw = await chatJson([
      { role: "system", content: SYSTEM },
      { role: "user", content: parts.join("\n\n") },
    ]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "AI failed" };
  }

  const parsed = analysisResultSchema.safeParse(JSON.parse(stripFence(raw) || "{}"));
  if (!parsed.success) return { ok: false, error: "Malformed evaluation." };
  return { ok: true, result: parsed.data };
}

function numberLines(code: string): string {
  return code
    .split("\n")
    .map((l, i) => `${String(i + 1).padStart(3, " ")} | ${l}`)
    .join("\n");
}
function stripFence(s: string): string {
  const t = (s ?? "").trim();
  return t.startsWith("```")
    ? t.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim()
    : t;
}
