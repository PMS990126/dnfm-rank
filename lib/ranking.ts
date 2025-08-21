import * as cheerio from "cheerio";
import { kv } from "@/lib/cache";
import { scrapePost } from "@/lib/scraper";
import { GuildMember, GuildRanking } from "@/types/guild";
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

function extractPostIdsFromList(html: string): string[] {
  const $ = cheerio.load(html);
  const ids = new Set<string>();
  const reUrl = /\/Community\/Free\/(?:View|Detail)\/(\d+)/g;
  const reOnclick = /\bView\s*\(\s*(\d+)\s*\)/g;
  $("a").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    const m = href.match(/\/Community\/Free\/(?:View|Detail)\/(\d+)/);
    if (m) ids.add(m[1]);
    const onclick = ($(el).attr("onclick") || "").trim();
    const mm = onclick.match(/\bView\s*\(\s*(\d+)\s*\)/);
    if (mm) ids.add(mm[1]);
  });
  for (const m of html.matchAll(reUrl)) if (m[1]) ids.add(m[1]);
  for (const m of html.matchAll(reOnclick)) if (m[1]) ids.add(m[1]);
  return Array.from(ids);
}

async function forEachWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>, shouldStop?: () => boolean) {
  for (let i = 0; i < items.length; i += concurrency) {
    if (shouldStop?.()) break;
    const slice = items.slice(i, i + concurrency);
    await Promise.all(
      slice.map((it) => (shouldStop?.() ? Promise.resolve() : worker(it)))
    );
  }
}

export async function buildGuildSnapshot(options?: {
  pages?: number;
  top?: number;
  guildFilter?: string;
  debug?: boolean;
  timeBudgetMs?: number;
  useFallbackMaxPages?: number;
}): Promise<GuildRanking & { debug?: any }> {
  const pages = options?.pages ?? 5;
  const top = options?.top ?? 100;
  const guildFilter = options?.guildFilter ?? "항마압축파";
  const debug = options?.debug ?? false;
  const timeBudgetMs = options?.timeBudgetMs ?? 8000;
  const useFallbackMaxPages = options?.useFallbackMaxPages ?? 2;
  const deadline = Date.now() + timeBudgetMs;

  const cacheKey = `guildsnap:${guildFilter}`;
  if (!debug) {
    const cached = await kv.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const postIds: string[] = [];
  const listStats: any[] = [];
  let timedOut = false;

  for (let p = 1; p <= pages; p++) {
    if (Date.now() > deadline) {
      timedOut = true;
      break;
    }
    let html = await fetchListPage(p);
    let ids = extractPostIdsFromList(html);
    let usedFallback = false;
    const allowFallback = p <= useFallbackMaxPages && process.env.PLAYWRIGHT_ENABLE !== "false";
    if ((ids.length === 0 || /로그인/.test(html)) && allowFallback) {
      try {
        html = await renderHtml(p === 1 ? LIST_URL : `${LIST_URL}?p=${p}`);
        ids = extractPostIdsFromList(html);
        usedFallback = true;
      } catch (e) {
        // ignore
      }
    }
    postIds.push(...ids);
    if (debug) {
      const hrefMatches = (html.match(/\/Community\/Free\/(?:View|Detail)\//g) || []).length;
      const onclickMatches = (html.match(/\bView\s*\(/g) || []).length;
      listStats.push({ page: p, htmlLen: html.length, idsFound: ids.length, hrefMatches, onclickMatches, hasLoginWord: /로그인/.test(html), usedFallback });
    }
  }

  const membersMap = new Map<string, GuildMember>();
  let parsed = 0;
  let matched = 0;

  await forEachWithConcurrency(
    postIds,
    6,
    async (id) => {
      if (Date.now() > deadline) return;
      try {
        const post = await scrapePost(id);
        parsed++;
        const g = (post.profile.guild || "").toLowerCase();
        if (!g.includes(guildFilter.toLowerCase())) return;
        matched++;
        const fingerprint = `${post.profile.server}:${post.profile.nickname}`.toLowerCase();
        const current = membersMap.get(fingerprint);
        const candidate: GuildMember = {
          rank: 0,
          nickname: post.profile.nickname,
          level: post.profile.level,
          combatPower: post.profile.combatPower,
          job: post.profile.job,
          server: post.profile.server,
          avatarUrl: post.profile.avatarUrl,
          adventureName: post.profile.adventureName,
          adventureLevel: post.profile.adventureLevel,
          postId: id,
        };
        if (!current || (candidate.combatPower ?? 0) > (current.combatPower ?? 0)) {
          membersMap.set(fingerprint, candidate);
        }
      } catch (e) {
        // skip
      }
    },
    () => Date.now() > deadline
  );

  const members = Array.from(membersMap.values())
    .sort((a, b) => (b.combatPower ?? 0) - (a.combatPower ?? 0) || (b.level ?? 0) - (a.level ?? 0) || a.nickname.localeCompare(b.nickname))
    .slice(0, top)
    .map((m, i) => ({ ...m, rank: i + 1 }));

  const snapshot: GuildRanking & { debug?: any } = {
    guild: guildFilter,
    server: undefined,
    top,
    sampledPages: Math.min(pages, listStats.length || pages),
    members,
    sourceUrl: LIST_URL,
    generatedAt: new Date().toISOString(),
    debug: debug
      ? {
          postIdsFound: postIds.length,
          detailedParsed: parsed,
          guildMatched: matched,
          firstIds: postIds.slice(0, 10),
          listStats,
          timedOut,
        }
      : undefined,
  };

  if (!debug) await kv.set(cacheKey, JSON.stringify(snapshot), 60 * 10);
  return snapshot;
}
