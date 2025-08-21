import { getDb } from "@/lib/db";

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function snapshotDailyStats(guildFilter?: string) {
  const db = getDb();
  // 1) Load authors (optionally filtered by guild)
  const authorsRes = guildFilter
    ? await db
        .from("authors")
        .select("author_key, combat_power")
        .ilike("guild", `%${guildFilter}%`)
    : await db.from("authors").select("author_key, combat_power");
  const authors = authorsRes.data || [];
  if (authors.length === 0) return { inserted: 0 };

  // 2) Load yesterday snapshot for these authors
  const keys = authors.map((a) => a.author_key);
  const yday = yesterdayStr();
  const prevRes = await db
    .from("author_stats_daily")
    .select("author_key, combat_power")
    .in("author_key", keys)
    .eq("date", yday);
  const prevMap = new Map<string, number>((prevRes.data || []).map((r: any) => [r.author_key, r.combat_power]));

  // 3) Upsert today snapshot with delta
  const today = todayStr();
  const rows = authors.map((a: any) => ({
    author_key: a.author_key,
    date: today,
    combat_power: a.combat_power ?? 0,
    delta: (a.combat_power ?? 0) - (prevMap.get(a.author_key) ?? 0),
    snapshot_at: new Date().toISOString(),
  }));
  // Supabase upsert on PK(author_key,date)
  await db.from("author_stats_daily").upsert(rows);
  return { inserted: rows.length };
}

export async function getRankingWithDelta(guildFilter: string, top = 100) {
  const db = getDb();
  const today = todayStr();
  const { data: authors } = await db
    .from("authors")
    .select("author_key, server, nickname, job, level, combat_power, guild, adventure_name, adventure_level, avatar_url")
    .ilike("guild", `%${guildFilter}%`)
    .order("combat_power", { ascending: false })
    .limit(top);

  const keys = (authors || []).map((a: any) => a.author_key);
  const { data: stats } = await db
    .from("author_stats_daily")
    .select("author_key, combat_power, delta")
    .in("author_key", keys)
    .eq("date", today);
  const statMap = new Map<string, { cp: number; delta: number }>((stats || []).map((s: any) => [s.author_key, { cp: s.combat_power ?? 0, delta: s.delta ?? 0 }]));

  return (authors || []).map((r: any, idx: number) => ({
    rank: idx + 1,
    nickname: r.nickname,
    level: r.level ?? undefined,
    combatPower: r.combat_power ?? undefined,
    delta: statMap.get(r.author_key)?.delta ?? 0,
    job: r.job ?? undefined,
    server: r.server ?? undefined,
    avatarUrl: r.avatar_url ?? undefined,
    adventureName: r.adventure_name ?? undefined,
    adventureLevel: r.adventure_level ?? undefined,
  }));
}
