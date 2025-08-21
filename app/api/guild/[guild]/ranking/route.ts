import { NextRequest, NextResponse } from "next/server";
import { getGuildRankingFromDb } from "@/lib/indexer";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { guild: string } }) {
  const { searchParams } = new URL(req.url);
  const top = Number(searchParams.get("top") || 100);
  const guild = decodeURIComponent(params.guild);

  try {
    const members = await getGuildRankingFromDb(guild, top);
    return NextResponse.json({ 
      guild, 
      top, 
      sampledPages: 0, 
      members, 
      sourceUrl: "DB", 
      generatedAt: new Date().toISOString() 
    });
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to fetch guild ranking",
      guild,
      members: [] 
    }, { status: 500 });
  }
}
