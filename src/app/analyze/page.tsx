"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/analysis/schema";
import { AnalysisScorecard } from "@/components/AnalysisScorecard";
import { RepoImport } from "@/components/RepoImport";
import { PageHeader } from "@/components/ui";

const LANGS = ["python", "java", "javascript", "typescript", "go", "c++", "rust"];

export default function AnalyzePage() {
  const [tab, setTab] = useState<"paste" | "import">("paste");

  return (
    <div className="space-y-10">
      <PageHeader
        kicker="Analyze"
        title="Analyze code"
        description="Score a single snippet against what you meant it to do, or import a whole project as a .zip for a staff-engineer repo review."
      />

      <div
        role="tablist"
        aria-label="Analysis mode"
        className="panel-inset inline-flex gap-1 p-1"
      >
        {(["paste", "import"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-[7px] px-3.5 py-1.5 text-sm transition-colors ${
              tab === t ? "bg-bg-raised text-text" : "text-text-dim hover:text-text"
            }`}
          >
            {t === "paste" ? "Paste a snippet" : "Import project (.zip)"}
          </button>
        ))}
      </div>

      {tab === "paste" ? <PasteMode /> : <RepoImport />}
    </div>
  );
}

function PasteMode() {
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
    <div className="space-y-4">
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

      <label className="block">
        <span className="mb-1 block text-xs text-text-dim">
          What is this / what were you trying to do? (optional, improves the review)
        </span>
        <textarea
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          rows={3}
          className="w-full p-2.5 text-sm"
        />
      </label>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        rows={16}
        placeholder="Paste code here…"
        className="w-full p-3 font-mono text-sm"
      />

      <button
        onClick={run}
        disabled={!code.trim() || loading}
        className="btn btn-primary"
      >
        {loading ? "Analyzing…" : "Analyze"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}

      {analysis && (
        <div className="panel mt-2 p-5 sm:p-6">
          <AnalysisScorecard a={analysis} />
        </div>
      )}
    </div>
  );
}
