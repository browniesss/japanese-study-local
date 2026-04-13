# Vercel 배포

이 프로젝트는 Vercel에서 다음 구조로 배포하도록 정리되어 있다.

- 프론트엔드: Vite 정적 배포
- API: `api/*.js` Vercel Functions
- 진행 저장: 외부 Postgres (`DATABASE_URL`)

## 필요한 것

1. Vercel 프로젝트
2. Postgres 연결 문자열
   - Neon, Supabase, Railway Postgres 등 아무거나 가능
3. Vercel 환경 변수
   - `DATABASE_URL`

## 동작 방식

- `/api/health`
  - DB 연결 가능 여부 확인
- `/api/bootstrap`
  - 닉네임 + 내부 device token 기준으로 학습 프로필 생성/복구
- `/api/progress`
  - 학습 진행 조회/저장

## 첫 배포

```bash
npm install
npm run build
vercel
```

프로덕션 배포는 다음으로 올릴 수 있다.

```bash
vercel --prod
```

## 환경 변수

Vercel 프로젝트 Settings > Environment Variables 에서 아래 값을 넣는다.

```bash
DATABASE_URL=postgres://...
```

## 참고

- DB 테이블은 첫 API 호출 때 자동 생성된다.
- `DATABASE_URL`이 없으면 앱은 원격 저장을 비활성화하고 로컬 저장으로만 동작한다.
