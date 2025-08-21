let chromiumRef: any = null;
let browser: any = null;

async function ensureChromium() {
  if (process.env.PLAYWRIGHT_ENABLE === "false") {
    throw new Error("Playwright disabled (PLAYWRIGHT_ENABLE=false)");
  }
  if (!chromiumRef) {
    try {
      const dynamicImport: any = new Function("m", "return import(m)");
      const mod = await dynamicImport("playwright");
      chromiumRef = mod.chromium;
    } catch (e) {
      throw new Error("playwright not available. Run `npm i playwright` then `npx playwright install chromium`.");
    }
  }
}

export async function getBrowser() {
  await ensureChromium();
  if (browser) return browser;
  browser = await chromiumRef.launch({ headless: true, args: ["--disable-blink-features=AutomationControlled"] });
  return browser;
}

export async function renderHtml(url: string): Promise<string> {
  await ensureChromium();
  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "ko-KR",
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  try {
    await Promise.race([
      page.waitForSelector("text=대표 캐릭터", { timeout: 8000 }),
      page.waitForSelector(".tit_character", { timeout: 8000 }),
      page.waitForSelector("dt:has-text(\"길드\")", { timeout: 8000 }),
    ]);
  } catch {}
  await page.waitForTimeout(800);
  const html = await page.content();
  await ctx.close();
  return html;
}

export async function renderProfileData(url: string): Promise<any> {
  await ensureChromium();
  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "ko-KR",
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  try {
    await Promise.race([
      page.waitForSelector("text=대표 캐릭터", { timeout: 8000 }),
      page.waitForSelector(".tit_character", { timeout: 8000 }),
      page.waitForSelector("dt:has-text(\"길드\")", { timeout: 8000 }),
    ]);
  } catch {}
  await page.waitForTimeout(800);

  // Evaluate in all frames and pick the best complete record
  async function extractInFrame(frame: any) {
    // 더 간단한 접근법으로 직접 메인 페이지에서만 추출
    const result = await frame.evaluate('(function() { ' +
      'var nickname = ""; ' +
      'var nameElement = document.querySelector("li.-name span"); ' +
      'if (nameElement) { ' +
        'var nameText = nameElement.textContent || ""; ' +
        'var nicknameMatch = nameText.match(/Lv\\.?\\s*\\d+\\s+(.+)/); ' +
        'if (nicknameMatch) nickname = nicknameMatch[1].trim(); ' +
      '} ' +
      'if (!nickname) { ' +
        'var nicknameMatch2 = document.body.innerText.match(/Lv\\.?\\s*\\d+\\s+([^\\s<>]+)/); ' +
        'if (nicknameMatch2) nickname = nicknameMatch2[1].trim(); ' +
      '} ' +
      
      'var level = 0; ' +
      'if (nameElement) { ' +
        'var nameText = nameElement.textContent || ""; ' +
        'var levelMatch = nameText.match(/Lv\\.?\\s*(\\d+)/); ' +
        'if (levelMatch) level = parseInt(levelMatch[1], 10); ' +
      '} ' +
      
      'var specSpans = Array.from(document.querySelectorAll("li.-spec span")); ' +
      'var server = "", job = "", combatPower = 0, guild = ""; ' +
      'for (var i = 0; i < specSpans.length; i++) { ' +
        'var text = specSpans[i].textContent || ""; ' +
        'if (text.includes("서버:")) server = text.replace("서버:", "").trim(); ' +
        'else if (text.includes("직업:")) { ' +
          'var jobSpan = specSpans[i].querySelector(".UserClassName"); ' +
          'job = jobSpan ? (jobSpan.textContent || "").trim() : text.replace("직업:", "").trim(); ' +
        '} ' +
        'else if (text.includes("항마력:")) combatPower = parseInt(text.replace("항마력:", "").replace(/,/g, "").trim(), 10) || 0; ' +
        'else if (text.includes("길드")) guild = text.replace(/길드\\s*:?\\s*/, "").trim(); ' +
      '} ' +
      
      'var accountSpans = Array.from(document.querySelectorAll("li.-account span")); ' +
      'var adventureName = "", adventureLevel = 0; ' +
      'for (var j = 0; j < accountSpans.length; j++) { ' +
        'var text = accountSpans[j].textContent || ""; ' +
        'if (text.includes("모험단명:")) adventureName = text.replace("모험단명:", "").trim(); ' +
        'else if (text.includes("모험단 레벨:")) { ' +
          'var advMatch = text.match(/Lv\\.?\\s*(\\d+)/); ' +
          'if (advMatch) adventureLevel = parseInt(advMatch[1], 10); ' +
        '} ' +
      '} ' +
      
      'return { ' +
        'nickname: nickname, ' +
        'level: level, ' +
        'server: server, ' +
        'job: job, ' +
        'combatPower: combatPower, ' +
        'guild: guild, ' +
        'adventureName: adventureName, ' +
        'adventureLevel: adventureLevel, ' +
        'avatarUrl: "", ' +
        'debugInfo: { ' +
          'hasNameElement: !!document.querySelector("li.-name span"), ' +
          'hasSpecElements: document.querySelectorAll("li.-spec span").length, ' +
          'hasAccountElements: document.querySelectorAll("li.-account span").length, ' +
          'specSpanTexts: Array.from(document.querySelectorAll("li.-spec span")).map(function(s) { return s.textContent ? s.textContent.trim() : ""; }), ' +
          'accountSpanTexts: Array.from(document.querySelectorAll("li.-account span")).map(function(s) { return s.textContent ? s.textContent.trim() : ""; }) ' +
        '} ' +
      '}; ' +
    '})()');
    
    return result;
  }

  const frames = page.frames();
  const results: any[] = [];
  
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    try {
      const r = await extractInFrame(f);
      results.push(r);
    } catch (error) {
      // Silently continue on frame errors
    }
  }
  
  const score = (r: any) => [r.nickname, r.server, r.job, r.combatPower, r.guild].filter(Boolean).length;
  results.sort((a, b) => score(b) - score(a));
  
  const data = results[0] || { nickname: "", level: 0, server: "", job: "", combatPower: 0, guild: "", adventureName: "", adventureLevel: 0, avatarUrl: "" };

  await ctx.close();
  return data;
}
