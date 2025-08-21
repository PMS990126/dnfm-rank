import { NextRequest, NextResponse } from "next/server";
import { scanProfileRange, scanProfileRangeDebug } from "@/lib/indexer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startId = Number(searchParams.get("start") || 0);
  const count = Number(searchParams.get("count") || 100);
  const debug = searchParams.get("debug") === "1" || searchParams.get("debug") === "true";
  const guildFilter = (searchParams.get("guild") || process.env.GUILD_FILTER || "항마압축파").toString().toLowerCase();
  const data = debug
    ? await scanProfileRangeDebug(startId, count, guildFilter)
    : await scanProfileRange(startId, count, guildFilter);
  return NextResponse.json(data);
}
