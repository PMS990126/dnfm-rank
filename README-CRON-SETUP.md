# 🕐 Vercel Cron Job 설정 가이드

## 📋 필수 환경변수 설정

`.env.local` 파일에 다음을 추가하세요:

```bash
# Supabase 설정 (필수)
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key_here

# Cron Job 인증 (권장)
CRON_SECRET=your_secret_key_here

# 관리자 인증 (선택사항)
ADMIN_SECRET=your_admin_secret_here
```

## 🔑 CRON_SECRET 생성 방법

1. **터미널에서 랜덤 문자열 생성:**
```bash
# Windows PowerShell
$random = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
echo $random

# macOS/Linux
openssl rand -base64 32
```

2. **생성된 문자열을 CRON_SECRET에 설정**

## 🚀 Cron Job 테스트

### **1. 수동 실행 테스트**
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.vercel.app/api/cron/daily-update
```

### **2. 로컬 테스트**
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/daily-update
```

## 📊 Vercel에서 Cron Job 모니터링

### **1. Functions 탭 확인**
- Vercel 대시보드 → 프로젝트 → **Functions**
- `/api/cron/daily-update` 함수 확인

### **2. 실행 로그 확인**
- **Functions** → **View Function** → **Logs**
- 매일 6시 30분 실행 로그 확인

### **3. 환경변수 확인**
- **Settings** → **Environment Variables**
- `CRON_SECRET` 설정 확인

## ⚠️ 문제 해결

### **Cron Job이 실행되지 않는 경우:**

1. **환경변수 확인**
   - `CRON_SECRET`이 설정되어 있는지 확인
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE` 설정 확인

2. **Vercel 플랜 확인**
   - 무료 플랜에서는 cron job이 제한적일 수 있음
   - Pro 플랜으로 업그레이드 고려

3. **수동 실행 테스트**
   - API가 정상 작동하는지 수동으로 테스트
   - 에러 로그 확인

### **대안 방법:**

1. **외부 Cron 서비스 사용**
   - [UptimeRobot](https://uptimerobot.com/)
   - [Cron-job.org](https://cron-job.org/)
   - [EasyCron](https://www.easycron.com/)

2. **수동 업데이트 정기 실행**
   - 관리자 페이지에서 정기적으로 수동 실행
   - 브라우저 자동화 도구 사용

## 🔧 Cron Job 스케줄

현재 설정: `30 6 * * *` (매일 6시 30분)

### **다른 스케줄 옵션:**
```bash
# 매일 오전 6시 30분
30 6 * * *

# 매일 오후 6시 30분 (추가)
30 18 * * *

# 매 6시간마다
0 */6 * * *

# 매일 자정
0 0 * * *
```

## 📝 로그 확인 방법

### **Vercel 로그:**
```bash
# 실시간 로그 확인
vercel logs --follow

# 특정 함수 로그 확인
vercel logs --function api/cron/daily-update
```

### **로컬 로그:**
```bash
# 개발 서버 실행 시 콘솔에서 확인
npm run dev
```

## ✅ 성공적인 Cron Job 실행 확인

1. **로그에서 성공 메시지 확인:**
   ```
   🚀 일일 프로필 업데이트 시작: [시간]
   ✅ 인증 성공
   📋 총 X명의 길드원을 업데이트합니다.
   ✅ 업데이트 완료
   ```

2. **DB에서 `updated_at` 필드 확인**
3. **Vercel Functions에서 실행 시간 확인**
