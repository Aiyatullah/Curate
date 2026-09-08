import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { problems } from "@/lib/db/schema";
import { SolveFlow } from "@/components/SolveFlow";

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

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-xs text-text-faint hover:text-text-dim">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{problem.title}</h1>
        <p className="mt-1 text-sm text-text-dim">
          {problem.difficulty} · {problem.topic}
          {problem.subtopic ? ` · ${problem.subtopic}` : ""}
        </p>
      </div>
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
