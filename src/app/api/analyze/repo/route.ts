import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { analysisSessions } from "@/lib/db/schema";
import { reviewRepo } from "@/lib/analysis/repo-review";
import type { RepoInput } from "@/lib/analysis/repo-schema";

const MAX_FILES = 25;
const MAX_TOTAL_CHARS = 90_000;
const MAX_FILE_CHARS = 12_000;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | (RepoInput & { projectName?: string })
    | null;
  if (!body || !Array.isArray(body.files) || !Array.isArray(body.tree)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Defensive server-side caps — the client already trims, but never trust it.
  let total = 0;
  const files = [];
  for (const f of body.files) {
    if (files.length >= MAX_FILES || total >= MAX_TOTAL_CHARS) break;
    if (typeof f?.path !== "string" || typeof f?.content !== "string") continue;
    const content = f.content.slice(0, MAX_FILE_CHARS);
    total += content.length;
    files.push({ path: f.path, content });
  }

  const result = await reviewRepo({
    tree: body.tree.filter((p): p is string => typeof p === "string").slice(0, 400),
    files,
    note: typeof body.note === "string" ? body.note.slice(0, 2000) : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  await db.insert(analysisSessions).values({
    language: "repo",
    intent: `Repo review: ${body.projectName ?? "project"} (${files.length} files)`,
    code: files.map((f) => `// ${f.path}\n${f.content}`).join("\n\n").slice(0, 100_000),
    analysis: null,
  });

  return NextResponse.json({ review: result.review });
}
