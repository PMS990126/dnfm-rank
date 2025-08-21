#!/usr/bin/env npx tsx

// 환경변수 로드
import { config } from 'dotenv';
config({ path: '.env.local' });

import { scrapeProfileByUserId } from '@/lib/scraper';

async function testSingleProfile() {
  console.log('🧪 단일 프로필 테스트 시작...');
  
  const userId = '6629864'; // 첫 번째 프로필 ID로 테스트
  const url = `https://dnfm.nexon.com/Profile/User/${userId}`;
  
  console.log(`📍 URL: ${url}`);
  console.log('🔍 스크래핑 시작...');
  
  try {
    const result = await scrapeProfileByUserId(userId, { debug: true });
    
    console.log('\n📊 스크래핑 결과:');
    console.log('- exists:', result.exists);
    console.log('- usedFallback:', result.usedFallback);
    console.log('- hasProfile:', !!result.profile);
    
    if (result.profile) {
      console.log('\n📋 프로필 상세 정보:');
      console.log('- 닉네임:', result.profile.nickname || '(없음)');
      console.log('- 서버:', result.profile.server || '(없음)');
      console.log('- 직업:', result.profile.job || '(없음)');
      console.log('- 레벨:', result.profile.level || 0);
      console.log('- 항마력:', result.profile.combatPower || 0);
      console.log('- 길드:', result.profile.guild || '(없음)');
      console.log('- 모험단명:', result.profile.adventureName || '(없음)');
      console.log('- 모험단 레벨:', result.profile.adventureLevel || 0);
      console.log('- 아바타 URL:', result.profile.avatarUrl || '(없음)');
    } else {
      console.log('\n❌ 프로필 데이터가 없습니다.');
    }
    
  } catch (error) {
    console.error('\n❌ 테스트 중 오류 발생:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n✅ 테스트 완료');
}

testSingleProfile().catch(error => {
  console.error('❌ 최상위 오류:', error);
  process.exit(1);
});
