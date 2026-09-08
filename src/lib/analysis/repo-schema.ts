import { z } from "zod";

export const repoReviewSchema = z.object({
  summary: z.string(), // what this project is, in 1-2 sentences
  stack: z.array(z.string()), // detected languages / frameworks / notable libs
  scores: z.object({
    architecture: z.number().min(0).max(10),
    codeQuality: z.number().min(0).max(10),
    testing: z.number().min(0).max(10),
    documentation: z.number().min(0).max(10),
    security: z.number().min(0).max(10),
  }),
  overall: z.number().min(0).max(10),
  strengths: z.array(z.string()),
  risks: z.array(
    z.object({
      severity: z.enum(["high", "med", "low"]),
      file: z.string().nullable().optional(),
      note: z.string(),
    }),
  ),
  quickWins: z.array(z.string()), // highest-leverage improvements, ordered
  interviewerTake: z.string(), // "if this were your take-home submission…"
});
export type RepoReview = z.infer<typeof repoReviewSchema>;

export type RepoInput = {
  tree: string[]; // relative paths, capped
  files: { path: string; content: string }[]; // selected file contents, capped
  note?: string | null; // optional: what the user wants scrutinised
};
