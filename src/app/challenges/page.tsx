import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { challenges, challengeSessions } from "@/lib/db/schema";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  frontend: "Frontend / React",
  backend: "Backend",
  "api-design": "API Design",
};

const DIFF_COLOR: Record<string, string> = {
  Easy: "text-accent",
  Medium: "text-accent-warm",
  Hard: "text-danger",
};

export default async function ChallengesPage() {
  const [rows, done] = await Promise.all([
    db.select().from(challenges).orderBy(asc(challenges.kind), asc(challenges.trackOrder)),
    db
      .select({
        challengeId: challengeSessions.challengeId,
        solved: sql<boolean>`bool_or(${challengeSessions.solved})`,
        attempts: sql<number>`count(*)::int`,
      })
      .from(challengeSessions)
      .groupBy(challengeSessions.challengeId),
  ]);

  const stat = new Map(done.map((d) => [d.challengeId, d]));
  const byKind = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byKind.has(r.kind)) byKind.set(r.kind, []);
    byKind.get(r.kind)!.push(r);
  }

  const solvedCount = done.filter((d) => d.solved).length;

  return (
    <div className="space-y-10">
      <PageHeader
        kicker="Engineering Interview OS"
        title="Challenges"
        description={`${rows.length} challenges · ${solvedCount} complete. Not LeetCode — build a component, a backend service, or an API design, then get a staff-engineer review against the requirements.`}
      />

      {["frontend", "backend", "api-design"].map((kind) => {
        const list = byKind.get(kind) ?? [];
        if (!list.length) return null;
        return (
          <section key={kind}>
            <h2 className="label mb-2">{KIND_LABEL[kind] ?? kind}</h2>
            <ul className="panel divide-y divide-border overflow-hidden">
              {list.map((c) => {
                const s = stat.get(c.id);
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
                  >
                    <span
                      aria-hidden
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-xs ${
                        s?.solved
                          ? "border-accent bg-accent text-bg"
                          : s
                            ? "border-accent-warm text-accent-warm"
                            : "border-border text-transparent"
                      }`}
                    >
                      {s?.solved ? "✓" : s ? "·" : "·"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-text">{c.title}</span>
                      <span className="ml-2 text-xs text-text-faint">
                        <span className={DIFF_COLOR[c.difficulty]}>{c.difficulty}</span>
                        {s ? ` · ${s.attempts} attempt${s.attempts > 1 ? "s" : ""}` : ""}
                        {(c.companyTags?.length ?? 0) > 0
                          ? ` · ${c.companyTags!.slice(0, 3).join(" · ")}`
                          : ""}
                      </span>
                    </span>
                    <Link href={`/challenges/${c.id}`} className="text-xs text-accent">
                      {s ? "Open →" : "Start →"}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
