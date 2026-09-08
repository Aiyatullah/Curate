import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { resumeItems } from "@/lib/db/schema";

const KINDS = ["project", "oss", "blog", "application", "referral"];

export async function GET() {
  const rows = await db
    .select()
    .from(resumeItems)
    .orderBy(desc(resumeItems.createdAt));
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const { action } = (b ?? {}) as { action?: string };
  try {
    if (action === "create") {
      if (!KINDS.includes(b.kind) || !b.title?.trim())
        return NextResponse.json({ error: "Bad input" }, { status: 400 });
      const [row] = await db
        .insert(resumeItems)
        .values({
          kind: b.kind,
          title: b.title.trim(),
          url: b.url?.trim() || null,
          status: b.status?.trim() || null,
          company: b.company?.trim() || null,
          notes: b.notes?.trim() || null,
          happenedOn: b.happenedOn || null,
        })
        .returning();
      return NextResponse.json({ item: row });
    }
    if (action === "update") {
      await db
        .update(resumeItems)
        .set({
          title: b.title?.trim(),
          url: b.url?.trim() || null,
          status: b.status?.trim() || null,
          company: b.company?.trim() || null,
          notes: b.notes?.trim() || null,
        })
        .where(eq(resumeItems.id, b.id));
      return NextResponse.json({ ok: true });
    }
    if (action === "delete") {
      await db.delete(resumeItems).where(eq(resumeItems.id, b.id));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[/api/resume]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
