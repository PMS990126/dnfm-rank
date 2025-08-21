import { config } from 'dotenv';
config({ path: '.env.local' });

import { getDb } from '../lib/db';
import { scrapeProfileByUserId } from '../lib/scraper';
import fs from 'fs';

interface Author {
  author_key: string;
  user_id: string;
  nickname: string;
  combat_power: number;
}

async function checkSupabaseConnection() {
  try {
    const db = getDb();
    const { data, error } = await db.from('authors').select('count(*)').limit(1);
    if (error) throw error;
    console.log('✅ Supabase 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ Supabase 연결 실패:', error);
    return false;
  }
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
      console.log(`⚠️  ${member.nickname}: user_id 없음, 스킵`);
      return { success: false };
    }

    console.log(`🔄 ${member.nickname} 프로필 업데이트 중...`);
    
    const profileData = await scrapeProfileByUserId(member.user_id, { debug: false });
    
    if (!profileData) {
      console.log(`❌ ${member.nickname}: 프로필 스크래핑 실패`);
      return { success: false };
    }

    const db = getDb();
    const { error } = await db
      .from('authors')
      .update({
        level: profileData.level,
        combat_power: profileData.combatPower,
        adventure_level: profileData.adventureLevel,
        updated_at: new Date().toISOString()
      })
      .eq('author_key', member.author_key);

    if (error) {
      console.error(`❌ ${member.nickname}: DB 업데이트 실패:`, error);
      return { success: false };
    }

    const powerChange = profileData.combatPower - member.combat_power;
    const changeIcon = powerChange > 0 ? '📈' : powerChange < 0 ? '📉' : '➖';
    
    console.log(`✅ ${member.nickname}: ${member.combat_power.toLocaleString()} → ${profileData.combatPower.toLocaleString()} ${changeIcon} ${powerChange > 0 ? '+' : ''}${powerChange.toLocaleString()}`);
    
    return { success: true, newCombatPower: profileData.combatPower };
  } catch (error) {
    console.error(`❌ ${member.nickname}: 업데이트 중 오류:`, error);
    return { success: false };
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

async function cleanupOldHistory() {
  try {
    console.log('🔄 오래된 히스토리 데이터 정리 중...');
    const db = getDb();
    
    const { error } = await db.rpc('cleanup_old_combat_history');
    
    if (error) {
      console.error('❌ 히스토리 정리 실패:', error);
      return false;
    }
    
    console.log('✅ 오래된 히스토리 데이터 정리 완료');
    return true;
  } catch (error) {
    console.error('❌ 히스토리 정리 중 오류:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 일일 프로필 업데이트 시작:', new Date().toLocaleString());
  
  // Supabase 연결 확인
  const isConnected = await checkSupabaseConnection();
  if (!isConnected) {
    console.error('❌ Supabase 연결 실패로 종료');
    process.exit(1);
  }

  // 길드원 목록 조회
  const members = await getAllGuildMembers();
  if (members.length === 0) {
    console.log('❌ 업데이트할 길드원이 없습니다.');
    return;
  }

  console.log(`📋 총 ${members.length}명의 길드원 프로필 업데이트 시작`);

  let successCount = 0;
  let failCount = 0;

  // 각 길드원 프로필 업데이트
  for (const member of members) {
    const result = await updateMemberProfile(member);
    
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }

    // 서버 부하 방지를 위한 대기 (2초)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n📊 업데이트 결과:');
  console.log(`✅ 성공: ${successCount}명`);
  console.log(`❌ 실패: ${failCount}명`);

  // 항마력 변동 계산
  await calculateCombatPowerDeltas();

  // 오래된 히스토리 정리
  await cleanupOldHistory();

  // 로그 파일 생성
  const logData = {
    timestamp: new Date().toISOString(),
    totalMembers: members.length,
    successCount,
    failCount,
    completedAt: new Date().toLocaleString()
  };

  fs.writeFileSync(
    `logs/daily-update-${new Date().toISOString().split('T')[0]}.json`,
    JSON.stringify(logData, null, 2)
  );

  console.log('🎉 일일 업데이트 완료:', new Date().toLocaleString());
}

// 스크립트 실행
main().catch(console.error);
