# 콘텐츠 구조

이 앱은 이제 레슨/문제 세트를 코드 안 하드코딩이 아니라 `content/` 폴더의 정적 JSON 파일로 관리합니다.

## 현재 구조

- `content/manifest.json`
- `content/courses/starter.json`
- `content/courses/beginner.json`
- `content/courses/intermediate.json`
- `content/courses/advanced.json`

앱 런타임은 `public/content` 를 직접 읽고, 개발/빌드 전에 `content/` 를 `public/content/` 로 동기화합니다.

## 명령어

- `npm run content:bootstrap`
  현재 레거시 `src/data/curriculum.ts` 데이터를 `content/` 로 1회 내보냅니다.
- `npm run content:sync`
  `content/` 를 `public/content/` 로 복사합니다.
- `npm run content:check`
  JSON 콘텐츠의 참조 무결성, 중복 ID, 정답 개수, 문장 품질을 검사합니다.

## 앞으로의 운영 방식

앞으로 레슨을 추가할 때는 `src/data/curriculum.ts` 가 아니라 `content/courses/*.json` 을 수정하는 쪽을 기준으로 가져가는 것이 맞습니다.

추천 절차:

1. 해당 코스 JSON에 unit, lesson, review item을 추가
2. `npm run content:check`
3. `npm run content:sync`
4. `npm run dev`

## 의도

- 콘텐츠 변경을 코드 배포와 분리
- 리뷰/검수 시 diff 확인 단순화
- 대량 레슨 추가 시 앱 번들 코드와 학습 데이터 분리
- 향후 CMS나 관리 화면 도입 전까지 가장 단순한 authoring 경로 유지
