"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

export type GroupItem = { id: string; search: string; node: ReactNode };
export type Group = {
  key: string;
  label: string;
  count: number;
  done?: number;
  items: GroupItem[];
};

/**
 * Searchable, collapsible grouped list. Search filters items across every group
 * (and force-expands); collapse state is per-item and persisted per `storeKey`.
 */
export function CollapsibleGroups({
  groups,
  storeKey,
  placeholder = "Search…",
  defaultCollapsed = false,
}: {
  groups: Group[];
  storeKey: string;
  placeholder?: string;
  defaultCollapsed?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrate collapse state from localStorage after mount so SSR and the first
    // client render agree (everything expanded until `hydrated`).
    let next: Set<string> | null = null;
    try {
      const raw = localStorage.getItem(`groups:${storeKey}`);
      if (raw) next = new Set(JSON.parse(raw) as string[]);
      else if (defaultCollapsed) next = new Set(groups.map((g) => g.key));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (next) setCollapsed(next);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);

  function persist(next: Set<string>) {
    setCollapsed(next);
    try {
      localStorage.setItem(`groups:${storeKey}`, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => it.search.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);

  const matchCount = filtered.reduce((n, g) => n + g.items.length, 0);
  const allCollapsed = groups.every((g) => collapsed.has(g.key));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[200px]">
          <span className="sr-only">{placeholder}</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full py-2 pl-8 pr-3 text-sm"
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
            aria-hidden
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="m11 11 3 3" strokeLinecap="round" />
          </svg>
        </label>
        <button
          onClick={() =>
            persist(allCollapsed ? new Set() : new Set(groups.map((g) => g.key)))
          }
          className="btn btn-sm"
        >
          {allCollapsed ? "Expand all" : "Collapse all"}
        </button>
      </div>

      {q && (
        <p className="text-xs text-text-faint">
          {matchCount} match{matchCount === 1 ? "" : "es"} for “{query}”
        </p>
      )}

      {filtered.map((g) => {
        const isOpen = !!q || !collapsed.has(g.key) || !hydrated;
        return (
          <section key={g.key} id={g.key} className="scroll-mt-24">
            <h2 className="label mb-1.5">
              <button
                onClick={() => {
                  if (q) return;
                  const next = new Set(collapsed);
                  if (next.has(g.key)) next.delete(g.key);
                  else next.add(g.key);
                  persist(next);
                }}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-2 rounded px-0.5 py-1 hover:text-text-dim"
              >
                <span className="flex items-center gap-1.5">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                    aria-hidden
                  >
                    <path d="m3 1 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {g.label}
                </span>
                <span>
                  {g.done != null ? `${g.done}/${g.count}` : g.count}
                </span>
              </button>
            </h2>
            {isOpen && (
              <ul className="panel divide-y divide-border overflow-hidden">
                {g.items.map((it) => it.node)}
              </ul>
            )}
          </section>
        );
      })}

      {q && matchCount === 0 && (
        <p className="panel-inset px-4 py-6 text-center text-sm text-text-faint">
          Nothing matches “{query}”.
        </p>
      )}
    </div>
  );
}
