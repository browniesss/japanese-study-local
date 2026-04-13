# Cloudflare Pages + D1 배포 골격

현재 저장소는 아래 구조를 전제로 외부 배포 준비가 되어 있습니다.

- 프론트 정적 배포: Cloudflare Pages
- API: Pages Functions (`functions/api/*`)
- 진행도 저장: Cloudflare D1
- 오디오/이미지 확장 저장소: Cloudflare R2

## 포함된 파일

- `wrangler.jsonc`
- `migrations/0001_progress.sql`
- `functions/api/health.js`
- `functions/api/bootstrap.js`
- `functions/api/progress.js`

## 현재 API 역할

- `POST /api/bootstrap`
  닉네임과 선택적 device token을 받아 사용자 세션을 준비합니다.
- `GET /api/progress?deviceToken=...`
  특정 사용자의 저장된 진행도를 읽습니다.
- `POST /api/progress`
  특정 사용자의 진행도를 JSON 전체로 저장합니다.

## 운영 원칙

- 화면 UX는 닉네임만 입력
- 실제 저장 키는 브라우저 내부 device token 사용
- DB에는 진행도 전체를 JSON blob으로 먼저 저장

## D1 적용 예시

1. D1 DB 생성
2. `wrangler.jsonc` 의 `database_id` 교체
3. `wrangler d1 migrations apply japanese-study-progress`
4. Pages 프로젝트를 이 저장소와 연결

## 주의

- 현재 프론트는 아직 로컬 저장소를 기본값으로 사용합니다.
- Pages Functions 를 실제로 붙일 때는 `progressStore` 를 원격 저장소로 교체하거나, 로컬/원격 하이브리드로 확장하면 됩니다.
- 이 단계에서는 콘텐츠 구조와 배포 골격을 먼저 안정화하는 것이 우선입니다.
