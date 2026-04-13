import type { ChoiceOption } from '../types'

type SimpleSeed = {
  slug: string
  title: string
  subtitle: string
  objective: string
  sampleText: string
  sampleRomaji: string
  sampleTranslation: string
  extraExamples?: {
    title: string
    text: string
    romaji?: string
    translation?: string
  }[]
  quizTitle: string
  quizDescription: string
  quizPromptText: string
  quizOptions: ChoiceOption[]
  review:
    | {
        type: 'choice'
        prompt: string
        text: string
        translation?: string
        options: ChoiceOption[]
      }
    | {
        type: 'speaking'
        prompt: string
        text: string
        romaji?: string
        translation: string
        hint: string
      }
}

export type ExtensionUnit = {
  slug: string
  phase: string
  title: string
  summary: string
  badgeId: string
  keyPoints: string[]
  canDo: string[]
  speakingHint: string
  lessons: SimpleSeed[]
}

type Phrase = {
  label: string
  text: string
  romaji: string
  translation: string
}

type PhraseBank = {
  id: string
  phrases: Phrase[]
}

type UnitPlan = {
  slug: string
  phase: string
  title: string
  summary: string
  badgeId: string
  keyPoints: string[]
  canDo: string[]
  speakingHint: string
  bankId: string
}

const option = (id: string, label: string, isCorrect: boolean, explanation: string): ChoiceOption => ({
  id,
  label,
  isCorrect,
  explanation,
})

const lessonModes = [
  {
    suffix: '핵심 읽기',
    quizDescription: '뜻을 보고 가장 자연스러운 일본어 표현을 고르는 단계입니다.',
    speakingLead: '핵심 표현을 소리 내어 익혀 보세요.',
  },
  {
    suffix: '상황 이해',
    quizDescription: '상황 설명에 맞는 표현을 골라서 맥락을 확인합니다.',
    speakingLead: '상황을 떠올리며 천천히 따라 말해 보세요.',
  },
  {
    suffix: '듣기 연결',
    quizDescription: '들리는 표현과 뜻을 연결하는 감각을 키우는 단계입니다.',
    speakingLead: '소리의 리듬을 맞추는 데 집중해 보세요.',
  },
  {
    suffix: '짧은 응답',
    quizDescription: '짧게 반응하거나 되묻는 흐름을 익히는 단계입니다.',
    speakingLead: '문장 끝맺음을 분명하게 읽어 보세요.',
  },
  {
    suffix: '패턴 확장',
    quizDescription: '같은 표현을 다른 예문과 구분하는 단계입니다.',
    speakingLead: '핵심 단어를 바꿔 가며 반복해 보세요.',
  },
  {
    suffix: '빠른 복습',
    quizDescription: '이미 본 표현을 빠르게 떠올리는 연습입니다.',
    speakingLead: '멈추지 말고 한 번에 이어 읽어 보세요.',
  },
  {
    suffix: '실전 적용',
    quizDescription: '실제 생활이나 업무 장면에서 쓸 문장을 골라 봅니다.',
    speakingLead: '실제로 말하는 장면을 떠올리며 읽어 보세요.',
  },
  {
    suffix: '체크포인트',
    quizDescription: '이번 단원 핵심 표현을 마지막으로 확인합니다.',
    speakingLead: '오늘 배운 문장을 자연스럽게 마무리해 보세요.',
  },
]

const makeUnit = (plan: UnitPlan, bank: PhraseBank): ExtensionUnit => {
  const source = bank.phrases

  const lessons = lessonModes.map((mode, index) => {
    const phrase = source[index % source.length]
    const altA = source[(index + 1) % source.length]
    const altB = source[(index + 2) % source.length]

    return {
      slug: `${plan.slug}-${index + 1}`,
      title: `${plan.title} ${index + 1}`,
      subtitle: `${plan.title} 단원에서 ${mode.suffix.toLowerCase()} 흐름을 익힙니다.`,
      objective: `${phrase.translation}에 해당하는 표현을 읽고, 듣고, 직접 말할 수 있습니다.`,
      sampleText: phrase.text,
      sampleRomaji: phrase.romaji,
      sampleTranslation: phrase.translation,
      extraExamples: [
        {
          title: '함께 보는 예문 1',
          text: altA.text,
          romaji: altA.romaji,
          translation: altA.translation,
        },
        {
          title: '함께 보는 예문 2',
          text: altB.text,
          romaji: altB.romaji,
          translation: altB.translation,
        },
      ],
      quizTitle: `${phrase.translation}에 맞는 일본어 표현을 고르세요`,
      quizDescription: mode.quizDescription,
      quizPromptText: phrase.translation,
      quizOptions: [
        option(`${plan.slug}-${index}-correct`, phrase.text, true, '현재 장면에 맞는 표현입니다.'),
        option(`${plan.slug}-${index}-wrong-a`, altA.text, false, '비슷한 맥락이지만 지금 질문의 정답은 아닙니다.'),
        option(`${plan.slug}-${index}-wrong-b`, altB.text, false, '이 표현은 다른 의미로 쓰입니다.'),
      ],
      review: {
        type: 'speaking',
        prompt: `${phrase.translation} 문장을 다시 읽어 보세요.`,
        text: phrase.text,
        romaji: phrase.romaji,
        translation: phrase.translation,
        hint: `${mode.speakingLead} ${plan.speakingHint}`,
      },
    } satisfies SimpleSeed
  })

  return {
    slug: plan.slug,
    phase: plan.phase,
    title: plan.title,
    summary: plan.summary,
    badgeId: plan.badgeId,
    keyPoints: plan.keyPoints,
    canDo: plan.canDo,
    speakingHint: plan.speakingHint,
    lessons,
  }
}

const buildUnits = (plans: UnitPlan[], banks: PhraseBank[]) => {
  const bankMap = Object.fromEntries(banks.map((bank) => [bank.id, bank])) as Record<string, PhraseBank>
  return plans.map((plan) => makeUnit(plan, bankMap[plan.bankId]))
}

