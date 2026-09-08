"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnalysisResult } from "@/lib/analysis/schema";
import { AnalysisScorecard } from "./AnalysisScorecard";

const LANGS = ["typescript", "javascript", "python", "go", "java", "sql", "text"];

type Props = {
  challengeId: string;
  kind: string;
  requirements: string[];
};

export function ChallengeSolve({ challengeId, kind, requirements }: Props) {
  const router = useRouter();
  const sid = useRef<number | null>(null);
  const saving = useRef<Promise<void> | null>(null);
  const [attempt, setAttempt] = useState<number | null>(null);

  const [language, setLanguage] = useState(
    kind === "api-design" ? "text" : "typescript",
  );
  const [approach, setApproach] = useState("");
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [checks, setChecks] = useState<boolean[]>(requirements.map(() => false));

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  function payload() {
    return { challengeId, language, approach, code, notes };
  }

  async function save(): Promise<void> {
    const prior = saving.current ?? Promise.resolve();
    const next = prior.then(async () => {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "upsert", sessionId: sid.current, ...payload() }),
      });
      const d = await res.json();
      if (d.sessionId) sid.current = d.sessionId;
      if (typeof d.attemptNumber === "number") setAttempt(d.attemptNumber);
    });
    saving.current = next;
    return next;
  }

  async function evaluate() {
    setEvaluating(true);
    setError(null);
    try {
      await save();
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "evaluate", sessionId: sid.current, ...payload() }),
      });
      const d = await res.json();
      if (d.analysis) setAnalysis(d.analysis as AnalysisResult);
      else setError(d.error ?? "Evaluation failed.");
    } catch {
      setError("Network error.");
    } finally {
      setEvaluating(false);
    }
  }

  async function record(solved: boolean) {
    if (!sid.current) return;
    setRecording(true);
    await fetch("/api/challenge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "record", sessionId: sid.current, solved }),
    });
    router.push("/challenges");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {attempt != null && attempt > 1 && (
        <p className="rounded-lg border border-accent-warm/40 bg-bg-raised px-3 py-2 text-xs text-accent-warm">
          Attempt #{attempt}
        </p>
      )}

      <section className="rounded-xl border border-border bg-bg-raised p-5">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-text-faint">
          Requirements — tick as you satisfy them
        </h2>
        <ul className="space-y-1.5 text-sm">
          {requirements.map((r, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) =>
                    setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))
                  }
                  className="mt-0.5 accent-[var(--color-accent)]"
                />
                <span className={checks[i] ? "text-text-faint line-through" : "text-text-dim"}>
                  {r}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-bg-raised p-5">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-text-faint">
          Approach — write this before coding
        </h2>
        <textarea
          value={approach}
          onChange={(e) => setApproach(e.target.value)}
          onBlur={save}
          rows={4}
          placeholder="Data structures, component boundaries, failure modes, trade-offs you're choosing…"
          className="w-full rounded-lg border border-border bg-bg-inset p-3 text-sm outline-none focus:border-accent"
        />
      </section>

      <section className="rounded-xl border border-border bg-bg-raised p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`rounded-md px-2.5 py-1 text-xs ${
                language === l ? "bg-accent text-bg" : "border border-border text-text-dim"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onBlur={save}
          spellCheck={false}
          rows={16}
          placeholder={
            kind === "api-design"
              ? "Write your API design: endpoints, schemas, status codes, the contract…"
              : "Paste your implementation…"
          }
          className="w-full rounded-lg border border-border bg-bg-inset p-3 font-mono text-sm outline-none focus:border-accent"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={save}
          rows={2}
          placeholder="Notes for the reviewer (assumptions, what you'd do with more time)…"
          className="mt-2 w-full rounded-lg border border-border bg-bg-inset p-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={evaluate}
          disabled={!code.trim() || evaluating}
          className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-40"
        >
          {evaluating ? "Evaluating…" : "Submit for evaluation"}
        </button>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </section>

      {analysis && (
        <section className="rounded-xl border border-border bg-bg-raised p-5">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-text-faint">
            Staff-engineer review
          </h2>
          <AnalysisScorecard a={analysis} />
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
            <button
              disabled={recording}
              onClick={() => record(true)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-bg-inset disabled:opacity-40"
            >
              Mark complete
            </button>
            <button
              disabled={recording}
              onClick={() => record(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-faint hover:bg-bg-inset disabled:opacity-40"
            >
              Keep working
            </button>
            <Link href="/challenges" className="ml-auto self-center text-xs text-text-faint">
              Back to challenges
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
