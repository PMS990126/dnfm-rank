export type GuildMember = {
  rank: number;
  nickname: string;
  level?: number;
  combatPower?: number;
  job?: string;
  server?: string;
  avatarUrl?: string;
  adventureName?: string;
  adventureLevel?: number;
  postId?: string;
};

export type GuildRanking = {
  guild: string;
  server?: string;
  top: number;
  sampledPages: number;
  members: GuildMember[];
  sourceUrl?: string;
  generatedAt: string;
};
