"use client";

import { useState } from "react";
import { InterviewChat } from "./InterviewChat";
import { SessionRecorder } from "./SessionRecorder";
import { SECTION_LABEL, type SectionKind } from "@/lib/interview/schema";

const SECTIONS: { kind: SectionKind; hint: string }[] = [
  { kind: "coding", hint: "Talk through a random DSA problem" },
  { kind: "system-design", hint: "Design a random system, 7 dimensions" },
  { kind: "challenge", hint: "Design a component / service aloud" },
  { kind: "behavioral", hint: "Ownership, conflict, hard calls" },
  { kind: "concepts", hint: "Role-specific: React, infra, whatever fits" },
];

const SENIORITY = ["junior", "mid", "senior", "staff"] as const;

export function InterviewSetup({ companies }: { companies: string[] }) {
  const [role, setRole] = useState("");
  const [seniority, setSeniority] = useState<(typeof SENIORITY)[number]>("senior");
  const [picked, setPicked] = useState<SectionKind[]>(["coding", "concepts"]);
  const [surprise, setSurprise] = useState(true);
  const [config, setConfig] = useState<null | Record<string, unknown>>(null);

  function toggle(k: SectionKind) {
    setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  }

  if (config) {
    return (
      <div className="space-y-5">
        <div className="panel-inset flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-xs text-text-dim">
          <span className="text-text">{String(config.role)}</span>
          <span className="text-text-faint">· {String(config.seniority)}</span>
          <span className="text-text-faint">
            · {(config.sections as SectionKind[]).map((s) => SECTION_LABEL[s]).join(" · ")}
          </span>
          <button
            onClick={() => setConfig(null)}
            className="ml-auto text-text-faint hover:text-text-dim"
          >
            change
          </button>
        </div>
        <SessionRecorder label="Record this interview (optional)" />
        <InterviewChat startPayload={{ config }} />
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!role.trim()) return;
        setConfig({ role: role.trim(), seniority, sections: picked, surprise });
      }}
      className="panel space-y-5 p-6"
    >
      <label className="block">
        <span className="label">Role you&apos;re interviewing for</span>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          placeholder="e.g. Senior Frontend Engineer at Vercel"
          className="mt-1.5 w-full px-3 py-2 text-sm"
        />
        {companies.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {companies.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setRole((r) => (r ? r : `Software Engineer at ${c}`))}
                className="chip hover:text-text-dim"
              >
                {c}
              </button>
            ))}
          </span>
        )}
      </label>

      <div>
        <span className="label">Seniority</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SENIORITY.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setSeniority(s)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
                seniority === s
                  ? "bg-accent text-accent-ink"
                  : "border border-border text-text-dim hover:text-text"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <fieldset>
        <legend className="label">What should this interview include?</legend>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <label
              key={s.kind}
              className={`panel-inset flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-sm ${
                picked.includes(s.kind) ? "border-accent/50" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={picked.includes(s.kind)}
                onChange={() => toggle(s.kind)}
                className="mt-0.5 accent-[var(--color-accent)]"
              />
              <span>
                <span className="text-text">{SECTION_LABEL[s.kind]}</span>
                <span className="mt-0.5 block text-xs text-text-faint">{s.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-text-dim">
        <input
          type="checkbox"
          checked={surprise}
          onChange={(e) => setSurprise(e.target.checked)}
          className="accent-[var(--color-accent)]"
        />
        Surprise me — the interviewer picks the specific problems &amp; questions
      </label>

      <button type="submit" disabled={!role.trim()} className="btn btn-primary">
        Start interview →
      </button>
      <p className="text-xs text-text-faint">
        The interviewer tailors every question to the role — not just prebuilt banks.
        Up to ~20 questions across your chosen sections, then a scorecard.
      </p>
    </form>
  );
}
