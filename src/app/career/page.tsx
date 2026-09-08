import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { resumeItems } from "@/lib/db/schema";
import { getCompanyReadiness } from "@/lib/career/readiness";
import { Meter } from "@/components/Meter";
import { ResumeTracker } from "@/components/ResumeTracker";
import { AddCompany } from "@/components/AddCompany";

export const dynamic = "force-dynamic";

export default async function CareerPage() {
  const [companiesReady, resume] = await Promise.all([
    getCompanyReadiness(),
    db.select().from(resumeItems).orderBy(desc(resumeItems.createdAt)),
  ]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold">Career OS</h1>
        <p className="mt-1 text-sm text-text-dim">
          Company readiness is computed live from your knowledge graph, engineering
          challenges and system-design reviews — nothing to update by hand.
        </p>
      </header>

      <section aria-labelledby="companies-h">
        <h2
          id="companies-h"
          className="mb-3 font-mono text-xs uppercase tracking-widest text-text-faint"
        >
          Target companies
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {companiesReady.map((c) => (
            <article
              key={c.slug}
              className="rounded-xl border border-border bg-bg-raised p-4"
            >
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="font-semibold">{c.name}</h3>
                <span className="text-lg font-semibold">{c.overallPct}%</span>
              </div>
              <div className="space-y-2">
                <Meter value={c.dsaPct} label="DSA" size="sm" />
                <Meter value={c.engineeringPct} label="Engineering" size="sm" />
                <Meter value={c.systemDesignPct} label="System design" size="sm" />
              </div>
              {c.focusAreas.length > 0 && (
                <p className="mt-3 text-[11px] text-text-faint">
                  Focus: {c.focusAreas.join(" · ")}
                </p>
              )}
            </article>
          ))}
        </div>
        <div className="mt-3">
          <AddCompany />
        </div>
      </section>

      <section aria-labelledby="resume-h">
        <h2
          id="resume-h"
          className="mb-3 font-mono text-xs uppercase tracking-widest text-text-faint"
        >
          Resume tracker
        </h2>
        <ResumeTracker initial={resume} />
      </section>

      <p className="text-xs text-text-faint">
        Readiness inputs:{" "}
        <Link href="/graph" className="text-accent">
          knowledge graph
        </Link>
        ,{" "}
        <Link href="/challenges" className="text-accent">
          challenges
        </Link>
        ,{" "}
        <Link href="/design" className="text-accent">
          system design
        </Link>
        .
      </p>
    </div>
  );
}
