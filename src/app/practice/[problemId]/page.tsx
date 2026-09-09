import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { problems, solveSessions } from "@/lib/db/schema";
import { SolveFlow } from "@/components/SolveFlow";
import { PriorAttempts, type PriorAttempt } from "@/components/PriorAttempts";

export const dynamic = "force-dynamic";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ problemId: string }>;
}) {
  const { problemId } = await params;
  const [problem] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, problemId));

  if (!problem) notFound();

  const rows = await db
    .select()
    .from(solveSessions)
    .where(eq(solveSessions.problemId, problemId))
    .orderBy(desc(solveSessions.createdAt));

  // Only show attempts that were actually worked on (have code or a journal).
  const prior: PriorAttempt[] = rows
    .filter((r) => r.code?.trim() || r.firstThought?.trim())
    .map((r) => ({
      id: r.id,
      attemptNumber: r.attemptNumber,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      solved: !!r.solved,
      selfRating: r.selfRating,
      language: r.language,
      durationSec: r.durationSec,
      firstThought: r.firstThought,
      bruteForceIdea: r.bruteForceIdea,
      bruteForceBigO: r.bruteForceBigO,
      whyItWorks: r.whyItWorks,
      code: r.code,
      analysis: r.analysis,
    }));

  return (
    <div className="space-y-6">
      <div className="reveal reveal-1">
        <Link
          href="/problems"
          className="text-xs text-text-faint transition-colors hover:text-text-dim"
        >
          ← Problems
        </Link>
        <h1 className="display mt-2 text-[length:var(--text-title)]">
          {problem.title}
        </h1>
        <p className="mt-1.5 text-sm text-text-dim">
          <span
            className={
              problem.difficulty === "Easy"
                ? "text-accent"
                : problem.difficulty === "Hard"
                  ? "text-danger"
                  : "text-accent-warm"
            }
          >
            {problem.difficulty}
          </span>{" "}
          · {problem.topic}
          {problem.subtopic ? ` · ${problem.subtopic}` : ""}
        </p>
      </div>

      {prior.length > 0 && <PriorAttempts attempts={prior} />}

      <SolveFlow
        problem={{
          id: problem.id,
          title: problem.title,
          leetcodeUrl: problem.leetcodeUrl,
          optimalComplexity: problem.optimalComplexity,
        }}
      />
    </div>
  );
}
