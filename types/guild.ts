export type Badge = {
  id: number;
  name: string;
  description: string;
  iconUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: string;
  earnedCondition: string;
};

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
  title?: string;
  badges?: Badge[];
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
