import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { problems, problemStatus } from "@/lib/db/schema";
import type { ProblemStatusValue } from "@/lib/db/schema";
import { TRACK } from "@/lib/progression/track";
import { ProblemRow } from "@/components/ProblemRow";
import { PageHeader } from "@/components/ui";

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
    <div className="space-y-10">
      <PageHeader
        kicker="Problem bank"
        title="Problems"
        description={`${rows.length} problems · ${solved} solved · grouped by track topic. Tick the box to mark solved, or flag a problem to revise.`}
      />

      {orderedTopics.map((topic) => {
        const list = byTopic.get(topic)!;
        const done = list.filter(
          (r) => r.problem_status?.status === "solved",
        ).length;
        return (
          <section key={topic} id={topic} className="scroll-mt-24">
            <h2 className="label mb-2 flex items-baseline justify-between">
              <span>{topic}</span>
              <span>
                {done}/{list.length}
              </span>
            </h2>
            <ul className="panel divide-y divide-border overflow-hidden">
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
