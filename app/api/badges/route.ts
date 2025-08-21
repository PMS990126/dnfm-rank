import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// 타입 정의
interface BadgeDefinition {
  id: any;
  name: any;
  description: any;
  icon_url: any;
  rarity: any;
}

interface UserBadgeItem {
  badge_id: any;
  earned_at: any;
  earned_condition: any;
  badge_definitions: BadgeDefinition[];
}

// 뱃지 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authorKey = searchParams.get('authorKey');
    
    const db = getDb();
    
    if (authorKey) {
      // 특정 사용자의 뱃지 조회
      const { data, error } = await db
        .from('user_badges')
        .select(`
          badge_id,
          earned_at,
          earned_condition,
          badge_definitions (
            id,
            name,
            description,
            icon_url,
            rarity
          )
        `)
        .eq('author_key', authorKey);
      
      if (error) throw error;
      
      const badges = (data as UserBadgeItem[])?.map(item => ({
        id: item.badge_definitions[0]?.id,
        name: item.badge_definitions[0]?.name,
        description: item.badge_definitions[0]?.description,
        iconUrl: item.badge_definitions[0]?.icon_url,
        rarity: item.badge_definitions[0]?.rarity,
        earnedAt: item.earned_at,
        earnedCondition: item.earned_condition
      })) || [];
      
      return NextResponse.json({ badges });
    } else {
      // 모든 뱃지 정의 조회
      const { data, error } = await db
        .from('badge_definitions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return NextResponse.json({ badges: data });
    }
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 });
  }
}

// 사용자에게 뱃지 부여
export async function POST(request: NextRequest) {
  try {
    const { authorKey, badgeId, earnedCondition } = await request.json();
    
    if (!authorKey || !badgeId) {
      return NextResponse.json({ error: 'authorKey and badgeId are required' }, { status: 400 });
    }
    
    const db = getDb();
    
    const { data, error } = await db
      .from('user_badges')
      .insert({
        author_key: authorKey,
        badge_id: badgeId,
        earned_condition: earnedCondition || '',
        earned_at: new Date().toISOString()
      })
      .select();
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error awarding badge:', error);
    return NextResponse.json({ error: 'Failed to award badge' }, { status: 500 });
  }
}

// 사용자 뱃지 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authorKey = searchParams.get('authorKey');
    const badgeId = searchParams.get('badgeId');
    
    if (!authorKey || !badgeId) {
      return NextResponse.json({ error: 'authorKey and badgeId are required' }, { status: 400 });
    }
    
    const db = getDb();
    
    const { error } = await db
      .from('user_badges')
      .delete()
      .eq('author_key', authorKey)
      .eq('badge_id', badgeId);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing badge:', error);
    return NextResponse.json({ error: 'Failed to remove badge' }, { status: 500 });
  }
}
