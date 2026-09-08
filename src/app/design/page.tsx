import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { systemDesigns } from "@/lib/db/schema";
import { DESIGN_PROMPTS } from "@/lib/systemdesign/prompts";
import { NewDesignButton } from "@/components/NewDesignButton";
import { PageHeader, SectionLabel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DesignListPage() {
  const past = await db
    .select()
    .from(systemDesigns)
    .orderBy(desc(systemDesigns.createdAt))
    .limit(25);

  return (
    <div className="space-y-10">
      <PageHeader
        kicker="System Design OS"
        title="Design studio"
        description="Work a design in seven structured passes — requirements, scale, data model, API, high-level, deep dives, trade-offs — then get a principal-engineer review of what you missed."
      />

      <section>
        <SectionLabel>Start a design</SectionLabel>
        <ul className="grid gap-2 sm:grid-cols-2">
          {DESIGN_PROMPTS.map((p) => (
            <li key={p.title}>
              <NewDesignButton title={p.title} prompt={p.prompt} />
            </li>
          ))}
        </ul>
      </section>

      {past.length > 0 && (
        <section>
          <SectionLabel>Your designs</SectionLabel>
          <ul className="panel divide-y divide-border overflow-hidden">
            {past.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/design/${d.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-bg-raised"
                >
                  <span className="text-text-dim">{d.prompt.slice(0, 70)}</span>
                  <span className="font-mono text-xs text-text-faint">
                    {d.score != null ? `${d.score}/10` : "draft"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
