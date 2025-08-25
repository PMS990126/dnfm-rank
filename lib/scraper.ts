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
  try {
    // 환경변수로 우회 방법 선택
    const bypassMethod = process.env.SCRAPING_BYPASS_METHOD || 'default';
    
    if (bypassMethod === 'minimal') {
      // 최소한의 헤더로 시도
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
    }
    
    // 기본 방법: 완전한 브라우저 헤더
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://dnfm.nexon.com/',
        'DNT': '1',
        'Connection': 'keep-alive',
      },
      signal: AbortSignal.timeout(20000), // 20초 타임아웃
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return html;
  } catch (error) {
    // 첫 번째 시도 실패 시 더 간단한 헤더로 재시도
    try {
      console.log(`  🔄 첫 번째 시도 실패, 간단한 헤더로 재시도: ${error instanceof Error ? error.message : String(error)}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Referer': 'https://dnfm.nexon.com/',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return html;
    } catch (retryError) {
      throw new Error(`재시도 실패: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
    }
  }
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
  
  try {
    if (opts?.debug) {
      console.log(`  🔍 ${userId} 프로필 스크래핑 시작: ${url}`);
    }
    
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    
    if (opts?.debug) {
      console.log(`  🔍 HTML 가져오기 완료 (${html.length} bytes), 프로필 파싱 시작...`);
    }
    
    const profile = parseProfileFromDom($);
    
    if (opts?.debug) {
      console.log(`  🔍 추출 완료: ${profile.nickname || '(닉네임없음)'} - ${profile.guild || '(길드없음)'}`);
    }
    
    if (isProfileInsufficient(profile)) {
      if (opts?.debug) {
        console.log(`  ⚠️ 프로필 정보 부족: ${JSON.stringify(profile)}`);
      }
      return { url, exists: false, usedFallback: false };
    }
    
    return { url, exists: true, profile, usedFallback: false };
  } catch (error) {
    if (opts?.debug) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error(`  ❌ 스크래핑 실패 (${userId}):`, errorMessage);
      if (errorStack) {
        console.error(`  📍 에러 스택:`, errorStack);
      }
    }
    return { url, exists: false, usedFallback: false };
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
