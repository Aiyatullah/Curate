"use client";

import { useState } from "react";
import type { RepoReview } from "@/lib/analysis/repo-schema";
import { RepoReviewCard } from "./RepoReviewCard";

const SKIP_DIR =
  /(^|\/)(node_modules|\.git|\.next|dist|build|out|coverage|vendor|__pycache__|\.venv|target|\.turbo|\.cache)(\/|$)/;
const SOURCE_EXT =
  /\.(tsx?|jsx?|mjs|cjs|py|go|rs|java|kt|rb|php|swift|c|cc|cpp|h|hpp|cs|css|scss|sql|prisma|graphql|ya?ml|toml|md)$/i;
const KEY_FILES =
  /(^|\/)(readme|package\.json|requirements\.txt|pyproject\.toml|go\.mod|cargo\.toml|dockerfile|docker-compose|schema\.prisma|next\.config|tsconfig\.json|\.env\.example)/i;
const ENTRY =
  /(^|\/)(src\/)?(index|main|app|server|route|handler|__init__)\.(tsx?|jsx?|py|go|rs)$/i;

const MAX_FILES = 22;
const MAX_TOTAL = 85_000;
const MAX_PER_FILE = 11_000;

type Status = "idle" | "reading" | "reviewing" | "done" | "error";

export function RepoImport() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [review, setReview] = useState<RepoReview | null>(null);

  async function onFile(file: File) {
    setStatus("reading");
    setError(null);
    setReview(null);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(file);

      const all: string[] = [];
      const candidates: { path: string; rank: number; entry: import("jszip").JSZipObject }[] = [];
      zip.forEach((path, entry) => {
        if (entry.dir || SKIP_DIR.test(path)) return;
        const clean = path.replace(/^[^/]+\//, ""); // strip the single top-level folder
        all.push(clean);
        if (!SOURCE_EXT.test(clean)) return;
        let rank = clean.split("/").length; // shallower = better
        if (KEY_FILES.test(clean)) rank -= 100;
        else if (ENTRY.test(clean)) rank -= 50;
        else if (/(^|\/)src\//.test(clean)) rank -= 5;
        if (/\.(test|spec)\./.test(clean)) rank -= 3;
        candidates.push({ path: clean, rank, entry });
      });

      candidates.sort((a, b) => a.rank - b.rank);
      const files: { path: string; content: string }[] = [];
      let total = 0;
      for (const c of candidates) {
        if (files.length >= MAX_FILES || total >= MAX_TOTAL) break;
        const text = (await c.entry.async("string")).slice(0, MAX_PER_FILE);
        if (!text.trim()) continue;
        total += text.length;
        files.push({ path: c.path, content: text });
      }
      if (!files.length) {
        setError("No readable source files in that archive.");
        setStatus("error");
        return;
      }
      setPicked(files.map((f) => f.path));
      setStatus("reviewing");

      const res = await fetch("/api/analyze/repo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectName: file.name.replace(/\.zip$/i, ""),
          tree: all.sort(),
          files,
          note,
        }),
      });
      const data = await res.json();
      if (data.review) {
        setReview(data.review as RepoReview);
        setStatus("done");
      } else {
        setError(data.error ?? "Review failed.");
        setStatus("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file.");
      setStatus("error");
    }
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs text-text-dim">
          What should the reviewer focus on? (optional)
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. is the data layer sensible? is this take-home-ready?"
          className="w-full p-2.5 text-sm"
        />
      </label>

      <label
        className={`panel flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed px-6 py-10 text-center text-sm ${
          status === "reading" || status === "reviewing"
            ? "opacity-60"
            : "hover:border-border-strong"
        }`}
      >
        <input
          type="file"
          accept=".zip"
          className="sr-only"
          disabled={status === "reading" || status === "reviewing"}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
        {status === "reading" && <span className="text-text-dim">Reading archive…</span>}
        {status === "reviewing" && (
          <span className="text-text-dim">
            Reviewing {picked.length} files — this takes ~15s…
          </span>
        )}
        {(status === "idle" || status === "done" || status === "error") && (
          <>
            <span className="text-text">Drop a project .zip or click to choose</span>
            <span className="text-xs text-text-faint">
              Source files only, extracted in your browser. Nothing is stored except
              the review.
            </span>
          </>
        )}
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      {picked.length > 0 && status !== "reviewing" && (
        <details className="text-xs text-text-faint">
          <summary className="cursor-pointer">Files sent for review ({picked.length})</summary>
          <ul className="mt-1 space-y-0.5 font-mono">
            {picked.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </details>
      )}

      {review && <RepoReviewCard r={review} />}
    </div>
  );
}
