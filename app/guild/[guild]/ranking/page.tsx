import React from "react";
import { buildGuildSnapshot } from "@/lib/ranking";
import Title from "@/components/Title";
import Badge from "@/components/Badge";
import { Badge as BadgeType } from "@/types/guild";
import { getDb } from "@/lib/db";

// 데이터베이스에서 칭호와 뱃지 데이터 가져오기
async function getUserTitlesAndBadges() {
  const db = getDb();
  
  try {
    // 칭호 데이터 가져오기
    const { data: titles, error: titlesError } = await db
      .from('user_titles')
      .select('author_key, title');
    
    if (titlesError) {
      console.error('Error fetching titles:', titlesError);
      return { titleMap: new Map(), badgeMap: new Map() };
    }
    
    // 뱃지 데이터 가져오기
    const { data: badges, error: badgesError } = await db
      .from('user_badges')
      .select(`
        author_key,
        badge_id,
        earned_at,
        earned_condition,
        badge_definitions!inner (
          id,
          name,
          description,
          icon_url,
          rarity
        )
      `);
    
    if (badgesError) {
      console.error('Error fetching badges:', badgesError);
      return { titleMap: new Map(), badgeMap: new Map() };
    }
    
    // 데이터 매핑
    const titleMap = new Map();
    titles?.forEach(title => {
      titleMap.set(title.author_key, title.title);
    });
    
    const badgeMap = new Map();
    badges?.forEach(badge => {
      const authorKey = badge.author_key;
      if (!badgeMap.has(authorKey)) {
        badgeMap.set(authorKey, []);
      }
      badgeMap.get(authorKey).push({
        id: (badge.badge_definitions as any)?.id,
        name: (badge.badge_definitions as any)?.name,
        description: (badge.badge_definitions as any)?.description,
        iconUrl: (badge.badge_definitions as any)?.icon_url,
        rarity: (badge.badge_definitions as any)?.rarity,
        earnedAt: badge.earned_at,
        earnedCondition: badge.earned_condition
      });
    });
    
    console.log('DB에서 가져온 칭호 데이터:', Array.from(titleMap.entries()));
    console.log('DB에서 가져온 뱃지 데이터:', Array.from(badgeMap.entries()));
    
    return { titleMap, badgeMap };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return { titleMap: new Map(), badgeMap: new Map() };
  }
}

export default async function GuildRankingPage({ params }: { params: { guild: string } }) {
  const guild = decodeURIComponent(params.guild);
  const data = await buildGuildSnapshot({ guildFilter: guild });
  
  // 칭호와 뱃지 데이터 가져오기
  const { titleMap, badgeMap } = await getUserTitlesAndBadges();
  
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">{guild} 길드원 랭킹</h1>
      <ul className="divide-y divide-slate-800 rounded-md overflow-hidden bg-slate-900/40">
        {data.members.map((m: any) => {
          const authorKey = `${m.server}:${m.nickname}`.toLowerCase();
          const title = titleMap.get(authorKey);
          const badges = badgeMap.get(authorKey) || [];
          
          console.log(`${m.nickname} 매칭 확인:`, {
            authorKey,
            title,
            badgeCount: badges.length,
            hasTitle: titleMap.has(authorKey),
            hasBadges: badgeMap.has(authorKey)
          });
          
          return (
            <li key={m.nickname + m.server} className="flex items-start gap-3 p-4">
              {/* 프로필 이미지와 레벨 */}
              <div className="flex flex-col items-center flex-none">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex-none mb-1" />
                <span className="text-xs text-slate-400">Lv.{m.level}</span>
              </div>
              
              {/* 메인 정보 */}
              <div className="flex-1 min-w-0">
                {/* 칭호와 뱃지 행 */}
                {(title || badges.length > 0) && (
                  <div className="flex items-center gap-2 mb-2">
                    {title && <Title title={title} />}
                    <div className="flex gap-1">
                      {badges.map((badge: BadgeType) => (
                        <Badge key={badge.id} badge={badge} />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 기본 정보 행 */}
                <div className="flex items-center gap-2 text-sm mb-2">
                  <span className="text-slate-300 font-medium">#{m.rank}</span>
                  <span className="font-medium truncate">{m.nickname}</span>
                  <span className="text-slate-400">{m.server}</span>
                </div>
                
                {/* 직업과 항마력 행 */}
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="bg-slate-800 px-2 py-0.5 rounded">{m.job}</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded">항마력 {m.combatPower?.toLocaleString?.() ?? m.combatPower}</span>
                  {m.adventureName && (
                    <span className="bg-slate-800 px-2 py-0.5 rounded">모험단 {m.adventureName} Lv.{m.adventureLevel}</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-500">샘플 페이지 수: {data.sampledPages} · 생성 {new Date(data.generatedAt).toLocaleString()}</p>
    </div>
  );
}