import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { renderHtml } from "@/lib/browser";

const LIST_URL = "https://dnfm.nexon.com/Community/Free";

async function fetchListPage(page = 1): Promise<string> {
  const url = page === 1 ? LIST_URL : `${LIST_URL}?p=${page}`;
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
      referer: LIST_URL,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`list fetch failed: ${res.status}`);
  return await res.text();
}

function extract(html: string) {
  const $ = cheerio.load(html);
  const anchors: { href?: string; text?: string }[] = [];
  $("a").slice(0, 50).each((_, el) => {
    anchors.push({ href: $(el).attr("href"), text: $(el).text().trim().slice(0, 60) });
  });
  const ids = Array.from(html.matchAll(/\/Community\/Free\/(?:View|Detail)\/(\d+)/g)).map((m) => m[1]);
  return { anchors, ids };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const fallback = searchParams.get("fallback") === "1" || searchParams.get("fallback") === "true";

  let html = await fetchListPage(page);
  let usedFallback = false;
  if (fallback && (html.includes("로그인") || html.length < 50000) && process.env.PLAYWRIGHT_ENABLE !== "false") {
    try {
      html = await renderHtml(page === 1 ? LIST_URL : `${LIST_URL}?p=${page}`);
      usedFallback = true;
    } catch {}
  }

  const { anchors, ids } = extract(html);
  return NextResponse.json({
    page,
    htmlLen: html.length,
    usedFallback,
    anchors,
    ids: [...new Set(ids)].slice(0, 50),
  });
}
