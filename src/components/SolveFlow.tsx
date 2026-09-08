"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnalysisResult } from "@/lib/analysis/schema";
import { AnalysisScorecard } from "./AnalysisScorecard";

const LANGS = ["python", "java", "javascript", "go"];

const HINTS = [
  "Restate the problem in one sentence. What is the brute-force approach and its Big-O?",
  "What repeated work does the brute force do? Can a hash map, sorted order, or two pointers remove it?",
  "Name the pattern out loud (hash map / two pointers / sliding window / binary search) and write the invariant it maintains.",
];

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
  // Guards against concurrent onBlur saves each inserting a new row before the
  // first insert returns an id.
  const sessionIdRef = useRef<number | null>(null);
  const savingRef = useRef<Promise<void> | null>(null);

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
    // Serialize saves so the first one establishes the session id.
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
      await save(); // ensure the session exists and latest edits are persisted
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

  async function record(
    selfRating: string,
    solved: boolean,
    reviseAfter = false,
  ) {
    if (!sessionIdRef.current) return;
    setRecording(true);
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
          label="First thought — what jumps out?"
          value={firstThought}
          onChange={setFirstThought}
          onBlur={save}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Field
            label="Brute-force approach"
            value={bruteForceIdea}
            onChange={setBruteForceIdea}
            onBlur={save}
          />
          <Field
            label="Its Big-O"
            value={bruteForceBigO}
            onChange={setBruteForceBigO}
            onBlur={save}
            placeholder="O(n^2) time…"
            rows={2}
          />
        </div>
        {!started ? (
          <button
            onClick={() => {
              setStarted(true);
              save();
            }}
            disabled={!firstThought.trim() || !bruteForceBigO.trim()}
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
          <div className="flex items-center gap-2">
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
            placeholder="Paste your solution here after solving on LeetCode…"
            className="w-full rounded-lg border border-border bg-bg-inset p-3 font-mono text-sm text-text outline-none focus:border-accent"
          />
          <Field
            label="Why does this work? (the invariant / the insight)"
            value={whyItWorks}
            onChange={setWhyItWorks}
            onBlur={save}
          />

          <details className="rounded-lg border border-border bg-bg-raised p-3 text-sm">
            <summary className="cursor-pointer text-text-dim">
              Hints ({hintsUsed}/3 used)
            </summary>
            <ol className="mt-2 space-y-2">
              {HINTS.slice(0, hintsUsed).map((h, i) => (
                <li key={i} className="text-text-dim">
                  {i + 1}. {h}
                </li>
              ))}
            </ol>
            {hintsUsed < 3 && (
              <button
                onClick={() => setHintsUsed((n) => n + 1)}
                className="mt-2 text-xs text-accent"
              >
                Reveal hint {hintsUsed + 1} →
              </button>
            )}
          </details>

          <button
            onClick={runAnalysis}
            disabled={!code.trim() || analyzing}
            className="btn btn-primary"
          >
            {analyzing ? "Analyzing…" : "Submit for analysis"}
          </button>
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
        <Stage n={4} title="Record" open>
          <p className="text-sm text-text-dim">
            How did that feel? This ticks the problem and updates your knowledge graph.
          </p>
          <div className="flex flex-wrap gap-2">
            {(["easy", "ok", "hard"] as const).map((r) => (
              <button
                key={r}
                disabled={recording}
                onClick={() => record(r, true)}
                className="btn btn-sm capitalize"
              >
                Solved · {r}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              disabled={recording}
              onClick={() => record("hard", true, true)}
              className="rounded-lg border border-accent-warm/40 px-4 py-2 text-sm text-accent-warm hover:bg-bg-raised disabled:opacity-40"
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
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href={`/interview/${problem.id}`}
              className="text-xs text-accent"
            >
              Do a mock interview on this →
            </Link>
            <Link href="/" className="text-xs text-text-faint">
              Skip &amp; go to dashboard
            </Link>
          </div>
        </Stage>
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
        className="w-full rounded-lg border border-border bg-bg-inset p-2.5 text-sm text-text outline-none focus:border-accent"
      />
    </label>
  );
}
