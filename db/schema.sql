-- Authors table stores the latest known profile per author
create table if not exists authors (
  author_key text primary key, -- server:nickname lowercased
  server text,
  nickname text,
  job text,
  level int,
  combat_power int,
  guild text,
  adventure_name text,
  adventure_level int,
  avatar_url text,
  last_post_id text,
  updated_at timestamptz default now()
);
create index if not exists authors_guild_idx on authors using btree ((lower(guild)));
create index if not exists authors_power_idx on authors (combat_power desc);

-- Seen posts to avoid reprocessing (legacy)
create table if not exists posts_seen (
  post_id text primary key,
  seen_at timestamptz default now()
);

-- Recent check registry to avoid re-parsing too often (posts)
create table if not exists posts_checked (
  post_id text primary key,
  status text check (status in ('matched','not_matched')),
  checked_at timestamptz default now()
);
create index if not exists posts_checked_checked_at_idx on posts_checked(checked_at);

-- Recent check registry for profile id scanning
create table if not exists profiles_checked (
  user_id text primary key,
  status text check (status in ('matched','not_found')),
  checked_at timestamptz default now()
);
create index if not exists profiles_checked_checked_at_idx on profiles_checked(checked_at);

-- Daily stats snapshot for deltas
create table if not exists author_stats_daily (
  author_key text,
  date date,
  combat_power int,
  delta int,
  snapshot_at timestamptz default now(),
  primary key(author_key, date)
);
