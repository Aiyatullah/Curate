"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewDesignButton({ title, prompt }: { title: string; prompt: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const res = await fetch("/api/systemdesign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "upsert", prompt }),
      });
      const d = await res.json();
      if (d.id) router.push(`/design/${d.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={create}
      disabled={busy}
      className="w-full rounded-lg border border-border bg-bg-raised px-4 py-3 text-left text-sm text-text transition-colors hover:border-accent/50 disabled:opacity-40"
    >
      {title}
      <span className="mt-0.5 block text-xs text-text-faint">{prompt.slice(0, 80)}…</span>
    </button>
  );
}
