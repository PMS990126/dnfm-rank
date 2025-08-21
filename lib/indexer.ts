import * as cheerio from "cheerio";
import { getDb } from "@/lib/db";
import { scrapePost, scrapeProfileByUserId } from "@/lib/scraper";
import { renderHtml } from "@/lib/browser";

const LIST_URL = "https://dnfm.nexon.com/Community/Free";
const DEFAULT_GUILD_FILTER = (process.env.GUILD_FILTER || "항마압축파").toLowerCase();
const RECHECK_COOLDOWN_MIN = Number(process.env.RECHECK_COOLDOWN_MIN || 1440); // 24h
const PROFILE_RECHECK_MIN = Number(process.env.PROFILE_RECHECK_MIN || 1440);

function authorKey(server: string, nickname: string) {
	return `${server}:${nickname}`.toLowerCase();
}

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
	$("a").each((_, el) => {
		const href = ($(el).attr("href") || "").trim();
		const m = href.match(/\/Community\/Free\/(?:View|Detail)\/(\d+)/);
		if (m) ids.add(m[1]);
	});
	for (const m of html.matchAll(reUrl)) if (m[1]) ids.add(m[1]);
	return Array.from(ids);
}

async function recentlyChecked(postId: string) {
	const db = getDb();
	const cutoff = new Date(Date.now() - RECHECK_COOLDOWN_MIN * 60 * 1000).toISOString();
	const { data } = await db
		.from("posts_checked")
		.select("post_id, checked_at")
		.eq("post_id", String(postId))
		.gt("checked_at", cutoff)
		.maybeSingle();
	return !!data;
}

async function markChecked(postId: string, status: "matched" | "not_matched") {
	const db = getDb();
	await db.from("posts_checked").upsert({ post_id: String(postId), status, checked_at: new Date().toISOString() });
}

export async function upsertAuthorFromPost(postId: string, guildFilter: string = DEFAULT_GUILD_FILTER) {
	const data = await scrapePost(String(postId));
	const p = data.profile;
	if (!p.guild || !p.nickname || !p.server) {
		await markChecked(String(postId), "not_matched");
		return false;
	}
	if (!p.guild.toLowerCase().includes(guildFilter.toLowerCase())) {
		await markChecked(String(postId), "not_matched");
		return false;
	}
	const key = authorKey(p.server, p.nickname);
	const db = getDb();
	await db.from("authors").upsert({
		author_key: key,
		server: p.server,
		nickname: p.nickname,
		job: p.job,
		level: p.level,
		combat_power: p.combatPower,
		guild: p.guild,
		adventure_name: p.adventureName,
		adventure_level: p.adventureLevel,
		avatar_url: p.avatarUrl,
		last_post_id: String(postId),
		updated_at: new Date().toISOString(),
	});
	await markChecked(String(postId), "matched");
	return true;
}

export type ProcessSummary = { processed: number; matched: number; notMatched: number };

export async function processNewPosts(ids: string[], guildFilter: string = DEFAULT_GUILD_FILTER): Promise<ProcessSummary> {
	let processed = 0;
	let matched = 0;
	let notMatched = 0;
	for (const id of ids) {
		try {
			const ok = await upsertAuthorFromPost(id, guildFilter);
			processed++;
			if (ok) matched++; else notMatched++;
		} catch {
			// on error, mark as not_matched to avoid tight retry loops
			await markChecked(String(id), "not_matched");
			processed++;
			notMatched++;
		}
	}
	return { processed, matched, notMatched };
}

// Profile ID scanning
async function profileRecentlyChecked(userId: string) {
	const db = getDb();
	const cutoff = new Date(Date.now() - PROFILE_RECHECK_MIN * 60 * 1000).toISOString();
	const { data } = await db
		.from("profiles_checked")
		.select("user_id, checked_at")
		.eq("user_id", String(userId))
		.gt("checked_at", cutoff)
		.maybeSingle();
	return !!data;
}

async function markProfileChecked(userId: string, status: "matched" | "not_found") {
	const db = getDb();
	await db.from("profiles_checked").upsert({ user_id: String(userId), status, checked_at: new Date().toISOString() });
}

