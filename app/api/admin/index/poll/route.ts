import { NextRequest, NextResponse } from "next/server";
import { pollLatestPages, processNewPosts } from "@/lib/indexer";

export const runtime = "nodejs";

function msToSec(ms: number) {
  return Math.round((ms / 1000) * 10) / 10; // 1 decimal
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pages = Number(searchParams.get("pages") || 3);
    const fallbackPages = Number(searchParams.get("fallbackPages") || 2);
    const startPage = Number(searchParams.get("startPage") || 1);
    const guildFilter = (searchParams.get("guild") || process.env.GUILD_FILTER || "항마압축파").toString();

    const { ids, timings } = await pollLatestPages(pages, fallbackPages, startPage);
    const t0 = Date.now();
    const summary = await processNewPosts(ids, guildFilter);
    const processMs = Date.now() - t0;

    const lines = timings.map((t: any) => `page ${t.page}: ${t.usedFallback ? 'fallback' : 'static'} · ${t.idsFound} ids · ${msToSec(t.fetchMs)}s`);
    const totalFetchMs = timings.reduce((a: number, b: any) => a + b.fetchMs, 0);

    return NextResponse.json({
      startPage,
      pages,
      fallbackPages,
      guildFilter,
      pagesSummary: lines,
      fetchTotalSec: msToSec(totalFetchMs),
      queued: ids.length,
      process: { ...summary, processSec: msToSec(processMs) }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "INTERNAL_ERROR" }, { status: 500 });
  }
}