const starterBanks: PhraseBank[] = [
  {
    id: 'starter-kana-words',
    phrases: [
      { label: '아침', text: 'あさ', romaji: 'asa', translation: '아침' },
      { label: '강아지', text: 'いぬ', romaji: 'inu', translation: '강아지' },
      { label: '바다', text: 'うみ', romaji: 'umi', translation: '바다' },
      { label: '역', text: 'えき', romaji: 'eki', translation: '역' },
      { label: '언덕', text: 'おか', romaji: 'oka', translation: '언덕' },
      { label: '비', text: 'あめ', romaji: 'ame', translation: '비' },
    ],
  },
  {
    id: 'starter-reading',
    phrases: [
      { label: '우산', text: 'かさ', romaji: 'kasa', translation: '우산' },
      { label: '고양이', text: 'ねこ', romaji: 'neko', translation: '고양이' },
      { label: '집', text: 'いえ', romaji: 'ie', translation: '집' },
      { label: '책상', text: 'つくえ', romaji: 'tsukue', translation: '책상' },
      { label: '자동차', text: 'くるま', romaji: 'kuruma', translation: '자동차' },
      { label: '책', text: 'ほん', romaji: 'hon', translation: '책' },
    ],
  },
  {
    id: 'starter-greetings',
    phrases: [
      { label: '좋은 아침입니다', text: 'おはよう ございます', romaji: 'ohayou gozaimasu', translation: '좋은 아침입니다' },
      { label: '안녕하세요', text: 'こんにちは', romaji: 'konnichiwa', translation: '안녕하세요' },
      { label: '좋은 저녁입니다', text: 'こんばんは', romaji: 'konbanwa', translation: '좋은 저녁입니다' },
      { label: '잘 부탁드립니다', text: 'よろしく おねがいします', romaji: 'yoroshiku onegaishimasu', translation: '잘 부탁드립니다' },
      { label: '감사합니다', text: 'ありがとうございます', romaji: 'arigatou gozaimasu', translation: '감사합니다' },
      { label: '죄송합니다', text: 'すみません', romaji: 'sumimasen', translation: '죄송합니다' },
    ],
  },
  {
    id: 'starter-self-intro',
    phrases: [
      { label: '저는 민수입니다', text: 'わたしは ミンス です', romaji: 'watashi wa minsu desu', translation: '저는 민수입니다' },
      { label: '저는 한국에서 왔습니다', text: 'かんこくから きました', romaji: 'kankoku kara kimashita', translation: '저는 한국에서 왔습니다' },
      { label: '디자인 팀에서 일합니다', text: 'デザイン チームで はたらきます', romaji: 'dezain chiimu de hatarakimasu', translation: '디자인 팀에서 일합니다' },
      { label: '개발을 담당합니다', text: 'かいはつを たんとうします', romaji: 'kaihatsu o tantou shimasu', translation: '개발을 담당합니다' },
      { label: '잘 부탁드립니다', text: 'どうぞ よろしく おねがいします', romaji: 'douzo yoroshiku onegaishimasu', translation: '잘 부탁드립니다' },
      { label: '일본어를 배우고 있습니다', text: 'にほんごを べんきょうしています', romaji: 'nihongo o benkyou shiteimasu', translation: '일본어를 배우고 있습니다' },
    ],
  },
  {
    id: 'starter-numbers-time',
    phrases: [
      { label: '한 시입니다', text: 'いちじ です', romaji: 'ichiji desu', translation: '한 시입니다' },
      { label: '세 시입니다', text: 'さんじ です', romaji: 'sanji desu', translation: '세 시입니다' },
      { label: '일곱 시입니다', text: 'しちじ です', romaji: 'shichiji desu', translation: '일곱 시입니다' },
      { label: '월요일입니다', text: 'げつようび です', romaji: 'getsuyoubi desu', translation: '월요일입니다' },
      { label: '금요일입니다', text: 'きんようび です', romaji: 'kinyoubi desu', translation: '금요일입니다' },
      { label: '오늘은 일요일입니다', text: 'きょうは にちようび です', romaji: 'kyou wa nichiyoubi desu', translation: '오늘은 일요일입니다' },
    ],
  },
  {
    id: 'starter-daily',
    phrases: [
      { label: '물을 마십니다', text: 'みずを のみます', romaji: 'mizu o nomimasu', translation: '물을 마십니다' },
      { label: '밥을 먹습니다', text: 'ごはんを たべます', romaji: 'gohan o tabemasu', translation: '밥을 먹습니다' },
      { label: '책을 읽습니다', text: 'ほんを よみます', romaji: 'hon o yomimasu', translation: '책을 읽습니다' },
      { label: '음악을 듣습니다', text: 'おんがくを ききます', romaji: 'ongaku o kikimasu', translation: '음악을 듣습니다' },
      { label: '잠을 자요', text: 'ねます', romaji: 'nemasu', translation: '잠을 자요' },
      { label: '일찍 일어납니다', text: 'はやく おきます', romaji: 'hayaku okimasu', translation: '일찍 일어납니다' },
    ],
  },
  {
    id: 'starter-shopping',
    phrases: [
      { label: '이것을 주세요', text: 'これを ください', romaji: 'kore o kudasai', translation: '이것을 주세요' },
      { label: '얼마인가요', text: 'いくら ですか', romaji: 'ikura desu ka', translation: '얼마인가요' },
      { label: '조금 비쌉니다', text: 'すこし たかい です', romaji: 'sukoshi takai desu', translation: '조금 비쌉니다' },
      { label: '카드로 계산합니다', text: 'カードで はらいます', romaji: 'kaado de haraimasu', translation: '카드로 계산합니다' },
      { label: '봉투 부탁합니다', text: 'ふくろを おねがいします', romaji: 'fukuro o onegaishimasu', translation: '봉투 부탁합니다' },
      { label: '문제 없습니다', text: 'だいじょうぶ です', romaji: 'daijoubu desu', translation: '문제 없습니다' },
    ],
  },
  {
    id: 'starter-transport',
    phrases: [
      { label: '역에 갑니다', text: 'えきに いきます', romaji: 'eki ni ikimasu', translation: '역에 갑니다' },
      { label: '버스를 탑니다', text: 'バスに のります', romaji: 'basu ni norimasu', translation: '버스를 탑니다' },
      { label: '지하철로 갑니다', text: 'でんしゃで いきます', romaji: 'densha de ikimasu', translation: '지하철로 갑니다' },
      { label: '오른쪽입니다', text: 'みぎ です', romaji: 'migi desu', translation: '오른쪽입니다' },
      { label: '왼쪽입니다', text: 'ひだり です', romaji: 'hidari desu', translation: '왼쪽입니다' },
      { label: '곧 도착합니다', text: 'もうすぐ つきます', romaji: 'mousugu tsukimasu', translation: '곧 도착합니다' },
    ],
  },
  {
    id: 'starter-feeling',
    phrases: [
      { label: '재미있습니다', text: 'たのしい です', romaji: 'tanoshii desu', translation: '재미있습니다' },
      { label: '어렵습니다', text: 'むずかしい です', romaji: 'muzukashii desu', translation: '어렵습니다' },
      { label: '저는 괜찮아요', text: 'へいき です', romaji: 'heiki desu', translation: '저는 괜찮아요' },
      { label: '조금 피곤합니다', text: 'すこし つかれました', romaji: 'sukoshi tsukaremashita', translation: '조금 피곤합니다' },
      { label: '기분이 좋습니다', text: 'きぶんが いい です', romaji: 'kibun ga ii desu', translation: '기분이 좋습니다' },
      { label: '배가 고픕니다', text: 'おなかが すきました', romaji: 'onaka ga sukimashita', translation: '배가 고픕니다' },
    ],
  },
  {
    id: 'starter-katakana',
    phrases: [
      { label: '커피입니다', text: 'コーヒー です', romaji: 'koohii desu', translation: '커피입니다' },
      { label: '테스트입니다', text: 'テスト です', romaji: 'tesuto desu', translation: '테스트입니다' },
      { label: '메일입니다', text: 'メール です', romaji: 'meeru desu', translation: '메일입니다' },
      { label: '버스입니다', text: 'バス です', romaji: 'basu desu', translation: '버스입니다' },
      { label: '호텔입니다', text: 'ホテル です', romaji: 'hoteru desu', translation: '호텔입니다' },
      { label: '프로젝트입니다', text: 'プロジェクト です', romaji: 'purojekuto desu', translation: '프로젝트입니다' },
    ],
  },
]

const beginnerBanks: PhraseBank[] = [
  {
    id: 'beginner-particles',
    phrases: [
      { label: '저는 회사원입니다', text: 'わたしは かいしゃいん です', romaji: 'watashi wa kaishain desu', translation: '저는 회사원입니다' },
      { label: '커피를 마십니다', text: 'コーヒーを のみます', romaji: 'koohii o nomimasu', translation: '커피를 마십니다' },
      { label: '집에서 공부합니다', text: 'うちで べんきょうします', romaji: 'uchi de benkyou shimasu', translation: '집에서 공부합니다' },
      { label: '친구를 만납니다', text: 'ともだちに あいます', romaji: 'tomodachi ni aimasu', translation: '친구를 만납니다' },
      { label: '공원에 갑니다', text: 'こうえんへ いきます', romaji: 'kouen e ikimasu', translation: '공원에 갑니다' },
      { label: '회의가 있습니다', text: 'かいぎが あります', romaji: 'kaigi ga arimasu', translation: '회의가 있습니다' },
    ],
  },
  {
    id: 'beginner-verbs',
    phrases: [
      { label: '자료를 봅니다', text: 'しりょうを みます', romaji: 'shiryou o mimasu', translation: '자료를 봅니다' },
      { label: '일찍 출발합니다', text: 'はやく しゅっぱつします', romaji: 'hayaku shuppatsu shimasu', translation: '일찍 출발합니다' },
      { label: '오늘은 쉽니다', text: 'きょうは やすみます', romaji: 'kyou wa yasumimasu', translation: '오늘은 쉽니다' },
      { label: '보고서를 씁니다', text: 'ほうこくしょを かきます', romaji: 'houkokusho o kakimasu', translation: '보고서를 씁니다' },
      { label: '질문에 답합니다', text: 'しつもんに こたえます', romaji: 'shitsumon ni kotaemasu', translation: '질문에 답합니다' },
      { label: '일을 시작합니다', text: 'しごとを はじめます', romaji: 'shigoto o hajimemasu', translation: '일을 시작합니다' },
    ],
  },
  {
    id: 'beginner-adjective',
    phrases: [
      { label: '이 문장은 쉽습니다', text: 'この ぶんしょうは やさしい です', romaji: 'kono bunshou wa yasashii desu', translation: '이 문장은 쉽습니다' },
      { label: '설명이 깁니다', text: 'せつめいが ながい です', romaji: 'setsumei ga nagai desu', translation: '설명이 깁니다' },
      { label: '일정이 빠릅니다', text: 'にっていが はやい です', romaji: 'nittei ga hayai desu', translation: '일정이 빠릅니다' },
      { label: '회의실이 조용합니다', text: 'かいぎしつが しずか です', romaji: 'kaigishitsu ga shizuka desu', translation: '회의실이 조용합니다' },
      { label: '이 가게는 편리합니다', text: 'この みせは べんり です', romaji: 'kono mise wa benri desu', translation: '이 가게는 편리합니다' },
      { label: '그 제안은 중요합니다', text: 'その ていあんは じゅうよう です', romaji: 'sono teian wa juuyou desu', translation: '그 제안은 중요합니다' },
    ],
  },
  {
    id: 'beginner-schedule',
    phrases: [
      { label: '내일 회의가 있습니다', text: 'あした かいぎが あります', romaji: 'ashita kaigi ga arimasu', translation: '내일 회의가 있습니다' },
      { label: '세 시에 시작합니다', text: 'さんじに はじまります', romaji: 'sanji ni hajimarimasu', translation: '세 시에 시작합니다' },
      { label: '다음 주에 발표합니다', text: 'らいしゅう はっぴょうします', romaji: 'raishuu happyou shimasu', translation: '다음 주에 발표합니다' },
      { label: '금요일에 마감합니다', text: 'きんようびに しめきります', romaji: 'kinyoubi ni shimekirimasu', translation: '금요일에 마감합니다' },
      { label: '오전에 확인합니다', text: 'ごぜんに かくにんします', romaji: 'gozen ni kakunin shimasu', translation: '오전에 확인합니다' },
      { label: '오후에는 비어 있습니다', text: 'ごごは あいています', romaji: 'gogo wa aiteimasu', translation: '오후에는 비어 있습니다' },
    ],
  },
  {
    id: 'beginner-request',
    phrases: [
      { label: '조금만 기다려 주세요', text: 'すこし まって ください', romaji: 'sukoshi matte kudasai', translation: '조금만 기다려 주세요' },
      { label: '다시 설명해 주세요', text: 'もういちど せつめいして ください', romaji: 'mouichido setsumei shite kudasai', translation: '다시 설명해 주세요' },
      { label: '봐도 될까요', text: 'みても いい ですか', romaji: 'mite mo ii desu ka', translation: '봐도 될까요' },
      { label: '질문해도 될까요', text: 'しつもんしても いい ですか', romaji: 'shitsumon shite mo ii desu ka', translation: '질문해도 될까요' },
      { label: '한 번 더 말씀해 주세요', text: 'もういちど いって ください', romaji: 'mouichido itte kudasai', translation: '한 번 더 말씀해 주세요' },
      { label: '천천히 말씀해 주세요', text: 'ゆっくり いって ください', romaji: 'yukkuri itte kudasai', translation: '천천히 말씀해 주세요' },
    ],
  },
  {
    id: 'beginner-plan',
    phrases: [
      { label: '같이 점심 먹을까요', text: 'いっしょに ひるごはんを たべますか', romaji: 'issho ni hirugohan o tabemasu ka', translation: '같이 점심 먹을까요' },
      { label: '오후에 만날까요', text: 'ごごに あいませんか', romaji: 'gogo ni aimasen ka', translation: '오후에 만날까요' },
      { label: '먼저 확인합시다', text: 'まず かくにんしましょう', romaji: 'mazu kakunin shimashou', translation: '먼저 확인합시다' },
      { label: '이후에 다시 이야기합시다', text: 'あとで また はなしましょう', romaji: 'atode mata hanashimashou', translation: '이후에 다시 이야기합시다' },
      { label: '오늘 끝냅시다', text: 'きょう おわらせましょう', romaji: 'kyou owarasemashou', translation: '오늘 끝냅시다' },
      { label: '함께 준비합시다', text: 'いっしょに じゅんびしましょう', romaji: 'issho ni junbi shimashou', translation: '함께 준비합시다' },
    ],
  },
  {
    id: 'beginner-travel',
    phrases: [
      { label: '어디로 가나요', text: 'どこへ いきますか', romaji: 'doko e ikimasu ka', translation: '어디로 가나요' },
      { label: '표 두 장 부탁합니다', text: 'きっぷを にまい おねがいします', romaji: 'kippu o nimai onegaishimasu', translation: '표 두 장 부탁합니다' },
      { label: '여기서 갈아탑니다', text: 'ここで のりかえます', romaji: 'koko de norikaemasu', translation: '여기서 갈아탑니다' },
      { label: '출구는 어디인가요', text: 'でぐちは どこ ですか', romaji: 'deguchi wa doko desu ka', translation: '출구는 어디인가요' },
      { label: '지도를 볼 수 있나요', text: 'ちずを みられますか', romaji: 'chizu o miraremasu ka', translation: '지도를 볼 수 있나요' },
      { label: '천천히 가고 싶습니다', text: 'ゆっくり いきたい です', romaji: 'yukkuri ikitai desu', translation: '천천히 가고 싶습니다' },
    ],
  },
  {
    id: 'beginner-restaurant',
    phrases: [
      { label: '추천 메뉴가 있나요', text: 'おすすめ メニューが ありますか', romaji: 'osusume menyuu ga arimasu ka', translation: '추천 메뉴가 있나요' },
      { label: '물을 먼저 주세요', text: 'みずを さきに ください', romaji: 'mizu o saki ni kudasai', translation: '물을 먼저 주세요' },
      { label: '이것은 맵나요', text: 'これは からい ですか', romaji: 'kore wa karai desu ka', translation: '이것은 맵나요' },
      { label: '계산 부탁드립니다', text: 'おかいけい おねがいします', romaji: 'okaikei onegaishimasu', translation: '계산 부탁드립니다' },
      { label: '정말 맛있었습니다', text: 'とても おいしかった です', romaji: 'totemo oishikatta desu', translation: '정말 맛있었습니다' },
      { label: '자리 있나요', text: 'せきは ありますか', romaji: 'seki wa arimasu ka', translation: '자리 있나요' },
    ],
  },
  {
    id: 'beginner-health',
    phrases: [
      { label: '조금 아픕니다', text: 'すこし いたい です', romaji: 'sukoshi itai desu', translation: '조금 아픕니다' },
      { label: '약을 먹었습니다', text: 'くすりを のみました', romaji: 'kusuri o nomimashita', translation: '약을 먹었습니다' },
      { label: '잠깐 쉬겠습니다', text: 'すこし やすみます', romaji: 'sukoshi yasumimasu', translation: '잠깐 쉬겠습니다' },
      { label: '도와주실 수 있나요', text: 'たすけて もらえますか', romaji: 'tasukete moraemasu ka', translation: '도와주실 수 있나요' },
      { label: '병원에 가야 합니다', text: 'びょういんに いかなければ なりません', romaji: 'byouin ni ikanakereba narimasen', translation: '병원에 가야 합니다' },
      { label: '많이 괜찮아졌습니다', text: 'だいぶ よく なりました', romaji: 'daibu yoku narimashita', translation: '많이 괜찮아졌습니다' },
    ],
  },
  {
    id: 'beginner-work',
    phrases: [
      { label: '자료를 공유합니다', text: 'しりょうを きょうゆうします', romaji: 'shiryou o kyouyuu shimasu', translation: '자료를 공유합니다' },
      { label: '먼저 확인해 주세요', text: 'さきに かくにんして ください', romaji: 'saki ni kakunin shite kudasai', translation: '먼저 확인해 주세요' },
      { label: '회의실에서 만납시다', text: 'かいぎしつで あいましょう', romaji: 'kaigishitsu de aimashou', translation: '회의실에서 만납시다' },
      { label: '조금 늦겠습니다', text: 'すこし おくれます', romaji: 'sukoshi okuremasu', translation: '조금 늦겠습니다' },
      { label: '다시 보내 드리겠습니다', text: 'もういちど おくります', romaji: 'mouichido okurimasu', translation: '다시 보내 드리겠습니다' },
      { label: '이 부분을 수정합니다', text: 'この ぶぶんを しゅうせいします', romaji: 'kono bubun o shuusei shimasu', translation: '이 부분을 수정합니다' },
    ],
  },
]

