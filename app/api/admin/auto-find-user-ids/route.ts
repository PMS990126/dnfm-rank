import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { fetchHtml } from '@/lib/scraper';
import * as cheerio from 'cheerio';

// 동적 렌더링 강제 (빌드 시점 실행 방지)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Author {
  author_key: string;
  server: string;
  nickname: string;
  user_id: string | null;
  guild: string;
}

async function getMembersWithoutUserId(): Promise<Author[]> {
  const db = getDb();
  const { data, error } = await db
    .from('authors')
    .select('author_key, server, nickname, user_id, guild')
    .ilike('guild', '%항마압축파%')
    .or('user_id.is.null,user_id.eq.""')
    .order('nickname');

  if (error) {
    console.error('❌ user_id 없는 길드원 조회 실패:', error);
    return [];
  }

  return data || [];
}

async function findUserIdByNickname(nickname: string, server: string): Promise<string | null> {
  try {
    console.log(`🔍 ${nickname} (${server})의 user_id 찾는 중...`);
    
    // 방법 1: 게시글 검색을 통해 user_id 찾기
    const searchUrl = `https://dnfm.nexon.com/Community/Free?search=${encodeURIComponent(nickname)}`;
    console.log(`  📝 검색 URL: ${searchUrl}`);
    
    try {
      const html = await fetchHtml(searchUrl);
      const $ = cheerio.load(html);
      
      // 게시글 목록에서 해당 닉네임의 작성자 링크 찾기
      const authorLinks = $('a[href*="/Profile/User/"]');
      
      for (let i = 0; i < authorLinks.length; i++) {
        const link = authorLinks.eq(i);
        const href = link.attr('href');
        const linkText = link.text().trim();
        
        // 링크 텍스트에 닉네임이 포함되어 있는지 확인
        if (href && linkText.includes(nickname)) {
          const userIdMatch = href.match(/\/Profile\/User\/(\d+)/);
          if (userIdMatch) {
            const userId = userIdMatch[1];
            console.log(`  ✅ 게시글 검색으로 user_id 찾음: ${userId}`);
            return userId;
          }
        }
      }
      
      console.log(`  ❌ 게시글 검색으로 user_id를 찾을 수 없음`);
    } catch (searchError) {
      console.log(`  ⚠️ 게시글 검색 실패: ${searchError}`);
    }
    
    // 방법 2: 직접 프로필 검색 시도 (닉네임 기반)
    // DNFM에서는 닉네임으로 직접 프로필을 찾을 수 없으므로 이 방법은 제한적
    
    // 방법 3: 기존 DB에서 유사한 닉네임 찾기
    try {
      const db = getDb();
      const { data, error } = await db
        .from('authors')
        .select('user_id, nickname')
        .ilike('nickname', `%${nickname}%`)
        .not('user_id', 'is', null)
        .limit(5);
      
      if (!error && data && data.length > 0) {
        // 유사한 닉네임 중에서 가장 정확한 매치 찾기
        const exactMatch = data.find(author => author.nickname === nickname);
        if (exactMatch && exactMatch.user_id) {
          console.log(`  ✅ 유사 닉네임 매치로 user_id 찾음: ${exactMatch.user_id}`);
          return exactMatch.user_id;
        }
        
        // 부분 매치 중에서 선택
        const partialMatch = data.find(author => 
          author.nickname.includes(nickname) || nickname.includes(author.nickname)
        );
        if (partialMatch && partialMatch.user_id) {
          console.log(`  ⚠️ 부분 매치로 user_id 찾음: ${partialMatch.user_id} (${partialMatch.nickname})`);
          return partialMatch.user_id;
        }
      }
    } catch (dbError) {
      console.log(`  ⚠️ DB 검색 실패: ${dbError}`);
    }
    
    console.log(`  ❌ 모든 방법으로 user_id를 찾을 수 없음`);
    return null;
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${nickname}: user_id 찾기 실패:`, errorMsg);
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

export async function POST(request: NextRequest) {
  try {
    const startTime = new Date();
    console.log('🚀 user_id 자동 찾기 시작:', startTime.toLocaleString());
    
    // 관리자 인증 (선택사항)
    if (process.env.ADMIN_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
        console.log('❌ 관리자 인증 실패');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // user_id가 없는 길드원들 조회
    const members = await getMembersWithoutUserId();
    if (members.length === 0) {
      console.log('✅ 모든 길드원이 user_id를 가지고 있습니다.');
      return NextResponse.json({ 
        success: true, 
        message: '모든 길드원이 user_id를 가지고 있습니다.',
        summary: { totalMembers: 0, foundCount: 0, notFoundCount: 0 }
      });
    }

    console.log(`📋 user_id가 없는 길드원 ${members.length}명을 찾았습니다.`);

    let foundCount = 0;
    let notFoundCount = 0;
    const foundMembers: Array<{nickname: string, userId: string}> = [];
    const notFoundMembers: Array<{nickname: string, reason: string}> = [];

    // 각 길드원의 user_id 찾기
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      console.log(`\n[${i + 1}/${members.length}] ${member.nickname} (${member.server}) 처리 중...`);
      
      // 서버 부하 방지를 위한 지연
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // user_id 찾기 시도
      const userId = await findUserIdByNickname(member.nickname, member.server);
      
      if (userId) {
        // DB 업데이트
        const updated = await updateUserId(member.author_key, userId);
        if (updated) {
          foundCount++;
          foundMembers.push({ nickname: member.nickname, userId });
          console.log(`✅ ${member.nickname}: user_id ${userId} 찾음 및 업데이트 완료`);
        } else {
          notFoundCount++;
          notFoundMembers.push({ nickname: member.nickname, reason: 'DB 업데이트 실패' });
        }
      } else {
        notFoundCount++;
        notFoundMembers.push({ nickname: member.nickname, reason: 'user_id를 찾을 수 없음' });
        console.log(`❌ ${member.nickname}: user_id를 찾을 수 없음`);
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    const summary = {
      timestamp: startTime.toISOString(),
      totalMembers: members.length,
      foundCount,
      notFoundCount,
      foundMembers,
      notFoundMembers,
      startedAt: startTime.toLocaleString(),
      completedAt: endTime.toLocaleString(),
      duration: `${Math.round(duration / 1000)}초`
    };

    console.log('\n📊 user_id 찾기 결과 요약:');
    console.log(`✅ 찾음: ${foundCount}명`);
    console.log(`❌ 못찾음: ${notFoundCount}명`);
    console.log(`⏱️  소요시간: ${Math.round(duration / 1000)}초`);

    return NextResponse.json({
      success: true,
      message: 'user_id 자동 찾기 완료',
      summary
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ user_id 자동 찾기 중 오류:', errorMsg);
    return NextResponse.json({ 
      success: false, 
      error: errorMsg 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
