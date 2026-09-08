import Link from "next/link";
import { getDashboard } from "@/lib/dashboard";
import { TRACK } from "@/lib/progression/track";
import { FindMoreButton } from "@/components/FindMoreButton";
import { MentorBrief } from "@/components/MentorBrief";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const d = await getDashboard();
  const rec = d.recommendation;

  return (
    <div className="space-y-10">
      <section>
        <p className="font-mono text-xs uppercase tracking-widest text-text-faint">
          Welcome back, Aiyatullah
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {d.state.currentPhase} · {rec.topic}
        </h1>
      </section>

      <MentorBrief />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Problems solved"
          value={`${d.problemsSolved} / ${d.bankSize}`}
        />
        <Stat label="Current streak" value={`${d.streakDays}d`} accent="warm" />
        <Stat
          label="To revise"
          value={d.reviseCount}
          accent={d.reviseCount > 0 ? "warm" : undefined}
        />
        <Stat
          label="Weak areas"
          value={d.weakAreas.length ? d.weakAreas.join(", ") : "—"}
          small
        />
      </section>

      <section className="rounded-xl border border-border bg-bg-raised p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-text-faint">
          Today&apos;s problem
        </p>
        {rec.problem ? (
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{rec.problem.title}</h2>
              <p className="mt-1 text-sm text-text-dim">
                {rec.problem.difficulty} · {rec.problem.topic}
                {rec.problem.subtopic ? ` · ${rec.problem.subtopic}` : ""}
              </p>
              <p className="mt-2 max-w-md text-xs text-text-faint">{rec.reason}</p>
            </div>
            <Link
              href={`/practice/${rec.problem.id}`}
              className="shrink-0 rounded-lg bg-accent px-5 py-2.5 text-center text-sm font-medium text-bg transition-opacity hover:opacity-90"
            >
              {rec.kind === "revise" ? "Revise →" : "Start solving →"}
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-text-dim">
            Nothing recommended.{" "}
            <Link href="/problems" className="text-accent">
              Browse the bank.
            </Link>
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4">
          <FindMoreButton />
          {rec.problem && (
            <Link
              href={`/interview/${rec.problem.id}`}
              className="text-sm text-text-dim hover:text-text"
            >
              🎙 Mock interview on this →
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-text-faint">
            Track progress
          </h3>
          <ol className="space-y-1.5 text-sm">
            {TRACK.map((topic) => {
              const row = d.graph.find((g) => g.topic === topic);
              return (
                <li key={topic} className="flex items-center justify-between gap-3">
                  <Link
                    href={`/graph#${encodeURIComponent(topic)}`}
                    className={
                      topic === rec.topic
                        ? "text-text"
                        : "text-text-dim hover:text-text"
                    }
                  >
                    {topic === rec.topic ? "▸ " : "  "}
                    {topic}
                  </Link>
                  <span className="shrink-0 font-mono text-xs text-text-faint">
                    {row
                      ? `${row.solvedCount} solved${
                          row.avgReadiness != null
                            ? ` · ${row.avgReadiness}/10`
                            : ""
                        } · ${row.confidence}${
                          row.reviseCount > 0 ? ` · ${row.reviseCount}⟳` : ""
                        }`
                      : "—"}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div>
          <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-text-faint">
            Recent mock interviews
          </h3>
          {d.interviews.length ? (
            <ul className="mb-6 space-y-2 text-sm">
              {d.interviews.map((iv) => (
                <li
                  key={iv.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-text-dim">{iv.problemId ?? "freeform"}</span>
                  <span className="font-mono text-xs">
                    {iv.score ? (
                      <span
                        className={
                          iv.score.hireVerdict.includes("yes")
                            ? "text-accent"
                            : "text-text-faint"
                        }
                      >
                        {iv.score.overall}/10 · {iv.score.hireVerdict}
                      </span>
                    ) : (
                      "—"
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-6 text-sm text-text-faint">
              No mock interviews yet. Solve a problem, then hit “Mock interview”.
            </p>
          )}

          <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-text-faint">
            Recent attempts
          </h3>
          {d.recent.length ? (
            <ul className="space-y-2 text-sm">
              {d.recent.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-text-dim">
                    {s.problemId}
                    <span className="ml-1.5 text-text-faint">#{s.attemptNumber}</span>
                  </span>
                  <span className="font-mono text-xs">
                    {s.solved ? (
                      <span className="text-accent">solved</span>
                    ) : (
                      <span className="text-text-faint">attempt</span>
                    )}
                    {s.analysis
                      ? ` · ${s.analysis.scores.interviewReadiness}/10 ready`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-faint">No attempts yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string | number;
  accent?: "warm";
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-inset p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
        {label}
      </p>
      <p
        className={`mt-1.5 font-semibold ${small ? "text-sm leading-snug" : "text-2xl"} ${
          accent === "warm" ? "text-accent-warm" : "text-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
