"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProblemStatusValue } from "@/lib/db/schema";

type Props = {
  id: string;
  title: string;
  difficulty: string;
  subtopic: string | null;
  leetcodeUrl: string;
  companyTags: string[];
  lists: string[];
  initialStatus: ProblemStatusValue;
  attemptCount: number;
  lastReadiness: number | null;
};

const NEXT: Record<ProblemStatusValue, ProblemStatusValue> = {
  unsolved: "solved",
  solved: "unsolved",
  revise: "solved",
};

const DIFF_COLOR: Record<string, string> = {
  Easy: "text-accent",
  Medium: "text-accent-warm",
  Hard: "text-danger",
};

export function ProblemRow(props: Props) {
  const [status, setStatus] = useState<ProblemStatusValue>(props.initialStatus);
  const [busy, setBusy] = useState(false);

  async function set(next: ProblemStatusValue) {
    setBusy(true);
    const prev = status;
    setStatus(next);
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "status", problemId: props.id, status: next }),
      });
      if (!res.ok) setStatus(prev);
    } catch {
      setStatus(prev);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
      <button
        onClick={() => set(NEXT[status])}
        disabled={busy}
        title={status === "solved" ? "Mark unsolved" : "Mark solved"}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-xs ${
          status === "solved"
            ? "border-accent bg-accent text-bg"
            : status === "revise"
              ? "border-accent-warm text-accent-warm"
              : "border-border text-transparent hover:border-text-faint"
        }`}
      >
        {status === "solved" ? "✓" : status === "revise" ? "⟳" : "·"}
      </button>

      <span className="min-w-0 flex-1">
        <span className="text-text">{props.title}</span>
        <span className="ml-2 text-xs text-text-faint">
          <span className={DIFF_COLOR[props.difficulty]}>{props.difficulty}</span>
          {props.subtopic ? ` · ${props.subtopic}` : ""}
          {props.attemptCount > 0 ? ` · ${props.attemptCount} att` : ""}
          {props.lastReadiness != null ? ` · ${props.lastReadiness}/10` : ""}
        </span>
        {props.companyTags.length > 0 && (
          <span className="mt-0.5 block text-[11px] text-text-faint">
            {props.companyTags.slice(0, 4).join(" · ")}
          </span>
        )}
      </span>

      <button
        onClick={() => set(status === "revise" ? "unsolved" : "revise")}
        disabled={busy}
        className={`text-xs ${
          status === "revise" ? "text-accent-warm" : "text-text-faint hover:text-accent-warm"
        }`}
      >
        {status === "revise" ? "revising" : "revise"}
      </button>
      <a
        href={props.leetcodeUrl}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-text-faint hover:text-text-dim"
      >
        LeetCode ↗
      </a>
      <Link href={`/practice/${props.id}`} className="text-xs text-accent">
        {props.attemptCount > 0 ? "Attempt again →" : "Solve →"}
      </Link>
    </li>
  );
}
