import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { interviewSessions, companies } from "@/lib/db/schema";
import { PageHeader, SectionLabel } from "@/components/ui";
import { InterviewSetup } from "@/components/InterviewSetup";

export const dynamic = "force-dynamic";

export default async function InterviewHub() {
  const [past, cos] = await Promise.all([
    db
      .select({
        id: interviewSessions.id,
        problemId: interviewSessions.problemId,
        config: interviewSessions.config,
        score: interviewSessions.score,
        createdAt: interviewSessions.createdAt,
      })
      .from(interviewSessions)
      .where(sql`${interviewSessions.score} is not null`)
      .orderBy(desc(interviewSessions.createdAt))
      .limit(8),
    db.select({ name: companies.name }).from(companies).limit(8),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        kicker="Interview Thinking OS"
        title="Mock interview"
        description="Configure the interview — role, seniority, and which sections it covers — and the AI interviewer runs it live, tailoring questions to that exact role. Or start a quick debrief on any problem from its page."
      />

      <InterviewSetup companies={cos.map((c) => c.name)} />

      {past.length > 0 && (
        <section>
          <SectionLabel>Past interviews</SectionLabel>
          <ul className="panel divide-y divide-border overflow-hidden">
            {past.map((iv) => (
              <li
                key={iv.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-text-dim">
                  {iv.config?.role ?? iv.problemId ?? "interview"}
                  {iv.config?.seniority ? ` · ${iv.config.seniority}` : ""}
                </span>
                <span className="shrink-0 font-mono text-xs">
                  {iv.score ? (
                    <span
                      className={
                        iv.score.hireVerdict.includes("yes")
                          ? "text-accent"
                          : "text-text-faint"
                      }
                    >
                      {iv.score.overall}/10 · {iv.score.hireVerdict}
                    </span>
                  ) : (
                    "—"
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-text-faint">
        Practising a specific problem?{" "}
        <Link href="/problems" className="text-accent">
          Pick one
        </Link>{" "}
        and hit “Mock interview on this”.
      </p>
    </div>
  );
}
