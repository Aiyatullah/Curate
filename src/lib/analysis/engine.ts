import { chatJson } from "@/lib/ai";
import { buildMessages } from "./prompt";
import {
  analysisResultSchema,
  type AnalysisResult,
  type AnalyzeInput,
} from "./schema";

/**
 * Pure entry point for both the solve flow and the standalone /analyze page.
 * Never throws for "bad AI output" — returns a typed result or a fallback verdict
 * so the UI can always move on.
 */
export async function analyze(
  input: AnalyzeInput,
): Promise<{ ok: true; result: AnalysisResult } | { ok: false; error: string }> {
  if (!input.code?.trim()) {
    return { ok: false, error: "No code submitted." };
  }

  const messages = buildMessages(input);

  let raw: string;
  try {
    raw = await chatJson(messages);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "AI request failed",
    };
  }

  const parsed = safeParse(raw);
  if (!parsed) {
    // one retry with an explicit nudge
    try {
      const retry = await chatJson([
        ...messages,
        {
          role: "user",
          content:
            "Your previous reply was not valid JSON matching the schema. Reply again with ONLY the JSON object.",
        },
      ]);
      const parsedRetry = safeParse(retry);
      if (parsedRetry) return { ok: true, result: parsedRetry };
    } catch {
      /* fall through */
    }
    return { ok: false, error: "AI returned malformed analysis." };
  }

  return { ok: true, result: parsed };
}

function safeParse(raw: string): AnalysisResult | null {
  let json: unknown;
  try {
    json = JSON.parse(stripFence(raw));
  } catch {
    return null;
  }
  const result = analysisResultSchema.safeParse(json);
  return result.success ? result.data : null;
}

function stripFence(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  }
  return trimmed;
}
