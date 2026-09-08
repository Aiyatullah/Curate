"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { SystemDesignReview } from "@/lib/systemdesign/schema";

const SECTIONS: { key: keyof State; label: string; hint: string }[] = [
  { key: "requirements", label: "1 · Requirements", hint: "Functional (what it must do) and non-functional (latency, availability, consistency). What's in scope, what's not." },
  { key: "scaleEstimates", label: "2 · Scale estimates", hint: "DAU, read/write QPS, payload sizes, storage/year, peak vs average. Back of the envelope." },
  { key: "dataModel", label: "3 · Data model", hint: "Entities, key fields, the access patterns each table/collection serves, indexes, partition key." },
  { key: "apiDesign", label: "4 · API design", hint: "The handful of endpoints/RPCs. Request/response shape, pagination, idempotency where it matters." },
  { key: "highLevelDesign", label: "5 · High-level design", hint: "Boxes and arrows in words: clients → gateway → services → stores → queues. Where state lives." },
  { key: "deepDives", label: "6 · Deep dives", hint: "Pick 1-2: sharding strategy, cache + invalidation, fan-out, consistency model, hot partitions, dedupe." },
  { key: "tradeoffs", label: "7 · Trade-offs", hint: "What you optimised for and what you gave up. Alternatives you rejected and why." },
];

type State = {
  requirements: string;
  scaleEstimates: string;
  dataModel: string;
  apiDesign: string;
  highLevelDesign: string;
  deepDives: string;
  tradeoffs: string;
};

const EMPTY: State = {
  requirements: "",
  scaleEstimates: "",
  dataModel: "",
  apiDesign: "",
  highLevelDesign: "",
  deepDives: "",
  tradeoffs: "",
};

type Props = {
  prompt: string;
  designId?: number;
  initial?: Partial<State>;
  initialReview?: SystemDesignReview | null;
};

export function DesignStudio({ prompt, designId, initial, initialReview }: Props) {
  const id = useRef<number | null>(designId ?? null);
  const saving = useRef<Promise<void> | null>(null);
  const [state, setState] = useState<State>({ ...EMPTY, ...initial });
  const [review, setReview] = useState<SystemDesignReview | null>(initialReview ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const filledCount = Object.values(state).filter((v) => v.trim()).length;

  async function save() {
    const prior = saving.current ?? Promise.resolve();
    const next = prior.then(async () => {
      const res = await fetch("/api/systemdesign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "upsert", id: id.current, prompt, ...state }),
      });
      const d = await res.json();
      if (d.id) id.current = d.id;
      setSavedAt(new Date().toLocaleTimeString());
    });
    saving.current = next;
    return next;
  }

  async function runReview() {
    setBusy(true);
    setError(null);
    try {
      await save();
      const res = await fetch("/api/systemdesign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "review", id: id.current, prompt, ...state }),
      });
      const d = await res.json();
      if (d.review) setReview(d.review as SystemDesignReview);
      else setError(d.error ?? "Review failed.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-text-faint">
        <span>{filledCount}/7 sections filled</span>
        {savedAt && <span>saved {savedAt}</span>}
      </div>

      {SECTIONS.map((s) => (
        <section key={s.key} className="panel p-5">
          <label className="block">
            <span className="label">
              {s.label}
            </span>
            <span className="mt-1 mb-2 block text-xs text-text-faint">{s.hint}</span>
            <textarea
              value={state[s.key]}
              onChange={(e) => setState((st) => ({ ...st, [s.key]: e.target.value }))}
              onBlur={save}
              rows={5}
              className="w-full p-3 text-sm"
            />
          </label>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={runReview}
          disabled={busy || filledCount < 2}
          className="btn btn-primary"
        >
          {busy ? "Reviewing…" : "Submit for review"}
        </button>
        <Link href="/design" className="text-xs text-text-faint">
          Back to designs
        </Link>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {review && (
        <section className="panel p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-3xl font-semibold">{review.overall}/10</span>
            <span className="text-sm text-text-dim">{review.verdict}</span>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(review.scores).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-bg-inset p-3">
                <p className="label">
                  {k}
                </p>
                <p className="mt-0.5 text-xl font-semibold">
                  {v}
                  <span className="text-xs text-text-faint">/10</span>
                </p>
              </div>
            ))}
          </div>
          <ReviewList title="Missed" items={review.missed} tone="bad" />
          <ReviewList title="Nailed" items={review.good} tone="good" />
          <ReviewList title="Interviewer would ask next" items={review.followUps} tone="neutral" />
        </section>
      )}
    </div>
  );
}

function ReviewList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "bad" | "neutral";
}) {
  if (!items.length) return null;
  const mark = tone === "good" ? "+" : tone === "bad" ? "–" : "?";
  const color =
    tone === "good" ? "text-accent" : tone === "bad" ? "text-danger" : "text-accent-warm";
  return (
    <div className="mb-4">
      <h3 className="label mb-2">
        {title}
      </h3>
      <ul className="space-y-1 text-sm text-text-dim">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className={color}>{mark}</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
