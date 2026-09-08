import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { challenges } from "@/lib/db/schema";
import { ChallengeSolve } from "@/components/ChallengeSolve";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  frontend: "Frontend / React",
  backend: "Backend",
  "api-design": "API Design",
};

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, id));
  if (!challenge) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/challenges" className="text-xs text-text-faint hover:text-text-dim">
          ← Challenges
        </Link>
        <p className="mt-2 label">
          {KIND_LABEL[challenge.kind] ?? challenge.kind} · {challenge.difficulty}
        </p>
        <h1 className="display mt-1 text-[length:var(--text-title)]">{challenge.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-dim">
          {challenge.prompt}
        </p>
        {challenge.referenceUrl && (
          <a
            href={challenge.referenceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs text-accent"
          >
            Reference ↗
          </a>
        )}
      </div>
      <ChallengeSolve
        challengeId={challenge.id}
        kind={challenge.kind}
        requirements={challenge.requirements ?? []}
      />
    </div>
  );
}
