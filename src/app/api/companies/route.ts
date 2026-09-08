import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { companies } from "@/lib/db/schema";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const { action } = (b ?? {}) as { action?: string };
  try {
    if (action === "create") {
      if (!b.name?.trim())
        return NextResponse.json({ error: "Name required" }, { status: 400 });
      const slug = slugify(b.name);
      await db
        .insert(companies)
        .values({
          slug,
          name: b.name.trim(),
          tags: Array.isArray(b.tags) ? b.tags : [],
          focusAreas: Array.isArray(b.focusAreas) ? b.focusAreas : [],
          priority: Number(b.priority) || 3,
        })
        .onConflictDoNothing({ target: companies.slug });
      return NextResponse.json({ ok: true, slug });
    }
    if (action === "update") {
      await db
        .update(companies)
        .set({
          priority: b.priority != null ? Number(b.priority) : undefined,
          targetDate: b.targetDate || null,
          notes: b.notes ?? undefined,
          focusAreas: Array.isArray(b.focusAreas) ? b.focusAreas : undefined,
          archived: typeof b.archived === "boolean" ? b.archived : undefined,
        })
        .where(eq(companies.slug, b.slug));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[/api/companies]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
