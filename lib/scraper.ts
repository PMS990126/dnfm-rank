import got from "got";
import * as cheerio from "cheerio";
import { PostData, PostProfile } from "@/types/post";
import { renderHtml, renderProfileData } from "@/lib/browser";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function fixMojibake(input?: string): string | undefined {
  if (!input) return input;
  const hasHangul = /[가-힣]/.test(input);
  const looksMojibake = /[ÃÂÍÎÏìíë]/.test(input);
  if (!hasHangul && looksMojibake) {
    try {
      return Buffer.from(input, "latin1").toString("utf8").trim();
    } catch {
      return input;
    }
  }
  return input;
}

export async function fetchHtml(url: string): Promise<string> {
  const res = await got(url, {
    headers: {
      "user-agent": UA,
      "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
      referer: "https://dnfm.nexon.com/Community/Free",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
    timeout: { request: 8000 },
    retry: { limit: 1 },
  });
  return res.body;
}

function findProfileContainer($: cheerio.CheerioAPI) {
  const labelNode = $('*:contains("대표 캐릭터")').filter(function () {
    return $(this).children().length === 0;
  }).first();
  if (labelNode.length) {
    const area = labelNode.closest('section, .wrap, .view, .view_wrap, .character_info, .profile, .writer_info, .tit_character');
    if (area.length) return area;
    return labelNode.parent();
  }
  const candidates = [
    ".tit_character",
    ".represent_character, .rep_character",
    ".character_info",
    ".writer_info",
    ".user-info",
  ];
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length) return el.closest("section, .wrap, .box, .view, body");
  }
  return $("body");
}

function parseIntSafe(s: string | undefined, def = 0): number {
  if (!s) return def;
  const n = parseInt(s.replace(/,/g, "").trim(), 10);
  return Number.isFinite(n) ? n : def;
}

function extractByLabel(container: cheerio.Cheerio<any>, label: string) {
  const fromDl = container.find(`dt:contains("${label}")`).next("dd").first().text().trim();
  if (fromDl) return fromDl;
  const text = container.text();
  const re = new RegExp(label.replace(/([.*+?^${}()|[\]\\])/g, "\\$1") + "\s*[:：]?\s*([^|\n]+)");
  const m = text.match(re);
  return m?.[1]?.trim() ?? "";
}

export function parseProfileFromDom($: cheerio.CheerioAPI) {
  const container = findProfileContainer($);
  const textAll = $.root().text().replace(/\s+/g, " ").trim();

  let nickname = container.find(".tit_character .name, .tit_character strong, .nickname, .name").first().text().trim();
  if (!nickname) {
    const m = textAll.match(/Lv\.?\s*\d+\s+([^\s|\n]+)/);
    if (m) nickname = m[1];
    const m2 = textAll.match(/([^\s]+)\s*님(?:의|)/);
    if (!nickname && m2) nickname = m2[1];
  }

  let avatarUrl = container.find("img").first().attr("src") || undefined;

  const level = parseIntSafe(textAll.match(/Lv\.?\s*(\d{1,3})/)?.[1]);
  let server = extractByLabel(container, "서버");
  let job = extractByLabel(container, "직업");
  let combatPower = parseIntSafe(extractByLabel(container, "항마력"));
  let guild = extractByLabel(container, "길드");
  let adventureName = extractByLabel(container, "모험단명") || undefined;
  const advLvStr = extractByLabel(container, "모험단 레벨");
  let adventureLevel = parseIntSafe(advLvStr.match(/(\d+)/)?.[1]);

  if (!server) server = (textAll.match(/서버\s*[:：]?\s*([^|\s]+)/)?.[1] || "").trim();
  if (!job) job = (textAll.match(/직업\s*[:：]?\s*([^|\n]+)/)?.[1] || "").trim();
  if (!combatPower) combatPower = parseIntSafe((textAll.match(/항마력\s*[:：]?\s*([\d,]+)/)?.[1] || ""));
  if (!guild) guild = (textAll.match(/길드\s*[:：]?\s*([^|\s]+)/)?.[1] || "").trim();
  if (!adventureName) adventureName = (textAll.match(/모험단명\s*[:：]?\s*([^|\s]+)/)?.[1] || "").trim() || undefined;
  if (!adventureLevel) adventureLevel = parseIntSafe((textAll.match(/모험단\s*레벨\s*[:：]?\s*Lv\.?\s*(\d+)/)?.[1] || ""));

  nickname = fixMojibake(nickname) || nickname;
  server = fixMojibake(server) || server;
  job = fixMojibake(job) || job;
  guild = fixMojibake(guild) || guild;
  adventureName = fixMojibake(adventureName) || adventureName;

  return { nickname, level, server, job, combatPower, guild, adventureName, adventureLevel, avatarUrl };
}