const intermediateBanks: PhraseBank[] = [
  {
    id: 'inter-reason',
    phrases: [
      { label: '시간이 없어서 어렵습니다', text: 'じかんが ないので むずかしいです', romaji: 'jikan ga nai node muzukashii desu', translation: '시간이 없어서 어렵습니다' },
      { label: '정보가 부족해서 판단이 어렵습니다', text: 'じょうほうが たりないので はんだんが むずかしいです', romaji: 'jouhou ga tarinai node handan ga muzukashii desu', translation: '정보가 부족해서 판단이 어렵습니다' },
      { label: '조금 늦어져서 죄송합니다', text: 'すこし おくれて しまって すみません', romaji: 'sukoshi okurete shimatte sumimasen', translation: '조금 늦어져서 죄송합니다' },
      { label: '변경이 있어서 다시 공유드립니다', text: 'へんこうが あったので さいど きょうゆうします', romaji: 'henkou ga atta node saido kyouyuu shimasu', translation: '변경이 있어서 다시 공유드립니다' },
      { label: '확인이 필요해서 잠시 보류하겠습니다', text: 'かくにんが ひつようなので いったん ほりゅうします', romaji: 'kakunin ga hitsuyou na node ittan horyuu shimasu', translation: '확인이 필요해서 잠시 보류하겠습니다' },
      { label: '우선순위가 높아서 먼저 진행합니다', text: 'ゆうせんどが たかいので さきに すすめます', romaji: 'yuusendo ga takai node saki ni susumemasu', translation: '우선순위가 높아서 먼저 진행합니다' },
    ],
  },
  {
    id: 'inter-opinion',
    phrases: [
      { label: '저는 이 안이 더 좋다고 생각합니다', text: 'わたしは このあんの ほうが いいと おもいます', romaji: 'watashi wa kono an no hou ga ii to omoimasu', translation: '저는 이 안이 더 좋다고 생각합니다' },
      { label: '조금 더 단순하게 가도 될 것 같습니다', text: 'もうすこし たんじゅんにしても いいと おもいます', romaji: 'mou sukoshi tanjun ni shite mo ii to omoimasu', translation: '조금 더 단순하게 가도 될 것 같습니다' },
      { label: '지금 방향은 유지하는 편이 좋겠습니다', text: 'いまの ほうこうは いじした ほうが よさそうです', romaji: 'ima no houkou wa iji shita hou ga yosasou desu', translation: '지금 방향은 유지하는 편이 좋겠습니다' },
      { label: '먼저 범위를 줄이는 게 좋겠습니다', text: 'まず はんいを せばめた ほうが よさそうです', romaji: 'mazu hani o sebameta hou ga yosasou desu', translation: '먼저 범위를 줄이는 게 좋겠습니다' },
      { label: '같은 문제는 반복되지 않을 것 같습니다', text: 'おなじ もんだいは くりかえされないと おもいます', romaji: 'onaji mondai wa kurikaesararenai to omoimasu', translation: '같은 문제는 반복되지 않을 것 같습니다' },
      { label: '이 부분은 다시 논의할 필요가 있습니다', text: 'この ぶぶんは もういちど そうだんする ひつようが あります', romaji: 'kono bubun wa mouichido soudan suru hitsuyou ga arimasu', translation: '이 부분은 다시 논의할 필요가 있습니다' },
    ],
  },
  {
    id: 'inter-meeting',
    phrases: [
      { label: '오후 회의에 참석합니다', text: 'ごごの かいぎに さんかします', romaji: 'gogo no kaigi ni sanka shimasu', translation: '오후 회의에 참석합니다' },
      { label: '지금까지 절반 정도 진행됐습니다', text: 'いまの じてんで はんぶんほど すすんでいます', romaji: 'ima no jiten de hanbun hodo susundeimasu', translation: '지금까지 절반 정도 진행됐습니다' },
      { label: '먼저 배경을 설명드리겠습니다', text: 'まず はいけいから せつめいします', romaji: 'mazu haikei kara setsumei shimasu', translation: '먼저 배경을 설명드리겠습니다' },
      { label: '다음 안건으로 넘어가겠습니다', text: 'つぎの あんけんに うつります', romaji: 'tsugi no anken ni utsurimasu', translation: '다음 안건으로 넘어가겠습니다' },
      { label: '결론부터 말씀드리겠습니다', text: 'けつろんから もうしあげます', romaji: 'ketsuron kara moushiagemasu', translation: '결론부터 말씀드리겠습니다' },
      { label: '질문은 마지막에 받겠습니다', text: 'しつもんは さいごに うけつけます', romaji: 'shitsumon wa saigo ni uketsukemasu', translation: '질문은 마지막에 받겠습니다' },
    ],
  },
  {
    id: 'inter-report',
    phrases: [
      { label: '진행 상황을 공유드립니다', text: 'しんちょくを きょうゆうします', romaji: 'shinchoku o kyouyuu shimasu', translation: '진행 상황을 공유드립니다' },
      { label: '현재 이슈는 두 가지입니다', text: 'げんざいの イシューは ふたつです', romaji: 'genzai no ishuu wa futatsu desu', translation: '현재 이슈는 두 가지입니다' },
      { label: '주요 변경 사항은 세 가지입니다', text: 'しゅような へんこうてんは みっつです', romaji: 'shuyou na henkouten wa mittsu desu', translation: '주요 변경 사항은 세 가지입니다' },
      { label: '우선 사실 관계부터 정리하겠습니다', text: 'まず じじつかんけいから せいりします', romaji: 'mazu jijitsu kankei kara seiri shimasu', translation: '우선 사실 관계부터 정리하겠습니다' },
      { label: '추가 확인 후 다시 보고드리겠습니다', text: 'ついか かくにんご さいど ほうこくします', romaji: 'tsuika kakunin go saido houkoku shimasu', translation: '추가 확인 후 다시 보고드리겠습니다' },
      { label: '일단 여기까지 정리했습니다', text: 'ひとまず ここまで せいりしました', romaji: 'hitomazu kokomade seiri shimashita', translation: '일단 여기까지 정리했습니다' },
    ],
  },
  {
    id: 'inter-adjust',
    phrases: [
      { label: '일정을 조금 미룰 수 있을까요', text: 'にっていを すこし うしろに ずらせますか', romaji: 'nittei o sukoshi ushiro ni zurasemasu ka', translation: '일정을 조금 미룰 수 있을까요' },
      { label: '범위를 조금 줄이는 편이 좋겠습니다', text: 'はんいを すこし しぼった ほうが よさそうです', romaji: 'hani o sukoshi shibotta hou ga yosasou desu', translation: '범위를 조금 줄이는 편이 좋겠습니다' },
      { label: '다른 안과 비교해 보고 싶습니다', text: 'べつあんと くらべて みたいです', romaji: 'betsuan to kurabete mitai desu', translation: '다른 안과 비교해 보고 싶습니다' },
      { label: '먼저 최소 범위로 정리하겠습니다', text: 'まず さいしょう はんいで まとめます', romaji: 'mazu saishou hani de matomemasu', translation: '먼저 최소 범위로 정리하겠습니다' },
      { label: '이번 주 안에 방향을 정하고 싶습니다', text: 'こんしゅうちゅうに ほうこうを きめたいです', romaji: 'konshuuchuu ni houkou o kimetai desu', translation: '이번 주 안에 방향을 정하고 싶습니다' },
      { label: '이 부분은 별도로 맞추겠습니다', text: 'この ぶぶんは べつど すりあわせます', romaji: 'kono bubun wa betsudo suriawasemasu', translation: '이 부분은 별도로 맞추겠습니다' },
    ],
  },
  {
    id: 'inter-feedback',
    phrases: [
      { label: '이 부분은 이해하기 쉬웠습니다', text: 'この ぶぶんは わかりやすかったです', romaji: 'kono bubun wa wakariyasukatta desu', translation: '이 부분은 이해하기 쉬웠습니다' },
      { label: '조금 더 구체적이면 좋겠습니다', text: 'もうすこし ぐたいてきだと いいと おもいます', romaji: 'mou sukoshi gutaiteki da to ii to omoimasu', translation: '조금 더 구체적이면 좋겠습니다' },
      { label: '예시가 있으면 더 좋겠습니다', text: 'れいが あると さらに よいと おもいます', romaji: 'rei ga aru to sarani yoi to omoimasu', translation: '예시가 있으면 더 좋겠습니다' },
      { label: '구성이 깔끔해서 좋았습니다', text: 'こうせいが すっきりしていて よかったです', romaji: 'kousei ga sukkiri shiteite yokatta desu', translation: '구성이 깔끔해서 좋았습니다' },
      { label: '이 단어는 조금 딱딱하게 들립니다', text: 'この ことばは すこし かたい いんしょうです', romaji: 'kono kotoba wa sukoshi katai inshou desu', translation: '이 단어는 조금 딱딱하게 들립니다' },
      { label: '이 흐름이면 전달이 잘 될 것 같습니다', text: 'この ながれなら つたわりやすいと おもいます', romaji: 'kono nagare nara tsutawariyasui to omoimasu', translation: '이 흐름이면 전달이 잘 될 것 같습니다' },
    ],
  },
  {
    id: 'inter-trouble',
    phrases: [
      { label: '여기서 오류가 발생했습니다', text: 'ここで エラーが はっせいしました', romaji: 'koko de eraa ga hassei shimashita', translation: '여기서 오류가 발생했습니다' },
      { label: '재현 조건은 아직 확인 중입니다', text: 'さいげん じょうけんは まだ かくにんちゅうです', romaji: 'saigen jouken wa mada kakuninchuu desu', translation: '재현 조건은 아직 확인 중입니다' },
      { label: '영향 범위는 제한적입니다', text: 'えいきょう はんいは げんていてきです', romaji: 'eikyou hani wa genteiteki desu', translation: '영향 범위는 제한적입니다' },
      { label: '우선 임시 대응을 진행했습니다', text: 'ひとまず おうきゅうたいおうを すすめました', romaji: 'hitomazu oukyuu taiou o susumemashita', translation: '우선 임시 대응을 진행했습니다' },
      { label: '원인은 계속 조사 중입니다', text: 'げんいんは けいぞくして ちょうさちゅうです', romaji: 'genin wa keizoku shite chousachuu desu', translation: '원인은 계속 조사 중입니다' },
      { label: '정리되면 다시 알려 드리겠습니다', text: 'せいりできしだい さいど ごれんらくします', romaji: 'seiri deki shidai saido gorenraku shimasu', translation: '정리되면 다시 알려 드리겠습니다' },
    ],
  },
  {
    id: 'inter-email',
    phrases: [
      { label: '항상 신세지고 있습니다', text: 'いつも おせわに なっております', romaji: 'itsumo osewa ni natte orimasu', translation: '항상 신세지고 있습니다' },
      { label: '자료를 첨부드렸습니다', text: 'しりょうを てんぷいたしました', romaji: 'shiryou o tenpu itashimashita', translation: '자료를 첨부드렸습니다' },
      { label: '확인 부탁드립니다', text: 'ごかくにんのほど おねがいいたします', romaji: 'gokakunin no hodo onegai itashimasu', translation: '확인 부탁드립니다' },
      { label: '수정본을 다시 보내 드립니다', text: 'しゅうせいばんを さいど お送りします', romaji: 'shuuseiban o saido ookuri shimasu', translation: '수정본을 다시 보내 드립니다' },
      { label: '늦은 회신 죄송합니다', text: 'へんしんが おそくなり もうしわけありません', romaji: 'henshin ga osoku nari moushiwake arimasen', translation: '늦은 회신 죄송합니다' },
      { label: '잘 부탁드립니다', text: 'どうぞ よろしく おねがいいたします', romaji: 'douzo yoroshiku onegai itashimasu', translation: '잘 부탁드립니다' },
    ],
  },
  {
    id: 'inter-client',
    phrases: [
      { label: '요구 사항을 다시 정리하겠습니다', text: 'ごようけんを あらためて せいりします', romaji: 'goyouken o aratamete seiri shimasu', translation: '요구 사항을 다시 정리하겠습니다' },
      { label: '먼저 전제 조건을 맞추고 싶습니다', text: 'まず ぜんてい じょうけんを そろえたいです', romaji: 'mazu zentei jouken o soroetai desu', translation: '먼저 전제 조건을 맞추고 싶습니다' },
      { label: '이 안으로도 검토 가능할까요', text: 'この あんでも けんとう かのうでしょうか', romaji: 'kono an demo kentou kanou deshou ka', translation: '이 안으로도 검토 가능할까요' },
      { label: '우선 현재안 기준으로 진행하겠습니다', text: 'まず げんあん ベースで すすめます', romaji: 'mazu genan beesu de susumemasu', translation: '우선 현재안 기준으로 진행하겠습니다' },
      { label: '변경점은 문서로 정리해 두겠습니다', text: 'へんこうてんは ぶんしょに まとめて おきます', romaji: 'henkouten wa bunsho ni matomete okimasu', translation: '변경점은 문서로 정리해 두겠습니다' },
      { label: '이후 일정도 함께 공유드리겠습니다', text: 'いごの にっていも あわせて きょうゆうします', romaji: 'igo no nittei mo awasete kyouyuu shimasu', translation: '이후 일정도 함께 공유드리겠습니다' },
    ],
  },
]

