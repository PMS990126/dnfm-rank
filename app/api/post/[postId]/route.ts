import { NextRequest, NextResponse } from "next/server";
import { scrapePost } from "@/lib/scraper";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const debug = searchParams.get("debug") === "1" || searchParams.get("debug") === "true";
    const data = await scrapePost(params.postId, { debug });
    return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 502 });
  }
}
