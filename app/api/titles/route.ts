import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// 칭호 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authorKey = searchParams.get('authorKey');
    
    const db = getDb();
    
    if (authorKey) {
      // 특정 사용자의 칭호 조회
      const { data, error } = await db
        .from('user_titles')
        .select('title')
        .eq('author_key', authorKey)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return NextResponse.json({ title: data?.title || null });
    } else {
      // 모든 칭호 조회
      const { data, error } = await db
        .from('user_titles')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      return NextResponse.json({ titles: data });
    }
  } catch (error) {
    console.error('Error fetching titles:', error);
    return NextResponse.json({ error: 'Failed to fetch titles' }, { status: 500 });
  }
}

// 칭호 설정/수정
export async function POST(request: NextRequest) {
  try {
    const { authorKey, title } = await request.json();
    
    if (!authorKey || !title) {
      return NextResponse.json({ error: 'authorKey and title are required' }, { status: 400 });
    }
    
    const db = getDb();
    
    const { data, error } = await db
      .from('user_titles')
      .upsert({
        author_key: authorKey,
        title: title,
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error setting title:', error);
    return NextResponse.json({ error: 'Failed to set title' }, { status: 500 });
  }
}

// 칭호 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authorKey = searchParams.get('authorKey');
    
    if (!authorKey) {
      return NextResponse.json({ error: 'authorKey is required' }, { status: 400 });
    }
    
    const db = getDb();
    
    const { error } = await db
      .from('user_titles')
      .delete()
      .eq('author_key', authorKey);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting title:', error);
    return NextResponse.json({ error: 'Failed to delete title' }, { status: 500 });
  }
}
