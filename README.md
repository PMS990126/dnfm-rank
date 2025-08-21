# DNFM Bot (Next.js)

- Next.js + TypeScript + Tailwind
- Scrapes DNFM Free board posts and builds a guild ranking snapshot for members whose guild includes "항마압축파".

## Setup

1) Install deps
```
npm i
```

2) Env (.env.local)
```
NEXT_PUBLIC_BASE_URL=http://localhost:3000
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
PUBLIC_URL=http://localhost:3000

# Supabase 설정 (필수)
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key_here

# Playwright 설정
PLAYWRIGHT_ENABLE=true

# 길드 필터 설정
GUILD_FILTER=항마압축파

# 재검사 간격 (분 단위)
PROFILE_RECHECK_MINUTES=180

# Cron 작업 인증 (프로덕션에서 필수)
CRON_SECRET=your_random_secret_here
RECHECK_COOLDOWN_MIN=1440
PROFILE_RECHECK_MIN=1440
```

3) Dev
```
npm run dev
```

Open http://localhost:3000

4) 길드원 프로필 일괄 등록
```
npm run process-profiles
```

5) 일일 업데이트 (수동 실행)
```
npm run daily-update
```

## 자동화된 일일 업데이트

Vercel 배포 시 매일 오전 6시 30분에 자동으로 길드원 프로필이 업데이트됩니다:
- 각 길드원의 항마력, 레벨, 모험단 레벨 등을 다시 스크래핑
- 어제 대비 항마력 변동량 계산 및 표시
- 30일 이상 된 히스토리 데이터 자동 정리

API:
- GET /api/guild/항마압축파/ranking?pages=5&top=100
- GET /api/post/:postId
- POST /api/kakao/skill (Kakao skill webhook)

## 길드원 프로필 등록

1. `profile-url.txt` 파일에 프로필 URL 목록을 작성
2. `.env.local` 파일에 Supabase 연결 정보 설정
3. `npm run process-profiles` 명령어로 일괄 등록 실행
