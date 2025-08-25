import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fetchHtml } from '@/lib/scraper';
import * as cheerio from 'cheerio';

// 동적 렌더링 강제 (빌드 시점 실행 방지)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ProfileUrl {
  url: string;
  userId: string;
  nickname?: string;
}

interface GuildMember {
  author_key: string;
  server: string;
  nickname: string;
  user_id: string | null;
  guild: string;
}

function extractUserIdFromUrl(url: string): string | null {
  const match = url.match(/\/Profile\/User\/(\d+)/);
  return match ? match[1] : null;
}

function parseProfileUrls(): ProfileUrl[] {
  try {
    const filePath = join(process.cwd(), 'profile-url.txt');
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    const profileUrls: ProfileUrl[] = [];
    for (const line of lines) {
      const cleanUrl = line.replace(/,$/, ''); // 끝의 콤마 제거
      const userId = extractUserIdFromUrl(cleanUrl);
      if (userId) {
        profileUrls.push({
          url: cleanUrl,
          userId
        });
      }
    }
    
    return profileUrls;
  } catch (error) {
    console.error('파일 읽기 오류:', error);
    return [];
  }
}

async function getGuildMembers(): Promise<GuildMember[]> {
  const db = getDb();
  const { data, error } = await db
    .from('authors')
    .select('author_key, server, nickname, user_id, guild')
    .ilike('guild', '%항마압축파%')
    .order('nickname');

  if (error) {
    console.error('❌ 길드원 목록 조회 실패:', error);
    return [];
  }

  return data || [];
}

async function scrapeProfileNickname(url: string): Promise<string | null> {
  try {
    console.log(`  🔍 프로필 페이지 스크래핑: ${url}`);
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    
    // 닉네임 추출 시도 (여러 방법)
    let nickname = null;
    
    // 방법 1: 대표 캐릭터 섹션에서 닉네임 찾기
    nickname = $('*:contains("대표 캐릭터")').closest('section, .wrap, .view, .character_info').find('.tit_character .name, .tit_character strong, .nickname, .name').first().text().trim();
    
    // 방법 2: 레벨 정보에서 닉네임 추출
    if (!nickname) {
      const levelText = $('body').text();
      const match = levelText.match(/Lv\.?\s*\d+\s+([^\s|\n]+)/);
      if (match) nickname = match[1];
    }
    
    // 방법 3: 닉네임님 패턴 찾기
    if (!nickname) {
      const bodyText = $('body').text();
      const match = bodyText.match(/([^\s]+)\s*님(?:의|)/);
      if (match) nickname = match[1];
    }
    
    if (nickname) {
      console.log(`  ✅ 닉네임 추출 성공: ${nickname}`);
      return nickname;
    } else {
      console.log(`  ❌ 닉네임을 찾을 수 없음`);
      return null;
    }
    
  } catch (error) {
    console.log(`  ❌ 프로필 스크래핑 실패: ${error}`);
    return null;
  }
}

