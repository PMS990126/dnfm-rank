import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { scrapeProfileByUserId } from '@/lib/scraper';

interface Author {
  author_key: string;
  user_id: string;
  nickname: string;
  combat_power: number;
}

async function getAllGuildMembers(): Promise<Author[]> {
  const db = getDb();
  const { data, error } = await db
    .from('authors')
    .select('author_key, user_id, nickname, combat_power')
    .ilike('guild', '%항마압축파%')
    .order('combat_power', { ascending: false });

  if (error) {
    console.error('❌ 길드원 목록 조회 실패:', error);
    return [];
  }

  return data || [];
}

async function updateMemberProfile(member: Author): Promise<{ success: boolean; newCombatPower?: number; error?: string }> {
  try {
    if (!member.user_id) {
      return { success: false, error: 'user_id가 없습니다' };
    }

    console.log(`🔄 ${member.nickname} (${member.user_id}) 프로필 업데이트 시작...`);
    
    const profileData = await scrapeProfileByUserId(member.user_id, { debug: true });
    
    if (!profileData || !profileData.exists || !profileData.profile) {
      const errorMsg = !profileData ? '스크래핑 결과 없음' : 
                      !profileData.exists ? '프로필 존재하지 않음' : '프로필 데이터 없음';
      console.log(`❌ ${member.nickname}: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    const db = getDb();
    const { error } = await db
      .from('authors')
      .update({
        level: profileData.profile.level,
        combat_power: profileData.profile.combatPower,
        adventure_level: profileData.profile.adventureLevel,
        updated_at: new Date().toISOString()
      })
      .eq('author_key', member.author_key);

    if (error) {
      console.error(`❌ ${member.nickname}: DB 업데이트 실패:`, error);
      return { success: false, error: `DB 업데이트 실패: ${error.message}` };
    }

    const powerChange = profileData.profile.combatPower - member.combat_power;
    const changeIcon = powerChange > 0 ? '📈' : powerChange < 0 ? '📉' : '➖';
    
    console.log(`✅ ${member.nickname}: ${member.combat_power.toLocaleString()} → ${profileData.profile.combatPower.toLocaleString()} ${changeIcon} ${powerChange > 0 ? '+' : ''}${powerChange.toLocaleString()}`);
    
    return { success: true, newCombatPower: profileData.profile.combatPower };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${member.nickname}: 업데이트 중 오류:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

async function calculateCombatPowerDeltas() {
  try {
    console.log('🔄 항마력 변동 계산 중...');
    const db = getDb();
    
    const { error } = await db.rpc('calculate_combat_power_delta');
    
    if (error) {
      console.error('❌ 항마력 변동 계산 실패:', error);
      return false;
    }
    
    console.log('✅ 항마력 변동 계산 완료');
    return true;
  } catch (error) {
    console.error('❌ 항마력 변동 계산 중 오류:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const startTime = new Date();
    console.log('🚀 일일 프로필 업데이트 시작:', startTime.toLocaleString());
    console.log('🌍 환경변수 확인:', {
      hasCronSecret: !!process.env.CRON_SECRET,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE,
      nodeEnv: process.env.NODE_ENV
    });
    
    // Vercel Cron 인증 확인 (환경변수가 설정된 경우에만)
    if (process.env.CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('❌ 인증 실패: CRON_SECRET 불일치');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      console.log('✅ 인증 성공');
    } else {
      console.log('⚠️ CRON_SECRET이 설정되지 않음 - 인증 생략');
    }

    // 길드원 목록 조회
    const members = await getAllGuildMembers();
    if (members.length === 0) {
      console.log('❌ 업데이트할 길드원이 없습니다.');
      return NextResponse.json({ 
        success: false, 
        message: '업데이트할 길드원이 없습니다.' 
      });
    }

    console.log(`📋 총 ${members.length}명의 길드원을 업데이트합니다.`);
    console.log('📝 길드원 목록:', members.map(m => `${m.nickname}(${m.user_id || 'user_id 없음'})`).join(', '));

    let successCount = 0;
    let failCount = 0;
    const failedMembers: Array<{nickname: string, error: string}> = [];

    // 각 길드원 프로필 업데이트 (순차적 처리로 안정성 향상)
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      console.log(`\n[${i + 1}/${members.length}] ${member.nickname} 처리 중...`);
      
      // user_id가 없는 경우 스킵
      if (!member.user_id) {
        console.log(`⚠️ ${member.nickname}: user_id가 없어서 스킵`);
        failCount++;
        failedMembers.push({ nickname: member.nickname, error: 'user_id가 없음' });
        continue;
      }
      
      // 서버 부하 방지를 위한 지연
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const result = await updateMemberProfile(member);
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        failedMembers.push({ nickname: member.nickname, error: result.error || '알 수 없는 오류' });
      }
    }

    // 항마력 변동 계산
    const deltaCalculated = await calculateCombatPowerDeltas();

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    const summary = {
      timestamp: startTime.toISOString(),
      totalMembers: members.length,
      successCount,
      failCount,
      failedMembers,
      deltaCalculated,
      startedAt: startTime.toLocaleString(),
      completedAt: endTime.toLocaleString(),
      duration: `${Math.round(duration / 1000)}초`
    };

    console.log('\n📊 업데이트 결과 요약:');
    console.log(`✅ 성공: ${successCount}명`);
    console.log(`❌ 실패: ${failCount}명`);
    console.log(`⏱️  소요시간: ${Math.round(duration / 1000)}초`);
    
    if (failedMembers.length > 0) {
      console.log('\n❌ 실패한 길드원들:');
      failedMembers.forEach(member => {
        console.log(`  - ${member.nickname}: ${member.error}`);
      });
    }

    // 성공률이 낮은 경우 경고
    const successRate = (successCount / members.length) * 100;
    if (successRate < 50) {
      console.log(`⚠️ 경고: 성공률이 낮습니다 (${successRate.toFixed(1)}%)`);
    }

    return NextResponse.json({
      success: true,
      message: '일일 업데이트 완료',
      summary
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ 일일 업데이트 중 오류:', errorMsg);
    console.error('🔍 오류 상세:', error);
    return NextResponse.json({ 
      success: false, 
      error: errorMsg 
    }, { status: 500 });
  }
}
