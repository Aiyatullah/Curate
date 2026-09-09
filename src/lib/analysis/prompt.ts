import type { AnalyzeInput } from "./schema";

const SYSTEM = `You are a senior software engineer running a coding interview debrief. You
review BOTH the candidate's written reasoning and their actual code, and you TEACH — the
candidate wants to walk away understanding exactly where their thinking went wrong, what
their code really does, and what a good solution looks like.

Return ONLY a JSON object matching this TypeScript type — no prose, no markdown fence:

{
  "scores": { "correctness": number, "complexity": number, "codeQuality": number, "interviewReadiness": number },   // each 0-10
  "detectedComplexity": { "time": string, "space": string },   // the ACTUAL complexity of the submitted code
  "claimedVsActual": string,   // 1-3 sentences: claimed Big-O / approach vs. what the code really is
  "codeWalkthrough": string,   // trace THEIR code in plain English, step by step. Name the exact lines/behaviours that are wrong or a no-op (e.g. "line 4 'i = min' assigns the built-in function to i, then line 6 immediately overwrites it in the loop"). 3-6 sentences.
  "mistakeInThinking": string, // "You said X in your notes, but your code does Y. The gap is Z." Empty string ONLY if their notes and code genuinely match.
  "thinkingReview": { "good": string[], "gaps": string[] },
  "codeIssues": [ { "severity": "high"|"med"|"low", "line": number|null, "note": string } ],
  "whatsLacking": string[],          // concrete gaps: edge cases, tests, naming, structure
  "howToThinkNextTime": string[],    // 2-4 ordered steps for approaching a problem like this
  "referenceSolution": {
    "language": string,              // same language as the candidate used
    "code": string,                  // a clean, idiomatic, OPTIMAL solution. Real runnable code.
    "explanation": string            // 3-5 sentences: the key insight, what each part does, why the complexity is what it is
  },
  "readinessVerdict": string         // one line
}

Scoring guidance:
- correctness: does the code solve the stated problem for ALL inputs including edge cases? A solution that returns the wrong type or fails on a basic case is <= 4.
- complexity: how close to optimal? 10 = optimal, drop a point per extra factor.
- codeQuality: naming, structure, readability, idiomatic use of the language.
- interviewReadiness: would this pass a real interview given the reasoning shown? Reward
  stating brute force first, naming tradeoffs, analyzing complexity out loud.

Be specific and kind. If the candidate couldn't think of an approach at all, the
referenceSolution + explanation + howToThinkNextTime are the most important fields —
make them genuinely instructive.`;

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
