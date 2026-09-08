"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/problems", label: "Problems" },
  { href: "/challenges", label: "Challenges" },
  { href: "/design", label: "System Design" },
  { href: "/graph", label: "Knowledge" },
  { href: "/career", label: "Career" },
  { href: "/analyze", label: "Analyze" },
];

export function MainNav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="flex flex-col gap-3 border-b border-border py-5 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href="/"
        className="font-mono text-sm tracking-tight text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        self·curative<span className="text-accent">·learning</span>
      </Link>
      <nav aria-label="Primary" className="flex flex-wrap gap-1 text-sm">
        {NAV.map((n) => {
          const active = isActive(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                active
                  ? "bg-bg-raised text-text"
                  : "text-text-dim hover:bg-bg-raised hover:text-text"
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
