export function Meter({
  value,
  label,
  size = "md",
}: {
  value: number; // 0-100
  label: string;
  size?: "sm" | "md";
}) {
  const pct = Math.max(0, Math.min(100, value));
  const tone =
    pct >= 70 ? "var(--color-accent)" : pct >= 40 ? "var(--color-accent-warm)" : "var(--color-danger)";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span
          className={`${size === "sm" ? "text-[10px]" : "text-xs"} font-mono uppercase tracking-widest text-text-faint`}
        >
          {label}
        </span>
        <span className={`${size === "sm" ? "text-xs" : "text-sm"} font-semibold`}>
          {pct}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct} percent`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-bg-inset"
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${pct}%`, background: tone }}
        />
      </div>
    </div>
  );
}
