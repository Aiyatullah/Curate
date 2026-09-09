"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnalysisResult } from "@/lib/analysis/schema";
import { AnalysisScorecard } from "./AnalysisScorecard";
import { HintPanel } from "./HintPanel";

const LANGS = ["python", "java", "javascript", "typescript", "go", "c++"];

type Props = {
  problem: {
    id: string;
    title: string;
    leetcodeUrl: string;
    optimalComplexity: string | null;
  };
};

export function SolveFlow({ problem }: Props) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [attemptNumber, setAttemptNumber] = useState<number | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const savingRef = useRef<Promise<void> | null>(null);
  const firstThoughtRef = useRef("");

  // Stage 1
  const [firstThought, setFirstThought] = useState("");
  const [bruteForceIdea, setBruteForceIdea] = useState("");
  const [bruteForceBigO, setBruteForceBigO] = useState("");
  const [started, setStarted] = useState(false);

  // Stage 2
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [whyItWorks, setWhyItWorks] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);

  // Stage 3
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stage 4
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const recordRef = useRef<HTMLDivElement>(null);

  // timer
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (!started) return;
    startRef.current = Date.now() - seconds * 1000;
    const t = setInterval(() => {
      if (startRef.current)
        setSeconds(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // When the analysis lands, pull attention to the "record" step — it's the one
  // that actually counts.
  useEffect(() => {
    if (analysis) {
      recordRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [analysis]);

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;

  function payload() {
    return {
      problemId: problem.id,
      language,
      durationSec: seconds,
      hintsUsed,
      firstThought,
      bruteForceIdea,
      bruteForceBigO,
      whyItWorks,
      code,
    };
  }

  async function save(): Promise<void> {
    const prior = savingRef.current ?? Promise.resolve();
    const next = prior.then(async () => {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          sessionId: sessionIdRef.current,
          ...payload(),
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
        setSessionId(data.sessionId);
      }
      if (typeof data.attemptNumber === "number")
        setAttemptNumber(data.attemptNumber);
    });
    savingRef.current = next;
    return next;
  }

  async function runAnalysis() {
    setAnalyzing(true);
    setError(null);
    try {
      await save();
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          sessionId: sessionIdRef.current,
          ...payload(),
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
        setSessionId(data.sessionId);
      }
      if (data.analysis) setAnalysis(data.analysis as AnalysisResult);
      else setError(data.error ?? "Analysis failed.");
    } catch {
      setError("Network error.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function record(selfRating: string, solved: boolean, reviseAfter = false) {
    if (!sessionIdRef.current) return;
    setRecording(true);
    setRecorded(true);
    await fetch("/api/solve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "record",
        sessionId: sessionIdRef.current,
        selfRating,
        solved,
        reviseAfter,
      }),
    });
    router.push("/");
    router.refresh();
  }

  const suggested = analysis
    ? analysis.scores.correctness >= 8
      ? "solved"
      : "unsolved"
    : null;

  return (
    <div className="space-y-4">
      {attemptNumber != null && attemptNumber > 1 && (
        <p className="panel-inset px-3 py-2 text-xs text-accent-warm">
          Attempt #{attemptNumber} — your earlier attempts on this problem are kept.
        </p>
      )}

      {/* Stage 1 */}
      <Stage n={1} title="Understand" open>
        <a
          href={problem.leetcodeUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-sm inline-flex text-accent"
        >
          Open on LeetCode ↗
        </a>
        <Field
          label="First thought — what jumps out? (even 'no idea yet' is fine)"
          value={firstThought}
          onChange={(v) => {
            setFirstThought(v);
            firstThoughtRef.current = v;
          }}
          onBlur={save}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Field
            label="Brute-force approach (optional)"
            value={bruteForceIdea}
            onChange={setBruteForceIdea}
            onBlur={save}
          />
          <Field
            label="Its Big-O (optional)"
            value={bruteForceBigO}
            onChange={setBruteForceBigO}
            onBlur={save}
            placeholder="O(n^2) time…"
            rows={2}
          />
        </div>

        <HintPanel
          problemId={problem.id}
          getFirstThought={() => firstThoughtRef.current}
          onHintUsed={setHintsUsed}
        />

        {!started ? (
          <button
            onClick={() => {
              setStarted(true);
              save();
            }}
            disabled={!firstThought.trim()}
            className="btn btn-primary"
          >
            Start timer &amp; open workspace
          </button>
        ) : (
          <p className="font-mono text-sm text-accent-warm">⏱ {mmss}</p>
        )}
      </Stage>

      {/* Stage 2 */}
      {started && (
        <Stage n={2} title="Solve" open>
          <div className="flex flex-wrap items-center gap-1.5">
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  language === l
                    ? "bg-accent text-accent-ink"
                    : "border border-border text-text-dim hover:text-text"
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
            rows={14}
            placeholder="Paste your solution here (bugs and all — the analysis is more useful on real attempts)…"
            className="w-full p-3 font-mono text-sm"
          />
          <Field
            label="Why does this work? (the invariant / the insight)"
            value={whyItWorks}
            onChange={setWhyItWorks}
            onBlur={save}
          />

          <div className="panel-inset p-3">
            <p className="label mb-2">Hints</p>
            <HintPanel
              problemId={problem.id}
              getFirstThought={() => firstThoughtRef.current}
              onHintUsed={setHintsUsed}
              compact
            />
          </div>

          <button
            onClick={runAnalysis}
            disabled={!code.trim() || analyzing}
            className="btn btn-primary"
          >
            {analyzing ? "Analyzing…" : "Submit for analysis"}
          </button>
          <p className="text-xs text-text-faint">
            Analysis is feedback only — it doesn&apos;t change your streak or graph.
            Stage 4 does.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
        </Stage>
      )}

      {/* Stage 3 */}
      {analysis && (
        <Stage n={3} title="Analysis" open>
          <AnalysisScorecard a={analysis} />
        </Stage>
      )}

      {/* Stage 4 */}
      {analysis && (
        <section
          ref={recordRef}
          className="panel p-5 sm:p-6"
          style={{ borderTop: "2px solid var(--accent)" }}
        >
          <p className="label mb-1 flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-full border border-accent text-[10px] text-accent">
              4
            </span>
            Record — this is what counts
          </p>
          <p className="mb-4 text-sm text-text-dim">
            Tap one below so this attempt updates your streak, the problem&apos;s
            status, and the knowledge graph.{" "}
            {suggested === "solved"
              ? "Your code looks correct — mark it solved."
              : "Your code didn't fully work — that's fine, record it honestly."}
          </p>

          <div className="flex flex-wrap gap-2">
            {(["easy", "ok", "hard"] as const).map((r) => (
              <button
                key={r}
                disabled={recording}
                onClick={() => record(r, true)}
                className="btn btn-primary btn-sm capitalize"
              >
                Solved · {r}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              disabled={recording}
              onClick={() => record("hard", true, true)}
              className="btn btn-sm text-accent-warm"
            >
              Solved but flag to revise ⟳
            </button>
            <button
              disabled={recording}
              onClick={() => record("hard", false, true)}
              className="btn btn-sm"
            >
              Didn&apos;t solve — flag to revise
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <Link href={`/interview/${problem.id}`} className="text-xs text-accent">
              Mock interview on this →
            </Link>
            {!recorded && (
              <Link href="/" className="text-xs text-text-faint">
                Skip (won&apos;t count)
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Stage({
  n,
  title,
  open,
  children,
}: {
  n: number;
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`panel p-5 sm:p-6 ${open ? "" : "opacity-60"}`}>
      <p className="label mb-4 flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded-full border border-border text-[10px] text-text-dim">
          {n}
        </span>
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-text-dim">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className="w-full p-2.5 text-sm"
      />
    </label>
  );
}
