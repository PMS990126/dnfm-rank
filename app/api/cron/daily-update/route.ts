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
    .eq('guild', '항마압축파')
    .order('combat_power', { ascending: false });

  if (error) {
    console.error('❌ 길드원 목록 조회 실패:', error);
    return [];
  }

  return data || [];
}

async function updateMemberProfile(member: Author): Promise<{ success: boolean; newCombatPower?: number }> {
  try {
    if (!member.user_id) {
      return { success: false };
    }

    const profileData = await scrapeProfileByUserId(member.user_id, { debug: false });
    
    if (!profileData || !profileData.exists || !profileData.profile) {
      return { success: false };
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
      return { success: false };
    }

    return { success: true, newCombatPower: profileData.profile.combatPower };
  } catch (error) {
    console.error(`❌ ${member.nickname}: 업데이트 중 오류:`, error);
    return { success: false };
  }
}

async function calculateCombatPowerDeltas() {
  try {
    const db = getDb();
    const { error } = await db.rpc('calculate_combat_power_delta');
    
    if (error) {
      console.error('❌ 항마력 변동 계산 실패:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ 항마력 변동 계산 중 오류:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 일일 프로필 업데이트 시작:', new Date().toLocaleString());
    
    // Vercel Cron 인증 확인
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 길드원 목록 조회
    const members = await getAllGuildMembers();
    if (members.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: '업데이트할 길드원이 없습니다.' 
      });
    }

    let successCount = 0;
    let failCount = 0;

    // 각 길드원 프로필 업데이트 (병렬 처리를 위해 Promise.allSettled 사용)
    const updatePromises = members.map(async (member, index) => {
      // 서버 부하 방지를 위한 순차적 처리
      await new Promise(resolve => setTimeout(resolve, index * 1000));
      
      const result = await updateMemberProfile(member);
      return { member: member.nickname, result };
    });

    const results = await Promise.allSettled(updatePromises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.result.success) {
        successCount++;
      } else {
        failCount++;
      }
    });

    // 항마력 변동 계산
    const deltaCalculated = await calculateCombatPowerDeltas();

    const summary = {
      timestamp: new Date().toISOString(),
      totalMembers: members.length,
      successCount,
      failCount,
      deltaCalculated,
      completedAt: new Date().toLocaleString()
    };

    console.log('📊 업데이트 결과:', summary);

    return NextResponse.json({
      success: true,
      message: '일일 업데이트 완료',
      summary
    });

  } catch (error) {
    console.error('❌ 일일 업데이트 중 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
