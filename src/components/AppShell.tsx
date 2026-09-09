"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: React.ReactNode };

const I = {
  home: (
    <path d="M3 9.5 8 4l5 5.5M4.5 8.5V13h7V8.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  list: <path d="M5 4h8M5 8h8M5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" strokeLinecap="round" />,
  scan: (
    <path
      d="M3 5V3h2M13 5V3h-2M3 11v2h2M13 11v2h-2M4.5 8h7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  build: (
    <path
      d="M8 2 3 5v6l5 3 5-3V5L8 2ZM3 5l5 3 5-3M8 8v6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  grid: (
    <path
      d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z"
      strokeLinejoin="round"
    />
  ),
  graph: (
    <path d="M3 13V3M3 13h10M6 10l2.5-3L11 9l2-4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  target: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  mic: (
    <path
      d="M8 2a2 2 0 0 0-2 2v4a2 2 0 1 0 4 0V4a2 2 0 0 0-2-2ZM4 8a4 4 0 0 0 8 0M8 12v2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Practice",
    items: [
      { href: "/", label: "Dashboard", icon: I.home },
      { href: "/problems", label: "Problems", icon: I.list },
      { href: "/analyze", label: "Analyze code", icon: I.scan },
    ],
  },
  {
    title: "Interview",
    items: [
      { href: "/interview", label: "Mock interview", icon: I.mic },
      { href: "/challenges", label: "Challenges", icon: I.build },
      { href: "/design", label: "System design", icon: I.grid },
    ],
  },
  {
    title: "Progress",
    items: [
      { href: "/graph", label: "Knowledge", icon: I.graph },
      { href: "/career", label: "Career", icon: I.target },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <nav aria-label="Primary" className="flex flex-col gap-6">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="label mb-2 px-3">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const on = active(it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    aria-current={on ? "page" : undefined}
                    className={`group flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-sm transition-colors ${
                      on
                        ? "bg-bg-raised text-text"
                        : "text-text-dim hover:bg-bg-raised/60 hover:text-text"
                    }`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      className={on ? "text-accent" : "text-text-faint group-hover:text-text-dim"}
                      aria-hidden
                    >
                      {it.icon}
                    </svg>
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[236px_1fr]">
      {/* mobile top bar */}
      <header className="flex items-center justify-between border-b border-border bg-bg-inset px-4 py-3 md:hidden">
        <Link href="/" className="font-mono text-sm">
          self·curative<span className="text-accent">·learning</span>
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          className="btn btn-sm"
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>

      {open && (
        <div className="border-b border-border bg-bg-inset px-4 py-4 md:hidden">{nav}</div>
      )}

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col justify-between border-r border-border bg-bg-inset px-4 py-6 md:flex">
        <div>
          <Link
            href="/"
            className="mb-8 block px-3 font-mono text-[13px] leading-tight"
          >
            self·curative
            <br />
            <span className="text-accent">·learning</span>
          </Link>
          {nav}
        </div>
        <p className="px-3 text-[11px] text-text-faint">
          Personal interview-prep OS
        </p>
      </aside>

      <div className="flex min-w-0 flex-col">
        <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-8">
          {children}
        </main>
        <footer className="border-t border-border px-8 py-5 text-[11px] text-text-faint">
          Built for one engineer, by that engineer.
        </footer>
      </div>
    </div>
  );
}
