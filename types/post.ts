export type PostProfile = {
  nickname: string;
  level: number;
  server: string;
  job: string;
  combatPower: number;
  guild?: string;
  adventureName?: string;
  adventureLevel?: number;
  avatarUrl?: string;
};

export type PostData = {
  postId: string;
  sourceUrl: string;
  title: string;
  createdAt?: string;
  profile: PostProfile;
  contentHtml: string;
  attachments?: { url: string; name?: string }[];
  fetchedAt: string;
  cache?: { hit: boolean; ttlSec?: number };
};