const advancedBanks: PhraseBank[] = [
  {
    id: 'advanced-apology',
    phrases: [
      { label: '진심으로 사과드립니다', text: 'まことに もうしわけございません', romaji: 'makoto ni moushiwake gozaimasen', translation: '진심으로 사과드립니다' },
      { label: '혼선을 드려 죄송합니다', text: 'こんらんを まねき もうしわけございません', romaji: 'konran o maneki moushiwake gozaimasen', translation: '혼선을 드려 죄송합니다' },
      { label: '저희 확인이 부족했습니다', text: 'こちらの かくにん ぶそくでした', romaji: 'kochira no kakunin busoku deshita', translation: '저희 확인이 부족했습니다' },
      { label: '우선 깊이 사과드립니다', text: 'まず ふかく おわび もうしあげます', romaji: 'mazu fukaku owabi moushiagemasu', translation: '우선 깊이 사과드립니다' },
      { label: '불편을 끼쳐 드렸습니다', text: 'ごふべんを おかけしました', romaji: 'gofuben o okake shimashita', translation: '불편을 끼쳐 드렸습니다' },
      { label: '재발 방지까지 책임지고 대응하겠습니다', text: 'さいはつぼうしまで せきにんを もって たいおうします', romaji: 'saihatsu boushi made sekinin o motte taiou shimasu', translation: '재발 방지까지 책임지고 대응하겠습니다' },
    ],
  },
  {
    id: 'advanced-formal-mail',
    phrases: [
      { label: '항상 각별한 배려에 감사드립니다', text: 'へいそより かくべつの ごこうはいを たまわり ありがとうございます', romaji: 'heiso yori kakubetsu no gokouhai o tamawari arigatou gozaimasu', translation: '항상 각별한 배려에 감사드립니다' },
      { label: '아래와 같이 정리하여 공유드립니다', text: 'かきの とおり とりまとめのうえ きょうゆういたします', romaji: 'kaki no toori torimatome no ue kyouyuu itashimasu', translation: '아래와 같이 정리하여 공유드립니다' },
      { label: '검토 후 회신 부탁드립니다', text: 'ごけんとうのうえ ごかいしん いただけますと さいわいです', romaji: 'gokentou no ue gokaishin itadakemasu to saiwai desu', translation: '검토 후 회신 부탁드립니다' },
      { label: '추가 질문이 있으시면 말씀 부탁드립니다', text: 'ごふめいなてんが ございましたら おしらせください', romaji: 'gofumei na ten ga gozaimashitara oshirase kudasai', translation: '추가 질문이 있으시면 말씀 부탁드립니다' },
      { label: '첨부 자료도 함께 확인 부탁드립니다', text: 'てんぷ しりょうも あわせて ごかくにん ください', romaji: 'tenpu shiryou mo awasete gokakunin kudasai', translation: '첨부 자료도 함께 확인 부탁드립니다' },
      { label: '잘 부탁드립니다', text: 'なにとぞ よろしく おねがいもうしあげます', romaji: 'nanitozo yoroshiku onegai moushiagemasu', translation: '잘 부탁드립니다' },
    ],
  },
  {
    id: 'advanced-negotiation',
    phrases: [
      { label: '이 조건은 다시 논의가 필요합니다', text: 'この じょうけんは あらためて きょうぎが ひつようです', romaji: 'kono jouken wa aratamete kyougi ga hitsuyou desu', translation: '이 조건은 다시 논의가 필요합니다' },
      { label: '양측 모두 부담이 없는 선을 찾고 싶습니다', text: 'りょうしゃにとって むりのない せんを さがしたいです', romaji: 'ryousha ni totte muri no nai sen o sagashitai desu', translation: '양측 모두 부담이 없는 선을 찾고 싶습니다' },
      { label: '우선 가능한 범위를 확인하겠습니다', text: 'まず じっこう かのうな はんいを かくにんします', romaji: 'mazu jikkou kanou na hani o kakunin shimasu', translation: '우선 가능한 범위를 확인하겠습니다' },
      { label: '대안도 함께 준비해 보겠습니다', text: 'たいあんも あわせて よういして みます', romaji: 'taian mo awasete youi shite mimasu', translation: '대안도 함께 준비해 보겠습니다' },
      { label: '이 일정은 다소 촉박해 보입니다', text: 'この にっていは やや きびしい みこみです', romaji: 'kono nittei wa yaya kibishii mikomi desu', translation: '이 일정은 다소 촉박해 보입니다' },
      { label: '서로 맞출 수 있는 지점을 찾겠습니다', text: 'おたがいに すりあわせられる てんを さがします', romaji: 'otagai ni suriawaserareru ten o sagashimasu', translation: '서로 맞출 수 있는 지점을 찾겠습니다' },
    ],
  },
  {
    id: 'advanced-presentation',
    phrases: [
      { label: '먼저 전체 배경부터 설명드리겠습니다', text: 'まず ぜんたい はいけいから ごせつめいします', romaji: 'mazu zentai haikei kara gosetsumei shimasu', translation: '먼저 전체 배경부터 설명드리겠습니다' },
      { label: '다음으로 주요 포인트를 말씀드리겠습니다', text: 'つぎに しゅよう ポイントを ごしょうかいします', romaji: 'tsugi ni shuyou pointo o goshoukai shimasu', translation: '다음으로 주요 포인트를 말씀드리겠습니다' },
      { label: '결론부터 말씀드리겠습니다', text: 'けつろんから もうしあげます', romaji: 'ketsuron kara moushiagemasu', translation: '결론부터 말씀드리겠습니다' },
      { label: '이 페이지에서는 비교 결과를 보여 드립니다', text: 'この ページでは ひかく けっかを おしめしします', romaji: 'kono peeji dewa hikaku kekka o oshimeshi shimasu', translation: '이 페이지에서는 비교 결과를 보여 드립니다' },
      { label: '세부 사항은 뒤에서 다시 말씀드리겠습니다', text: 'しょうさいは のちほど あらためて ごせつめいします', romaji: 'shousai wa nochihodo aratamete gosetsumei shimasu', translation: '세부 사항은 뒤에서 다시 말씀드리겠습니다' },
      { label: '질문은 마지막에 정리해서 답변드리겠습니다', text: 'ごしつもんは さいごに まとめて ごへんとうします', romaji: 'goshitsumon wa saigo ni matomete gohentou shimasu', translation: '질문은 마지막에 정리해서 답변드리겠습니다' },
    ],
  },
  {
    id: 'advanced-qa',
    phrases: [
      { label: '그 점은 확인 후 바로 회신드리겠습니다', text: 'そのてんは かくにんのうえ すぐに ごへんしんします', romaji: 'sono ten wa kakunin no ue sugu ni gohenshin shimasu', translation: '그 점은 확인 후 바로 회신드리겠습니다' },
      { label: '현시점에서는 이렇게 이해하고 있습니다', text: 'げんじてんでは このように りかいしております', romaji: 'genjiten dewa konoyouni rikai shite orimasu', translation: '현시점에서는 이렇게 이해하고 있습니다' },
      { label: '오해가 있었다면 정정드리겠습니다', text: 'ごかいが あれば ていせい いたします', romaji: 'gokai ga areba teisei itashimasu', translation: '오해가 있었다면 정정드리겠습니다' },
      { label: '추가 자료를 준비해 다시 설명드리겠습니다', text: 'ついか しりょうを よういし あらためて ごせつめいします', romaji: 'tsuika shiryou o youi shi aratamete gosetsumei shimasu', translation: '추가 자료를 준비해 다시 설명드리겠습니다' },
      { label: '답변이 길어질 것 같아 별도로 정리하겠습니다', text: 'ごへんとうが ながくなりそうですので べつど せいりします', romaji: 'gohentou ga nagaku narisou desu node betsudo seiri shimasu', translation: '답변이 길어질 것 같아 별도로 정리하겠습니다' },
      { label: '핵심만 먼저 말씀드리면 다음과 같습니다', text: 'ようてんのみ さきに もうしあげますと つぎのとおりです', romaji: 'youten nomi saki ni moushiagemasu to tsugi no toori desu', translation: '핵심만 먼저 말씀드리면 다음과 같습니다' },
    ],
  },
  {
    id: 'advanced-escalation',
    phrases: [
      { label: '이 사안은 즉시 공유가 필요합니다', text: 'この けんは ただちに きょうゆうが ひつようです', romaji: 'kono ken wa tadachi ni kyouyuu ga hitsuyou desu', translation: '이 사안은 즉시 공유가 필요합니다' },
      { label: '영향 범위를 우선 정리하겠습니다', text: 'えいきょう はんいを まず せいりいたします', romaji: 'eikyou hani o mazu seiri itashimasu', translation: '영향 범위를 우선 정리하겠습니다' },
      { label: '관계자와 바로 연결하겠습니다', text: 'かんけいしゃへ ただちに てんたつします', romaji: 'kankeisha e tadachi ni tentatsu shimasu', translation: '관계자와 바로 연결하겠습니다' },
      { label: '임시 대응안을 먼저 적용하겠습니다', text: 'おうきゅう たいおうあんを さきに てきようします', romaji: 'oukyuu taiouan o saki ni tekiyou shimasu', translation: '임시 대응안을 먼저 적용하겠습니다' },
      { label: '추가 리스크도 함께 확인하겠습니다', text: 'ついか リスクも あわせて かくにんします', romaji: 'tsuika risuku mo awasete kakunin shimasu', translation: '추가 리스크도 함께 확인하겠습니다' },
      { label: '상황이 정리되는 대로 다시 보고드리겠습니다', text: 'じょうきょうが まとまりしだい さいど ごほうこくします', romaji: 'joukyou ga matomari shidai saido gohoukoku shimasu', translation: '상황이 정리되는 대로 다시 보고드리겠습니다' },
    ],
  },
  {
    id: 'advanced-risk',
    phrases: [
      { label: '현재 가장 큰 리스크는 일정 지연입니다', text: 'げんざい もっとも おおきい リスクは にってい えんきです', romaji: 'genzai mottomo ookii risuku wa nittei enki desu', translation: '현재 가장 큰 리스크는 일정 지연입니다' },
      { label: '대체안도 동시에 준비해 두겠습니다', text: 'だいたいあんも どうじに よういして おきます', romaji: 'daitaian mo douji ni youi shite okimasu', translation: '대체안도 동시에 준비해 두겠습니다' },
      { label: '이번 결정은 신중할 필요가 있습니다', text: 'こんかいの けっていは しんちょうである ひつようが あります', romaji: 'konkai no kettei wa shinchou de aru hitsuyou ga arimasu', translation: '이번 결정은 신중할 필요가 있습니다' },
      { label: '불확실한 부분은 명시해서 전달하겠습니다', text: 'ふかくていな てんは めいじして おつたえします', romaji: 'fukakutei na ten wa meiji shite otsutae shimasu', translation: '불확실한 부분은 명시해서 전달하겠습니다' },
      { label: '추가 검토 시간이 필요해 보입니다', text: 'ついか けんとう じかんが ひつようと みています', romaji: 'tsuika kentou jikan ga hitsuyou to miteimasu', translation: '추가 검토 시간이 필요해 보입니다' },
      { label: '지금은 보수적으로 판단하는 편이 좋겠습니다', text: 'いまは ほしゅてきに はんだんした ほうが よさそうです', romaji: 'ima wa hoshuteki ni handan shita hou ga yosasou desu', translation: '지금은 보수적으로 판단하는 편이 좋겠습니다' },
    ],
  },
  {
    id: 'advanced-stakeholder',
    phrases: [
      { label: '관계 부서와 먼저 합의하겠습니다', text: 'かんけい ぶしょと まず ごういを とります', romaji: 'kankei busho to mazu goui o torimasu', translation: '관계 부서와 먼저 합의하겠습니다' },
      { label: '이 안건은 경영진 판단이 필요합니다', text: 'この あんけんは けいえいじん はんだんが ひつようです', romaji: 'kono anken wa keieijin handan ga hitsuyou desu', translation: '이 안건은 경영진 판단이 필요합니다' },
      { label: '설명 자료를 다시 정리해 공유하겠습니다', text: 'せつめい しりょうを あらためて まとめて きょうゆうします', romaji: 'setsumei shiryou o aratamete matomete kyouyuu shimasu', translation: '설명 자료를 다시 정리해 공유하겠습니다' },
      { label: '이해관계자 의견을 먼저 수렴하겠습니다', text: 'りかい かんけいしゃの いけんを まず しゅうやくします', romaji: 'rikai kankeisha no iken o mazu shuuyaku shimasu', translation: '이해관계자 의견을 먼저 수렴하겠습니다' },
      { label: '결정 사항은 문서로 남기겠습니다', text: 'けってい じこうは ぶんしょで のこします', romaji: 'kettei jikou wa bunsho de nokoshimasu', translation: '결정 사항은 문서로 남기겠습니다' },
      { label: '공유 범위도 함께 조정하겠습니다', text: 'きょうゆう はんいも あわせて ちょうせいします', romaji: 'kyouyuu hani mo awasete chousei shimasu', translation: '공유 범위도 함께 조정하겠습니다' },
    ],
  },
  {
    id: 'advanced-closeout',
    phrases: [
      { label: '결론적으로는 이 방향으로 진행하겠습니다', text: 'けつろんとしましては この ほうこうで すすめます', romaji: 'ketsuron to shimashite wa kono houkou de susumemasu', translation: '결론적으로는 이 방향으로 진행하겠습니다' },
      { label: '이상으로 설명을 마치겠습니다', text: 'いじょうで せつめいを おわります', romaji: 'ijou de setsumei o owarimasu', translation: '이상으로 설명을 마치겠습니다' },
      { label: '이후 일정은 별도 공유드리겠습니다', text: 'いご にっていは べつど きょうゆういたします', romaji: 'igo nittei wa betsudo kyouyuu itashimasu', translation: '이후 일정은 별도 공유드리겠습니다' },
      { label: '계속 협조 부탁드립니다', text: 'ひきつづき ごきょうりょくのほど おねがいいたします', romaji: 'hikitsuzuki gokyouryoku no hodo onegai itashimasu', translation: '계속 협조 부탁드립니다' },
      { label: '최종본은 오늘 중 전달드리겠습니다', text: 'さいしゅうばんは ほんじつじゅうに おわたしします', romaji: 'saishuuban wa honjitsujuu ni owatashi shimasu', translation: '최종본은 오늘 중 전달드리겠습니다' },
      { label: '필요하시면 별도로 말씀 부탁드립니다', text: 'ひつようでしたら べつど おしらせください', romaji: 'hitsuyou deshitara betsudo oshirase kudasai', translation: '필요하시면 별도로 말씀 부탁드립니다' },
    ],
  },
]

