import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { problems, problemStatus } from "@/lib/db/schema";
import type { ProblemStatusValue } from "@/lib/db/schema";
import { TRACK } from "@/lib/progression/track";
import { ProblemRow } from "@/components/ProblemRow";
import { CollapsibleGroups, type Group } from "@/components/CollapsibleGroups";
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

  const groups: Group[] = orderedTopics.map((topic) => {
    const list = byTopic.get(topic)!;
    return {
      key: topic,
      label: topic,
      count: list.length,
      done: list.filter((r) => r.problem_status?.status === "solved").length,
      items: list.map((r) => {
        const lists: string[] = [];
        if (r.problems.inBlind75) lists.push("Blind75");
        if (r.problems.inNeetcode150) lists.push("NC150");
        if (r.problems.inGrind169) lists.push("Grind169");
        return {
          id: r.problems.id,
          search: [
            r.problems.title,
            r.problems.topic,
            r.problems.subtopic ?? "",
            r.problems.difficulty,
            ...(r.problems.companyTags ?? []),
            ...(r.problems.patternTags ?? []),
          ].join(" "),
          node: (
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
                (r.problem_status?.status as ProblemStatusValue) ?? "unsolved"
              }
              attemptCount={r.problem_status?.attemptCount ?? 0}
              lastReadiness={r.problem_status?.lastReadiness ?? null}
            />
          ),
        };
      }),
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Problem bank"
        title="Problems"
        description={`${rows.length} problems · ${solved} solved. Search across every topic, collapse the ones you've cleared.`}
      />
      <CollapsibleGroups
        groups={groups}
        storeKey="problems"
        placeholder="Search problems, companies, patterns…"
      />
    </div>
  );
}
