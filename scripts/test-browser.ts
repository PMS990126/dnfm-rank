#!/usr/bin/env npx tsx

// 환경변수 로드
import { config } from 'dotenv';
config({ path: '.env.local' });

import { getBrowser } from '@/lib/browser';

async function testBrowser() {
  console.log('🧪 브라우저 기본 테스트 시작...');
  
  try {
    console.log('🔧 브라우저 시작...');
    const browser = await getBrowser();
    console.log('✅ 브라우저 시작 성공');
    
    const ctx = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "ko-KR",
      viewport: { width: 1280, height: 900 },
    });
    console.log('✅ 컨텍스트 생성 성공');
    
    const page = await ctx.newPage();
    console.log('✅ 페이지 생성 성공');
    
    const url = 'https://dnfm.nexon.com/Profile/User/6629864';
    console.log(`🌐 URL 접근: ${url}`);
    
    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
    console.log('✅ 페이지 로딩 완료');
    
    const title = await page.title();
    console.log('📄 페이지 제목:', title);
    
    // 기본 요소들 확인
    const hasBody = await page.$('body') !== null;
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200));
    const dtElements = await page.$$eval('dt', elements => elements.map(el => el.textContent?.trim()));
    const ddElements = await page.$$eval('dd', elements => elements.map(el => el.textContent?.trim()));
    
    console.log('📋 기본 정보:');
    console.log('- body 존재:', hasBody);
    console.log('- body 텍스트 일부:', bodyText);
    console.log('- DT 요소들:', dtElements);
    console.log('- DD 요소들:', ddElements);
    
    // 닉네임 패턴 테스트
    const nicknameMatch = await page.evaluate(() => {
      const pattern = /Lv\.?\s*\d+\s+([^\s<>]+)/;
      const match = document.body.innerText.match(pattern);
      return match ? { full: match[0], nickname: match[1] } : null;
    });
    console.log('🏷️ 닉네임 매치:', nicknameMatch);
    
    // 페이지 HTML 구조 확인
    const pageHTML = await page.content();
    console.log('📝 HTML 길이:', pageHTML.length);
    
    // 특정 패턴들 찾기
    const patterns = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasServer: text.includes('시로코'),
        hasGuild: text.includes('항마압축파'),
        hasAdventure: text.includes('흑룡학무령단'),
        serverMatch: text.match(/서버\s*[:：]?\s*([^\s|\n]+)/),
        guildMatch: text.match(/길드\s*[:：]?\s*([^\s|\n]+)/),
        adventureMatch: text.match(/모험단명\s*[:：]?\s*([^\s|\n]+)/),
      };
    });
    console.log('🔍 패턴 매칭 결과:', patterns);
    
    await ctx.close();
    console.log('✅ 테스트 완료');
    
  } catch (error) {
    console.error('❌ 브라우저 테스트 실패:', error.message);
    console.error('스택:', error.stack);
  }
}

testBrowser().catch(error => {
  console.error('❌ 최상위 오류:', error);
  process.exit(1);
});
