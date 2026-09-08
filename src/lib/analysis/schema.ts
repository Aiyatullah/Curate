import { z } from "zod";

/**
 * The structured verdict returned by the analysis engine. Both the problem-based
 * solve flow and the standalone /analyze page render this same shape.
 */
export const analysisResultSchema = z.object({
  scores: z.object({
    correctness: z.number().min(0).max(10),
    complexity: z.number().min(0).max(10),
    codeQuality: z.number().min(0).max(10),
    interviewReadiness: z.number().min(0).max(10),
  }),
  detectedComplexity: z.object({
    time: z.string(),
    space: z.string(),
  }),
  claimedVsActual: z.string(), // compares what the user claimed vs. what the code is
  thinkingReview: z.object({
    good: z.array(z.string()),
    gaps: z.array(z.string()),
  }),
  codeIssues: z.array(
    z.object({
      severity: z.enum(["high", "med", "low"]),
      line: z.number().nullable().optional(),
      note: z.string(),
    }),
  ),
  whatsLacking: z.array(z.string()),
  howToThinkNextTime: z.array(z.string()),
  readinessVerdict: z.string(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export type AnalyzeInput = {
  language: string;
  code: string;
  intent?: string | null;
  problem?: {
    title: string;
    difficulty: string;
    topic: string;
    optimalComplexity?: string | null;
    patternTags?: string[] | null;
    leetcodeUrl?: string;
  } | null;
  journal?: {
    firstThought?: string | null;
    bruteForceIdea?: string | null;
    bruteForceBigO?: string | null;
    whyItWorks?: string | null;
  } | null;
};
