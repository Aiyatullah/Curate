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
};
