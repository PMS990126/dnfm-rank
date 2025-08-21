#!/usr/bin/env npx tsx

// 환경변수 로드
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// .env.local 파일 로드
config({ path: '.env.local' });

import { scrapeProfileByUserId } from '@/lib/scraper';
import { getDb } from '@/lib/db';

function authorKey(server: string, nickname: string) {
  return `${server}:${nickname}`.toLowerCase();
}

function extractUserIdFromUrl(url: string): string | null {
  const match = url.match(/\/Profile\/User\/(\d+)/);
  return match ? match[1] : null;
}

function parseProfileUrls(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    const userIds: string[] = [];
    for (const line of lines) {
      // 콤마로 끝나는 경우 제거
      const cleanUrl = line.replace(/,$/, '');
      const userId = extractUserIdFromUrl(cleanUrl);
      if (userId) {
        userIds.push(userId);
      }
    }
    
    return userIds;
  } catch (error) {
    console.error('파일 읽기 오류:', error);
    return [];
  }
}

async function processProfile(userId: string, index: number, total: number): Promise<boolean> {
  console.log(`[${index + 1}/${total}] 처리 중: User ID ${userId}`);
  
  try {
    const result = await scrapeProfileByUserId(userId, { debug: true });
    
    if (!result.exists || !result.profile) {
      console.log(`  ❌ 프로필 없음 또는 스크래핑 실패`);
      return false;
    }
    
    const profile = result.profile;
    
    if (!profile.server || !profile.nickname) {
      console.log(`  ❌ 필수 정보 부족 (서버: ${profile.server}, 닉네임: ${profile.nickname})`);
      return false;
    }
    
    const key = authorKey(profile.server, profile.nickname);
    const db = getDb();
    
    await db.from("authors").upsert({
      author_key: key,
      server: profile.server,
      nickname: profile.nickname,
      job: profile.job || null,
      level: profile.level || null,
      combat_power: profile.combatPower || null,
      guild: profile.guild || null,
      adventure_name: profile.adventureName || null,
      adventure_level: profile.adventureLevel || null,
      avatar_url: profile.avatarUrl || null,
      updated_at: new Date().toISOString(),
    });
    
    console.log(`  ✅ 등록 완료: ${profile.nickname} (${profile.server}) - ${profile.guild || '길드 없음'}`);
    return true;
  } catch (error) {
    console.error(`  ❌ 오류 발생:`, error);
    return false;
  }
}

async function checkSupabaseConnection() {
  console.log('🔍 환경변수 확인 중...');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ 설정됨' : '❌ 없음');
  console.log('- SUPABASE_SERVICE_ROLE:', process.env.SUPABASE_SERVICE_ROLE ? '✅ 설정됨' : '❌ 없음');
  
  try {
    const db = getDb();
    const { data, error } = await db.from('authors').select('author_key').limit(1);
    if (error) {
      console.error('❌ Supabase 연결 실패:', error.message);
      return false;
    }
    console.log('✅ Supabase 연결 확인 완료');
    return true;
  } catch (error) {
    console.error('❌ Supabase 환경변수 오류:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function main() {
  console.log('🚀 길드원 프로필 일괄 등록을 시작합니다...\n');
  
  // Supabase 연결 확인
  const dbConnected = await checkSupabaseConnection();
  if (!dbConnected) {
    process.exit(1);
  }
  
  const profileFile = join(process.cwd(), 'profile-url.txt');
  const userIds = parseProfileUrls(profileFile);
  
  if (userIds.length === 0) {
    console.error('❌ 유효한 프로필 URL을 찾을 수 없습니다.');
    process.exit(1);
  }
  
  console.log(`📋 총 ${userIds.length}개의 프로필을 처리합니다.\n`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const success = await processProfile(userId, i, userIds.length);
    
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // 요청 간 간격 (API 부하 방지)
    if (i < userIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초로 증가
    }
  }
  
  console.log('\n📊 처리 결과:');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failureCount}개`);
  console.log(`📈 성공률: ${((successCount / userIds.length) * 100).toFixed(1)}%`);
  
  if (successCount > 0) {
    console.log('\n🎉 프로필 등록이 완료되었습니다!');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
