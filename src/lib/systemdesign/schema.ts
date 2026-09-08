import { z } from "zod";

export const systemDesignReviewSchema = z.object({
  scores: z.object({
    requirements: z.number().min(0).max(10),
    scale: z.number().min(0).max(10),
    dataModel: z.number().min(0).max(10),
    apiDesign: z.number().min(0).max(10),
    deepDives: z.number().min(0).max(10),
    tradeoffs: z.number().min(0).max(10),
  }),
  overall: z.number().min(0).max(10),
  missed: z.array(z.string()), // "Message ordering", "Presence service"
  good: z.array(z.string()),
  followUps: z.array(z.string()), // questions an interviewer would now ask
  verdict: z.string(),
});
export type SystemDesignReview = z.infer<typeof systemDesignReviewSchema>;

export type SystemDesignInput = {
  prompt: string;
  requirements?: string | null;
  scaleEstimates?: string | null;
  dataModel?: string | null;
  apiDesign?: string | null;
  highLevelDesign?: string | null;
  deepDives?: string | null;
  tradeoffs?: string | null;
};
