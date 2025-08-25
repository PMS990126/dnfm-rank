import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // 빌드 시점 체크 (빌드 시에는 즉시 반환)
    if (process.env.NODE_ENV === 'production' && !request) {
      return NextResponse.json({ message: 'Cron job endpoint' });
    }

    const startTime = new Date();
    console.log('🚀 Vercel Cron Job - Supabase Edge Function 호출 시작:', startTime.toLocaleString());
    
    // 환경변수 확인
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase 환경변수가 설정되지 않았습니다.' 
      }, { status: 500 });
    }

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

    console.log('🌍 환경변수 확인:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      nodeEnv: process.env.NODE_ENV
    });

    // Supabase Edge Function 호출
    console.log('📡 Supabase Edge Function 호출 중...');
    const response = await fetch(
      `${supabaseUrl}/functions/v1/daily-update`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(600000), // 10분 타임아웃
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Edge Function 호출 실패: HTTP ${response.status} - ${errorText}`);
      return NextResponse.json({ 
        success: false, 
        error: `Edge Function failed: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log('✅ Edge Function 실행 완료');
    console.log('📊 실행 결과:', result);
    console.log(`⏱️ 총 소요 시간: ${Math.round(duration / 1000)}초`);

    return NextResponse.json({
      success: true,
      message: 'Supabase Edge Function 실행 완료',
      result,
      executionTime: startTime.toISOString(),
      duration: `${Math.round(duration / 1000)}초`
    });

  } catch (error) {
    console.error('❌ Vercel Cron Job 오류:', error);
    return NextResponse.json({
      success: false,
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
