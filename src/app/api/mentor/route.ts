import { NextResponse } from "next/server";
import { getOrCreateBrief } from "@/lib/mentor/brief";

export async function GET(req: Request) {
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    const brief = await getOrCreateBrief(refresh);
    return NextResponse.json({ brief });
  } catch (err) {
    console.error("[/api/mentor]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
