import type { AnalysisResult } from "@/lib/analysis/schema";

const SCORE_LABELS: Record<keyof AnalysisResult["scores"], string> = {
  correctness: "Correctness",
  complexity: "Complexity",
  codeQuality: "Code Quality",
  interviewReadiness: "Interview Readiness",
};

export function AnalysisScorecard({ a }: { a: AnalysisResult }) {
  const ref = a.referenceSolution;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(a.scores) as (keyof AnalysisResult["scores"])[]).map((k) => (
          <div key={k} className="panel-inset p-4">
            <p className="label">{SCORE_LABELS[k]}</p>
            <p className="stat-num mt-1 text-2xl font-semibold">
              {a.scores[k]}
              <span className="text-sm text-text-faint">/10</span>
            </p>
          </div>
        ))}
      </div>

      <p className="panel-inset px-4 py-3 text-sm">
        <span className="label mr-2">Verdict</span>
        {a.readinessVerdict}
      </p>

      {a.mistakeInThinking?.trim() && (
        <div
          className="rounded-[9px] border-l-2 px-4 py-3 text-sm"
          style={{ borderColor: "var(--danger)", background: "var(--danger-soft)" }}
        >
          <p className="label mb-1" style={{ color: "var(--danger)" }}>
            Where your thinking and your code diverge
          </p>
          {a.mistakeInThinking}
        </div>
      )}

      {a.codeWalkthrough?.trim() && (
        <Row title="Your code, traced">
          <p className="text-sm leading-relaxed text-text-dim">{a.codeWalkthrough}</p>
        </Row>
      )}

      <Row title="Detected complexity">
        <p className="font-mono text-sm text-text-dim">
          time {a.detectedComplexity.time} · space {a.detectedComplexity.space}
        </p>
        <p className="mt-1 text-sm text-text-dim">{a.claimedVsActual}</p>
      </Row>

      <div className="grid gap-6 md:grid-cols-2">
        <Row title="Thinking — what worked">
          <List items={a.thinkingReview.good} tone="good" empty="Nothing noted." />
        </Row>
        <Row title="Thinking — gaps">
          <List items={a.thinkingReview.gaps} tone="bad" empty="None." />
        </Row>
      </div>

      <Row title="Code issues">
        {a.codeIssues.length ? (
          <ul className="space-y-1.5 text-sm">
            {a.codeIssues.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className={`mt-0.5 shrink-0 font-mono text-[10px] uppercase ${
                    c.severity === "high"
                      ? "text-danger"
                      : c.severity === "med"
                        ? "text-accent-warm"
                        : "text-text-faint"
                  }`}
                >
                  {c.severity}
                </span>
                <span className="text-text-dim">
                  {c.line != null ? (
                    <span className="font-mono text-text-faint">L{c.line} </span>
                  ) : null}
                  {c.note}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-faint">No issues flagged.</p>
        )}
      </Row>

      <div className="grid gap-6 md:grid-cols-2">
        <Row title="What's lacking">
          <List items={a.whatsLacking} tone="bad" empty="Nothing major." />
        </Row>
        <Row title="How to think next time">
          <ol className="list-decimal space-y-1 pl-4 text-sm text-text-dim">
            {a.howToThinkNextTime.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </Row>
      </div>

      {ref?.code?.trim() && (
        <details className="panel-inset overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm text-accent">
            Show a clean optimal solution
          </summary>
          <div className="border-t border-border p-4">
            <pre className="overflow-x-auto rounded-md bg-bg-sunken p-3 font-mono text-xs leading-relaxed text-text">
              <code>{ref.code}</code>
            </pre>
            {ref.explanation?.trim() && (
              <p className="mt-3 text-sm leading-relaxed text-text-dim">
                {ref.explanation}
              </p>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="label mb-2">{title}</h3>
      {children}
    </div>
  );
}

function List({
  items,
  tone,
  empty,
}: {
  items: string[];
  tone: "good" | "bad";
  empty: string;
}) {
  if (!items.length) return <p className="text-sm text-text-faint">{empty}</p>;
  return (
    <ul className="space-y-1 text-sm text-text-dim">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className={tone === "good" ? "text-accent" : "text-danger"}>
            {tone === "good" ? "+" : "–"}
          </span>
          {it}
        </li>
      ))}
    </ul>
  );
}
