#!/usr/bin/env npx tsx

// 환경변수 로드
import { config } from 'dotenv';
config({ path: '.env.local' });

import { renderProfileData } from '@/lib/browser';

async function testRenderProfile() {
  console.log('🧪 renderProfileData 직접 테스트 시작...');
  
  const url = 'https://dnfm.nexon.com/Profile/User/6629864';
  console.log(`📍 URL: ${url}`);
  
  try {
    const result = await renderProfileData(url);
    console.log('\n📊 renderProfileData 전체 결과:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ renderProfileData 테스트 실패:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n✅ 테스트 완료');
}

testRenderProfile().catch(error => {
  console.error('❌ 최상위 오류:', error);
  process.exit(1);
});
