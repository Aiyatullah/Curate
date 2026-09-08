import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { analysisSessions } from "@/lib/db/schema";
import { analyze } from "@/lib/analysis/engine";

/** Standalone "paste code & analyze" — no problem attached. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { language, code, intent } = (body ?? {}) as {
    language?: string;
    code?: string;
    intent?: string;
  };

  if (!code?.trim()) {
    return NextResponse.json({ error: "Paste some code first." }, { status: 400 });
  }

  const result = await analyze({
    language: language ?? "python",
    code,
    intent: intent ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const [row] = await db
    .insert(analysisSessions)
    .values({
      language: language ?? "python",
      code,
      intent: intent ?? null,
      analysis: result.result,
    })
    .returning({ id: analysisSessions.id });

  return NextResponse.json({ id: row.id, analysis: result.result });
}
