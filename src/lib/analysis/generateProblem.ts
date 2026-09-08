import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { chatJson } from "@/lib/ai";
import { db } from "@/lib/db/client";
import { problems } from "@/lib/db/schema";

const generatedSchema = z.object({
  leetcodeSlug: z.string(), // e.g. "two-sum"
  title: z.string(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  subtopic: z.string(),
  optimalComplexity: z.string(),
  patternTags: z.array(z.string()).max(6),
  companyTags: z.array(z.string()).max(6),
});

/**
 * Ask the model for one more real LeetCode problem in `topic` that isn't already
 * in the bank, then insert it (source = "ai"). Returns the inserted row or null.
 */
export async function generateNewProblem(
  topic: string,
): Promise<typeof problems.$inferSelect | null> {
  const existing = await db
    .select({ title: problems.title })
    .from(problems)
    .where(eq(problems.topic, topic));
  const known = existing.map((e) => e.title).join(", ");

  let raw: string;
  try {
    raw = await chatJson([
      {
        role: "system",
        content:
          "You recommend real, well-known LeetCode problems. Return ONLY a JSON object: " +
          '{ "leetcodeSlug": string, "title": string, "difficulty": "Easy"|"Medium"|"Hard", ' +
          '"subtopic": string, "optimalComplexity": string, "patternTags": string[], "companyTags": string[] }. ' +
          "The slug must be the exact leetcode.com/problems/<slug> path segment.",
      },
      {
        role: "user",
        content: `Give me ONE more real LeetCode problem for the topic "${topic}" that is NOT any of these already-covered problems: ${known}. Pick something commonly asked in interviews.`,
      },
    ]);
  } catch {
    return null;
  }

  let parsed;
  try {
    parsed = generatedSchema.parse(JSON.parse(stripFence(raw)));
  } catch {
    return null;
  }

  const id = `ai_${parsed.leetcodeSlug}`.slice(0, 60);
  const [dup] = await db.select().from(problems).where(eq(problems.id, id));
  if (dup) return dup;

  const [maxRow] = await db
    .select({ m: sql<number>`coalesce(max(${problems.trackOrder}), 0)` })
    .from(problems)
    .where(eq(problems.topic, topic));

  const [row] = await db
    .insert(problems)
    .values({
      id,
      title: parsed.title,
      difficulty: parsed.difficulty,
      topic,
      subtopic: parsed.subtopic,
      leetcodeUrl: `https://leetcode.com/problems/${parsed.leetcodeSlug}/`,
      optimalComplexity: parsed.optimalComplexity,
      patternTags: parsed.patternTags,
      companyTags: parsed.companyTags,
      trackOrder: Number(maxRow?.m ?? 0) + 1,
      source: "ai",
    })
    .returning();

  return row ?? null;
}

function stripFence(s: string): string {
  const t = s.trim();
  return t.startsWith("```")
    ? t.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim()
    : t;
}
