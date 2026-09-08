"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRACK } from "@/lib/progression/track";

export function AddCompany() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(2);
  const [focus, setFocus] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/companies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name,
          priority,
          focusAreas: focus,
        }),
      });
      setName("");
      setFocus([]);
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border px-4 py-2 text-sm text-text-dim hover:bg-bg-raised hover:text-text"
      >
        + Add a company
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 panel p-4"
    >
      <label className="block text-xs text-text-dim">
        <span className="mb-1 block">Company name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block text-xs text-text-dim">
        <span className="mb-1 block">Priority</span>
        <select
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="rounded-md border border-border bg-bg-inset px-2 py-1.5 text-sm text-text"
        >
          <option value={1}>1 — dream</option>
          <option value={2}>2 — strong target</option>
          <option value={3}>3 — maybe</option>
        </select>
      </label>
      <fieldset className="text-xs text-text-dim">
        <legend className="mb-1">Focus topics (drives DSA readiness)</legend>
        <div className="flex flex-wrap gap-1.5">
          {TRACK.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() =>
                setFocus((f) =>
                  f.includes(t) ? f.filter((x) => x !== t) : [...f, t],
                )
              }
              className={`rounded-md px-2 py-1 text-[11px] ${
                focus.includes(t)
                  ? "bg-accent text-bg"
                  : "border border-border text-text-dim"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="btn btn-primary btn-sm"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-border px-4 py-2 text-sm text-text-faint"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
