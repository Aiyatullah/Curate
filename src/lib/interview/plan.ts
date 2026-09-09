import { eq, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { problems, challenges, solveSessions, problemStatus } from "@/lib/db/schema";
import { DESIGN_PROMPTS } from "@/lib/systemdesign/prompts";
import type {
  InterviewConfig,
  InterviewPlan,
  PlanSection,
  SectionKind,
} from "./schema";

function pick<T>(arr: T[]): T | null {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

async function randomProblem(): Promise<PlanSection | null> {
  const solved = await db
    .select({ id: problemStatus.problemId })
    .from(problemStatus)
    .where(eq(problemStatus.status, "solved"));
  const solvedSession = await db
    .select({ id: solveSessions.problemId })
    .from(solveSessions)
    .where(eq(solveSessions.solved, true));
  const exclude = [
    ...solved.map((s) => s.id),
    ...solvedSession.map((s) => s.id),
  ];
  const [p] = await db
    .select()
    .from(problems)
    .where(exclude.length ? notInArray(problems.id, exclude) : undefined)
    .orderBy(sql`random()`)
    .limit(1);
  if (!p) return null;
  return {
    kind: "coding",
    ref: p.id,
    label: `Coding — ${p.title}`,
    brief: `${p.title} (${p.difficulty}, ${p.topic}). Have the candidate state the brute force + Big-O, then the optimal approach and its complexity, out loud. They do NOT need to write code — this is the talk-through. Optimal: ${p.optimalComplexity ?? "unknown"}.`,
  };
}

async function randomChallenge(): Promise<PlanSection | null> {
  const [c] = await db
    .select()
    .from(challenges)
    .orderBy(sql`random()`)
    .limit(1);
  if (!c) return null;
  return {
    kind: "challenge",
    ref: c.id,
    label: `Practical — ${c.title}`,
    brief: `${c.title} (${c.kind}). ${c.prompt} Probe how they'd structure it, the tricky cases (${(c.requirements ?? []).slice(0, 3).join("; ")}), and trade-offs. No coding — design it aloud.`,
  };
}

function randomDesign(): PlanSection {
  const d = pick(DESIGN_PROMPTS)!;
  return {
    kind: "system-design",
    ref: d.title,
    label: `System design — ${d.title.replace(/^Design (a |an )?/, "")}`,
    brief: `${d.prompt} Drive them through requirements, scale estimates, data model, one deep dive, and trade-offs.`,
  };
}

function roleSection(kind: "behavioral" | "concepts", config: InterviewConfig): PlanSection {
  return kind === "behavioral"
    ? {
        kind,
        ref: null,
        label: "Behavioral",
        brief: `Ask 2-3 behavioral questions calibrated to a ${config.seniority} ${config.role}: ownership, conflict, a hard technical decision, dealing with ambiguity. Push for specifics (situation, what they did, outcome).`,
      }
    : {
        kind,
        ref: null,
        label: "Role concepts",
        brief: `Ask 2-4 role-specific conceptual questions for a ${config.seniority} ${config.role} — the kind a real interviewer for that exact role asks. Not coding: explanations, trade-offs, "how would you decide between X and Y". Adapt to their answers.`,
      };
}

export async function buildPlan(config: InterviewConfig): Promise<InterviewPlan> {
  const sections: PlanSection[] = [];
  for (const kind of config.sections as SectionKind[]) {
    if (kind === "coding") {
      const s = await randomProblem();
      if (s) sections.push(s);
    } else if (kind === "challenge") {
      const s = await randomChallenge();
      if (s) sections.push(s);
    } else if (kind === "system-design") {
      sections.push(randomDesign());
    } else if (kind === "behavioral" || kind === "concepts") {
      sections.push(roleSection(kind, config));
    }
  }
  if (!sections.length) {
    sections.push(roleSection("concepts", config));
  }
  return { sections };
}
