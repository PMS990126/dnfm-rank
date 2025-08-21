export default async function UserPage({ params }: { params: { nickname: string } }) {
  return (
    <div>
      <h1 className="text-xl font-semibold">유저 정보: {decodeURIComponent(params.nickname)}</h1>
      <p className="text-slate-400 mt-2">준비 중입니다. 게시글을 통한 최신 데이터로 곧 연결됩니다.</p>
    </div>
  );
}
