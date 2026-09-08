import Link from "next/link";
import { getDashboard } from "@/lib/dashboard";
import { TRACK } from "@/lib/progression/track";
import { FindMoreButton } from "@/components/FindMoreButton";
import { MentorBrief } from "@/components/MentorBrief";
import { Stat, SectionLabel, Difficulty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const d = await getDashboard();
  const rec = d.recommendation;
  const solvedPct = d.bankSize ? Math.round((d.problemsSolved / d.bankSize) * 100) : 0;

  return (
    <div className="space-y-12">
      {/* hero */}
      <section className="glow-hero reveal reveal-1">
        <p className="label mb-2">Welcome back, Aiyatullah</p>
        <h1 className="display text-[length:var(--text-hero)]">
          {d.state.currentPhase}
          <span className="text-text-faint"> · </span>
          <span className="text-accent">{rec.topic}</span>
        </h1>
      </section>

      <div className="reveal reveal-2">
        <MentorBrief />
      </div>

      {/* stat strip */}
      <section className="reveal reveal-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Solved"
          value={
            <>
              {d.problemsSolved}
              <span className="text-base text-text-faint"> / {d.bankSize}</span>
            </>
          }
          hint={`${solvedPct}% of the bank`}
        />
        <Stat label="Streak" value={`${d.streakDays}d`} tone="warm" />
        <Stat
          label="To revise"
          value={d.reviseCount}
          tone={d.reviseCount > 0 ? "warm" : undefined}
        />
        <Stat
          label="Weak areas"
          value={
            <span className="text-sm leading-snug">
              {d.weakAreas.length ? d.weakAreas.slice(0, 2).join(", ") : "—"}
            </span>
          }
        />
      </section>

      {/* today's problem — offset editorial block */}
      <section className="reveal reveal-4">
        <SectionLabel>Today&apos;s problem</SectionLabel>
        <div className="panel p-6 sm:p-7">
          {rec.problem ? (
            <>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="display text-2xl sm:text-3xl">{rec.problem.title}</h2>
                  <p className="mt-2 text-sm text-text-dim">
                    <Difficulty level={rec.problem.difficulty} /> · {rec.problem.topic}
                    {rec.problem.subtopic ? ` · ${rec.problem.subtopic}` : ""}
                  </p>
                  <p className="mt-2 max-w-md text-xs text-text-faint">{rec.reason}</p>
                </div>
                <Link
                  href={`/practice/${rec.problem.id}`}
                  className="btn btn-primary shrink-0 justify-center"
                >
                  {rec.kind === "revise" ? "Revise →" : "Start solving →"}
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border pt-5">
                <FindMoreButton />
                <Link
                  href={`/interview/${rec.problem.id}`}
                  className="text-sm text-text-dim transition-colors hover:text-text"
                >
                  Mock interview on this →
                </Link>
              </div>
            </>
          ) : (
            <p className="text-text-dim">
              Nothing recommended.{" "}
              <Link href="/problems" className="text-accent">
                Browse the bank
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      {/* asymmetric: track (narrow) + activity (wide) */}
      <section className="reveal grid gap-8 md:grid-cols-[1fr_1.15fr]">
        <div>
          <SectionLabel>Track</SectionLabel>
          <ol className="space-y-px">
            {TRACK.map((topic) => {
              const row = d.graph.find((g) => g.topic === topic);
              const here = topic === rec.topic;
              return (
                <li key={topic}>
                  <Link
                    href={`/graph#${encodeURIComponent(topic)}`}
                    className={`flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-bg-raised ${
                      here ? "text-text" : "text-text-dim"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          here
                            ? "bg-accent"
                            : row?.confidence === "high"
                              ? "bg-accent/40"
                              : row?.attemptCount
                                ? "bg-accent-warm/50"
                                : "bg-border-strong"
                        }`}
                      />
                      {topic}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-text-faint">
                      {row
                        ? `${row.solvedCount}${
                            row.avgReadiness != null ? ` · ${row.avgReadiness}` : ""
                          }${row.reviseCount > 0 ? ` · ${row.reviseCount}⟳` : ""}`
                        : "—"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-8">
          <div>
            <SectionLabel>Recent mock interviews</SectionLabel>
            {d.interviews.length ? (
              <ul className="space-y-1.5 text-sm">
                {d.interviews.map((iv) => (
                  <li
                    key={iv.id}
                    className="panel-inset flex items-center justify-between px-3 py-2"
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
              <p className="text-sm text-text-faint">
                None yet — solve a problem, then run a mock interview.
              </p>
            )}
          </div>

          <div>
            <SectionLabel>Recent attempts</SectionLabel>
            {d.recent.length ? (
              <ul className="space-y-1.5 text-sm">
                {d.recent.map((s) => (
                  <li
                    key={s.id}
                    className="panel-inset flex items-center justify-between px-3 py-2"
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
                        ? ` · ${s.analysis.scores.interviewReadiness}/10`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-faint">No attempts yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