const starterPlans: UnitPlan[] = [
  ['starter-kana-rhythm-1', '입문 확장 1', '히라가나 자동화 1', '기본 글자와 소리를 바로 연결하는 감각을 늘립니다.', 'starter-kana-words'],
  ['starter-kana-rhythm-2', '입문 확장 2', '히라가나 자동화 2', '비슷한 글자를 섞어도 흔들리지 않게 읽는 연습입니다.', 'starter-kana-words'],
  ['starter-kana-rhythm-3', '입문 확장 3', '짧은 낱말 읽기 1', '두세 글자 단어를 끊지 않고 읽는 연습입니다.', 'starter-reading'],
  ['starter-kana-rhythm-4', '입문 확장 4', '짧은 낱말 읽기 2', '익숙한 사물 이름으로 읽기 속도를 높입니다.', 'starter-reading'],
  ['starter-greet-1', '입문 확장 5', '기본 인사 1', '가장 자주 쓰는 인사말을 익힙니다.', 'starter-greetings'],
  ['starter-greet-2', '입문 확장 6', '기본 인사 2', '시간대와 상황에 맞게 인사를 나누는 연습입니다.', 'starter-greetings'],
  ['starter-self-1', '입문 확장 7', '자기소개 1', '이름과 출신을 소개하는 짧은 흐름을 익힙니다.', 'starter-self-intro'],
  ['starter-self-2', '입문 확장 8', '자기소개 2', '팀과 역할까지 붙여 말하는 연습입니다.', 'starter-self-intro'],
  ['starter-number-1', '입문 확장 9', '숫자와 시간 1', '숫자와 시각을 읽는 감각을 키웁니다.', 'starter-numbers-time'],
  ['starter-number-2', '입문 확장 10', '숫자와 시간 2', '요일과 날짜 감각을 함께 익힙니다.', 'starter-numbers-time'],
  ['starter-daily-1', '입문 확장 11', '일상 동작 1', '먹다, 마시다, 읽다 같은 기초 동사를 익힙니다.', 'starter-daily'],
  ['starter-daily-2', '입문 확장 12', '일상 동작 2', '짧은 하루 루틴을 일본어로 떠올려 봅니다.', 'starter-daily'],
  ['starter-shop-1', '입문 확장 13', '쇼핑 표현 1', '가격과 요청 표현을 자연스럽게 익힙니다.', 'starter-shopping'],
  ['starter-shop-2', '입문 확장 14', '쇼핑 표현 2', '결제와 응답 문장을 짧게 말해 봅니다.', 'starter-shopping'],
  ['starter-move-1', '입문 확장 15', '이동 표현 1', '역과 버스처럼 자주 쓰는 이동 표현을 익힙니다.', 'starter-transport'],
  ['starter-move-2', '입문 확장 16', '이동 표현 2', '방향과 도착 문장을 연결해서 읽습니다.', 'starter-transport'],
  ['starter-feel-1', '입문 확장 17', '감정 표현 1', '쉽다, 어렵다, 재미있다를 구분합니다.', 'starter-feeling'],
  ['starter-feel-2', '입문 확장 18', '감정 표현 2', '몸 상태와 기분을 짧게 말해 봅니다.', 'starter-feeling'],
  ['starter-kata-1', '입문 확장 19', '가타카나 적응 1', '자주 보이는 외래어를 읽기 시작합니다.', 'starter-katakana'],
  ['starter-kata-2', '입문 확장 20', '가타카나 적응 2', '업무와 일상에서 자주 보는 가타카나를 익힙니다.', 'starter-katakana'],
  ['starter-read-1', '입문 확장 21', '짧은 문장 읽기 1', '두 문절 문장을 멈추지 않고 읽습니다.', 'starter-reading'],
  ['starter-read-2', '입문 확장 22', '짧은 문장 읽기 2', '문장 의미와 읽기를 동시에 확인합니다.', 'starter-reading'],
  ['starter-greet-3', '입문 확장 23', '인사 응답 1', '인사에 자연스럽게 응답하는 흐름을 익힙니다.', 'starter-greetings'],
  ['starter-greet-4', '입문 확장 24', '인사 응답 2', '감사와 사과 표현을 연결합니다.', 'starter-greetings'],
  ['starter-self-3', '입문 확장 25', '자기소개 3', '학습 목표까지 덧붙여 소개합니다.', 'starter-self-intro'],
  ['starter-self-4', '입문 확장 26', '자기소개 4', '짧은 소개를 더 또렷하게 말하는 연습입니다.', 'starter-self-intro'],
  ['starter-number-3', '입문 확장 27', '시간 묻고 답하기', '시간과 요일을 듣고 빠르게 떠올립니다.', 'starter-numbers-time'],
  ['starter-daily-3', '입문 확장 28', '생활 루틴 말하기', '하루 패턴을 일본어로 짧게 정리합니다.', 'starter-daily'],
  ['starter-shop-3', '입문 확장 29', '주문과 요청', '필요한 것을 부탁하는 표현을 익힙니다.', 'starter-shopping'],
  ['starter-move-3', '입문 확장 30', '길 찾기 기본', '어디로 가는지 묻고 답하는 연습입니다.', 'starter-transport'],
  ['starter-feel-3', '입문 확장 31', '상태와 느낌', '상태 표현을 듣고 바로 고르는 훈련입니다.', 'starter-feeling'],
  ['starter-kata-3', '입문 확장 32', '가타카나 읽기 강화', '자주 보는 외래어를 빠르게 읽는 연습입니다.', 'starter-katakana'],
  ['starter-mixed-1', '입문 확장 33', '기초 혼합 복습 1', '문자, 인사, 숫자, 가타카나를 묶어 점검합니다.', 'starter-reading'],
  ['starter-mixed-2', '입문 확장 34', '기초 혼합 복습 2', '실생활 표현으로 입문 과정을 다시 묶습니다.', 'starter-daily'],
  ['starter-final-1', '입문 확장 35', '입문 종합 체크', '입문 단계 핵심 표현을 전체적으로 점검합니다.', 'starter-self-intro'],
].map(([slug, phase, title, summary, bankId]) => ({
  slug,
  phase,
  title,
  summary,
  badgeId: slug,
  keyPoints: [title, '반복 노출', '짧은 말하기'],
  canDo: [`${title} 핵심 표현을 읽고 이해할 수 있습니다.`, '짧은 문장을 보고 바로 소리 내어 말할 수 있습니다.'],
  speakingHint: '너무 빨리 읽기보다 박자를 일정하게 맞추는 데 집중해 보세요.',
  bankId,
})) satisfies UnitPlan[]

