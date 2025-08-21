import React from "react";
import { getGuildRankingFromDb } from "@/lib/indexer";
import JobAvatar from "@/components/JobAvatar";
import CombatPowerDelta from "@/components/CombatPowerDelta";

export default async function HomePage() {
  // 데이터베이스에서 직접 길드원 랭킹 가져오기
  const members = await getGuildRankingFromDb("항마압축파", 100);
  
  const data = {
    members,
    sampledPages: 0,
    generatedAt: new Date().toISOString(),
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src="/images/logo1.png" alt="Logo 1" className="h-12 w-auto" />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              항마압축파 랭킹
            </h1>
            <img src="/images/logo2.png" alt="Logo 2" className="h-12 w-auto" />
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <span>만든놈 :</span>
            <img src="/images/profile.png" alt="Profile" className="h-6 w-6 rounded-full" />
            <span className="font-medium">정신나간메짱</span>
          </div>
        </div>

        {data.members.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">😔</span>
            </div>
            <p className="text-xl text-gray-600 mb-2">등록된 길드원이 없습니다</p>
            <p className="text-gray-500">길드원 프로필 등록을 먼저 실행해주세요</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {data.members.map((m: any, index: number) => (
              <div 
                key={m.nickname + m.server} 
                className={`relative bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
                  index === 0 ? 'ring-2 ring-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50' :
                  index === 1 ? 'ring-2 ring-gray-400 bg-gradient-to-r from-gray-50 to-slate-50' :
                  index === 2 ? 'ring-2 ring-amber-600 bg-gradient-to-r from-amber-50 to-yellow-50' : ''
                }`}
              >
                {/* 순위 배지 */}
                <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg' :
                  index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg' :
                  index === 2 ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg' :
                  'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                }`}>
                  {m.rank}
                </div>

                <div className="flex items-start gap-3 xs:gap-4 sm:gap-6">
                  {/* 아바타 */}
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <JobAvatar 
                        job={m.job} 
                        size={70} 
                        className="w-[60px] h-[60px] xs:w-[70px] xs:h-[70px] sm:w-[80px] sm:h-[80px] ring-3 xs:ring-4 ring-white shadow-xl" 
                      />
                      {index < 3 && (
                        <div className="absolute -top-1 -right-1 xs:-top-2 xs:-right-2">
                          {index === 0 && <span className="text-lg xs:text-xl sm:text-2xl">👑</span>}
                          {index === 1 && <span className="text-lg xs:text-xl sm:text-2xl">🥈</span>}
                          {index === 2 && <span className="text-lg xs:text-xl sm:text-2xl">🥉</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 메인 정보 */}
                  <div className="flex-1 min-w-0">
                    {/* 닉네임 + 레벨 */}
                    <div className="flex items-center gap-2 xs:gap-3 mb-1.5 xs:mb-2">
                      <h3 className="text-lg xs:text-xl sm:text-2xl font-black text-gray-900 truncate min-w-0 flex-1">
                        {m.nickname}
                      </h3>
                      <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 xs:px-3 py-1 rounded-full text-xs xs:text-sm font-bold shadow-sm flex-shrink-0">
                        Lv.{m.level}
                      </span>
                    </div>

                    {/* 직업 + 항마력 */}
                    <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 mb-1.5 xs:mb-2 flex-wrap">
                      <span className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 px-2 xs:px-3 py-1 xs:py-1.5 rounded-full text-xs xs:text-sm sm:text-base font-semibold">
                        {m.job}
                      </span>
                      <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-2 xs:px-3 py-1 xs:py-1.5 rounded-full text-xs xs:text-sm sm:text-base font-bold">
                        ⚔️ {m.combatPower?.toLocaleString?.() ?? m.combatPower}
                      </span>
                    </div>

                    {/* 서버 + 모험단 */}
                    <div className="flex items-center gap-1.5 xs:gap-2 flex-wrap">
                      <span className="bg-purple-100 text-purple-700 px-2 xs:px-3 py-1 rounded-full text-xs xs:text-sm font-medium">
                        📍 {m.server}
                      </span>
                      {m.adventureName && (
                        <span className="bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 px-2 xs:px-3 py-1 rounded-full text-xs xs:text-sm font-medium truncate max-w-[140px] xs:max-w-none" title={`${m.adventureName} Lv.${m.adventureLevel}`}>
                          🏰 {m.adventureName} Lv.{m.adventureLevel}
                        </span>
                      )}
                    </div>

                    {/* 항마력 변동 */}
                    {m.combatPowerDelta !== undefined && m.combatPowerDelta !== 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-500">어제 대비</span>
                        <CombatPowerDelta delta={m.combatPowerDelta} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}


      </div>
    </div>
  );
}
