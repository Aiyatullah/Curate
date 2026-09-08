import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Self Curative Learning",
  description: "A personal problem-solving OS for interview prep.",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/problems", label: "Problem Bank" },
  { href: "/analyze", label: "Paste & Analyze" },
  { href: "/graph", label: "Knowledge Graph" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
          <header className="flex items-center justify-between border-b border-border py-5">
            <Link href="/" className="font-mono text-sm tracking-tight text-text">
              self·curative<span className="text-accent">·learning</span>
            </Link>
            <nav className="flex gap-1 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-3 py-1.5 text-text-dim transition-colors hover:bg-bg-raised hover:text-text"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="flex-1 py-10">{children}</main>
          <footer className="border-t border-border py-6 text-xs text-text-faint">
            Phase 1 · Problem Solving OS
          </footer>
        </div>
      </body>
    </html>
  );
}
