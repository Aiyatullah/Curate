"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Rec = {
  topic: string;
  problem: { id: string; title: string; difficulty: string; topic: string } | null;
  reason: string;
  kind: string;
};

export function FindMoreButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rec, setRec] = useState<Rec | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function find() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommend?mode=more");
      const data = (await res.json()) as Rec;
      if (data.problem) {
        setRec(data);
        router.refresh(); // an AI problem may have been added to the bank
      } else {
        setError(data.reason ?? "Nothing found.");
      }
    } catch {
      setError("Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button onClick={find} disabled={loading} className="btn btn-sm">
        {loading ? "Finding…" : "Find another →"}
      </button>
      {rec?.problem && (
        <a
          href={`/practice/${rec.problem.id}`}
          className="panel block p-3 text-sm"
        >
          <span className="font-medium text-accent">{rec.problem.title}</span>
          <span className="ml-2 text-xs text-text-faint">
            {rec.problem.difficulty} · {rec.problem.topic}
            {rec.kind === "ai" ? " · AI-generated" : ""}
          </span>
          <p className="mt-1 text-xs text-text-faint">{rec.reason}</p>
        </a>
      )}
      {error && <p className="text-xs text-text-faint">{error}</p>}
    </div>
  );
}
