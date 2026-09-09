import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { problems, solveSessions } from "@/lib/db/schema";
import { InterviewChat } from "@/components/InterviewChat";
import { SessionRecorder } from "@/components/SessionRecorder";

export const dynamic = "force-dynamic";

export default async function InterviewPage({
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

  const [session] = await db
    .select({ id: solveSessions.id })
    .from(solveSessions)
    .where(eq(solveSessions.problemId, problemId))
    .orderBy(desc(solveSessions.createdAt))
    .limit(1);

  return (
    <div className="space-y-6">
      <div className="reveal reveal-1">
        <Link
          href="/interview"
          className="text-xs text-text-faint hover:text-text-dim"
        >
          ← Interview hub
        </Link>
        <h1 className="display mt-2 text-[length:var(--text-title)]">
          Mock interview · {problem.title}
        </h1>
        <p className="mt-1 text-sm text-text-dim">
          {problem.difficulty} · {problem.topic}
        </p>
      </div>
      <SessionRecorder label="Record this interview (optional)" />
      <InterviewChat
        startPayload={{ problemId: problem.id }}
        startLabel="Start debrief →"
        splash={
          <>
            <p className="text-sm text-text-dim">
              A senior engineer will debrief you on{" "}
              <strong>{problem.title}</strong> — approach, complexity, tradeoffs
              and edge cases, then a scorecard.
            </p>
            {!session && (
              <p className="text-xs text-accent-warm">
                You haven&apos;t submitted a solution yet — the interviewer runs
                without your code. Solve it first for a sharper debrief.
              </p>
            )}
          </>
        }
      />
    </div>
  );
}
