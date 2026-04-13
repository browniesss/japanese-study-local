# 고정 음원 파일 규칙

입문 코어 구간은 `/audio/starter/<lesson-id>.mp3` 파일을 먼저 찾고, 파일이 없으면 브라우저 음성으로 재생합니다.

예시:

- `public/audio/starter/starter-welcome-flow.mp3`
- `public/audio/starter/starter-vowel-rhythm.mp3`
- `public/audio/starter/starter-starter-kana-rhythm-1-1.mp3`

앱은 다음 키를 우선 찾습니다.

- `lessonId-speaking`
- `review-lessonId`

두 키는 같은 MP3 파일을 공유합니다.
