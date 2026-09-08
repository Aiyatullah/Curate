import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { problems, solveSessions } from "@/lib/db/schema";
import { InterviewChat } from "@/components/InterviewChat";

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
      <div>
        <Link
          href={`/practice/${problemId}`}
          className="text-xs text-text-faint hover:text-text-dim"
        >
          ← Back to solve
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          Mock Interview · {problem.title}
        </h1>
        <p className="mt-1 text-sm text-text-dim">
          {problem.difficulty} · {problem.topic}
        </p>
      </div>
      <InterviewChat
        problemId={problem.id}
        problemTitle={problem.title}
        hasSolveSession={!!session}
      />
    </div>
  );
}
