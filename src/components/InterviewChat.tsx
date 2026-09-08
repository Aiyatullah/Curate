"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { InterviewScore, TranscriptEntry } from "@/lib/interview/schema";
import { useSpeechInput } from "@/lib/useSpeechInput";
import { InterviewScorecard } from "./InterviewScorecard";

type Props = {
  problemId: string;
  problemTitle: string;
  hasSolveSession: boolean;
};

export function InterviewChat({ problemId, problemTitle, hasSolveSession }: Props) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState<InterviewScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number>(0);

  const appendSpeech = (t: string) =>
    setDraft((d) => (d ? `${d} ${t}` : t).replace(/\s+/g, " "));
  const speech = useSpeechInput(appendSpeech);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [transcript, score]);

  async function start() {
    setBusy(true);
    setError(null);
    startedAt.current = Date.now();
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start", problemId }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setTranscript([{ role: "interviewer", text: data.turn.message }]);
        setStarted(true);
      } else setError(data.error ?? "Could not start.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function send(endNow = false) {
    if (!sessionId || busy) return;
    if (!endNow && !draft.trim()) return;
    setBusy(true);
    setError(null);
    if (speech.listening) speech.toggle();

    const myText = draft.trim();
    if (myText) setTranscript((t) => [...t, { role: "candidate", text: myText }]);
    setDraft("");
    const durationSec = Math.round((Date.now() - startedAt.current) / 1000);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          endNow
            ? { action: "end", sessionId, durationSec, text: myText }
            : { action: "reply", sessionId, text: myText, durationSec },
        ),
      });
      const data = await res.json();
      if (data.turn?.message)
        setTranscript((t) => [...t, { role: "interviewer", text: data.turn.message }]);
      if (data.turn?.mode === "wrap") setDone(true);
      if (data.score) setScore(data.score as InterviewScore);
      if (data.error && !data.turn) setError(data.error);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (!started) {
    return (
      <div className="space-y-4 panel p-6">
        <p className="text-sm text-text-dim">
          A senior engineer will debrief you on <strong>{problemTitle}</strong> —
          up to ~6 questions probing your approach, complexity analysis, tradeoffs
          and edge cases, then a scorecard.
        </p>
        {!hasSolveSession && (
          <p className="text-xs text-accent-warm">
            You haven&apos;t submitted a solution for this problem yet. The
            interviewer will run without your code — solve it first for a sharper
            debrief.
          </p>
        )}
        <button
          onClick={start}
          disabled={busy}
          className="btn btn-primary"
        >
          {busy ? "Starting…" : "Start mock interview →"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        ref={scrollRef}
        className="max-h-[52vh] space-y-3 overflow-y-auto panel p-4"
      >
        {transcript.map((e, i) => (
          <div
            key={i}
            className={e.role === "interviewer" ? "" : "flex justify-end"}
          >
            <p
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                e.role === "interviewer"
                  ? "bg-bg-inset text-text"
                  : "bg-accent/15 text-text"
              }`}
            >
              <span className="mb-0.5 block label">
                {e.role}
              </span>
              {e.text}
            </p>
          </div>
        ))}
        {busy && <p className="text-xs text-text-faint">interviewer is thinking…</p>}
      </div>

      {!done && (
        <div className="space-y-2">
          <textarea
            value={draft + (speech.interim ? ` ${speech.interim}` : "")}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Type your answer, or use the mic…"
            className="w-full p-3 text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => send(false)}
              disabled={busy || !draft.trim()}
              className="btn btn-primary"
            >
              Send
            </button>
            {speech.supported && (
              <button
                onClick={speech.toggle}
                disabled={busy}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  speech.listening
                    ? "border-danger text-danger"
                    : "border-border text-text-dim hover:text-text"
                }`}
              >
                {speech.listening ? "● stop mic" : "🎙 speak"}
              </button>
            )}
            <button
              onClick={() => send(true)}
              disabled={busy}
              className="ml-auto btn"
            >
              End &amp; grade
            </button>
          </div>
          {!speech.supported && (
            <p className="text-xs text-text-faint">
              Voice input needs Chrome/Edge — typing works everywhere.
            </p>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}

      {score && (
        <div className="panel p-5">
          <p className="label mb-4">
            Interview scorecard
          </p>
          <InterviewScorecard s={score} />
          <div className="mt-4 flex gap-3">
            <Link href="/" className="text-xs text-accent">
              ← Dashboard
            </Link>
            <button
              onClick={() => {
                router.refresh();
                location.reload();
              }}
              className="text-xs text-text-faint"
            >
              Run another
            </button>
          </div>
        </div>
      )}

      {done && !score && error && (
        <p className="rounded-lg border border-border bg-bg-raised px-4 py-3 text-sm text-danger">
          Interview finished but grading failed: {error}
        </p>
      )}
    </div>
  );
}