const beginnerPlans: UnitPlan[] = [
  ['beginner-particles-1', '초보 확장 1', '조사 감각 1', 'は, を, に, で를 문장 속에서 구분하는 연습입니다.', 'beginner-particles'],
  ['beginner-particles-2', '초보 확장 2', '조사 감각 2', '비슷한 문장을 비교하면서 조사를 익힙니다.', 'beginner-particles'],
  ['beginner-verbs-1', '초보 확장 3', '기본 동사 1', '자주 쓰는 동사를 현재형으로 익힙니다.', 'beginner-verbs'],
  ['beginner-verbs-2', '초보 확장 4', '기본 동사 2', '행동 표현을 더 자연스럽게 묶어 읽습니다.', 'beginner-verbs'],
  ['beginner-adj-1', '초보 확장 5', '형용사 1', '쉽다, 길다, 중요하다 같은 표현을 익힙니다.', 'beginner-adjective'],
  ['beginner-adj-2', '초보 확장 6', '형용사 2', '상태 설명을 붙여 짧은 문장을 만듭니다.', 'beginner-adjective'],
  ['beginner-schedule-1', '초보 확장 7', '일정 말하기 1', '날짜와 시간에 맞춰 일정을 설명합니다.', 'beginner-schedule'],
  ['beginner-schedule-2', '초보 확장 8', '일정 말하기 2', '회의와 발표 일정을 자연스럽게 묶습니다.', 'beginner-schedule'],
  ['beginner-request-1', '초보 확장 9', '요청 표현 1', '정중하게 부탁하는 표현을 익힙니다.', 'beginner-request'],
  ['beginner-request-2', '초보 확장 10', '요청 표현 2', '다시 말해 달라고 요청하는 흐름을 익힙니다.', 'beginner-request'],
  ['beginner-plan-1', '초보 확장 11', '제안과 권유 1', '같이 하자고 제안하는 표현을 익힙니다.', 'beginner-plan'],
  ['beginner-plan-2', '초보 확장 12', '제안과 권유 2', '회의 전후 일정 제안을 자연스럽게 합니다.', 'beginner-plan'],
  ['beginner-travel-1', '초보 확장 13', '이동과 질문 1', '길 찾기와 이동 질문을 연습합니다.', 'beginner-travel'],
  ['beginner-travel-2', '초보 확장 14', '이동과 질문 2', '표, 출구, 환승 표현을 익힙니다.', 'beginner-travel'],
  ['beginner-food-1', '초보 확장 15', '식당 표현 1', '주문과 질문의 기본 표현을 익힙니다.', 'beginner-restaurant'],
  ['beginner-food-2', '초보 확장 16', '식당 표현 2', '메뉴와 계산 표현을 더 자연스럽게 말합니다.', 'beginner-restaurant'],
  ['beginner-health-1', '초보 확장 17', '도움 요청 1', '아프거나 곤란할 때 도움을 요청합니다.', 'beginner-health'],
  ['beginner-health-2', '초보 확장 18', '도움 요청 2', '몸 상태를 설명하고 필요한 행동을 말합니다.', 'beginner-health'],
  ['beginner-work-1', '초보 확장 19', '업무 표현 1', '공유, 확인, 수정 같은 기본 업무 표현을 익힙니다.', 'beginner-work'],
  ['beginner-work-2', '초보 확장 20', '업무 표현 2', '회의실, 전달, 지연 표현을 정리합니다.', 'beginner-work'],
  ['beginner-particles-3', '초보 확장 21', '조사 응용 1', '같은 단어라도 조사에 따라 뜻이 달라지는 흐름을 봅니다.', 'beginner-particles'],
  ['beginner-verbs-3', '초보 확장 22', '동사 응용 1', '동사와 목적어를 빠르게 연결합니다.', 'beginner-verbs'],
  ['beginner-adj-3', '초보 확장 23', '형용사 응용 1', '장점과 단점을 나눠 말하는 연습입니다.', 'beginner-adjective'],
  ['beginner-schedule-3', '초보 확장 24', '일정 응답 1', '비는 시간과 가능한 시간을 구분합니다.', 'beginner-schedule'],
  ['beginner-request-3', '초보 확장 25', '허가와 요청', '해도 되는지 묻고 부탁하는 표현을 정리합니다.', 'beginner-request'],
  ['beginner-plan-3', '초보 확장 26', '같이 하기', '함께 하자는 제안과 응답을 익힙니다.', 'beginner-plan'],
  ['beginner-travel-3', '초보 확장 27', '길 찾기 심화', '방향 설명과 이동 계획을 이어 읽습니다.', 'beginner-travel'],
  ['beginner-food-3', '초보 확장 28', '주문 응답', '식당에서 오가는 말을 짧게 복습합니다.', 'beginner-restaurant'],
  ['beginner-health-3', '초보 확장 29', '상태 설명', '몸 상태를 조금 더 구체적으로 설명합니다.', 'beginner-health'],
  ['beginner-work-3', '초보 확장 30', '업무 루틴', '일상적인 업무 루틴을 일본어로 말합니다.', 'beginner-work'],
  ['beginner-work-4', '초보 확장 31', '업무 요청', '자료 요청과 전달 흐름을 다시 점검합니다.', 'beginner-work'],
  ['beginner-mixed-1', '초보 확장 32', '초보 혼합 복습 1', '기초 문장과 일상 표현을 섞어 점검합니다.', 'beginner-plan'],
  ['beginner-mixed-2', '초보 확장 33', '초보 혼합 복습 2', '일상과 업무 표현을 함께 묶습니다.', 'beginner-work'],
  ['beginner-mixed-3', '초보 확장 34', '초보 혼합 복습 3', '질문, 요청, 제안을 섞어서 복습합니다.', 'beginner-request'],
  ['beginner-final-1', '초보 확장 35', '초보 종합 체크', '초보 단계 핵심 표현을 전체적으로 점검합니다.', 'beginner-schedule'],
].map(([slug, phase, title, summary, bankId]) => ({
  slug,
  phase,
  title,
  summary,
  badgeId: slug,
  keyPoints: [title, '문장 패턴', '실전 회화'],
  canDo: [`${title} 관련 표현을 읽고 선택할 수 있습니다.`, '짧은 상황에서 맞는 표현을 말할 수 있습니다.'],
  speakingHint: '문장 끝 어미를 무시하지 말고 끝까지 또렷하게 읽어 보세요.',
  bankId,
})) satisfies UnitPlan[]

