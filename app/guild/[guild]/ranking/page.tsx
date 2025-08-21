import React from "react";
import { buildGuildSnapshot } from "@/lib/ranking";

export default async function GuildRankingPage({ params }: { params: { guild: string } }) {
  const guild = decodeURIComponent(params.guild);
  const data = await buildGuildSnapshot({ guildFilter: guild });
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">{guild} 길드원 랭킹</h1>
      <ul className="divide-y divide-slate-800 rounded-md overflow-hidden bg-slate-900/40">
        {data.members.map((m: any) => (
          <li key={m.nickname + m.server} className="flex items-center gap-3 p-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex-none" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-300">#{m.rank}</span>
                <span className="font-medium truncate">{m.nickname}</span>
                <span className="text-slate-400">Lv.{m.level}</span>
                <span className="text-slate-400">{m.server}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="bg-slate-800 px-2 py-0.5 rounded">{m.job}</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded">항마력 {m.combatPower?.toLocaleString?.() ?? m.combatPower}</span>
                {m.adventureName && (
                  <span className="bg-slate-800 px-2 py-0.5 rounded">모험단 {m.adventureName} Lv.{m.adventureLevel}</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">샘플 페이지 수: {data.sampledPages} · 생성 {new Date(data.generatedAt).toLocaleString()}</p>
    </div>
  );
}