function isProfileInsufficient(p: Partial<PostProfile>) {
  const hasAny = !!(p.nickname || p.server || p.job || (p.combatPower && p.combatPower > 0) || (p.guild && p.guild.length >= 2));
  return !hasAny;
}

export async function scrapeProfileByUserId(userId: string, opts?: { debug?: boolean }) {
  const url = `https://dnfm.nexon.com/Profile/User/${userId}`;
  if (process.env.PLAYWRIGHT_ENABLE === "false") {
    return { url, exists: false, usedFallback: false };
  }
  // Prefer DOM-evaluated structured data to avoid encoding issues
  try {
    const data = await renderProfileData(url);
    if (opts?.debug) {
      console.log('  🔍 추출 완료:', `${data.nickname || '(닉네임없음)'} - ${data.guild || '(길드없음)'}`);
    }
    const profile: PostProfile = {
      nickname: data.nickname || "",
      level: data.level || 0,
      server: data.server || "",
      job: data.job || "",
      combatPower: data.combatPower || 0,
      guild: data.guild || "",
      adventureName: data.adventureName || undefined,
      adventureLevel: data.adventureLevel || 0,
      avatarUrl: data.avatarUrl || undefined,
    };

    if (isProfileInsufficient(profile)) {
      return { url, exists: false, usedFallback: true };
    }
    return { url, exists: true, profile, usedFallback: true };
  } catch (error) {
    if (opts?.debug) {
      console.error('  ❌ 스크래핑 실패:', error.message);
    }
    return { url, exists: false, usedFallback: true };
  }
}

export async function scrapePost(postId: string, opts?: { debug?: boolean }): Promise<PostData & { debug?: any }> {
  const sourceUrl = `https://dnfm.nexon.com/Community/Free/View/${postId}`;
  let html = await fetchHtml(sourceUrl);
  const $ = cheerio.load(html);

  const title = ($("h1, .title, .post-title").first().text() || "").trim();
  let prof = parseProfileFromDom($);
  let usedFallback = false;

  if (isProfileInsufficient(prof) && process.env.PLAYWRIGHT_ENABLE !== "false") {
    try {
      html = await renderHtml(sourceUrl);
      const _$ = cheerio.load(html);
      prof = parseProfileFromDom(_$);
      usedFallback = true;
    } catch {}
  }

  const profile: PostProfile = {
    nickname: prof.nickname ?? "",
    level: prof.level ?? 0,
    server: prof.server ?? "",
    job: prof.job ?? "",
    combatPower: prof.combatPower ?? 0,
    guild: prof.guild,
    adventureName: prof.adventureName,
    adventureLevel: prof.adventureLevel,
    avatarUrl: prof.avatarUrl,
  };

  const contentHtml = ($(".content, .post_view, #content, .detail_view").first().html() || "").trim();
  const base: PostData & { debug?: any } = {
    postId,
    sourceUrl,
    title,
    profile,
    contentHtml,
    fetchedAt: new Date().toISOString(),
  };

  if (opts?.debug) {
    const profileAreaText = findProfileContainer($).text().replace(/\s+/g, " ").slice(0, 400);
    base.debug = {
      usedFallback,
      profileAreaText,
      nickname: profile.nickname,
      guild: profile.guild,
      avatar: profile.avatarUrl,
    };
  }

  return base;
}
