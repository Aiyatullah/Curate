"use client";

import { useState } from "react";

type Hint = { level: number; text: string };

const LABELS = ["Nudge", "Name the technique", "Full approach"];

/**
 * Problem-specific hints, escalating: 1 = nudge, 2 = the technique, 3 = the whole
 * approach in words (never code). Generated per problem, aware of what the
 * candidate has written so far.
 */
export function HintPanel({
  problemId,
  getFirstThought,
  onHintUsed,
  compact = false,
}: {
  problemId: string;
  getFirstThought?: () => string;
  onHintUsed?: (count: number) => void;
  compact?: boolean;
}) {
  const [hints, setHints] = useState<Hint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextLevel = hints.length + 1;

  async function reveal() {
    if (nextLevel > 3) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          problemId,
          level: nextLevel,
          firstThought: getFirstThought?.() ?? "",
        }),
      });
      const data = await res.json();
      if (data.hint) {
        const updated = [...hints, { level: nextLevel, text: data.hint }];
        setHints(updated);
        onHintUsed?.(updated.length);
      } else {
        setError(data.error ?? "Could not get a hint.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={compact ? "" : "panel-inset p-3"}>
      {!compact && (
        <p className="label mb-2">Stuck? Problem-specific hints</p>
      )}
      <ol className="space-y-2">
        {hints.map((h) => (
          <li key={h.level} className="text-sm text-text-dim">
            <span className="label mr-1.5">
              {LABELS[h.level - 1] ?? `Hint ${h.level}`}
            </span>
            {h.text}
          </li>
        ))}
      </ol>
      {nextLevel <= 3 && (
        <button
          onClick={reveal}
          disabled={loading}
          className="btn btn-sm mt-2 text-accent"
        >
          {loading
            ? "Thinking…"
            : hints.length === 0
              ? "Give me a hint"
              : nextLevel === 3
                ? "Reveal the full approach"
                : `Next hint (${LABELS[nextLevel - 1]})`}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
