import Link from "next/link";
import { db } from "@/lib/db/client";
import { knowledgeGraph, problems } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { TRACK } from "@/lib/progression/track";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const CONF_COLOR: Record<string, string> = {
  high: "text-accent",
  medium: "text-accent-warm",
  low: "text-danger",
};

export default async function GraphPage() {
  const [graph, allProblems] = await Promise.all([
    db.select().from(knowledgeGraph),
    db.select().from(problems).orderBy(asc(problems.topic)),
  ]);

  const bankByTopic: Record<string, number> = {};
  for (const p of allProblems)
    bankByTopic[p.topic] = (bankByTopic[p.topic] ?? 0) + 1;

  const rowByTopic = new Map(graph.map((g) => [g.topic, g]));

  return (
    <div className="space-y-10">
      <PageHeader
        kicker="Progress"
        title="Knowledge graph"
        description={
          <>
            Per-topic progress. <span className="text-text">Readiness</span> is the
            mean AI interview-readiness across your analysed attempts — where your
            first-thought and pasted code feed back into the graph. Confidence
            combines solved count, accuracy and readiness.
          </>
        }
      />

      <div className="panel overflow-x-auto px-4 py-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-widest text-text-faint">
              <th className="py-2 pr-4">Topic</th>
              <th className="py-2 pr-4">Solved</th>
              <th className="py-2 pr-4">Attempts</th>
              <th className="py-2 pr-4">Accuracy</th>
              <th className="py-2 pr-4">Readiness</th>
              <th className="py-2 pr-4">Interview</th>
              <th className="py-2 pr-4">Revise</th>
              <th className="py-2 pr-4">Confidence</th>
              <th className="py-2">In bank</th>
            </tr>
          </thead>
          <tbody>
            {TRACK.map((topic) => {
              const r = rowByTopic.get(topic);
              return (
                <tr
                  key={topic}
                  id={topic}
                  className="scroll-mt-24 border-b border-border"
                >
                  <td className="py-2.5 pr-4 text-text">
                    <Link
                      href={`/problems#${encodeURIComponent(topic)}`}
                      className="hover:text-accent"
                    >
                      {topic}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-text-dim">
                    {r?.solvedCount ?? 0}
                  </td>
                  <td className="py-2.5 pr-4 text-text-dim">
                    {r?.attemptCount ?? 0}
                  </td>
                  <td className="py-2.5 pr-4 text-text-dim">
                    {r ? `${r.accuracyPct}%` : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-text-dim">
                    {r?.avgReadiness != null ? `${r.avgReadiness}/10` : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-text-dim">
                    {r?.avgInterviewScore != null
                      ? `${r.avgInterviewScore}/10`
                      : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-accent-warm">
                    {r?.reviseCount ? r.reviseCount : "—"}
                  </td>
                  <td
                    className={`py-2.5 pr-4 capitalize ${
                      r ? CONF_COLOR[r.confidence] : "text-text-faint"
                    }`}
                  >
                    {r?.confidence ?? "—"}
                  </td>
                  <td className="py-2.5 text-text-faint">
                    {bankByTopic[topic] ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
