import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface GuildMember {
  author_key: string;
  nickname: string;
  user_id: string;
  level: number;
  combat_power: number;
  server: string;
  job: string;
  guild: string;
  adventure_name?: string;
  adventure_level?: number;
}

interface ProfileData {
  level: number;
  combatPower: number;
  server: string;
  job: string;
  guild: string;
  adventureName?: string;
  adventureLevel?: number;
}

serve(async (req) => {
  try {
    console.log('🚀 Supabase Edge Function - 일일 프로필 업데이트 시작');
    
    // 환경변수 확인
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. 길드원 목록 조회 (길드명에 "항마압축파"가 포함된 모든 멤버)
    console.log('📋 길드원 목록 조회 중...');
    const { data: members, error: fetchError } = await supabase
      .from('authors')
      .select('*')
      .ilike('guild', '%항마압축파%')
      .not('user_id', 'is', null);

    if (fetchError) {
      console.error('❌ 길드원 목록 조회 실패:', fetchError);
      throw fetchError;
    }

    if (!members || members.length === 0) {
      console.log('❌ 업데이트할 길드원이 없습니다.');
      return new Response(JSON.stringify({
        success: false,
        message: '업데이트할 길드원이 없습니다.'
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`📋 총 ${members.length}명의 길드원을 업데이트합니다.`);
    console.log('📝 길드원 목록:', members.map(m => `${m.nickname}(${m.user_id})`).join(', '));

    let successCount = 0;
    let failCount = 0;
    const failedMembers: Array<{nickname: string, error: string}> = [];

    // 2. 각 길드원 프로필 업데이트 (순차적 처리로 안정성 향상)
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      console.log(`\n[${i + 1}/${members.length}] ${member.nickname} 처리 중...`);
      
      try {
        // 서버 부하 방지를 위한 지연 (5초)
        if (i > 0) {
          console.log(`  ⏳ 서버 부하 방지를 위한 대기 (5초)...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

        console.log(`  🔄 ${member.nickname} (${member.user_id}) 프로필 업데이트 시작...`);
        
        const profile = await scrapeProfileByUserId(member.user_id);
        
        if (profile) {
          const updateResult = await updateMemberProfile(supabase, member, profile);
          if (updateResult.success) {
            successCount++;
            console.log(`  ✅ ${member.nickname}: 프로필 업데이트 성공`);
          } else {
            failCount++;
            failedMembers.push({ nickname: member.nickname, error: updateResult.error || '업데이트 실패' });
            console.log(`  ❌ ${member.nickname}: ${updateResult.error}`);
          }
        } else {
          failCount++;
          failedMembers.push({ nickname: member.nickname, error: '프로필 스크래핑 실패' });
          console.log(`  ❌ ${member.nickname}: 프로필 존재하지 않음`);
        }
        
      } catch (error) {
        failCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        failedMembers.push({ nickname: member.nickname, error: errorMessage });
        console.error(`  ❌ ${member.nickname}: ${errorMessage}`);
      }
    }

    // 3. 항마력 변동 계산
    console.log('\n🔄 항마력 변동 계산 중...');
    try {
      const { error: deltaError } = await supabase.rpc('calculate_combat_power_delta');
      if (deltaError) {
        console.error('❌ 항마력 변동 계산 실패:', deltaError);
      } else {
        console.log('✅ 항마력 변동 계산 완료');
      }
    } catch (error) {
      console.error('❌ 항마력 변동 계산 중 오류:', error);
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      totalMembers: members.length,
      successCount,
      failCount,
      failedMembers: failedMembers.length > 0 ? failedMembers : undefined
    };

    console.log('\n📊 업데이트 완료 요약:', summary);
    
    if (failCount > 0) {
      console.log('⚠️ 실패한 길드원들:', failedMembers);
    }

    if (successCount / members.length < 0.5) {
      console.log('⚠️ 성공률이 낮습니다. 네트워크 상태를 확인해주세요.');
    }

    return new Response(JSON.stringify(summary), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('❌ Edge Function 실행 중 오류:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function scrapeProfileByUserId(userId: string): Promise<ProfileData | null> {
  try {
    console.log(`  🔍 ${userId} 프로필 스크래핑 시작...`);
    
    const response = await fetch(`https://dnfm.nexon.com/Profile/User/${userId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.google.com/',
        'DNT': '1',
        'Connection': 'keep-alive',
      },
      signal: AbortSignal.timeout(25000), // 25초 타임아웃
    });

    if (!response.ok) {
      console.log(`  ❌ HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const html = await response.text();
    console.log(`  🔍 HTML 가져오기 완료 (${html.length} bytes)`);
    
    const profile = parseProfileFromHtml(html);
    
    if (isProfileInsufficient(profile)) {
      console.log(`  ⚠️ 프로필 정보 부족: ${JSON.stringify(profile)}`);
      return null;
    }
    
    console.log(`  🔍 추출 완료: ${profile.level}레벨, 항마력 ${profile.combatPower.toLocaleString()}`);
    return profile;
    
  } catch (error) {
    console.error(`  ❌ 스크래핑 실패:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

function parseProfileFromHtml(html: string): ProfileData {
  const text = html.replace(/\s+/g, ' ').trim();
  
  // 레벨 추출
  const levelMatch = text.match(/Lv\.?\s*(\d{1,3})/);
  const level = levelMatch ? parseInt(levelMatch[1]) : 0;
  
  // 항마력 추출
  const combatPowerMatch = text.match(/항마력\s*[:：]?\s*([\d,]+)/);
  const combatPower = combatPowerMatch ? parseInt(combatPowerMatch[1].replace(/,/g, '')) : 0;
  
  // 서버 추출
  const serverMatch = text.match(/서버\s*[:：]?\s*([^|\s]+)/);
  const server = serverMatch ? serverMatch[1].trim() : '';
  
  // 직업 추출
  const jobMatch = text.match(/직업\s*[:：]?\s*([^|\n]+)/);
  const job = jobMatch ? jobMatch[1].trim() : '';
  
  // 길드 추출
  const guildMatch = text.match(/길드\s*[:：]?\s*([^|\s]+)/);
  const guild = guildMatch ? guildMatch[1].trim() : '';
  
  // 모험단명 추출
  const adventureMatch = text.match(/모험단명\s*[:：]?\s*([^|\s]+)/);
  const adventureName = adventureMatch ? adventureMatch[1].trim() : undefined;
  
  // 모험단 레벨 추출
  const advLevelMatch = text.match(/모험단\s*레벨\s*[:：]?\s*Lv\.?\s*(\d+)/);
  const adventureLevel = advLevelMatch ? parseInt(advLevelMatch[1]) : undefined;
  
  return {
    level,
    combatPower,
    server,
    job,
    guild,
    adventureName,
    adventureLevel
  };
}

function isProfileInsufficient(profile: ProfileData): boolean {
  return !(profile.level > 0 || profile.combatPower > 0 || profile.server || profile.job || profile.guild);
}

async function updateMemberProfile(supabase: any, member: GuildMember, profile: ProfileData): Promise<{success: boolean, error?: string}> {
  try {
    const { error } = await supabase
      .from('authors')
      .update({
        level: profile.level,
        combat_power: profile.combatPower,
        server: profile.server || member.server,
        job: profile.job || member.job,
        guild: profile.guild || member.guild,
        adventure_name: profile.adventureName || member.adventure_name,
        adventure_level: profile.adventureLevel || member.adventure_level,
        updated_at: new Date().toISOString()
      })
      .eq('author_key', member.author_key);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}
