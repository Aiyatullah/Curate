"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MentorBrief } from "@/lib/mentor/schema";

const MOVE_HREF: Record<MentorBrief["todaysMove"]["kind"], (ref: string | null) => string> = {
  problem: (ref) => (ref ? `/practice/${ref}` : "/problems"),
  challenge: (ref) => (ref ? `/challenges/${ref}` : "/challenges"),
  "system-design": () => "/design",
  interview: (ref) => (ref ? `/interview/${ref}` : "/problems"),
  revise: () => "/problems",
};

export function MentorBrief() {
  const [brief, setBrief] = useState<MentorBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/mentor");
        const d = await res.json();
        if (!cancelled) setBrief(d.brief ?? null);
      } catch {
        /* silent — dashboard still works without the brief */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/mentor?refresh=1");
      const d = await res.json();
      setBrief(d.brief ?? null);
    } catch {
      /* silent */
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <section
        aria-label="AI mentor brief"
        className="rounded-xl border border-border bg-bg-raised p-5 text-sm text-text-faint"
      >
        Loading today&apos;s brief…
      </section>
    );
  }
  if (!brief) return null;

  const move = brief.todaysMove;
  return (
    <section
      aria-label="AI mentor brief"
      className="rounded-xl border border-accent/30 bg-bg-raised p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            Your mentor
          </p>
          <h2 className="mt-1 text-xl font-semibold">{brief.greeting}</h2>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="shrink-0 text-xs text-text-faint hover:text-text-dim disabled:opacity-40"
        >
          {refreshing ? "…" : "refresh"}
        </button>
      </div>

      <p className="mt-2 text-sm text-text-dim">
        <span className="text-text-faint">Focus today: </span>
        {brief.focus}
      </p>

      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-bg-inset p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{move.label}</p>
          <p className="mt-0.5 text-xs text-text-faint">{move.why}</p>
        </div>
        <Link
          href={MOVE_HREF[move.kind](move.ref)}
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-bg hover:opacity-90"
        >
          Go →
        </Link>
      </div>

      {(brief.weaknesses.length > 0 || brief.strengths.length > 0) && (
        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          {brief.strengths.length > 0 && (
            <p className="text-text-faint">
              <span className="text-accent">Strong:</span>{" "}
              {brief.strengths.join(", ")}
            </p>
          )}
          {brief.weaknesses.length > 0 && (
            <p className="text-text-faint">
              <span className="text-danger">Working on:</span>{" "}
              {brief.weaknesses.join(", ")}
            </p>
          )}
        </div>
      )}

      <p className="mt-3 text-xs italic text-text-faint">{brief.encouragement}</p>
    </section>
  );
}
