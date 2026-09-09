import { z } from "zod";

/** One interviewer turn during a live mock interview. */
export const interviewTurnSchema = z.object({
  mode: z.enum(["question", "wrap"]),
  message: z.string(),
});
export type InterviewTurn = z.infer<typeof interviewTurnSchema>;

/** The graded scorecard produced when an interview ends. */
export const interviewScoreSchema = z.object({
  scores: z.object({
    communication: z.number().min(0).max(10),
    clarity: z.number().min(0).max(10),
    tradeoffDiscussion: z.number().min(0).max(10),
    complexityExplanation: z.number().min(0).max(10),
  }),
  overall: z.number().min(0).max(10),
  greenFlags: z.array(z.string()),
  redFlags: z.array(z.string()),
  feedback: z.string(),
  hireVerdict: z.enum(["strong-no", "no", "lean-no", "lean-yes", "yes", "strong-yes"]),
});
export type InterviewScore = z.infer<typeof interviewScoreSchema>;

export type TranscriptEntry = { role: "interviewer" | "candidate"; text: string };

export const SECTION_KINDS = [
  "coding",
  "system-design",
  "challenge",
  "behavioral",
  "concepts",
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export type InterviewConfig = {
  role: string; // free text: "Senior Frontend Engineer at Vercel"
  seniority: "junior" | "mid" | "senior" | "staff";
  sections: SectionKind[]; // which sections to include
  surprise: boolean; // true = interviewer picks the specifics
};

export type PlanSection = {
  kind: SectionKind;
  ref: string | null; // problem id / challenge id / design prompt title
  label: string;
  brief: string; // what the interviewer should probe in this section
};
export type InterviewPlan = { sections: PlanSection[] };

export type InterviewContext = {
  problem?: {
    title: string;
    difficulty: string;
    topic: string;
    optimalComplexity?: string | null;
  } | null;
  code?: string | null;
  language?: string | null;
  journal?: {
    firstThought?: string | null;
    bruteForceIdea?: string | null;
    whyItWorks?: string | null;
  } | null;
  config?: InterviewConfig | null;
  plan?: InterviewPlan | null;
};

export const SECTION_LABEL: Record<SectionKind, string> = {
  coding: "Coding",
  "system-design": "System design",
  challenge: "Practical build",
  behavioral: "Behavioral",
  concepts: "Role concepts",
};
