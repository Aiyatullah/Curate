import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { problems, problemStatus } from "@/lib/db/schema";
import type { ProblemStatusValue } from "@/lib/db/schema";
import { TRACK } from "@/lib/progression/track";
import { ProblemRow } from "@/components/ProblemRow";

export const dynamic = "force-dynamic";

export default async function ProblemsPage() {
  const rows = await db
    .select()
    .from(problems)
    .leftJoin(problemStatus, eq(problemStatus.problemId, problems.id))
    .orderBy(asc(problems.topic), asc(problems.trackOrder), asc(problems.id));

  type Row = (typeof rows)[number];
  const byTopic = new Map<string, Row[]>();
  for (const r of rows) {
    const t = r.problems.topic;
    if (!byTopic.has(t)) byTopic.set(t, []);
    byTopic.get(t)!.push(r);
  }

  const orderedTopics = [
    ...TRACK.filter((t) => byTopic.has(t)),
    ...[...byTopic.keys()].filter((t) => !TRACK.includes(t)),
  ];

  const solved = rows.filter((r) => r.problem_status?.status === "solved").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Problem Bank</h1>
        <p className="mt-1 text-sm text-text-dim">
          {rows.length} problems · {solved} solved · grouped by track topic. Tick
          the box to mark solved, or flag a problem to revise.
        </p>
      </div>

      {orderedTopics.map((topic) => {
        const list = byTopic.get(topic)!;
        const done = list.filter(
          (r) => r.problem_status?.status === "solved",
        ).length;
        return (
          <section key={topic} id={topic}>
            <h2 className="mb-2 flex items-baseline justify-between font-mono text-xs uppercase tracking-widest text-text-faint">
              <span>{topic}</span>
              <span>
                {done}/{list.length}
              </span>
            </h2>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {list.map((r) => {
                const lists: string[] = [];
                if (r.problems.inBlind75) lists.push("Blind75");
                if (r.problems.inNeetcode150) lists.push("NC150");
                if (r.problems.inGrind169) lists.push("Grind169");
                return (
                  <ProblemRow
                    key={r.problems.id}
                    id={r.problems.id}
                    title={r.problems.title}
                    difficulty={r.problems.difficulty}
                    subtopic={r.problems.subtopic}
                    leetcodeUrl={r.problems.leetcodeUrl}
                    companyTags={r.problems.companyTags ?? []}
                    lists={lists}
                    initialStatus={
                      (r.problem_status?.status as ProblemStatusValue) ??
                      "unsolved"
                    }
                    attemptCount={r.problem_status?.attemptCount ?? 0}
                    lastReadiness={r.problem_status?.lastReadiness ?? null}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
