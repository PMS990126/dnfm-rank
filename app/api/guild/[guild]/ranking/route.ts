import { NextRequest, NextResponse } from "next/server";
import { buildGuildSnapshot } from "@/lib/ranking";
import { getGuildRankingFromDb, pollLatestPages, processNewPosts } from "@/lib/indexer";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { guild: string } }) {
  const { searchParams } = new URL(req.url);
  const top = Number(searchParams.get("top") || 100);
  const pages = Number(searchParams.get("pages") || 12);
  const debug = searchParams.get("debug") === "1" || searchParams.get("debug") === "true";
  const timeBudgetMs = Number(searchParams.get("budget") || 8000);
  const useFallbackMaxPages = Number(searchParams.get("fallbackPages") || 2);
  const guild = decodeURIComponent(params.guild);

  // 1) Read from DB first
  try {
    const members = await getGuildRankingFromDb(guild, top);
    if (members.length > 0 && !debug) {
      return NextResponse.json({ guild, top, sampledPages: 0, members, sourceUrl: "DB", generatedAt: new Date().toISOString() });
    }
    if (members.length > 0 && debug) {
      return NextResponse.json({ guild, top, sampledPages: 0, members, sourceUrl: "DB", generatedAt: new Date().toISOString(), debug: { from: "db" } });
    }
  } catch {}

  // 2) Optional: in debug mode, kick a small poll to seed DB
  if (debug) {
    const ids = await pollLatestPages(Math.min(3, pages), useFallbackMaxPages);
    await processNewPosts(ids);
  }

  // 3) Fallback to slow path (legacy) in debug only
  const data = await buildGuildSnapshot({ top, pages, guildFilter: guild, debug, timeBudgetMs, useFallbackMaxPages });
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
