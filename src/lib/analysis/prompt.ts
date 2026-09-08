import type { AnalyzeInput } from "./schema";

const SYSTEM = `You are a senior software engineer running a coding interview debrief.
You review BOTH the candidate's written reasoning and their code. You are specific and
concrete: cite line numbers, name the exact missing step, compare claimed Big-O to the
real Big-O of the code. You are encouraging but never inflate scores.

Return ONLY a JSON object matching this TypeScript type — no prose, no markdown fence:

{
  "scores": { "correctness": number, "complexity": number, "codeQuality": number, "interviewReadiness": number },   // each 0-10
  "detectedComplexity": { "time": string, "space": string },   // the ACTUAL complexity of the submitted code
  "claimedVsActual": string,   // 1-3 sentences comparing what the candidate claimed to reality
  "thinkingReview": { "good": string[], "gaps": string[] },
  "codeIssues": [ { "severity": "high"|"med"|"low", "line": number|null, "note": string } ],
  "whatsLacking": string[],          // concrete gaps: edge cases, tests, naming, structure
  "howToThinkNextTime": string[],    // 2-4 ordered steps
  "readinessVerdict": string         // one line
}

Scoring guidance:
- correctness: does the code solve the stated problem for all inputs including edge cases?
- complexity: how close is it to the optimal complexity? 10 = optimal, drop for each extra factor.
- codeQuality: naming, structure, readability, idiomatic use of the language.
- interviewReadiness: would this pass a real interview given the reasoning shown? Reward stating
  brute force first, naming tradeoffs, and analyzing complexity out loud.`;

export function buildMessages(input: AnalyzeInput) {
  const parts: string[] = [];

  if (input.problem) {
    parts.push(
      `PROBLEM: ${input.problem.title} (${input.problem.difficulty}, topic: ${input.problem.topic})`,
    );
    if (input.problem.optimalComplexity)
      parts.push(`KNOWN OPTIMAL: ${input.problem.optimalComplexity}`);
    if (input.problem.patternTags?.length)
      parts.push(`EXPECTED PATTERN(S): ${input.problem.patternTags.join(", ")}`);
    if (input.problem.leetcodeUrl)
      parts.push(`LEETCODE: ${input.problem.leetcodeUrl}`);
  } else if (input.intent) {
    parts.push(`CANDIDATE'S STATED INTENT FOR THIS CODE:\n${input.intent}`);
  }

  if (input.journal) {
    const j = input.journal;
    parts.push("--- CANDIDATE'S WRITTEN REASONING ---");
    if (j.firstThought) parts.push(`First thought: ${j.firstThought}`);
    if (j.bruteForceIdea) parts.push(`Brute force idea: ${j.bruteForceIdea}`);
    if (j.bruteForceBigO) parts.push(`Claimed brute-force Big-O: ${j.bruteForceBigO}`);
    if (j.whyItWorks) parts.push(`Why the final solution works: ${j.whyItWorks}`);
  }

  parts.push("--- SUBMITTED CODE ---");
  parts.push(`Language: ${input.language}`);
  parts.push(numberLines(input.code));

  return [
    { role: "system" as const, content: SYSTEM },
    { role: "user" as const, content: parts.join("\n\n") },
  ];
}

function numberLines(code: string): string {
  return code
    .split("\n")
    .map((l, i) => `${String(i + 1).padStart(3, " ")} | ${l}`)
    .join("\n");
}
