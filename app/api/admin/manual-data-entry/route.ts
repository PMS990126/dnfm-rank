import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface GuildMember {
  nickname: string;
  level: number;
  server: string;
  job: string;
  combatPower: number;
  guild: string;
  adventureName?: string;
  adventureLevel?: number;
  user_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { members }: { members: GuildMember[] } = await request.json();

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: '유효하지 않은 데이터입니다.' }, { status: 400 });
    }

    const db = getDb();
    let updatedCount = 0;
    const errors: string[] = [];

    // 각 길드원 데이터를 데이터베이스에 upsert
    for (const member of members) {
      try {
        const authorKey = `${member.server}:${member.nickname}`;
        
        const { error } = await db
          .from('authors')
          .upsert({
            author_key: authorKey,
            nickname: member.nickname,
            level: member.level,
            server: member.server,
            job: member.job,
            combat_power: member.combatPower,
            guild: member.guild,
            adventure_name: member.adventureName || null,
            adventure_level: member.adventureLevel || null,
            user_id: member.user_id || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'author_key'
          });

        if (error) {
          errors.push(`${member.nickname}: ${error.message}`);
        } else {
          updatedCount++;
        }
      } catch (error) {
        errors.push(`${member.nickname}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (errors.length > 0) {
      console.error('수동 데이터 입력 중 오류:', errors);
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      totalMembers: members.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('수동 데이터 입력 API 오류:', error);
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    
    // 현재 데이터베이스의 길드원 목록 조회
    const { data: authors, error } = await db
      .from('authors')
      .select('*')
      .order('nickname');

    if (error) {
      return NextResponse.json({ error: '데이터 조회 실패' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      authors: authors || []
    });

  } catch (error) {
    console.error('길드원 목록 조회 오류:', error);
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
