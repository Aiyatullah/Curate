import { chatJson } from "@/lib/ai";
import { repoReviewSchema, type RepoReview, type RepoInput } from "./repo-schema";

const SYSTEM = `You are a staff engineer doing a first-pass review of a codebase a candidate
submitted (a take-home, a side project, or work they want feedback on). You get the file
tree plus the contents of the most important files. Judge architecture, code quality,
testing, docs and security. Be concrete — cite file paths.

Return ONLY JSON:
{
  "summary": string,
  "stack": string[],
  "scores": { "architecture": n, "codeQuality": n, "testing": n, "documentation": n, "security": n },  // 0-10
  "overall": n,
  "strengths": string[],
  "risks": [ { "severity": "high"|"med"|"low", "file": string|null, "note": string } ],
  "quickWins": string[],          // highest-leverage improvements, ordered
  "interviewerTake": string       // 2-4 sentences: would this pass as a take-home, what stands out
}
If you can't see test files, score testing low and say so. Flag secrets, injection,
missing input validation, and unsafe defaults under security.`;

export async function reviewRepo(
  input: RepoInput,
): Promise<{ ok: true; review: RepoReview } | { ok: false; error: string }> {
  if (!input.files.length) return { ok: false, error: "No readable source files found in the archive." };

  const parts = [
    `FILE TREE (${input.tree.length} paths):\n${input.tree.slice(0, 400).join("\n")}`,
  ];
  if (input.note) parts.push(`CANDIDATE ASKS YOU TO FOCUS ON:\n${input.note}`);
  for (const f of input.files) {
    parts.push(`--- ${f.path} ---\n${f.content}`);
  }

  let raw: string;
  try {
    raw = await chatJson([
      { role: "system", content: SYSTEM },
      { role: "user", content: parts.join("\n\n") },
    ]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "AI request failed" };
  }

  const parsed = repoReviewSchema.safeParse(JSON.parse(stripFence(raw) || "{}"));
  if (!parsed.success) return { ok: false, error: "AI returned a malformed review." };
  return { ok: true, review: parsed.data };
}

function stripFence(s: string): string {
  const t = (s ?? "").trim();
  return t.startsWith("```")
    ? t.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim()
    : t;
}