async function updateUserId(authorKey: string, userId: string): Promise<boolean> {
  try {
    const db = getDb();
    const { error } = await db
      .from('authors')
      .update({ user_id: userId })
      .eq('author_key', authorKey);

    if (error) {
      console.error(`❌ ${authorKey}: user_id 업데이트 실패:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`❌ ${authorKey}: user_id 업데이트 중 오류:`, error);
    return false;
  }
}

async function findExactMatch(nickname: string, members: GuildMember[]): Promise<GuildMember | null> {
  // 정확한 닉네임 매치 찾기
  let exactMatch = members.find(member => 
    member.nickname === nickname && !member.user_id
  );
  
  if (exactMatch) {
    console.log(`  ✅ 정확한 닉네임 매치: ${nickname} → ${exactMatch.author_key}`);
    return exactMatch;
  }
  
  // 부분 매치 찾기 (닉네임이 포함된 경우)
  let partialMatch = members.find(member => 
    !member.user_id && (
      member.nickname.includes(nickname) || 
      nickname.includes(member.nickname) ||
      member.nickname.toLowerCase() === nickname.toLowerCase()
    )
  );
  
  if (partialMatch) {
    console.log(`  ⚠️ 부분 매치 (확인 필요): ${nickname} → ${partialMatch.nickname} (${partialMatch.author_key})`);
    return partialMatch;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const startTime = new Date();
    console.log('🚀 profile-url.txt 기반 user_id 일괄 업데이트 시작:', startTime.toLocaleString());
    
    // 관리자 인증 (선택사항)
    if (process.env.ADMIN_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
        console.log('❌ 관리자 인증 실패');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // profile-url.txt에서 URL 목록 읽기
    const profileUrls = parseProfileUrls();
    if (profileUrls.length === 0) {
      console.log('❌ profile-url.txt에서 URL을 읽을 수 없습니다.');
      return NextResponse.json({ 
        success: false, 
        message: 'profile-url.txt에서 URL을 읽을 수 없습니다.' 
      });
    }

    console.log(`📋 profile-url.txt에서 ${profileUrls.length}개의 URL을 읽었습니다.`);

    // 길드원 목록 조회
    const members = await getGuildMembers();
    if (members.length === 0) {
      console.log('❌ 업데이트할 길드원이 없습니다.');
      return NextResponse.json({ 
        success: false, 
        message: '업데이트할 길드원이 없습니다.' 
      });
    }

    console.log(`📋 DB에서 ${members.length}명의 길드원을 찾았습니다.`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    const updatedMembers: Array<{nickname: string, userId: string, authorKey: string, matchedType: string}> = [];
    const failedMembers: Array<{nickname: string, reason: string}> = [];

    // 각 URL에 대해 프로필 스크래핑 및 정확한 매칭
    for (let i = 0; i < profileUrls.length; i++) {
      const profileUrl = profileUrls[i];
      console.log(`\n[${i + 1}/${profileUrls.length}] URL 처리 중: ${profileUrl.url}`);
      
      // user_id 추출
      const userId = extractUserIdFromUrl(profileUrl.url);
      if (!userId) {
        console.log(`  ❌ user_id 추출 실패`);
        failCount++;
        failedMembers.push({ nickname: '알 수 없음', reason: 'user_id 추출 실패' });
        continue;
      }

      // 이 user_id가 이미 DB에 있는지 확인
      const existingMember = members.find(member => member.user_id === userId);
      if (existingMember) {
        console.log(`  ⚠️ user_id ${userId}는 이미 ${existingMember.nickname}에게 할당됨`);
        skipCount++;
        continue;
      }

      // 프로필 페이지에서 닉네임 추출
      const profileNickname = await scrapeProfileNickname(profileUrl.url);
      if (!profileNickname) {
        console.log(`  ❌ 프로필에서 닉네임을 추출할 수 없음`);
        failCount++;
        failedMembers.push({ nickname: '알 수 없음', reason: '프로필에서 닉네임 추출 실패' });
        continue;
      }

      // DB의 길드원과 정확한 매칭
      const matchedMember = await findExactMatch(profileNickname, members);
      if (!matchedMember) {
        console.log(`  ❌ 매칭되는 길드원을 찾을 수 없음: ${profileNickname}`);
        failCount++;
        failedMembers.push({ nickname: profileNickname, reason: '매칭되는 길드원을 찾을 수 없음' });
        continue;
      }

      // DB 업데이트
      const updated = await updateUserId(matchedMember.author_key, userId);
      if (updated) {
        successCount++;
        const matchedType = matchedMember.nickname === profileNickname ? '정확한 매치' : '부분 매치';
        updatedMembers.push({ 
          nickname: matchedMember.nickname, 
          userId, 
          authorKey: matchedMember.author_key,
          matchedType
        });
        console.log(`  ✅ ${matchedMember.nickname}에게 user_id ${userId} 할당 완료 (${matchedType})`);
      } else {
        failCount++;
        failedMembers.push({ 
          nickname: matchedMember.nickname, 
          reason: 'DB 업데이트 실패' 
        });
      }
      
      // 서버 부하 방지를 위한 지연
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    const summary = {
      timestamp: startTime.toISOString(),
      totalUrls: profileUrls.length,
      totalMembers: members.length,
      successCount,
      failCount,
      skipCount,
      updatedMembers,
      failedMembers,
      startedAt: startTime.toLocaleString(),
      completedAt: endTime.toLocaleString(),
      duration: `${Math.round(duration / 1000)}초`
    };

    console.log('\n📊 일괄 업데이트 결과 요약:');
    console.log(`✅ 성공: ${successCount}명`);
    console.log(`❌ 실패: ${failCount}명`);
    console.log(`⏭️  스킵: ${skipCount}명`);
    console.log(`⏱️  소요시간: ${Math.round(duration / 1000)}초`);

    return NextResponse.json({
      success: true,
      message: 'profile-url.txt 기반 user_id 일괄 업데이트 완료',
      summary
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ 일괄 업데이트 중 오류:', errorMsg);
    return NextResponse.json({ 
      success: false, 
      error: errorMsg 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