const intermediatePlans: UnitPlan[] = [
  ['inter-reason-1', '중급 확장 1', '이유 설명 1', '이유와 배경을 붙여 말하는 연습입니다.', 'inter-reason'],
  ['inter-reason-2', '중급 확장 2', '이유 설명 2', '조금 더 길게 원인을 설명하는 연습입니다.', 'inter-reason'],
  ['inter-opinion-1', '중급 확장 3', '의견 말하기 1', '선호와 판단을 말하는 표현을 익힙니다.', 'inter-opinion'],
  ['inter-opinion-2', '중급 확장 4', '의견 말하기 2', '비교와 제안을 함께 말하는 연습입니다.', 'inter-opinion'],
  ['inter-meeting-1', '중급 확장 5', '회의 진행 1', '회의 시작과 안건 전환 표현을 익힙니다.', 'inter-meeting'],
  ['inter-meeting-2', '중급 확장 6', '회의 진행 2', '질문 처리와 참석 표현을 복습합니다.', 'inter-meeting'],
  ['inter-report-1', '중급 확장 7', '진행 보고 1', '진행 상황과 이슈를 구조적으로 말합니다.', 'inter-report'],
  ['inter-report-2', '중급 확장 8', '진행 보고 2', '사실 관계와 다음 액션을 함께 말합니다.', 'inter-report'],
  ['inter-adjust-1', '중급 확장 9', '조정과 제안 1', '일정과 범위를 조정하는 표현을 익힙니다.', 'inter-adjust'],
  ['inter-adjust-2', '중급 확장 10', '조정과 제안 2', '다른 안을 제안하고 조율하는 흐름입니다.', 'inter-adjust'],
  ['inter-feedback-1', '중급 확장 11', '피드백 1', '좋았던 점과 개선점을 나눠 말합니다.', 'inter-feedback'],
  ['inter-feedback-2', '중급 확장 12', '피드백 2', '조금 더 부드럽게 의견을 전달합니다.', 'inter-feedback'],
  ['inter-trouble-1', '중급 확장 13', '문제 공유 1', '오류와 영향 범위를 설명합니다.', 'inter-trouble'],
  ['inter-trouble-2', '중급 확장 14', '문제 공유 2', '임시 대응과 후속 보고를 정리합니다.', 'inter-trouble'],
  ['inter-email-1', '중급 확장 15', '이메일 1', '업무 메일 첫 문장과 회신 표현을 익힙니다.', 'inter-email'],
  ['inter-email-2', '중급 확장 16', '이메일 2', '첨부, 확인 요청, 마무리 표현을 묶습니다.', 'inter-email'],
  ['inter-client-1', '중급 확장 17', '대외 커뮤니케이션 1', '요구 사항과 일정 공유 표현을 익힙니다.', 'inter-client'],
  ['inter-client-2', '중급 확장 18', '대외 커뮤니케이션 2', '정리와 합의 중심으로 말하는 연습입니다.', 'inter-client'],
  ['inter-reason-3', '중급 확장 19', '사유 설명 심화', '판단 근거를 좀 더 선명하게 전달합니다.', 'inter-reason'],
  ['inter-opinion-3', '중급 확장 20', '비교와 판단', '여러 안을 비교해 의견을 정리합니다.', 'inter-opinion'],
  ['inter-meeting-3', '중급 확장 21', '회의 참여', '의견 제시와 질문 수렴 흐름을 익힙니다.', 'inter-meeting'],
  ['inter-report-3', '중급 확장 22', '상황 정리', '보고 순서를 안정적으로 정리합니다.', 'inter-report'],
  ['inter-adjust-3', '중급 확장 23', '범위 조율', '우선순위와 일정 균형을 이야기합니다.', 'inter-adjust'],
  ['inter-feedback-3', '중급 확장 24', '부드러운 피드백', '직접적이지 않게 개선점을 제안합니다.', 'inter-feedback'],
  ['inter-trouble-3', '중급 확장 25', '이슈 확산 방지', '문제와 대응 상태를 차분하게 말합니다.', 'inter-trouble'],
  ['inter-email-3', '중급 확장 26', '회신과 전달', '후속 메일 문장을 더 자연스럽게 익힙니다.', 'inter-email'],
  ['inter-client-3', '중급 확장 27', '요건 정리', '요구 사항과 전제 조건을 맞추는 연습입니다.', 'inter-client'],
  ['inter-mixed-1', '중급 확장 28', '중급 혼합 복습 1', '이유, 의견, 보고를 한 번에 묶습니다.', 'inter-reason'],
  ['inter-mixed-2', '중급 확장 29', '중급 혼합 복습 2', '회의, 조정, 피드백을 섞어 복습합니다.', 'inter-meeting'],
  ['inter-mixed-3', '중급 확장 30', '중급 혼합 복습 3', '이슈와 이메일 흐름을 함께 정리합니다.', 'inter-email'],
  ['inter-mixed-4', '중급 확장 31', '중급 혼합 복습 4', '대외 커뮤니케이션까지 연결합니다.', 'inter-client'],
  ['inter-scenario-1', '중급 확장 32', '업무 시나리오 1', '하나의 업무 흐름 안에서 표현을 연결합니다.', 'inter-report'],
  ['inter-scenario-2', '중급 확장 33', '업무 시나리오 2', '회의 이후 후속 커뮤니케이션을 묶습니다.', 'inter-adjust'],
  ['inter-scenario-3', '중급 확장 34', '업무 시나리오 3', '문제 발생부터 공유까지 순서대로 연습합니다.', 'inter-trouble'],
  ['inter-final-1', '중급 확장 35', '중급 종합 체크', '중급 단계 핵심 표현을 전체적으로 점검합니다.', 'inter-client'],
].map(([slug, phase, title, summary, bankId]) => ({
  slug,
  phase,
  title,
  summary,
  badgeId: slug,
  keyPoints: [title, '업무 맥락', '설명 구조'],
  canDo: [`${title}에 해당하는 표현을 맥락과 함께 이해할 수 있습니다.`, '보고와 의견 표현을 조금 더 길게 말할 수 있습니다.'],
  speakingHint: '문장 전체를 한 번에 내뱉기보다 의미 단위로 끊어 안정적으로 읽어 보세요.',
  bankId,
})) satisfies UnitPlan[]

