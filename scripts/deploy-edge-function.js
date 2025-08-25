#!/usr/bin/env node

/**
 * Supabase Edge Function 수동 배포 스크립트
 * Supabase CLI가 설치되지 않은 경우 사용
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Supabase Edge Function 수동 배포 가이드');
console.log('=====================================\n');

console.log('1️⃣ Supabase Dashboard에서 Edge Function 생성:');
console.log('   - https://supabase.com/dashboard 접속');
console.log('   - 프로젝트 선택');
console.log('   - Edge Functions → New Function');
console.log('   - Function name: daily-update');
console.log('   - Import maps: deno.json 내용 복사');
console.log('   - Code: supabase/functions/daily-update/index.ts 내용 복사\n');

console.log('2️⃣ 환경변수 설정:');
console.log('   - SUPABASE_URL: 프로젝트 URL');
console.log('   - SUPABASE_SERVICE_ROLE_KEY: 서비스 롤 키\n');

console.log('3️⃣ 함수 배포 후 테스트:');
console.log('   - Test function 버튼 클릭');
console.log('   - 응답 확인\n');

console.log('4️⃣ Vercel 환경변수 설정:');
console.log('   - SUPABASE_URL');
console.log('   - SUPABASE_ANON_KEY');
console.log('   - CRON_SECRET (선택사항)\n');

console.log('5️⃣ Vercel 배포 및 Cron Job 확인:');
console.log('   - vercel.json의 cron 설정 확인');
console.log('   - Vercel Dashboard에서 Cron Job 상태 확인\n');

console.log('✅ 배포 완료 후 매일 오전 6:30에 자동 실행됩니다!');
