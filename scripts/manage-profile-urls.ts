#!/usr/bin/env npx tsx

import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// .env.local 파일 로드
config({ path: '.env.local' });

import { getDb } from '../lib/db';

interface ProfileUrl {
  url: string;
  userId: string;
  isNew: boolean;
}

function extractUserIdFromUrl(url: string): string | null {
  const match = url.match(/\/Profile\/User\/(\d+)/);
  return match ? match[1] : null;
}

function parseProfileUrls(filePath: string): ProfileUrl[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    const profileUrls: ProfileUrl[] = [];
    for (const line of lines) {
      const cleanUrl = line.replace(/,$/, '');
      const userId = extractUserIdFromUrl(cleanUrl);
      if (userId) {
        profileUrls.push({
          url: cleanUrl,
          userId,
          isNew: false
        });
      }
    }
    
    return profileUrls;
  } catch (error) {
    console.error('파일 읽기 오류:', error);
    return [];
  }
}

async function getExistingUserIds(): Promise<Set<string>> {
  const db = getDb();
  try {
    const { data, error } = await db
      .from('authors')
      .select('user_id')
      .not('user_id', 'is', null);
    
    if (error) {
      console.error('기존 사용자 ID 조회 오류:', error);
      return new Set();
    }
    
    return new Set(data?.map(row => row.user_id).filter(Boolean) || []);
  } catch (error) {
    console.error('기존 사용자 ID 조회 중 오류:', error);
    return new Set();
  }
}

function removeDuplicates(profileUrls: ProfileUrl[]): ProfileUrl[] {
  const seen = new Set<string>();
  return profileUrls.filter(profile => {
    if (seen.has(profile.userId)) {
      return false;
    }
    seen.add(profile.userId);
    return true;
  });
}

function saveProfileUrls(filePath: string, profileUrls: ProfileUrl[]) {
  const content = profileUrls.map(profile => profile.url).join('\n');
  writeFileSync(filePath, content, 'utf-8');
}

async function checkSupabaseConnection() {
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
  console.log('🔧 프로필 URL 관리 도구를 시작합니다...\n');
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log('사용법:');
    console.log('  npm run manage-urls -- check     - URL 상태 확인');
    console.log('  npm run manage-urls -- clean     - 중복 URL 제거');
    console.log('  npm run manage-urls -- new-only  - 새 URL만 추출');
    console.log('  npm run manage-urls -- stats     - 통계 정보');
    return;
  }
  
  // Supabase 연결 확인
  const dbConnected = await checkSupabaseConnection();
  if (!dbConnected) {
    process.exit(1);
  }
  
  const profileFile = join(process.cwd(), 'profile-url.txt');
  
  if (!existsSync(profileFile)) {
    console.error('❌ profile-url.txt 파일을 찾을 수 없습니다.');
    process.exit(1);
  }
  
  const profileUrls = parseProfileUrls(profileFile);
  const existingUserIds = await getExistingUserIds();
  
  // 각 URL의 상태 확인
  profileUrls.forEach(profile => {
    profile.isNew = !existingUserIds.has(profile.userId);
  });
  
  switch (command) {
    case 'check':
      console.log('📋 URL 상태 확인:');
      console.log(`총 URL 수: ${profileUrls.length}`);
      console.log(`새 URL: ${profileUrls.filter(p => p.isNew).length}`);
      console.log(`기존 URL: ${profileUrls.filter(p => !p.isNew).length}`);
      
      if (profileUrls.filter(p => p.isNew).length > 0) {
        console.log('\n🆕 새로 등록할 URL:');
        profileUrls.filter(p => p.isNew).forEach(p => console.log(`  ${p.url}`));
      }
      break;
      
    case 'clean':
      const uniqueUrls = removeDuplicates(profileUrls);
      const removedCount = profileUrls.length - uniqueUrls.length;
      
      if (removedCount > 0) {
        saveProfileUrls(profileFile, uniqueUrls);
        console.log(`🧹 중복 URL 제거 완료: ${removedCount}개 제거됨`);
        console.log(`남은 URL 수: ${uniqueUrls.length}`);
      } else {
        console.log('✅ 중복 URL이 없습니다.');
      }
      break;
      
    case 'new-only':
      const newUrls = profileUrls.filter(p => p.isNew);
      if (newUrls.length > 0) {
        const newFile = join(process.cwd(), 'new-profile-urls.txt');
        saveProfileUrls(newFile, newUrls);
        console.log(`🆕 새 URL만 추출 완료: ${newUrls.length}개`);
        console.log(`파일 저장: new-profile-urls.txt`);
      } else {
        console.log('✅ 새로 등록할 URL이 없습니다.');
      }
      break;
      
    case 'stats':
      const duplicates = profileUrls.length - removeDuplicates(profileUrls).length;
      console.log('📊 URL 통계:');
      console.log(`총 URL 수: ${profileUrls.length}`);
      console.log(`고유 사용자 ID: ${removeDuplicates(profileUrls).length}`);
      console.log(`중복 URL: ${duplicates}`);
      console.log(`새 URL: ${profileUrls.filter(p => p.isNew).length}`);
      console.log(`기존 URL: ${profileUrls.filter(p => !p.isNew).length}`);
      break;
      
    default:
      console.error(`❌ 알 수 없는 명령어: ${command}`);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