export async function scanProfileRange(startId: number, count: number, guildFilter: string = DEFAULT_GUILD_FILTER) {
	const matchedAuthors: string[] = [];
	for (let i = 0; i < count; i++) {
		const id = String(startId + i);
		if (await profileRecentlyChecked(id)) continue; // only skips previously matched profiles
		try {
			const res = await scrapeProfileByUserId(id);
			if (!res.exists) {
				continue;
			}
			const profile = res.profile as any;
			{
				const key = profile?.server && profile?.nickname ? authorKey(profile.server, profile.nickname) : `user:${id}`;
				const db = getDb();
				await db.from("authors").upsert({
					author_key: key,
					server: profile?.server ?? null,
					nickname: profile?.nickname ?? null,
					job: profile?.job ?? null,
					level: profile?.level ?? null,
					combat_power: profile?.combatPower ?? null,
					guild: profile?.guild ?? null,
					adventure_name: profile?.adventureName ?? null,
					adventure_level: profile?.adventureLevel ?? null,
					avatar_url: profile?.avatarUrl ?? null,
					updated_at: new Date().toISOString(),
				});
				await markProfileChecked(id, "matched");
				matchedAuthors.push(key);
			}
		} catch {
			// swallow and continue; no recording for non-matches
		}
	}
	return { startId, scanned: count, matched: matchedAuthors.length };
}

export async function scanProfileRangeDebug(startId: number, count: number, guildFilter: string = DEFAULT_GUILD_FILTER) {
	const details: { id: string; exists: boolean; matched: boolean; guild?: string; nickname?: string; usedFallback?: boolean; ms: number }[] = [];
	let matched = 0;
	const t0 = Date.now();
	for (let i = 0; i < count; i++) {
		const id = String(startId + i);
		const s0 = Date.now();
		let exists = false;
		let isMatched = false;
		let guild: string | undefined;
		let nickname: string | undefined;
		let usedFallback: boolean | undefined;
		try {
			const res = await scrapeProfileByUserId(id);
			exists = !!res.exists;
			if (res.exists && res.profile) {
				guild = res.profile.guild;
				nickname = res.profile.nickname;
				usedFallback = res.usedFallback;
				if (res.profile.server && res.profile.nickname) {
					isMatched = true;
					const key = authorKey(res.profile.server, res.profile.nickname);
					const db = getDb();
					await db.from("authors").upsert({
						author_key: key,
						server: res.profile.server,
						nickname: res.profile.nickname,
						job: res.profile.job,
						level: res.profile.level,
						combat_power: res.profile.combatPower,
						guild: res.profile.guild,
						adventure_name: res.profile.adventureName,
						adventure_level: res.profile.adventureLevel,
						avatar_url: res.profile.avatarUrl,
						updated_at: new Date().toISOString(),
					});
					await markProfileChecked(id, "matched");
					matched++;
				}
			}
		} catch {}
		details.push({ id, exists, matched: isMatched, guild, nickname, usedFallback, ms: Date.now() - s0 });
	}
	return { startId, scanned: count, matched, totalSec: Math.round((Date.now() - t0) / 100) / 10, details };
}

export async function getGuildRankingFromDb(guildFilter: string, top = 100) {
	const db = getDb();
	const { data } = await db
		.from("authors")
		.select("server, nickname, job, level, combat_power, guild, adventure_name, adventure_level, avatar_url, previous_combat_power, combat_power_delta, last_checked_at")
		.ilike("guild", `%${guildFilter}%`)
		.order("combat_power", { ascending: false })
		.limit(top);
	return (data || []).map((r, idx) => ({
		rank: idx + 1,
		nickname: r.nickname,
		level: r.level ?? undefined,
		combatPower: r.combat_power ?? undefined,
		job: r.job ?? undefined,
		server: r.server ?? undefined,
		avatarUrl: r.avatar_url ?? undefined,
		adventureName: r.adventure_name ?? undefined,
		adventureLevel: r.adventure_level ?? undefined,
		previousCombatPower: r.previous_combat_power ?? undefined,
		combatPowerDelta: r.combat_power_delta ?? 0,
		lastCheckedAt: r.last_checked_at ?? undefined,
	}));
}