const advancedPlans: UnitPlan[] = [
  ['advanced-apology-1', '숙련 확장 1', '사과와 시정 1', '문제 상황에서 정중하게 사과하는 표현을 익힙니다.', 'advanced-apology'],
  ['advanced-apology-2', '숙련 확장 2', '사과와 시정 2', '원인 인정과 후속 조치를 함께 말합니다.', 'advanced-apology'],
  ['advanced-mail-1', '숙련 확장 3', '정중 메일 1', '격식 있는 메일 첫 문장과 요청 표현을 익힙니다.', 'advanced-formal-mail'],
  ['advanced-mail-2', '숙련 확장 4', '정중 메일 2', '첨부와 회신 요청을 더 자연스럽게 익힙니다.', 'advanced-formal-mail'],
  ['advanced-negotiation-1', '숙련 확장 5', '협상과 조율 1', '조건을 맞추는 표현을 익힙니다.', 'advanced-negotiation'],
  ['advanced-negotiation-2', '숙련 확장 6', '협상과 조율 2', '대안과 한계를 함께 설명합니다.', 'advanced-negotiation'],
  ['advanced-presentation-1', '숙련 확장 7', '발표와 전환 1', '발표 구조를 명확히 안내하는 표현을 익힙니다.', 'advanced-presentation'],
  ['advanced-presentation-2', '숙련 확장 8', '발표와 전환 2', '포인트 제시와 질문 안내를 묶습니다.', 'advanced-presentation'],
  ['advanced-qa-1', '숙련 확장 9', '질의응답 1', '즉답이 어려울 때의 표현을 익힙니다.', 'advanced-qa'],
  ['advanced-qa-2', '숙련 확장 10', '질의응답 2', '정정과 후속 설명을 차분하게 전달합니다.', 'advanced-qa'],
  ['advanced-escalation-1', '숙련 확장 11', '에스컬레이션 1', '긴급 공유와 즉시 대응 표현을 익힙니다.', 'advanced-escalation'],
  ['advanced-escalation-2', '숙련 확장 12', '에스컬레이션 2', '상황 정리와 후속 보고를 연결합니다.', 'advanced-escalation'],
  ['advanced-risk-1', '숙련 확장 13', '리스크 설명 1', '주요 리스크를 구조적으로 말합니다.', 'advanced-risk'],
  ['advanced-risk-2', '숙련 확장 14', '리스크 설명 2', '불확실성과 판단 기준을 함께 설명합니다.', 'advanced-risk'],
  ['advanced-stakeholder-1', '숙련 확장 15', '이해관계자 조율 1', '관계 부서와의 합의 표현을 익힙니다.', 'advanced-stakeholder'],
  ['advanced-stakeholder-2', '숙련 확장 16', '이해관계자 조율 2', '공유 범위와 결정 기록을 정리합니다.', 'advanced-stakeholder'],
  ['advanced-closeout-1', '숙련 확장 17', '마무리와 후속 1', '결론과 다음 액션을 정중하게 정리합니다.', 'advanced-closeout'],
  ['advanced-closeout-2', '숙련 확장 18', '마무리와 후속 2', '최종본 전달과 협조 요청을 연결합니다.', 'advanced-closeout'],
  ['advanced-apology-3', '숙련 확장 19', '사과 표현 심화', '조금 더 무거운 톤의 사과 표현을 점검합니다.', 'advanced-apology'],
  ['advanced-mail-3', '숙련 확장 20', '격식 메일 심화', '받는 사람을 고려한 표현을 다듬습니다.', 'advanced-formal-mail'],
  ['advanced-negotiation-3', '숙련 확장 21', '조건 협상 심화', '선 긋기와 대안 제시를 함께 연습합니다.', 'advanced-negotiation'],
  ['advanced-presentation-3', '숙련 확장 22', '발표 진행 심화', '전환 문장을 더 안정적으로 말합니다.', 'advanced-presentation'],
  ['advanced-qa-3', '숙련 확장 23', '질의응답 심화', '질문을 정리해서 응답하는 흐름을 익힙니다.', 'advanced-qa'],
  ['advanced-escalation-3', '숙련 확장 24', '긴급 공유 심화', '사실 관계와 임시 대응을 빠르게 정리합니다.', 'advanced-escalation'],
  ['advanced-risk-3', '숙련 확장 25', '리스크 판단 심화', '보수적 판단과 추가 검토 필요성을 말합니다.', 'advanced-risk'],
  ['advanced-stakeholder-3', '숙련 확장 26', '대내 조율 심화', '합의와 문서화를 함께 묶어 말합니다.', 'advanced-stakeholder'],
  ['advanced-closeout-3', '숙련 확장 27', '마감 커뮤니케이션', '최종 전달 전후 문장을 정리합니다.', 'advanced-closeout'],
  ['advanced-mixed-1', '숙련 확장 28', '숙련 혼합 복습 1', '사과, 메일, 조율 표현을 한 번에 복습합니다.', 'advanced-formal-mail'],
  ['advanced-mixed-2', '숙련 확장 29', '숙련 혼합 복습 2', '발표, 질의응답, 마무리 표현을 연결합니다.', 'advanced-presentation'],
  ['advanced-mixed-3', '숙련 확장 30', '숙련 혼합 복습 3', '리스크와 에스컬레이션 흐름을 복습합니다.', 'advanced-risk'],
  ['advanced-mixed-4', '숙련 확장 31', '숙련 혼합 복습 4', '이해관계자 조율과 최종 보고를 묶습니다.', 'advanced-stakeholder'],
  ['advanced-scenario-1', '숙련 확장 32', '고급 시나리오 1', '문제 발생 후 커뮤니케이션 전체 흐름을 연습합니다.', 'advanced-escalation'],
  ['advanced-scenario-2', '숙련 확장 33', '고급 시나리오 2', '발표와 질문 대응을 한 묶음으로 연습합니다.', 'advanced-presentation'],
  ['advanced-scenario-3', '숙련 확장 34', '고급 시나리오 3', '협상과 후속 메일 문장을 연결합니다.', 'advanced-negotiation'],
  ['advanced-final-1', '숙련 확장 35', '숙련 종합 체크', '숙련 단계 핵심 표현을 전체적으로 점검합니다.', 'advanced-closeout'],
].map(([slug, phase, title, summary, bankId]) => ({
  slug,
  phase,
  title,
  summary,
  badgeId: slug,
  keyPoints: [title, '정중한 표현', '비즈니스 맥락'],
  canDo: [`${title} 표현을 보고 상황에 맞게 고를 수 있습니다.`, '길고 정중한 문장도 안정적으로 읽고 말할 수 있습니다.'],
  speakingHint: '길이가 길어질수록 호흡을 나누되 문장의 톤은 일정하게 유지해 보세요.',
  bankId,
})) satisfies UnitPlan[]

export const starterExtraUnits = buildUnits(starterPlans, starterBanks)
export const beginnerExtraUnits = buildUnits(beginnerPlans, beginnerBanks)
export const intermediateExtraUnits = buildUnits(intermediatePlans, intermediateBanks)
export const advancedExtraUnits = buildUnits(advancedPlans, advancedBanks)
