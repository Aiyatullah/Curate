"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/analysis/schema";

export type PriorAttempt = {
  id: number;
  attemptNumber: number;
  createdAt: string | null;
  solved: boolean;
  selfRating: string | null;
  language: string;
  durationSec: number | null;
  firstThought: string | null;
  bruteForceIdea: string | null;
  bruteForceBigO: string | null;
  whyItWorks: string | null;
  code: string | null;
  analysis: AnalysisResult | null;
};

function fmtDate(s: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * On a re-attempt, a collapsible recap of how the problem was approached before —
 * the written approach, the code, and the clean solution the analysis produced.
 */
export function PriorAttempts({ attempts }: { attempts: PriorAttempt[] }) {
  const [open, setOpen] = useState(false);
  if (!attempts.length) return null;
  const latest = attempts[0];

  return (
    <section className="panel overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-3 text-sm hover:bg-bg-raised/60"
      >
        <span className="label">
          How you solved this before — {attempts.length} attempt
          {attempts.length > 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-2 text-xs text-text-faint">
          {latest.solved ? (
            <span className="text-accent">last: solved</span>
          ) : (
            <span>last: not solved</span>
          )}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className={`transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden
          >
            <path d="m3 1 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border p-4">
          {attempts.map((a) => (
            <details key={a.id} className="panel-inset overflow-hidden" open={a === latest}>
              <summary className="cursor-pointer px-3 py-2 text-sm">
                <span className="text-text">Attempt #{a.attemptNumber}</span>
                <span className="ml-2 text-xs text-text-faint">
                  {fmtDate(a.createdAt)}
                  {a.solved ? ` · solved${a.selfRating ? ` (${a.selfRating})` : ""}` : " · not solved"}
                  {a.analysis
                    ? ` · ${a.analysis.scores.interviewReadiness}/10 ready`
                    : ""}
                  {a.durationSec ? ` · ${Math.round(a.durationSec / 60)}m` : ""}
                </span>
              </summary>

              <div className="space-y-3 border-t border-border px-3 py-3 text-sm">
                {a.firstThought && (
                  <Line label="First thought">{a.firstThought}</Line>
                )}
                {(a.bruteForceIdea || a.bruteForceBigO) && (
                  <Line label="Brute force">
                    {a.bruteForceIdea}
                    {a.bruteForceBigO ? ` — ${a.bruteForceBigO}` : ""}
                  </Line>
                )}
                {a.whyItWorks && (
                  <Line label="Why it works">{a.whyItWorks}</Line>
                )}

                {a.code && (
                  <div>
                    <p className="label mb-1">Your code ({a.language})</p>
                    <pre className="overflow-x-auto rounded-md bg-bg-sunken p-3 font-mono text-xs leading-relaxed text-text">
                      <code>{a.code}</code>
                    </pre>
                  </div>
                )}

                {a.analysis?.referenceSolution?.code?.trim() && (
                  <details className="rounded-md border border-border">
                    <summary className="cursor-pointer px-3 py-2 text-xs text-accent">
                      The clean solution from that attempt&apos;s review
                    </summary>
                    <div className="border-t border-border p-3">
                      <pre className="overflow-x-auto rounded-md bg-bg-sunken p-3 font-mono text-xs leading-relaxed text-text">
                        <code>{a.analysis.referenceSolution.code}</code>
                      </pre>
                      {a.analysis.referenceSolution.explanation?.trim() && (
                        <p className="mt-2 text-xs leading-relaxed text-text-dim">
                          {a.analysis.referenceSolution.explanation}
                        </p>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-text-dim">
      <span className="label mr-1.5">{label}</span>
      {children}
    </p>
  );
}
