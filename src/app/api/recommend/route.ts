import { NextResponse } from "next/server";
import { recommendNext, findMore } from "@/lib/progression/recommend";

/**
 * GET /api/recommend            -> next problem (revise queue > current topic > any)
 * GET /api/recommend?mode=more  -> same, but generate a fresh AI problem when the
 *                                  bank has no unsolved problem left
 */
export async function GET(req: Request) {
  const mode = new URL(req.url).searchParams.get("mode");
  try {
    const rec = mode === "more" ? await findMore() : await recommendNext();
    return NextResponse.json(rec);
  } catch (err) {
    console.error("[/api/recommend]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
