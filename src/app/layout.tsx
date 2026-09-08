import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MainNav } from "@/components/MainNav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Self Curative Learning",
  description: "A personal problem-solving OS for interview prep.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a
          href="#main"
          className="sr-only rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to content
        </a>
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
          <MainNav />
          <main id="main" className="flex-1 py-10">
            {children}
          </main>
          <footer className="border-t border-border py-6 text-xs text-text-faint">
            Self Curative Learning — a personal interview-prep OS.
          </footer>
        </div>
      </body>
    </html>
  );
}
