-- 칭호 관리 테이블
CREATE TABLE IF NOT EXISTS public.user_titles (
  id SERIAL PRIMARY KEY,
  author_key text NOT NULL REFERENCES public.authors(author_key) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(author_key)
);

-- 뱃지 정의 테이블 (뱃지 종류)
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id SERIAL PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  icon_url text,
  rarity text CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
  created_at timestamptz DEFAULT NOW()
);

-- 사용자 뱃지 테이블 (어떤 사용자가 어떤 뱃지를 갖고 있는지)
CREATE TABLE IF NOT EXISTS public.user_badges (
  id SERIAL PRIMARY KEY,
  author_key text NOT NULL REFERENCES public.authors(author_key) ON DELETE CASCADE,
  badge_id integer NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT NOW(),
  earned_condition text, -- 획득 조건 설명
  UNIQUE(author_key, badge_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS user_titles_author_key_idx ON public.user_titles(author_key);
CREATE INDEX IF NOT EXISTS user_badges_author_key_idx ON public.user_badges(author_key);
CREATE INDEX IF NOT EXISTS user_badges_badge_id_idx ON public.user_badges(badge_id);

-- RLS 설정
ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- 샘플 뱃지 데이터 삽입
INSERT INTO public.badge_definitions (name, description, icon_url, rarity) VALUES
('길드 창립 멤버', '길드 창립 초기부터 함께한 멤버', '/images/badges/founder.png', 'legendary'),
('고인물', '길드에서 가장 오래 활동한 멤버', '/images/badges/veteran.png', 'epic'),
('항마력 킹', '길드 내 항마력 1위', '/images/badges/power-king.png', 'epic'),
('성장왕', '지난 주 가장 많이 성장한 멤버', '/images/badges/growth.png', 'rare'),
('출석왕', '매일 접속하는 성실한 멤버', '/images/badges/attendance.png', 'rare'),
('친화력 갑', '길드 내 인기 멤버', '/images/badges/friendly.png', 'common'),
('레이드 마스터', '레이드를 자주 주도하는 멤버', '/images/badges/raid-master.png', 'epic'),
('신입 환영', '새로 가입한 멤버를 잘 도와주는 멤버', '/images/badges/helper.png', 'common');

-- 샘플 칭호 데이터 삽입
INSERT INTO public.user_titles (author_key, title) VALUES
('카인:모험가1', '길드마스터'),
('카인:모험가2', '부길드마스터'),
('카인:모험가3', '고인물 1타'),
('카인:모험가4', '레이드 진행자'),
('카인:모험가5', '분위기 메이커');

-- 샘플 사용자 뱃지 데이터 삽입
INSERT INTO public.user_badges (author_key, badge_id, earned_condition) VALUES
('카인:모험가1', 1, '길드 창립 당시부터 함께함'),
('카인:모험가1', 3, '2024년 1월 길드 항마력 1위 달성'),
('카인:모험가2', 1, '길드 창립 당시부터 함께함'),
('카인:모험가2', 7, '매주 레이드 진행'),
('카인:모험가3', 2, '2년 이상 활동'),
('카인:모험가3', 5, '100일 연속 접속'),
('카인:모험가4', 4, '지난주 항마력 1000 상승'),
('카인:모험가5', 6, '길드 분위기 조성에 기여');
