"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/analysis/schema";
import { AnalysisScorecard } from "@/components/AnalysisScorecard";

const LANGS = ["python", "java", "javascript", "go", "typescript", "c++", "rust"];

export default function AnalyzePage() {
  const [language, setLanguage] = useState("python");
  const [intent, setIntent] = useState("");
  const [code, setCode] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language, intent, code }),
      });
      const data = await res.json();
      if (data.analysis) setAnalysis(data.analysis as AnalysisResult);
      else setError(data.error ?? "Analysis failed.");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Paste &amp; Analyze</h1>
        <p className="mt-1 text-sm text-text-dim">
          Any code — an old solution, an interview post-mortem, work code. The
          analyzer scores it against what you say you were trying to do.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`rounded-md px-2.5 py-1 text-xs ${
                language === l
                  ? "bg-accent text-bg"
                  : "border border-border text-text-dim"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1 block text-xs text-text-dim">
            What is this / what were you trying to do? (optional but improves the review)
          </span>
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-bg-inset p-2.5 text-sm outline-none focus:border-accent"
          />
        </label>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          rows={16}
          placeholder="Paste code here…"
          className="w-full rounded-lg border border-border bg-bg-inset p-3 font-mono text-sm outline-none focus:border-accent"
        />

        <button
          onClick={run}
          disabled={!code.trim() || loading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-40"
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {analysis && (
        <div className="border-t border-border pt-8">
          <AnalysisScorecard a={analysis} />
        </div>
      )}
    </div>
  );
}
