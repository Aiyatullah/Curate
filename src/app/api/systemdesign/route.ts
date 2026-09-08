import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { systemDesigns } from "@/lib/db/schema";
import { reviewSystemDesign } from "@/lib/systemdesign/review";

type Body = {
  id?: number;
  prompt: string;
  requirements?: string;
  scaleEstimates?: string;
  dataModel?: string;
  apiDesign?: string;
  highLevelDesign?: string;
  deepDives?: string;
  tradeoffs?: string;
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { action } = (body ?? {}) as { action?: string };
  try {
    if (action === "upsert") return await upsert(body);
    if (action === "review") return await review(body);
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[/api/systemdesign]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function fields(b: Body) {
  return {
    prompt: b.prompt,
    requirements: b.requirements ?? null,
    scaleEstimates: b.scaleEstimates ?? null,
    dataModel: b.dataModel ?? null,
    apiDesign: b.apiDesign ?? null,
    highLevelDesign: b.highLevelDesign ?? null,
    deepDives: b.deepDives ?? null,
    tradeoffs: b.tradeoffs ?? null,
  };
}

async function upsert(b: Body) {
  if (b.id) {
    await db.update(systemDesigns).set(fields(b)).where(eq(systemDesigns.id, b.id));
    return NextResponse.json({ id: b.id });
  }
  const [row] = await db
    .insert(systemDesigns)
    .values(fields(b))
    .returning({ id: systemDesigns.id });
  return NextResponse.json({ id: row.id });
}

async function review(b: Body) {
  const saved = await upsert(b);
  const { id } = (await saved.json()) as { id: number };
  const [d] = await db.select().from(systemDesigns).where(eq(systemDesigns.id, id));

  const result = await reviewSystemDesign({
    prompt: d.prompt,
    requirements: d.requirements,
    scaleEstimates: d.scaleEstimates,
    dataModel: d.dataModel,
    apiDesign: d.apiDesign,
    highLevelDesign: d.highLevelDesign,
    deepDives: d.deepDives,
    tradeoffs: d.tradeoffs,
  });
  if (!result.ok) return NextResponse.json({ id, error: result.error }, { status: 502 });

  await db
    .update(systemDesigns)
    .set({ review: result.review, score: Math.round(result.review.overall) })
    .where(eq(systemDesigns.id, id));
  return NextResponse.json({ id, review: result.review });
}
