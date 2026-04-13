# Content QA Process

## 목적

입문자 기준으로 레슨 카피, romaji, 오디오, 복습 프롬프트를 출시 전에 빠르게 점검하기 위한 최소 QA 절차입니다.

## 사람이 보는 체크리스트

1. 정답이 문제 문구 안에 직접 드러나지 않는가
2. 한국어 번역이 실제 일본어 난이도와 맞는가
3. romaji가 소문자 기준으로 일관적인가
4. 초반 starter 레슨은 설명, 예문, 팁이 실제 입문 교재처럼 충분히 손편집되어 있는가
5. 말하기 단계에 체크리스트가 현재 문장 구조와 맞게 보이는가
6. starter 코어 레슨은 고정 음원이 실제로 재생되는가
7. review prompt가 lesson 본문과 모순되지 않는가

## 자동 검사

```bash
npm run content:check
```

현재 자동 검사는 아래를 확인합니다.

- romaji 안의 이상한 대소문자 섞임
- 두 칸 이상 공백이 들어간 문자열
- 수동 override slug와 실제 lesson slug 불일치
- starter 고정 음원 파일 누락

## 고정 음원 재생성

```bash
npm run audio:starter
```

이 스크립트는 starter 코어 15개 레슨의 MP3를 다시 생성합니다.
