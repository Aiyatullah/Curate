import type { InterviewScore } from "@/lib/interview/schema";

const LABELS: Record<keyof InterviewScore["scores"], string> = {
  communication: "Communication",
  clarity: "Clarity",
  tradeoffDiscussion: "Tradeoff Discussion",
  complexityExplanation: "Complexity Explanation",
};

const VERDICT_LABEL: Record<InterviewScore["hireVerdict"], string> = {
  "strong-no": "Strong No",
  no: "No",
  "lean-no": "Lean No",
  "lean-yes": "Lean Yes",
  yes: "Yes",
  "strong-yes": "Strong Yes",
};

export function InterviewScorecard({ s }: { s: InterviewScore }) {
  const positive = s.hireVerdict.includes("yes");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-3xl font-semibold">{s.overall}/10</span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            positive
              ? "bg-accent/15 text-accent"
              : "bg-danger/15 text-danger"
          }`}
        >
          {VERDICT_LABEL[s.hireVerdict]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(s.scores) as (keyof InterviewScore["scores"])[]).map((k) => (
          <div key={k} className="rounded-xl border border-border bg-bg-inset p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
              {LABELS[k]}
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {s.scores[k]}
              <span className="text-sm text-text-faint">/10</span>
            </p>
          </div>
        ))}
      </div>

      <p className="rounded-lg border border-border bg-bg-raised px-4 py-3 text-sm">
        {s.feedback}
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-text-faint">
            Green flags
          </h3>
          {s.greenFlags.length ? (
            <ul className="space-y-1 text-sm text-text-dim">
              {s.greenFlags.map((g, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-accent">+</span>
                  {g}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-faint">None noted.</p>
          )}
        </div>
        <div>
          <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-text-faint">
            Red flags
          </h3>
          {s.redFlags.length ? (
            <ul className="space-y-1 text-sm text-text-dim">
              {s.redFlags.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-danger">–</span>
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-faint">None.</p>
          )}
        </div>
      </div>
    </div>
  );
}
