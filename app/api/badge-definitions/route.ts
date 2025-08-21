import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// 뱃지 정의 조회
export async function GET() {
  try {
    const db = getDb();
    
    const { data, error } = await db
      .from('badge_definitions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json({ badges: data });
  } catch (error) {
    console.error('Error fetching badge definitions:', error);
    return NextResponse.json({ error: 'Failed to fetch badge definitions' }, { status: 500 });
  }
}

// 새 뱃지 정의 생성
export async function POST(request: NextRequest) {
  try {
    const { name, description, iconUrl, rarity } = await request.json();
    
    if (!name || !description) {
      return NextResponse.json({ error: 'name and description are required' }, { status: 400 });
    }
    
    if (!['common', 'rare', 'epic', 'legendary'].includes(rarity)) {
      return NextResponse.json({ error: 'Invalid rarity value' }, { status: 400 });
    }
    
    const db = getDb();
    
    const { data, error } = await db
      .from('badge_definitions')
      .insert({
        name,
        description,
        icon_url: iconUrl || '',
        rarity: rarity || 'common'
      })
      .select();
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating badge definition:', error);
    return NextResponse.json({ error: 'Failed to create badge definition' }, { status: 500 });
  }
}

// 뱃지 정의 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const badgeId = searchParams.get('badgeId');
    
    if (!badgeId) {
      return NextResponse.json({ error: 'badgeId is required' }, { status: 400 });
    }
    
    const db = getDb();
    
    // 먼저 해당 뱃지를 사용 중인 사용자가 있는지 확인
    const { data: userBadges, error: checkError } = await db
      .from('user_badges')
      .select('id')
      .eq('badge_id', badgeId)
      .limit(1);
    
    if (checkError) throw checkError;
    
    if (userBadges && userBadges.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete badge definition. Badge is currently assigned to users.' 
      }, { status: 400 });
    }
    
    const { error } = await db
      .from('badge_definitions')
      .delete()
      .eq('id', badgeId);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting badge definition:', error);
    return NextResponse.json({ error: 'Failed to delete badge definition' }, { status: 500 });
  }
}
