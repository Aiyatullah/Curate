import Link from "next/link";
import type { ReactNode } from "react";

/** Serif page title with an optional mono kicker, description and trailing actions. */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="reveal reveal-1">
      {kicker && <p className="label mb-2">{kicker}</p>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-[length:var(--text-title)]">{title}</h1>
        {actions}
      </div>
      {description && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-dim">
          {description}
        </p>
      )}
    </header>
  );
}

/** A labelled statistic — big tabular number under a mono label. */
export function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: "accent" | "warm" | "danger";
  hint?: string;
}) {
  const color =
    tone === "warm"
      ? "text-accent-warm"
      : tone === "danger"
        ? "text-danger"
        : tone === "accent"
          ? "text-accent"
          : "text-text";
  return (
    <div className="panel-inset px-4 py-3.5">
      <p className="label">{label}</p>
      <p className={`stat-num mt-1.5 text-2xl font-semibold ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-text-faint">{hint}</p>}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="label mb-3">{children}</h2>;
}

export function EmptyState({
  children,
  cta,
}: {
  children: ReactNode;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="panel-inset px-5 py-8 text-center">
      <p className="text-sm text-text-faint">{children}</p>
      {cta && (
        <Link href={cta.href} className="btn btn-sm mt-3 inline-flex">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

const DIFF: Record<string, string> = {
  Easy: "text-accent",
  Medium: "text-accent-warm",
  Hard: "text-danger",
};
export function Difficulty({ level }: { level: string }) {
  return <span className={DIFF[level] ?? "text-text-faint"}>{level}</span>;
}
