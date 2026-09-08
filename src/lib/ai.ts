import OpenAI from "openai";

/**
 * AI plumbing. Primary path is OpenRouter (free / auto routing). If OpenRouter
 * errors or returns unusable output, we fall back to the Anthropic API — but only
 * if ANTHROPIC_API_KEY is set.
 */

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Self Curative Learning",
  },
});

const PRIMARY_MODEL = process.env.OPENROUTER_MODEL ?? "openrouter/auto";
const FALLBACK_MODEL =
  process.env.OPENROUTER_FALLBACK_MODEL ??
  "meta-llama/llama-3.3-70b-instruct:free";

export async function chatJson(messages: ChatMessage[]): Promise<string> {
  // 1. OpenRouter primary model
  try {
    return await callOpenRouter(PRIMARY_MODEL, messages);
  } catch (err) {
    console.warn("[ai] OpenRouter primary failed:", describe(err));
  }

  // 2. OpenRouter free fallback model
  try {
    return await callOpenRouter(FALLBACK_MODEL, messages);
  } catch (err) {
    console.warn("[ai] OpenRouter fallback failed:", describe(err));
  }

  // 3. Anthropic direct (optional)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await callAnthropic(messages);
    } catch (err) {
      console.warn("[ai] Anthropic fallback failed:", describe(err));
    }
  }

  throw new Error("All AI providers failed");
}

async function callOpenRouter(
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const res = await openrouter.chat.completions.create(
    {
      model,
      messages,
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    },
    { timeout: 45_000 },
  );
  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("empty response");
  console.log(`[ai] openrouter/${model} tokens:`, res.usage?.total_tokens ?? "?");
  return content;
}

async function callAnthropic(messages: ChatMessage[]): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const rest = messages.filter((m) => m.role !== "system");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: system + "\n\nRespond with a single JSON object and nothing else.",
      messages: rest.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: { text: string }[] };
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("empty response");
  console.log(`[ai] anthropic/${model} ok`);
  return text;
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
