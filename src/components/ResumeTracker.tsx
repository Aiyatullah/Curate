"use client";

import { useState } from "react";
import type { ResumeItem } from "@/lib/db/schema";

const KINDS = [
  { v: "project", label: "Project" },
  { v: "oss", label: "Open source" },
  { v: "blog", label: "Blog post" },
  { v: "application", label: "Application" },
  { v: "referral", label: "Referral" },
];

export function ResumeTracker({ initial }: { initial: ResumeItem[] }) {
  const [items, setItems] = useState(initial);
  const [kind, setKind] = useState("project");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", kind, title, url, status, company }),
      });
      const d = await res.json();
      if (d.item) {
        setItems((x) => [d.item, ...x]);
        setTitle("");
        setUrl("");
        setStatus("");
        setCompany("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setItems((x) => x.filter((i) => i.id !== id));
    await fetch("/api/resume", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
  }

  const counts = KINDS.map((k) => ({
    ...k,
    n: items.filter((i) => i.kind === k.v).length,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs text-text-faint">
        {counts.map((c) => (
          <span key={c.v} className="rounded-full border border-border px-2.5 py-1">
            {c.label}: <span className="text-text">{c.n}</span>
          </span>
        ))}
      </div>

      <form
        onSubmit={add}
        className="grid gap-2 panel p-4 sm:grid-cols-[130px_1fr]"
      >
        <label className="text-xs text-text-dim">
          <span className="mb-1 block">Type</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full px-2 py-1.5 text-sm"
          >
            {KINDS.map((k) => (
              <option key={k.v} value={k.v}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-text-dim">
          <span className="mb-1 block">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-text-dim sm:col-start-2">
          <span className="mb-1 block">URL (optional)</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-text-dim">
          <span className="mb-1 block">Status</span>
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="shipped / applied / interviewing…"
            className="w-full px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-text-dim">
          <span className="mb-1 block">Company (optional)</span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="btn btn-primary btn-sm sm:col-start-2 sm:justify-self-start"
        >
          Add
        </button>
      </form>

      {items.length > 0 && (
        <ul className="panel divide-y divide-border overflow-hidden">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-20 shrink-0 font-mono text-[10px] uppercase text-text-faint">
                {i.kind}
              </span>
              <span className="min-w-0 flex-1">
                {i.url ? (
                  <a href={i.url} target="_blank" rel="noreferrer" className="text-text hover:text-accent">
                    {i.title}
                  </a>
                ) : (
                  <span className="text-text">{i.title}</span>
                )}
                {(i.status || i.company) && (
                  <span className="ml-2 text-xs text-text-faint">
                    {[i.company, i.status].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              <button
                onClick={() => remove(i.id)}
                aria-label={`Delete ${i.title}`}
                className="text-xs text-text-faint hover:text-danger"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
