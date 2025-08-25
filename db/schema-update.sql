-- 기존 authors 테이블에 새로운 컬럼 추가
ALTER TABLE public.authors 
ADD COLUMN IF NOT EXISTS previous_combat_power int,
ADD COLUMN IF NOT EXISTS combat_power_delta int,
ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

-- Add user_id column to authors table for profile updates
ALTER TABLE authors ADD COLUMN IF NOT EXISTS user_id text;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS authors_user_id_idx ON authors(user_id);

-- Update existing records if needed (example)
-- UPDATE authors SET user_id = 'default_user_id' WHERE user_id IS NULL;

-- 일별 항마력 히스토리 테이블 (기존 author_stats_daily 개선)
DROP TABLE IF EXISTS public.author_stats_daily;
CREATE TABLE public.combat_power_history (
  id SERIAL PRIMARY KEY,
  author_key text NOT NULL REFERENCES public.authors(author_key) ON DELETE CASCADE,
  combat_power int NOT NULL,
  recorded_date date NOT NULL DEFAULT CURRENT_DATE,
  recorded_at timestamptz DEFAULT NOW(),
  UNIQUE(author_key, recorded_date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS combat_power_history_author_key_idx ON public.combat_power_history(author_key);
CREATE INDEX IF NOT EXISTS combat_power_history_date_idx ON public.combat_power_history(recorded_date DESC);

-- 스케줄링을 위한 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT NOW()
);

-- 마지막 업데이트 시간 기록용
INSERT INTO public.system_config (key, value) 
VALUES ('last_daily_update', CURRENT_TIMESTAMP::text)
ON CONFLICT (key) DO NOTHING;

-- RLS 설정
ALTER TABLE public.combat_power_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- 항마력 변동 계산 함수
CREATE OR REPLACE FUNCTION calculate_combat_power_delta()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 각 길드원의 항마력 변동 계산
  UPDATE public.authors 
  SET 
    previous_combat_power = COALESCE(
      (SELECT combat_power 
       FROM public.combat_power_history 
       WHERE author_key = authors.author_key 
       ORDER BY recorded_date DESC 
       LIMIT 1), 
      combat_power
    ),
    combat_power_delta = combat_power - COALESCE(
      (SELECT combat_power 
       FROM public.combat_power_history 
       WHERE author_key = authors.author_key 
       ORDER BY recorded_date DESC 
       LIMIT 1), 
      combat_power
    ),
    last_checked_at = NOW()
  WHERE guild = '항마압축파';

  -- 오늘의 항마력 기록 저장
  INSERT INTO public.combat_power_history (author_key, combat_power, recorded_date)
  SELECT author_key, combat_power, CURRENT_DATE
  FROM public.authors 
  WHERE guild = '항마압축파'
  ON CONFLICT (author_key, recorded_date) 
  DO UPDATE SET 
    combat_power = EXCLUDED.combat_power,
    recorded_at = NOW();

  -- 시스템 설정 업데이트
  UPDATE public.system_config 
  SET value = CURRENT_TIMESTAMP::text, updated_at = NOW() 
  WHERE key = 'last_daily_update';
END;
$$;

-- 30일 이상 오래된 히스토리 데이터 정리 함수
CREATE OR REPLACE FUNCTION cleanup_old_combat_history()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.combat_power_history 
  WHERE recorded_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$;
