import { z } from "zod";

export const mentorBriefSchema = z.object({
  greeting: z.string(), // "Welcome back. You struggle with Graphs."
  focus: z.string(), // the single thing to work on today
  todaysMove: z.object({
    kind: z.enum(["problem", "challenge", "system-design", "interview", "revise"]),
    ref: z.string().nullable(), // a problem/challenge id, or null
    label: z.string(), // "Solve: Number of Islands"
    why: z.string(),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  encouragement: z.string(),
});
export type MentorBrief = z.infer<typeof mentorBriefSchema>;
