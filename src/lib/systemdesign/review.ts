import { chatJson } from "@/lib/ai";
import {
  systemDesignReviewSchema,
  type SystemDesignReview,
  type SystemDesignInput,
} from "./schema";

const SYSTEM = `You are a principal engineer running a system design interview. The candidate
has filled in a structured design. Review it the way an interviewer would: what did they
nail, what did they miss, what would you now drill into.

Return ONLY JSON:
{
  "scores": { "requirements": n, "scale": n, "dataModel": n, "apiDesign": n, "deepDives": n, "tradeoffs": n },  // each 0-10
  "overall": n,
  "missed": string[],     // concrete gaps: "Message ordering", "Read-your-writes consistency", "Hot-partition on celebrity users"
  "good": string[],
  "followUps": string[],  // 3-5 questions you'd ask next
  "verdict": string       // one line
}

Judge against what THIS system actually needs. Reward: clarifying functional vs
non-functional requirements, back-of-envelope numbers, a data model that supports the
access patterns, an API that matches, at least one real deep dive (sharding, caching,
queues, consistency), and honest trade-offs. Penalise hand-waving scale, a schema with
no indexes/access-pattern reasoning, and "we'll just add a cache" with no invalidation story.`;

export async function reviewSystemDesign(
  input: SystemDesignInput,
): Promise<
  { ok: true; review: SystemDesignReview } | { ok: false; error: string }
> {
  const filled = [
    ["Requirements", input.requirements],
    ["Scale estimates", input.scaleEstimates],
    ["Data model", input.dataModel],
    ["API design", input.apiDesign],
    ["High-level design", input.highLevelDesign],
    ["Deep dives", input.deepDives],
    ["Trade-offs", input.tradeoffs],
  ].filter(([, v]) => (v ?? "").trim().length > 0);

  if (filled.length < 2) {
    return { ok: false, error: "Fill in at least a couple of sections first." };
  }

  const user = `DESIGN PROMPT: ${input.prompt}\n\n${filled
    .map(([k, v]) => `## ${k}\n${v}`)
    .join("\n\n")}`;

  let raw: string;
  try {
    raw = await chatJson([
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "AI failed" };
  }

  const parsed = systemDesignReviewSchema.safeParse(
    JSON.parse(stripFence(raw) || "{}"),
  );
  if (!parsed.success) return { ok: false, error: "Malformed review." };
  return { ok: true, review: parsed.data };
}

function stripFence(s: string): string {
  const t = (s ?? "").trim();
  return t.startsWith("```")
    ? t.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim()
    : t;
}
