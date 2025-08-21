import React from "react";
import { scrapePost } from "@/lib/scraper";

export default async function PostPage({ params }: { params: { postId: string } }) {
  const data = await scrapePost(params.postId);
  const p = data.profile;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">게시글 {data.postId}</h1>
      <div className="bg-slate-900/40 rounded p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-800" />
          <div className="min-w-0">
            <div className="font-medium truncate">{p.nickname} · Lv.{p.level}</div>
            <div className="text-sm text-slate-400">{p.server} · {p.job} · 항마력 {p.combatPower?.toLocaleString?.()}</div>
          </div>
        </div>
      </div>
      <article className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
    </div>
  );
}
