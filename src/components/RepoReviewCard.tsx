import type { RepoReview } from "@/lib/analysis/repo-schema";

const LABELS: Record<keyof RepoReview["scores"], string> = {
  architecture: "Architecture",
  codeQuality: "Code quality",
  testing: "Testing",
  documentation: "Docs",
  security: "Security",
};

export function RepoReviewCard({ r }: { r: RepoReview }) {
  return (
    <div className="panel space-y-6 p-5 sm:p-6">
      <div>
        <div className="flex items-baseline gap-3">
          <span className="stat-num text-3xl font-semibold">{r.overall}/10</span>
          <div className="flex flex-wrap gap-1.5">
            {r.stack.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-2 text-sm text-text-dim">{r.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(Object.keys(r.scores) as (keyof RepoReview["scores"])[]).map((k) => (
          <div key={k} className="panel-inset px-3 py-2.5">
            <p className="label">{LABELS[k]}</p>
            <p className="stat-num mt-0.5 text-xl font-semibold">
              {r.scores[k]}
              <span className="text-xs text-text-faint">/10</span>
            </p>
          </div>
        ))}
      </div>

      <p className="panel-inset px-4 py-3 text-sm">
        <span className="label mr-2">Take</span>
        {r.interviewerTake}
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <List title="Strengths" items={r.strengths} tone="good" />
        <List title="Quick wins" items={r.quickWins} tone="neutral" ordered />
      </div>

      <div>
        <h3 className="label mb-2">Risks</h3>
        {r.risks.length ? (
          <ul className="space-y-1.5 text-sm">
            {r.risks.map((risk, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className={`mt-0.5 shrink-0 font-mono text-[10px] uppercase ${
                    risk.severity === "high"
                      ? "text-danger"
                      : risk.severity === "med"
                        ? "text-accent-warm"
                        : "text-text-faint"
                  }`}
                >
                  {risk.severity}
                </span>
                <span className="text-text-dim">
                  {risk.file && (
                    <span className="font-mono text-text-faint">{risk.file} — </span>
                  )}
                  {risk.note}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-faint">Nothing flagged.</p>
        )}
      </div>
    </div>
  );
}

function List({
  title,
  items,
  tone,
  ordered,
}: {
  title: string;
  items: string[];
  tone: "good" | "neutral";
  ordered?: boolean;
}) {
  if (!items.length) return null;
  const mark = tone === "good" ? "+" : "→";
  const color = tone === "good" ? "text-accent" : "text-accent-warm";
  const Tag = ordered ? "ol" : "ul";
  return (
    <div>
      <h3 className="label mb-2">{title}</h3>
      <Tag className={`space-y-1 text-sm text-text-dim ${ordered ? "list-decimal pl-4" : ""}`}>
        {items.map((it, i) => (
          <li key={i} className={ordered ? "" : "flex gap-2"}>
            {!ordered && <span className={color}>{mark}</span>}
            {it}
          </li>
        ))}
      </Tag>
    </div>
  );
}
