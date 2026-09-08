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
        aria-label="Mentor brief"
        className="panel p-6 text-sm text-text-faint"
      >
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          Reading your history…
        </span>
      </section>
    );
  }
  if (!brief) return null;

  const move = brief.todaysMove;
  return (
    <section
      aria-label="Mentor brief"
      className="panel overflow-hidden p-6 sm:p-7"
      style={{
        borderTop: "2px solid var(--accent-warm)",
        boxShadow: "0 0 0 1px var(--accent-warm-soft), 0 16px 40px -24px var(--glow)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label" style={{ color: "var(--accent)" }}>
            Your mentor
          </p>
          <h2 className="display mt-1.5 text-xl sm:text-2xl">{brief.greeting}</h2>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="shrink-0 text-xs text-text-faint transition-colors hover:text-text-dim disabled:opacity-40"
        >
          {refreshing ? "…" : "↻ refresh"}
        </button>
      </div>

      <p className="mt-2.5 text-sm text-text-dim">
        <span className="text-text-faint">Focus today — </span>
        {brief.focus}
      </p>

      <div className="mt-5 flex flex-col gap-3 rounded-[9px] border border-border bg-bg-sunken p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-text">{move.label}</p>
          <p className="mt-0.5 text-xs text-text-faint">{move.why}</p>
        </div>
        <Link
          href={MOVE_HREF[move.kind](move.ref)}
          className="btn btn-primary shrink-0 justify-center"
        >
          Start →
        </Link>
      </div>

      {(brief.weaknesses.length > 0 || brief.strengths.length > 0) && (
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
          {brief.strengths.length > 0 && (
            <p className="text-text-faint">
              <span className="text-accent">Strong</span> — {brief.strengths.join(", ")}
            </p>
          )}
          {brief.weaknesses.length > 0 && (
            <p className="text-text-faint">
              <span className="text-danger">Working on</span> —{" "}
              {brief.weaknesses.join(", ")}
            </p>
          )}
        </div>
      )}

      <p className="mt-3 border-t border-border pt-3 text-xs italic text-text-faint">
        {brief.encouragement}
      </p>
    </section>
  );
}
