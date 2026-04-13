import type { ChoiceOption, Course, Lesson, ReviewItem, Step, Unit } from '../types'
import {
  advancedExtraUnits,
  beginnerExtraUnits,
  intermediateExtraUnits,
  starterExtraUnits,
  type ExtensionUnit,
} from './courseExpansions'

type ReferenceRow = {
  label: string
  kana: string
  romaji: string
}

type LessonSeed = {
  slug: string
  title: string
  subtitle: string
  objective: string
  oneLinePrinciple?: string
  contextHint?: string
  canDo: string[]
  keyPoints: string[]
  studyTips?: string[]
  exampleCards?: {
    title: string
    text: string
    romaji?: string
    translation?: string
  }[]
  referenceSections?: {
    title: string
    rows: ReferenceRow[]
  }[]
  contentTitle: string
  contentDescription: string
  contentText?: string
  contentRomaji?: string
  contentTranslation?: string
  contentBullets?: string[]
  choiceTitle: string
  choiceDescription: string
  choicePromptText: string
  choiceTeachingNote?: string
  choiceOptions: ChoiceOption[]
  speakingTitle: string
  speakingDescription: string
  speakingText: string
  speakingRomaji?: string
  speakingTranslation?: string
  speakingHint: string
  review:
    | {
        type: 'choice'
        prompt: string
        text: string
        romaji?: string
        translation?: string
        teachingNote?: string
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

type UnitSeed = {
  slug: string
  phase: string
  title: string
  summary: string
  badgeId: string
  lessons: LessonSeed[]
}

type CourseSeed = {
  course: Course
  units: UnitSeed[]
}

const option = (id: string, label: string, isCorrect: boolean, explanation: string): ChoiceOption => ({
  id,
  label,
  isCorrect,
  explanation,
})

const hashText = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

const distributeChoiceOptions = (options: ChoiceOption[], key: string, preferredIndex?: number) => {
  const correctIndex = options.findIndex((option) => option.isCorrect)
  if (correctIndex < 0 || options.length < 2) return options

  const targetIndex = typeof preferredIndex === 'number' ? preferredIndex % options.length : hashText(key) % options.length
  const correctOption = options[correctIndex]
  const otherOptions = options.filter((_, index) => index !== correctIndex)
  const arranged = [...otherOptions]
  arranged.splice(targetIndex, 0, correctOption)
  return arranged
}

const rows = (entries: Array<[string, string, string]>) =>
  entries.map(([label, kana, romaji]) => ({ label, kana, romaji }))

const createReviewItems = (lessonId: string, review: LessonSeed['review']): ReviewItem[] => {
  if (review.type === 'choice') {
    return [{ ...review, id: `review-${lessonId}`, lessonId, type: 'choice', options: distributeChoiceOptions(review.options, `${lessonId}-review`) }]
  }

  return [{ ...review, id: `review-${lessonId}`, lessonId, type: 'speaking' }]
}

const splitSegments = (value: string | undefined) =>
  (value ?? '')
    .split('・')
    .map((segment) => segment.trim())
    .filter(Boolean)

const looksJapanese = (value: string) => /[ぁ-んァ-ン一-龯]/.test(value)

const buildExampleCards = (seed: SimpleLessonSeed) => {
  const cards: NonNullable<LessonSeed['exampleCards']> = [
    {
      title: '핵심 예문',
      text: seed.sampleText,
      romaji: seed.sampleRomaji,
      translation: seed.sampleTranslation,
    },
  ]

  const sampleSegments = splitSegments(seed.sampleText)
  const romajiSegments = splitSegments(seed.sampleRomaji)
  const translationSegments = splitSegments(seed.sampleTranslation)

  if (sampleSegments.length >= 2) {
    cards.push({
      title: '예문 2',
      text: sampleSegments[0],
      romaji: romajiSegments[0],
      translation: translationSegments[0],
    })

    cards.push({
      title: '예문 3',
      text: sampleSegments[sampleSegments.length - 1],
      romaji: romajiSegments[romajiSegments.length - 1],
      translation: translationSegments[translationSegments.length - 1],
    })
  } else {
    const correctOption = seed.quizOptions.find((entry) => entry.isCorrect)
    if (correctOption && looksJapanese(correctOption.label) && correctOption.label !== seed.sampleText) {
      cards.push({
        title: '예문 2',
        text: correctOption.label,
        translation: seed.quizPromptText,
      })
    }

    if (seed.review.type === 'speaking' && seed.review.text !== seed.sampleText) {
      cards.push({
        title: '예문 3',
        text: seed.review.text,
        romaji: seed.review.romaji,
        translation: seed.review.translation,
      })
    }
  }

  if (seed.extraExamples?.length) {
    cards.push(...seed.extraExamples)
  }

  return cards.slice(0, 4)
}

const buildCourse = (seed: CourseSeed) => {
  const units: Unit[] = []
  const lessons: Lesson[] = []

  seed.units.forEach((unitSeed, unitIndex) => {
    const unitId = `${seed.course.id}-${unitSeed.slug}`
    const lessonIds: string[] = []

    unitSeed.lessons.forEach((lessonSeed, lessonIndex) => {
      const lessonId = `${seed.course.id}-${lessonSeed.slug}`
      lessonIds.push(lessonId)

      lessons.push({
        id: lessonId,
        courseId: seed.course.id,
        unitId,
        title: lessonSeed.title,
        subtitle: lessonSeed.subtitle,
        objective: lessonSeed.objective,
        oneLinePrinciple:
          lessonSeed.oneLinePrinciple ?? `${lessonSeed.keyPoints[0]}를 먼저 잡고 ${lessonSeed.keyPoints[1] ?? '핵심 표현'}과 연결해 익히는 것이 중요합니다.`,
        contextHint: lessonSeed.contextHint,
        canDo: lessonSeed.canDo,
        keyPoints: lessonSeed.keyPoints,
        studyTips: lessonSeed.studyTips,
        exampleCards: lessonSeed.exampleCards,
        referenceSections: lessonSeed.referenceSections,
        minutes: 7 + ((unitIndex + lessonIndex) % 4),
        xp: 20 + unitIndex * 4 + lessonIndex * 2,
        steps: ([
          {
            id: `${lessonId}-content`,
            type: 'content',
            label: '설명',
            title: lessonSeed.contentTitle,
            description: lessonSeed.contentDescription,
            text: lessonSeed.contentText,
            romaji: lessonSeed.contentRomaji,
            translation: lessonSeed.contentTranslation,
            bullets: lessonSeed.contentBullets,
          },
          {
            id: `${lessonId}-choice`,
            type: 'choice',
            label: '확인 문제',
            title: lessonSeed.choiceTitle,
            description: lessonSeed.choiceDescription,
            promptText: lessonSeed.choicePromptText,
            teachingNote: lessonSeed.choiceTeachingNote,
            options: distributeChoiceOptions(lessonSeed.choiceOptions, `${lessonId}-choice`, unitIndex + lessonIndex + 1),
          },
          {
            id: `${lessonId}-checklist`,
            type: 'checklist',
            label: '학습 체크',
            title: `${lessonSeed.title} 체크리스트`,
            description: '입문자 기준으로 꼭 거쳐야 하는 핵심 행동만 다시 한 번 확인합니다.',
            items: [
              '샘플 표현을 눈으로 보고 소리를 떠올렸는지 확인하기',
              '문제에서 틀린 보기와 정답 차이 비교하기',
              '말하기 단계 전에 문장을 한 번 조용히 읽어 보기',
            ],
          },
          {
            id: `${lessonId}-speaking`,
            type: 'speaking',
            label: '따라 말하기',
            title: lessonSeed.speakingTitle,
            description: lessonSeed.speakingDescription,
            text: lessonSeed.speakingText,
            romaji: lessonSeed.speakingRomaji,
            translation: lessonSeed.speakingTranslation,
            hint: lessonSeed.speakingHint,
          },
        ] satisfies Step[]).filter((step) => step.type !== 'checklist'),
        reviewItems: createReviewItems(lessonId, lessonSeed.review),
      })
    })

    units.push({
      id: unitId,
      courseId: seed.course.id,
      phase: unitSeed.phase,
      title: unitSeed.title,
      summary: unitSeed.summary,
      badgeId: `${seed.course.id}-${unitSeed.badgeId}`,
      lessonIds,
    })
  })

  return { units, lessons }
}

type SimpleLessonSeed = {
  slug: string
  title: string
  subtitle: string
  objective: string
  oneLinePrinciple?: string
  contextHint?: string
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
  quizTeachingNote?: string
  quizOptions: ChoiceOption[]
  review:
    | {
        type: 'choice'
        prompt: string
        text: string
        options: ChoiceOption[]
        translation?: string
        teachingNote?: string
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

const createSimpleLesson = (
  seed: SimpleLessonSeed,
  keyPoints: string[],
  canDo: string[],
  speakingHint: string,
): LessonSeed => ({
  slug: seed.slug,
  title: seed.title,
  subtitle: seed.subtitle,
  objective: seed.objective,
  oneLinePrinciple:
    seed.oneLinePrinciple ?? `${keyPoints[0]}를 먼저 잡고, ${keyPoints[1] ?? '핵심 표현'}과 바로 연결해 익히는 것이 중요합니다.`,
  contextHint: seed.contextHint,
  canDo,
  keyPoints,
  exampleCards: buildExampleCards(seed),
  contentTitle: `${seed.title} 핵심 표현`,
  contentDescription: '설명을 읽고 예시를 본 뒤, 바로 퀴즈와 말하기로 이어집니다.',
  contentText: seed.sampleText,
  contentRomaji: seed.sampleRomaji,
  contentTranslation: seed.sampleTranslation,
  choiceTitle: seed.quizTitle,
  choiceDescription: seed.quizDescription,
  choicePromptText: seed.quizPromptText,
  choiceTeachingNote:
    seed.quizTeachingNote ?? `뜻을 먼저 떠올린 뒤, ${keyPoints[0]}에 해당하는 핵심 글자나 표현을 비교하면 정답을 더 빨리 찾을 수 있습니다.`,
  choiceOptions: seed.quizOptions,
  speakingTitle: `${seed.title} 따라 읽기`,
  speakingDescription: '표현 전체를 한 번에 읽는 감각을 익혀보세요.',
  speakingText: seed.sampleText,
  speakingRomaji: seed.sampleRomaji,
  speakingTranslation: seed.sampleTranslation,
  speakingHint,
  review: seed.review.type === 'choice'
    ? {
        type: 'choice',
        prompt: seed.review.prompt,
        text: seed.review.text,
        translation: seed.review.translation,
        teachingNote: seed.review.teachingNote,
        options: seed.review.options,
      }
    : {
        type: 'speaking',
        prompt: seed.review.prompt,
        text: seed.review.text,
        romaji: seed.review.romaji,
        translation: seed.review.translation,
        hint: seed.review.hint,
      },
})

const extensionToUnitSeed = (unit: ExtensionUnit): UnitSeed => ({
  slug: unit.slug,
  phase: unit.phase,
  title: unit.title,
  summary: unit.summary,
  badgeId: unit.badgeId,
  lessons: unit.lessons.map((lesson) =>
    createSimpleLesson(lesson, unit.keyPoints, unit.canDo, unit.speakingHint),
  ),
})

export const courseCatalog: Course[] = [
  {
    id: 'starter',
    label: '입문자',
    title: '문자와 첫 표현 코스',
    summary: '히라가나부터 천천히 시작해 짧은 인사와 자기소개까지 가는 가장 쉬운 과정입니다.',
    audience: '히라가나를 전혀 모르는 사람',
    lessonCount: 300,
  },
  {
    id: 'beginner',
    label: '초보자',
    title: '기초 문장과 일상 표현 코스',
    summary: '기본 문장 구조, 질문, 주문, 취미, 일정 같은 생활 표현을 익히는 단계입니다.',
    audience: '문자는 읽을 수 있지만 문장을 아직 잘 못 만드는 사람',
    lessonCount: 300,
  },
  {
    id: 'intermediate',
    label: '중급자',
    title: '업무 대화와 설명 코스',
    summary: '이유, 비교, 일정, 회의, 진행 상황 공유처럼 실제 협업에 가까운 표현을 다룹니다.',
    audience: '기초 회화는 가능하지만 더 자연스러운 설명이 필요한 사람',
    lessonCount: 300,
  },
  {
    id: 'advanced',
    label: '숙련자',
    title: '비즈니스 톤과 고급 표현 코스',
    summary: '완곡 표현, 회의 진행, 보고, 조율, 이메일 문구 같은 고급 업무 표현을 다룹니다.',
    audience: '업무 맥락에서 더 정교한 일본어 톤이 필요한 사람',
    lessonCount: 300,
  },
]

const courseSeeds: CourseSeed[] = [
  {
    course: courseCatalog[0],
    units: [
      {
        slug: 'start',
        phase: '첫걸음',
        title: '첫 소리와 기본 리듬',
        summary: '모음 5개, 리듬, 첫 문자표를 바로 익힙니다.',
        badgeId: 'start',
        lessons: [
          {
            slug: 'welcome-flow',
            title: '첫 소리: あ행',
            subtitle: '일본어를 처음 시작한다면 모음과 첫 줄부터 익힙니다.',
            objective: 'あ행 모음과 소리를 처음 읽는다.',
            canDo: ['あ い う え お를 보고 읽는다.', '일정한 박자로 다섯 소리를 말한다.'],
            keyPoints: ['첫 소리', '모음', '박자'],
            studyTips: ['처음에는 빨리 읽기보다 또렷하게 읽는 것이 더 중요합니다.', '글자와 소리를 바로 연결하는 감각을 먼저 익히세요.'],
            contentTitle: '모음 5개부터 바로 시작합니다',
            contentDescription: '앱 설명보다 먼저 실제 일본어 소리를 입에 붙입니다. あ い う え お를 천천히 보고 읽어보세요.',
            contentText: 'あ い う え お',
            contentRomaji: 'a i u e o',
            contentTranslation: '일본어 기본 모음',
            contentBullets: ['처음에는 한 글자씩 또렷하게 읽습니다.', '리듬을 일정하게 유지하면 다음 글자도 쉬워집니다.'],
            choiceTitle: '소리 o에 맞는 글자를 고르세요',
            choiceDescription: '소리와 글자를 바로 연결하는 첫 문제입니다.',
            choicePromptText: 'o',
            choiceOptions: [
              option('correct', 'お', true, '맞습니다.'),
              option('wrong-1', 'う', false, 'u 소리입니다.'),
              option('wrong-2', 'え', false, 'e 소리입니다.'),
            ],
            speakingTitle: '모음을 한 줄로 읽어보세요',
            speakingDescription: '짧게라도 직접 읽어보는 것이 가장 중요합니다.',
            speakingText: 'あ い う え お',
            speakingRomaji: 'a i u e o',
            speakingTranslation: '일본어 기본 모음',
            speakingHint: '각 글자를 끊어 또렷하게 읽어보세요.',
            review: {
              type: 'speaking',
              prompt: '기본 모음을 다시 읽어보세요.',
              text: 'あ い う え お',
              romaji: 'a i u e o',
              translation: '일본어 기본 모음',
              hint: '한 글자씩 또렷하게 읽으면 충분합니다.',
            },
          },
          {
            slug: 'vowel-rhythm',
            title: '모음 5개와 리듬',
            subtitle: 'a i u e o 순서와 고른 박자를 먼저 익힙니다.',
            objective: '기본 모음과 일본어 리듬을 안다.',
            canDo: ['あ い う え お를 읽는다.', '고른 박자로 천천히 읽는다.'],
            keyPoints: ['모음', '박자', '천천히 읽기'],
            referenceSections: [{ title: '기본 모음표', rows: rows([['a', 'あ', 'a'], ['i', 'い', 'i'], ['u', 'う', 'u'], ['e', 'え', 'e'], ['o', 'お', 'o']]) }],
            contentTitle: '모음은 이후 모든 문자 읽기의 기준입니다',
            contentDescription: '히라가나와 가타카나는 결국 모음 줄에 자음이 붙는 구조로 읽습니다.',
            contentText: 'あ い う え お',
            contentRomaji: 'a i u e o',
            contentTranslation: '기본 모음',
            choiceTitle: '기본 모음 순서로 맞는 것은 무엇일까요?',
            choiceDescription: '이 순서를 자주 보게 됩니다.',
            choicePromptText: 'a i u e o',
            choiceOptions: [
              option('correct', 'a i u e o', true, '맞습니다.'),
              option('wrong-1', 'a e i o u', false, '순서가 바뀌었습니다.'),
              option('wrong-2', 'a i e u o', false, '중간 순서가 다릅니다.'),
            ],
            speakingTitle: '모음을 한 줄로 읽어보세요',
            speakingDescription: '리듬을 일정하게 유지하는 연습입니다.',
            speakingText: 'あ い う え お',
            speakingRomaji: 'a i u e o',
            speakingTranslation: '기본 모음',
            speakingHint: '속도보다 일정한 박자가 중요합니다.',
            review: {
              type: 'speaking',
              prompt: '기본 모음을 다시 읽어보세요.',
              text: 'あ い う え お',
              romaji: 'a i u e o',
              translation: '기본 모음',
              hint: '하나씩 또렷하게 읽어보세요.',
            },
          },
          {
            slug: 'hiragana-a-row',
            title: '히라가나 1: あ행',
            subtitle: '히라가나의 첫 줄을 모음과 연결합니다.',
            objective: 'あ행을 보고 읽을 수 있다.',
            canDo: ['あ, い, う, え, お를 읽는다.', '모음과 히라가나를 연결한다.'],
            keyPoints: ['あ행', '모양 익히기', '소리 연결'],
            referenceSections: [{ title: 'あ행 문자표', rows: rows([['a', 'あ', 'a'], ['i', 'い', 'i'], ['u', 'う', 'u'], ['e', 'え', 'e'], ['o', 'お', 'o']]) }],
            contentTitle: '히라가나의 첫 줄입니다',
            contentDescription: '이 줄만 확실히 익혀도 나머지 줄을 배우기 훨씬 쉬워집니다.',
            contentText: 'あ い う え お',
            contentRomaji: 'a i u e o',
            contentTranslation: 'あ행',
            choiceTitle: '소리 u에 맞는 글자를 고르세요',
            choiceDescription: '소리와 글자를 연결하는 단계입니다.',
            choicePromptText: 'u',
            choiceOptions: [
              option('u', 'う', true, '맞습니다.'),
              option('i', 'い', false, 'い는 i입니다.'),
              option('e', 'え', false, 'え는 e입니다.'),
            ],
            speakingTitle: 'あ행을 순서대로 읽어보세요',
            speakingDescription: '모음 리듬을 유지하면서 읽습니다.',
            speakingText: 'あ い う え お',
            speakingRomaji: 'a i u e o',
            speakingTranslation: 'あ행',
            speakingHint: '한 글자씩 또렷하게 읽으면 충분합니다.',
            review: {
              type: 'choice',
              prompt: '소리 e에 맞는 글자를 고르세요.',
              text: 'e',
              options: [
                option('e', 'え', true, '맞습니다.'),
                option('o', 'お', false, 'お는 o입니다.'),
                option('a', 'あ', false, 'あ는 a입니다.'),
              ],
            },
          },
          {
            slug: 'hiragana-ka-sa',
            title: '히라가나 2: か행과 さ행',
            subtitle: '초반 단어에서 가장 자주 보는 글자들을 익힙니다.',
            objective: 'か행과 さ행을 읽고 구분한다.',
            canDo: ['し를 보고 shi라고 읽는다.', 'こ를 보고 ko라고 읽는다.'],
            keyPoints: ['か행', 'さ행', 'shi'],
            referenceSections: [{ title: 'か행과 さ행', rows: rows([['ka', 'か', 'ka'], ['ki', 'き', 'ki'], ['ku', 'く', 'ku'], ['ke', 'け', 'ke'], ['ko', 'こ', 'ko'], ['sa', 'さ', 'sa'], ['shi', 'し', 'shi'], ['su', 'す', 'su'], ['se', 'せ', 'se'], ['so', 'そ', 'so']]) }],
            contentTitle: '짧은 단어와 인사에 자주 나오는 줄입니다',
            contentDescription: '특히 し는 초보자가 많이 헷갈리므로 자주 보는 것이 좋습니다.',
            contentText: 'か き く け こ ・ さ し す せ そ',
            contentRomaji: 'ka ki ku ke ko ・ sa shi su se so',
            contentTranslation: 'か행과 さ행',
            choiceTitle: '소리 shi에 맞는 글자를 고르세요',
            choiceDescription: '정답이 문제 안에 보이지 않도록 소리만 제시합니다.',
            choicePromptText: 'shi',
            choiceOptions: [
              option('shi', 'し', true, '맞습니다.'),
              option('su', 'す', false, 'す는 su입니다.'),
              option('se', 'せ', false, 'せ는 se입니다.'),
            ],
            speakingTitle: 'さ행을 읽어보세요',
            speakingDescription: '한 줄 전체의 리듬을 느껴보는 연습입니다.',
            speakingText: 'さ し す せ そ',
            speakingRomaji: 'sa shi su se so',
            speakingTranslation: 'さ행',
            speakingHint: 'し만 과하게 세게 읽지 말고 전체 흐름을 유지해보세요.',
            review: {
              type: 'choice',
              prompt: '소리 ko에 맞는 글자를 고르세요.',
              text: 'ko',
              options: [
                option('ko', 'こ', true, '맞습니다.'),
                option('ku', 'く', false, 'く는 ku입니다.'),
                option('so', 'そ', false, 'そ는 so입니다.'),
              ],
            },
          },
        ],
      },
      {
        slug: 'hiragana-more',
        phase: '히라가나 확장',
        title: '나머지 기본 문자',
        summary: '히라가나 기본 줄을 끝내고 단어 읽기로 넘어갈 준비를 합니다.',
        badgeId: 'hiragana-more',
        lessons: [
          {
            slug: 'hiragana-ta-na',
            title: '히라가나 3: た행과 な행',
            subtitle: '자주 쓰이는 두 줄을 이어서 익힙니다.',
            objective: 'た행과 な행을 읽고 구분한다.',
            canDo: ['た, て, と를 읽는다.', 'な, に, ぬ, ね, の를 구분한다.'],
            keyPoints: ['た행', 'な행', '단어 준비'],
            referenceSections: [{ title: 'た행과 な행', rows: rows([['ta', 'た', 'ta'], ['chi', 'ち', 'chi'], ['tsu', 'つ', 'tsu'], ['te', 'て', 'te'], ['to', 'と', 'to'], ['na', 'な', 'na'], ['ni', 'に', 'ni'], ['nu', 'ぬ', 'nu'], ['ne', 'ね', 'ne'], ['no', 'の', 'no']]) }],
            contentTitle: '글자 수가 늘어나도 한 줄씩 보면 괜찮습니다',
            contentDescription: '한 번에 다 외우려 하지 말고 오늘은 두 줄만 익숙해지면 됩니다.',
            contentText: 'た ち つ て と ・ な に ぬ ね の',
            contentRomaji: 'ta chi tsu te to ・ na ni nu ne no',
            contentTranslation: 'た행과 な행',
            choiceTitle: '글자 の 를 읽은 소리로 맞는 것을 고르세요',
            choiceDescription: '글자를 보고 소리를 떠올리는 문제입니다.',
            choicePromptText: 'の',
            choiceOptions: [
              option('no', 'no', true, '맞습니다.'),
              option('nu', 'nu', false, 'ぬ가 nu입니다.'),
              option('to', 'to', false, 'と가 to입니다.'),
            ],
            speakingTitle: 'な행을 한 줄로 읽어보세요',
            speakingDescription: '막혀도 괜찮으니 끝까지 읽는 연습입니다.',
            speakingText: 'な に ぬ ね の',
            speakingRomaji: 'na ni nu ne no',
            speakingTranslation: 'な행',
            speakingHint: '글자 하나씩 정확하게 읽어보세요.',
            review: {
              type: 'choice',
              prompt: '글자 て 를 읽은 소리로 맞는 것을 고르세요.',
              text: 'て',
              options: [
                option('te', 'te', true, '맞습니다.'),
                option('to', 'to', false, 'と가 to입니다.'),
                option('chi', 'chi', false, 'ち가 chi입니다.'),
              ],
            },
          },
          {
            slug: 'hiragana-ha-ma',
            title: '히라가나 4: は행과 ま행',
            subtitle: '이름과 단어에 자주 보이는 글자들을 추가합니다.',
            objective: 'は행과 ま행을 읽는다.',
            canDo: ['ふ를 보고 fu라고 읽는다.', 'ま행을 한 줄로 읽는다.'],
            keyPoints: ['は행', 'ま행', 'fu'],
            referenceSections: [{ title: 'は행과 ま행', rows: rows([['ha', 'は', 'ha'], ['hi', 'ひ', 'hi'], ['fu', 'ふ', 'fu'], ['he', 'へ', 'he'], ['ho', 'ほ', 'ho'], ['ma', 'ま', 'ma'], ['mi', 'み', 'mi'], ['mu', 'む', 'mu'], ['me', 'め', 'me'], ['mo', 'も', 'mo']]) }],
            contentTitle: '자주 쓰이는 음절이 더 많아집니다',
            contentDescription: '특히 ま행은 단어 읽기에서 자주 만납니다.',
            contentText: 'は ひ ふ へ ほ ・ ま み む め も',
            contentRomaji: 'ha hi fu he ho ・ ma mi mu me mo',
            contentTranslation: 'は행과 ま행',
            choiceTitle: '소리 fu에 맞는 글자를 고르세요',
            choiceDescription: '비슷해 보이는 글자와 헷갈리지 않게 골라보세요.',
            choicePromptText: 'fu',
            choiceOptions: [
              option('fu', 'ふ', true, '맞습니다.'),
              option('hi', 'ひ', false, 'ひ는 hi입니다.'),
              option('ho', 'ほ', false, 'ほ는 ho입니다.'),
            ],
            speakingTitle: 'ま행을 읽어보세요',
            speakingDescription: '단어에 잘 연결되도록 또박또박 읽습니다.',
            speakingText: 'ま み む め も',
            speakingRomaji: 'ma mi mu me mo',
            speakingTranslation: 'ま행',
            speakingHint: '각 글자의 박자를 같게 맞춰보세요.',
            review: {
              type: 'choice',
              prompt: '글자 ま 를 읽은 소리로 맞는 것을 고르세요.',
              text: 'ま',
              options: [
                option('ma', 'ma', true, '맞습니다.'),
                option('mi', 'mi', false, 'み가 mi입니다.'),
                option('mo', 'mo', false, 'も가 mo입니다.'),
              ],
            },
          },
          {
            slug: 'hiragana-ya-ra-wa',
            title: '히라가나 5: や행, ら행, わ행',
            subtitle: '기본 글자 마무리 단계입니다.',
            objective: '남은 기본 글자를 읽는다.',
            canDo: ['や, ゆ, よ를 읽는다.', 'ん을 보고 n이라고 읽는다.'],
            keyPoints: ['や행', 'ら행', 'ん'],
            referenceSections: [{ title: '남은 기본 글자', rows: rows([['ya', 'や', 'ya'], ['yu', 'ゆ', 'yu'], ['yo', 'よ', 'yo'], ['ra', 'ら', 'ra'], ['ri', 'り', 'ri'], ['ru', 'る', 'ru'], ['re', 'れ', 're'], ['ro', 'ろ', 'ro'], ['wa', 'わ', 'wa'], ['wo', 'を', 'wo'], ['n', 'ん', 'n']]) }],
            contentTitle: '이제 기본 히라가나를 거의 다 보았습니다',
            contentDescription: '완벽 암기보다 “봤을 때 덜 낯설다”는 감각이 중요합니다.',
            contentText: 'や ゆ よ ・ ら り る れ ろ ・ わ を ん',
            contentRomaji: 'ya yu yo ・ ra ri ru re ro ・ wa wo n',
            contentTranslation: '남은 기본 글자',
            choiceTitle: '소리 n에 맞는 글자를 고르세요',
            choiceDescription: '기본 글자 마무리 문제입니다.',
            choicePromptText: 'n',
            choiceOptions: [
              option('n', 'ん', true, '맞습니다.'),
              option('wa', 'わ', false, 'わ는 wa입니다.'),
              option('wo', 'を', false, 'を는 wo입니다.'),
            ],
            speakingTitle: 'や행과 ら행을 함께 읽어보세요',
            speakingDescription: '짧게 끊되 전체 흐름을 유지합니다.',
            speakingText: 'や ゆ よ ・ ら り る れ ろ',
            speakingRomaji: 'ya yu yo ・ ra ri ru re ro',
            speakingTranslation: 'や행과 ら행',
            speakingHint: '모르는 글자가 있어도 멈추지 말고 끝까지 가보세요.',
            review: {
              type: 'choice',
              prompt: '글자 よ 를 읽은 소리로 맞는 것을 고르세요.',
              text: 'よ',
              options: [
                option('yo', 'yo', true, '맞습니다.'),
                option('yu', 'yu', false, 'ゆ가 yu입니다.'),
                option('ro', 'ro', false, 'ろ가 ro입니다.'),
              ],
            },
          },
          {
            slug: 'hiragana-voiced-small',
            title: '히라가나 6: 탁음과 작은 글자',
            subtitle: 'が와 きゃ 같은 변형 소리를 맛보기로 익힙니다.',
            objective: '탁음과 작은 글자의 개념을 안다.',
            canDo: ['が를 ga로 읽는다.', 'きゃ를 kya로 읽는다.'],
            keyPoints: ['탁음', '작은 やゆよ', '소리 묶음'],
            referenceSections: [{ title: '자주 보는 변화', rows: rows([['ga', 'が', 'ga'], ['za', 'ざ', 'za'], ['da', 'だ', 'da'], ['ba', 'ば', 'ba'], ['pa', 'ぱ', 'pa'], ['kya', 'きゃ', 'kya'], ['shu', 'しゅ', 'shu'], ['cho', 'ちょ', 'cho']]) }],
            contentTitle: '점과 작은 글자가 붙으면 소리가 바뀝니다',
            contentDescription: '기본 글자를 읽을 수 있다면 이 변화도 금방 익숙해집니다.',
            contentText: 'が ざ だ ば ぱ ・ きゃ しゅ ちょ',
            contentRomaji: 'ga za da ba pa ・ kya shu cho',
            contentTranslation: '탁음과 작은 글자',
            choiceTitle: '소리 kya에 맞는 글자를 고르세요',
            choiceDescription: '앞 글자와 작은 글자를 하나로 봅니다.',
            choicePromptText: 'kya',
            choiceOptions: [
              option('kya', 'きゃ', true, '맞습니다.'),
              option('ki', 'き', false, 'き는 ki입니다.'),
              option('ka', 'か', false, 'か는 ka입니다.'),
            ],
            speakingTitle: '변화된 소리를 읽어보세요',
            speakingDescription: '기본 글자보다 조금 더 큰 덩어리로 읽습니다.',
            speakingText: 'が ざ だ ば ぱ ・ きゃ しゅ ちょ',
            speakingRomaji: 'ga za da ba pa ・ kya shu cho',
            speakingTranslation: '탁음과 작은 글자',
            speakingHint: 'きゃ 같은 글자는 두 글자를 따로 떼지 말고 한 번에 읽어보세요.',
            review: {
              type: 'choice',
              prompt: '글자 が 를 읽은 소리로 맞는 것을 고르세요.',
              text: 'が',
              options: [
                option('ga', 'ga', true, '맞습니다.'),
                option('ka', 'ka', false, 'か가 ka입니다.'),
                option('pa', 'pa', false, 'ぱ가 pa입니다.'),
              ],
            },
          },
        ],
      },
      {
        slug: 'word-reading',
        phase: '단어 읽기',
        title: '히라가나를 단어로 연결하기',
        summary: '기본 글자를 단어와 짧은 표현으로 묶어 읽는 연습을 합니다.',
        badgeId: 'word-reading',
        lessons: [
          {
            slug: 'hiragana-words-1',
            title: '히라가나 7: 짧은 단어 읽기',
            subtitle: '이제 글자가 아니라 단어 단위로 보기 시작합니다.',
            objective: '짧은 히라가나 단어를 읽는다.',
            canDo: ['さかな를 읽는다.', 'ねこ를 읽는다.'],
            keyPoints: ['단어 읽기', '묶음 읽기', '정확성'],
            contentTitle: '짧은 단어를 천천히 읽어봅니다',
            contentDescription: '뜻을 완벽히 외우는 것보다, 우선 읽을 수 있는지가 중요합니다.',
            contentText: 'さかな ・ ねこ ・ たまご',
            contentRomaji: 'sakana ・ neko ・ tamago',
            contentTranslation: '물고기 ・ 고양이 ・ 달걀',
            choiceTitle: '단어 ねこ 를 읽은 소리로 맞는 것을 고르세요',
            choiceDescription: '글자를 한 번에 묶어서 보세요.',
            choicePromptText: 'ねこ',
            choiceOptions: [
              option('neko', 'neko', true, '맞습니다.'),
              option('noko', 'noko', false, '첫 글자가 다릅니다.'),
              option('neka', 'neka', false, '마지막 글자가 다릅니다.'),
            ],
            speakingTitle: '세 단어를 읽어보세요',
            speakingDescription: '단어 사이에서만 잠깐 쉬고 이어 읽습니다.',
            speakingText: 'さかな ・ ねこ ・ たまご',
            speakingRomaji: 'sakana ・ neko ・ tamago',
            speakingTranslation: '물고기 ・ 고양이 ・ 달걀',
            speakingHint: '단어 안에서는 최대한 끊지 않고 읽어보세요.',
            review: {
              type: 'choice',
              prompt: '단어 さかな 를 읽은 소리로 맞는 것을 고르세요.',
              text: 'さかな',
              options: [
                option('sakana', 'sakana', true, '맞습니다.'),
                option('sanaka', 'sanaka', false, '가운데 소리 순서가 다릅니다.'),
                option('sakanaa', 'sakanaa', false, '장음이 들어가지 않습니다.'),
              ],
            },
          },
          {
            slug: 'hiragana-words-2',
            title: '히라가나 8: 생활 단어 읽기',
            subtitle: '익숙한 사물 이름으로 읽기 감각을 더 굳힙니다.',
            objective: '생활 단어를 자연스럽게 읽는다.',
            canDo: ['みず를 읽는다.', 'くるま를 읽는다.'],
            keyPoints: ['생활 단어', '반복 읽기', '리듬'],
            contentTitle: '이미 아는 뜻의 단어를 읽으면 부담이 줄어듭니다',
            contentDescription: '뜻이 익숙할수록 문자와 소리를 연결하기 쉽습니다.',
            contentText: 'みず ・ くるま ・ はこ',
            contentRomaji: 'mizu ・ kuruma ・ hako',
            contentTranslation: '물 ・ 자동차 ・ 상자',
            choiceTitle: '단어 みず 를 읽은 소리로 맞는 것을 고르세요',
            choiceDescription: '짧은 생활 단어 복습입니다.',
            choicePromptText: 'みず',
            choiceOptions: [
              option('mizu', 'mizu', true, '맞습니다.'),
              option('miso', 'miso', false, '마지막 글자가 다릅니다.'),
              option('mido', 'mido', false, '가운데 글자가 다릅니다.'),
            ],
            speakingTitle: '생활 단어를 읽어보세요',
            speakingDescription: '낯설지 않은 뜻을 떠올리며 읽습니다.',
            speakingText: 'みず ・ くるま ・ はこ',
            speakingRomaji: 'mizu ・ kuruma ・ hako',
            speakingTranslation: '물 ・ 자동차 ・ 상자',
            speakingHint: '의미를 떠올리며 읽으면 기억에 더 오래 남습니다.',
            review: {
              type: 'speaking',
              prompt: '생활 단어 세 개를 다시 읽어보세요.',
              text: 'みず ・ くるま ・ はこ',
              romaji: 'mizu ・ kuruma ・ hako',
              translation: '물 ・ 자동차 ・ 상자',
              hint: '한 단어씩 안정적으로 읽으면 충분합니다.',
            },
          },
          {
            slug: 'greetings-1',
            title: '첫 표현 1: 기본 인사',
            subtitle: '문자 읽기를 실제 인사 표현으로 연결합니다.',
            objective: '기본 인사를 읽고 따라 말한다.',
            canDo: ['こんにちは를 읽는다.', 'ありがとうございます를 읽는다.'],
            keyPoints: ['인사', '감사', '짧은 표현'],
            contentTitle: '처음으로 실제 쓸 수 있는 표현을 봅니다',
            contentDescription: '표현 전체를 하나로 익히는 감각이 중요합니다.',
            contentText: 'こんにちは ・ ありがとうございます',
            contentRomaji: 'konnichiwa ・ arigatou gozaimasu',
            contentTranslation: '안녕하세요 ・ 감사합니다',
            choiceTitle: '“감사합니다”에 해당하는 표현을 고르세요',
            choiceDescription: '뜻과 표현을 연결합니다.',
            choicePromptText: '감사합니다',
            choiceOptions: [
              option('thanks', 'ありがとうございます', true, '맞습니다.'),
              option('hello', 'こんにちは', false, '이것은 기본 인사입니다.'),
              option('morning', 'おはようございます', false, '이것은 아침 인사입니다.'),
            ],
            speakingTitle: '기본 인사를 읽어보세요',
            speakingDescription: '문장처럼 이어서 읽는 연습입니다.',
            speakingText: 'こんにちは',
            speakingRomaji: 'konnichiwa',
            speakingTranslation: '안녕하세요',
            speakingHint: '한 글자씩 끊기보다 한 표현처럼 읽어보세요.',
            review: {
              type: 'choice',
              prompt: '“안녕하세요”에 해당하는 표현을 고르세요.',
              text: '안녕하세요',
              options: [
                option('hello', 'こんにちは', true, '맞습니다.'),
                option('thanks', 'ありがとうございます', false, '감사 표현입니다.'),
                option('request', 'おねがいします', false, '부탁 표현입니다.'),
              ],
            },
          },
          {
            slug: 'greetings-2',
            title: '첫 표현 2: 자기소개 시작',
            subtitle: '가장 쉬운 자기소개 한 문장을 익힙니다.',
            objective: '“저는 ___입니다” 패턴을 말한다.',
            canDo: ['わたしは ___ です를 읽는다.', '짧은 자기소개를 따라 말한다.'],
            keyPoints: ['わたしは', 'です', '자기소개'],
            contentTitle: '처음 만났을 때 가장 기본이 되는 문장',
            contentDescription: '이름 부분만 바꾸면 바로 자기소개가 됩니다.',
            contentText: 'わたしは コルトン です',
            contentRomaji: 'watashi wa Koruton desu',
            contentTranslation: '저는 Colton입니다.',
            choiceTitle: '자기소개 기본 패턴으로 맞는 것을 고르세요',
            choiceDescription: '패턴 전체를 하나로 익히는 문제입니다.',
            choicePromptText: '저는 ___입니다',
            choiceOptions: [
              option('intro', 'わたしは ___ です', true, '맞습니다.'),
              option('thanks', 'ありがとうございます', false, '감사 표현입니다.'),
              option('hello', 'こんにちは', false, '기본 인사입니다.'),
            ],
            speakingTitle: '자기소개 문장을 읽어보세요',
            speakingDescription: '이름까지 한 문장으로 자연스럽게 이어 봅니다.',
            speakingText: 'わたしは コルトン です',
            speakingRomaji: 'watashi wa Koruton desu',
            speakingTranslation: '저는 Colton입니다.',
            speakingHint: '속도보다 한 문장 끝까지 편하게 읽는 것이 더 중요합니다.',
            review: {
              type: 'speaking',
              prompt: '짧은 자기소개 문장을 다시 읽어보세요.',
              text: 'わたしは コルトン です',
              romaji: 'watashi wa Koruton desu',
              translation: '저는 Colton입니다.',
              hint: '처음보다 덜 낯설게 느껴지면 잘 진행 중입니다.',
            },
          },
        ],
      },
      {
        slug: 'starter-phrases',
        phase: '표현 확장',
        title: '짧은 표현 더하기',
        summary: '자기소개를 확장하고 숫자, 요일, 일상 표현을 붙입니다.',
        badgeId: 'starter-phrases',
        lessons: [
          {
            slug: 'self-intro-2',
            title: '자기소개 2: 잘 부탁드립니다',
            subtitle: '자기소개 뒤에 붙이는 자연스러운 마무리 표현입니다.',
            objective: '자기소개 마무리 표현을 읽고 말한다.',
            canDo: ['よろしく おねがいします를 읽는다.', '자기소개 뒤에 이어서 말한다.'],
            keyPoints: ['마무리 표현', '연결 말하기', '인사 확장'],
            contentTitle: '자기소개 뒤에 자연스럽게 붙는 문장',
            contentDescription: '한 문장처럼 통째로 익히는 편이 좋습니다.',
            contentText: 'よろしく おねがいします',
            contentRomaji: 'yoroshiku onegaishimasu',
            contentTranslation: '잘 부탁드립니다',
            choiceTitle: '자기소개 뒤에 붙이기 좋은 표현을 고르세요',
            choiceDescription: '문맥에 맞는 표현을 고르는 문제입니다.',
            choicePromptText: '잘 부탁드립니다',
            choiceOptions: [
              option('yoroshiku', 'よろしく おねがいします', true, '맞습니다.'),
              option('thanks', 'ありがとうございます', false, '감사 표현입니다.'),
              option('morning', 'おはようございます', false, '아침 인사입니다.'),
            ],
            speakingTitle: '마무리 표현을 읽어보세요',
            speakingDescription: '자기소개와 붙여 읽을 준비를 합니다.',
            speakingText: 'よろしく おねがいします',
            speakingRomaji: 'yoroshiku onegaishimasu',
            speakingTranslation: '잘 부탁드립니다',
            speakingHint: '길어 보여도 한 번에 자연스럽게 읽어보세요.',
            review: {
              type: 'choice',
              prompt: '“잘 부탁드립니다”에 해당하는 표현을 고르세요.',
              text: '잘 부탁드립니다',
              options: [
                option('yoroshiku', 'よろしく おねがいします', true, '맞습니다.'),
                option('thanks', 'ありがとうございます', false, '감사 표현입니다.'),
                option('hello', 'こんにちは', false, '기본 인사입니다.'),
              ],
            },
          },
          {
            slug: 'numbers-basic',
            title: '숫자와 시간 감각',
            subtitle: '아주 자주 들리는 숫자와 시간 표현을 맛보기로 익힙니다.',
            objective: '기본 숫자를 읽고 간단한 시간을 말한다.',
            canDo: ['いち, に, さん을 읽는다.', 'さんじ를 읽는다.'],
            keyPoints: ['숫자', '시간', '반복'],
            contentTitle: '숫자는 생활 표현의 기본입니다',
            contentDescription: '처음에는 1~5와 간단한 시각 표현만 익혀도 충분합니다.',
            contentText: 'いち ・ に ・ さん ・ よん ・ ご',
            contentRomaji: 'ichi ・ ni ・ san ・ yon ・ go',
            contentTranslation: '1 ・ 2 ・ 3 ・ 4 ・ 5',
            choiceTitle: '“3시”에 해당하는 표현을 고르세요',
            choiceDescription: '숫자와 시간을 연결해보세요.',
            choicePromptText: '3시',
            choiceOptions: [
              option('sanji', 'さんじ', true, '맞습니다.'),
              option('goji', 'ごじ', false, '이것은 5시입니다.'),
              option('yonji', 'よんじ', false, '이것은 4시입니다.'),
            ],
            speakingTitle: '숫자를 읽어보세요',
            speakingDescription: '박자를 맞추며 읽으면 훨씬 익숙해집니다.',
            speakingText: 'いち ・ に ・ さん ・ よん ・ ご',
            speakingRomaji: 'ichi ・ ni ・ san ・ yon ・ go',
            speakingTranslation: '1 ・ 2 ・ 3 ・ 4 ・ 5',
            speakingHint: '숫자 하나마다 짧게 끊어 읽어보세요.',
            review: {
              type: 'choice',
              prompt: '“5시”에 해당하는 표현을 고르세요.',
              text: '5시',
              options: [
                option('goji', 'ごじ', true, '맞습니다.'),
                option('sanji', 'さんじ', false, '이것은 3시입니다.'),
                option('niji', 'にじ', false, '이것은 2시입니다.'),
              ],
            },
          },
          {
            slug: 'days-basic',
            title: '요일과 반복 표현',
            subtitle: '자주 보이는 요일 표현과 “매일” 같은 말을 익힙니다.',
            objective: '기본 요일 두세 개와 반복 표현을 안다.',
            canDo: ['げつようび를 읽는다.', 'まいにち를 읽는다.'],
            keyPoints: ['요일', '반복', '리듬'],
            contentTitle: '요일은 길어 보여도 패턴처럼 읽으면 됩니다',
            contentDescription: '지금은 모든 요일을 외우기보다 대표 예시만 익혀도 충분합니다.',
            contentText: 'げつようび ・ きんようび ・ まいにち',
            contentRomaji: 'getsuyoubi ・ kinyoubi ・ mainichi',
            contentTranslation: '월요일 ・ 금요일 ・ 매일',
            choiceTitle: '“매일”에 해당하는 표현을 고르세요',
            choiceDescription: '뜻과 표현을 연결하는 문제입니다.',
            choicePromptText: '매일',
            choiceOptions: [
              option('daily', 'まいにち', true, '맞습니다.'),
              option('monday', 'げつようび', false, '이것은 월요일입니다.'),
              option('friday', 'きんようび', false, '이것은 금요일입니다.'),
            ],
            speakingTitle: '요일 표현을 읽어보세요',
            speakingDescription: '길어 보이는 표현도 박자를 나눠 읽으면 됩니다.',
            speakingText: 'げつようび ・ まいにち',
            speakingRomaji: 'getsuyoubi ・ mainichi',
            speakingTranslation: '월요일 ・ 매일',
            speakingHint: '중간에서 끊기보다 전체를 한 표현처럼 읽어보세요.',
            review: {
              type: 'speaking',
              prompt: '요일과 반복 표현을 다시 읽어보세요.',
              text: 'げつようび ・ まいにち',
              romaji: 'getsuyoubi ・ mainichi',
              translation: '월요일 ・ 매일',
              hint: '길어도 끝까지 편하게 읽는 연습입니다.',
            },
          },
          {
            slug: 'katakana-intro',
            title: '가타카나 1: 익숙한 외래어',
            subtitle: '히라가나 뒤에, 익숙한 외래어로 가타카나를 시작합니다.',
            objective: '가타카나 단어를 몇 개 읽는다.',
            canDo: ['コーヒー를 읽는다.', 'テスト를 읽는다.'],
            keyPoints: ['가타카나', '외래어', '친숙한 단어'],
            contentTitle: '익숙한 뜻의 단어로 가타카나를 시작합니다',
            contentDescription: '문자 모양이 달라도 읽는 방식은 크게 다르지 않습니다.',
            contentText: 'コーヒー ・ テスト ・ カメラ',
            contentRomaji: 'koohii ・ tesuto ・ kamera',
            contentTranslation: '커피 ・ 테스트 ・ 카메라',
            choiceTitle: '“커피”에 해당하는 단어를 고르세요',
            choiceDescription: '뜻과 가타카나 단어를 연결합니다.',
            choicePromptText: '커피',
            choiceOptions: [
              option('coffee', 'コーヒー', true, '맞습니다.'),
              option('test', 'テスト', false, '이것은 테스트입니다.'),
              option('camera', 'カメラ', false, '이것은 카메라입니다.'),
            ],
            speakingTitle: '가타카나 단어를 읽어보세요',
            speakingDescription: '의미를 떠올리면서 읽으면 더 쉽습니다.',
            speakingText: 'コーヒー ・ テスト ・ カメラ',
            speakingRomaji: 'koohii ・ tesuto ・ kamera',
            speakingTranslation: '커피 ・ 테스트 ・ 카메라',
            speakingHint: '단어 전체를 하나로 읽는 느낌을 가져보세요.',
            review: {
              type: 'choice',
              prompt: '“테스트”에 해당하는 단어를 고르세요.',
              text: '테스트',
              options: [
                option('test', 'テスト', true, '맞습니다.'),
                option('coffee', 'コーヒー', false, '커피입니다.'),
                option('camera', 'カメラ', false, '카메라입니다.'),
              ],
            },
          },
        ],
      },
      {
        slug: 'starter-finish',
        phase: '마무리',
        title: '업무 표현과 체크포인트',
        summary: '업무에서 들을 수 있는 짧은 표현을 배우고 입문 과정을 마무리합니다.',
        badgeId: 'starter-finish',
        lessons: [
          {
            slug: 'katakana-more',
            title: '가타카나 2: 더 자주 보이는 단어',
            subtitle: '회사 생활에서 보게 되는 쉬운 가타카나를 더 읽습니다.',
            objective: '추가 가타카나 단어를 읽는다.',
            canDo: ['メール를 읽는다.', 'チーム를 읽는다.'],
            keyPoints: ['가타카나 확장', '업무 단어', '반복'],
            contentTitle: '업무에서 만나는 쉬운 가타카나',
            contentDescription: '가타카나가 낯설어도 뜻이 익숙하면 훨씬 읽기 쉽습니다.',
            contentText: 'メール ・ チーム ・ コピー',
            contentRomaji: 'meeru ・ chiimu ・ kopii',
            contentTranslation: '메일 ・ 팀 ・ 복사',
            choiceTitle: '“팀”에 해당하는 단어를 고르세요',
            choiceDescription: '업무 단어를 뜻과 연결합니다.',
            choicePromptText: '팀',
            choiceOptions: [
              option('team', 'チーム', true, '맞습니다.'),
              option('mail', 'メール', false, '이것은 메일입니다.'),
              option('copy', 'コピー', false, '이것은 복사입니다.'),
            ],
            speakingTitle: '업무 단어를 읽어보세요',
            speakingDescription: '의미를 떠올리며 읽으면 더 편합니다.',
            speakingText: 'メール ・ チーム ・ コピー',
            speakingRomaji: 'meeru ・ chiimu ・ kopii',
            speakingTranslation: '메일 ・ 팀 ・ 복사',
            speakingHint: '길어 보여도 이미 아는 단어라고 생각하고 읽어보세요.',
            review: {
              type: 'speaking',
              prompt: '가타카나 업무 단어를 다시 읽어보세요.',
              text: 'メール ・ チーム ・ コピー',
              romaji: 'meeru ・ chiimu ・ kopii',
              translation: '메일 ・ 팀 ・ 복사',
              hint: '뜻을 떠올리며 편하게 읽어보세요.',
            },
          },
          {
            slug: 'workplace-1',
            title: '업무 표현 1: 부탁과 감사',
            subtitle: '실제로 바로 쓸 수 있는 아주 짧은 업무 표현입니다.',
            objective: 'おねがいします와 ありがとうございます를 구분한다.',
            canDo: ['부탁 표현을 읽는다.', '감사 표현을 다시 확인한다.'],
            keyPoints: ['부탁', '감사', '업무 표현'],
            contentTitle: '짧지만 자주 쓰이는 표현 두 개',
            contentDescription: '비즈니스 일본어 전체가 아니라, 가장 자주 보게 될 핵심 표현부터 익힙니다.',
            contentText: 'おねがいします ・ ありがとうございます',
            contentRomaji: 'onegaishimasu ・ arigatou gozaimasu',
            contentTranslation: '부탁드립니다 ・ 감사합니다',
            choiceTitle: '“부탁드립니다”에 가까운 표현을 고르세요',
            choiceDescription: '뜻을 기준으로 구분합니다.',
            choicePromptText: '부탁드립니다',
            choiceOptions: [
              option('request', 'おねがいします', true, '맞습니다.'),
              option('thanks', 'ありがとうございます', false, '감사 표현입니다.'),
              option('hello', 'こんにちは', false, '기본 인사입니다.'),
            ],
            speakingTitle: '부탁 표현을 읽어보세요',
            speakingDescription: '길어 보여도 한 표현처럼 읽으면 됩니다.',
            speakingText: 'おねがいします',
            speakingRomaji: 'onegaishimasu',
            speakingTranslation: '부탁드립니다',
            speakingHint: '부드럽게 이어 읽는 연습을 해보세요.',
            review: {
              type: 'choice',
              prompt: '“감사합니다”에 가까운 표현을 고르세요.',
              text: '감사합니다',
              options: [
                option('thanks', 'ありがとうございます', true, '맞습니다.'),
                option('request', 'おねがいします', false, '부탁 표현입니다.'),
                option('hello', 'こんにちは', false, '기본 인사입니다.'),
              ],
            },
          },
          {
            slug: 'workplace-2',
            title: '업무 표현 2: 이해와 확인',
            subtitle: '아주 짧은 반응 표현을 추가합니다.',
            objective: 'わかりました와 だいじょうぶです를 읽는다.',
            canDo: ['알겠습니다를 표현한다.', '괜찮습니다를 읽는다.'],
            keyPoints: ['반응 표현', '이해', '확인'],
            contentTitle: '짧은 반응 표현은 실전에서 자주 씁니다',
            contentDescription: '뜻을 붙여두면 실제 상황에서도 바로 떠올리기 쉽습니다.',
            contentText: 'わかりました ・ だいじょうぶです',
            contentRomaji: 'wakarimashita ・ daijoubu desu',
            contentTranslation: '알겠습니다 ・ 괜찮습니다',
            choiceTitle: '“알겠습니다”에 해당하는 표현을 고르세요',
            choiceDescription: '짧은 반응 표현 복습입니다.',
            choicePromptText: '알겠습니다',
            choiceOptions: [
              option('understood', 'わかりました', true, '맞습니다.'),
              option('okay', 'だいじょうぶです', false, '이것은 괜찮습니다.'),
              option('request', 'おねがいします', false, '부탁 표현입니다.'),
            ],
            speakingTitle: '반응 표현을 읽어보세요',
            speakingDescription: '짧은 문장이라도 자연스럽게 이어 읽는 것이 중요합니다.',
            speakingText: 'わかりました ・ だいじょうぶです',
            speakingRomaji: 'wakarimashita ・ daijoubu desu',
            speakingTranslation: '알겠습니다 ・ 괜찮습니다',
            speakingHint: '뜻을 생각하며 읽으면 더 자연스럽게 나옵니다.',
            review: {
              type: 'speaking',
              prompt: '반응 표현 두 개를 다시 읽어보세요.',
              text: 'わかりました ・ だいじょうぶです',
              romaji: 'wakarimashita ・ daijoubu desu',
              translation: '알겠습니다 ・ 괜찮습니다',
              hint: '두 표현의 톤 차이를 느끼며 읽어보세요.',
            },
          },
          {
            slug: 'starter-checkpoint',
            title: '입문자 코스 체크포인트',
            subtitle: '문자, 짧은 단어, 인사, 자기소개를 한 번 더 점검합니다.',
            objective: '입문자 코스 핵심 내용을 다시 확인한다.',
            canDo: ['짧은 자기소개를 읽는다.', '기본 인사를 고른다.', '가타카나 단어를 읽는다.'],
            keyPoints: ['코스 마무리', '전체 복습', '자신감'],
            contentTitle: '이제 기본 문자와 첫 표현은 충분히 익혔습니다',
            contentDescription: '모든 글자가 자동으로 떠오르지 않아도, 읽을 수 있다면 잘 진행된 것입니다.',
            contentBullets: ['히라가나 기본 글자를 모두 한 번 이상 보았습니다.', '짧은 단어를 직접 읽어보았습니다.', '인사와 자기소개를 소리 내어 말해보았습니다.'],
            choiceTitle: '자기소개 뒤에 붙이기 좋은 표현을 고르세요',
            choiceDescription: '입문자 코스 마지막 문제입니다.',
            choicePromptText: '잘 부탁드립니다',
            choiceOptions: [
              option('yoroshiku', 'よろしく おねがいします', true, '맞습니다.'),
              option('thanks', 'ありがとうございます', false, '감사 표현입니다.'),
              option('morning', 'おはようございます', false, '아침 인사입니다.'),
            ],
            speakingTitle: '자기소개 문장을 다시 읽어보세요',
            speakingDescription: '처음보다 더 편하게 읽을 수 있는지 확인합니다.',
            speakingText: 'わたしは コルトン です',
            speakingRomaji: 'watashi wa Koruton desu',
            speakingTranslation: '저는 Colton입니다.',
            speakingHint: '막히는 부분이 줄었다면 충분히 성장한 것입니다.',
            review: {
              type: 'speaking',
              prompt: '입문자 코스 마지막으로 자기소개를 읽어보세요.',
              text: 'わたしは コルトン です',
              romaji: 'watashi wa Koruton desu',
              translation: '저는 Colton입니다.',
              hint: '처음보다 자연스럽게 이어 읽는 데 집중해보세요.',
            },
          },
        ],
      },
    ],
  },
  {
    course: courseCatalog[1],
    units: [
      {
        slug: 'sentence-basics',
        phase: '기초 문장',
        title: '문장 구조와 지시어',
        summary: '기초 문장 구조와 これ/それ 같은 지시 표현부터 정리합니다.',
        badgeId: 'sentence-basics',
        lessons: [
          createSimpleLesson(
            {
              slug: 'sentence-order',
              title: '기초 문장 1: 기본 어순',
              subtitle: '짧은 문장을 통째로 읽고 의미를 잡는 연습입니다.',
              objective: '가장 쉬운 A는 B입니다 패턴을 이해한다.',
              sampleText: 'これは ペン です',
              sampleRomaji: 'kore wa pen desu',
              sampleTranslation: '이것은 펜입니다',
              quizTitle: '“이것은 펜입니다”에 맞는 표현을 고르세요',
              quizDescription: '문장 전체를 뜻과 연결합니다.',
              quizPromptText: '이것은 펜입니다',
              quizOptions: [
                option('correct', 'これは ペン です', true, '맞습니다.'),
                option('wrong-1', 'それは ペン です', false, '그것은 펜입니다.'),
                option('wrong-2', 'これは ほん です', false, '이것은 책입니다.'),
              ],
              review: { type: 'speaking', prompt: '기본 문장을 다시 읽어보세요.', text: 'これは ペン です', romaji: 'kore wa pen desu', translation: '이것은 펜입니다', hint: '문장 전체를 한 번에 보세요.' },
            },
            ['기본 어순', 'です', '문장 덩어리'],
            ['짧은 문장을 읽는다.', 'A는 B입니다 패턴을 안다.'],
            'は는 지금은 한 덩어리로 읽어도 충분합니다.',
          ),
          createSimpleLesson(
            {
              slug: 'demonstratives',
              title: '기초 문장 2: 이것, 그것, 저것',
              subtitle: '지시어를 쓰면 물건을 가리키는 표현을 바로 만들 수 있습니다.',
              objective: 'これ, それ, あれ를 구분한다.',
              sampleText: 'これ ・ それ ・ あれ',
              sampleRomaji: 'kore ・ sore ・ are',
              sampleTranslation: '이것 ・ 그것 ・ 저것',
              quizTitle: '“그것”에 해당하는 표현을 고르세요',
              quizDescription: '세 표현의 차이를 익힙니다.',
              quizPromptText: '그것',
              quizOptions: [
                option('sore', 'それ', true, '맞습니다.'),
                option('kore', 'これ', false, '이것입니다.'),
                option('are', 'あれ', false, '저것입니다.'),
              ],
              review: { type: 'choice', prompt: '“저것”에 해당하는 표현을 고르세요.', text: '저것', options: [option('are', 'あれ', true, '맞습니다.'), option('kore', 'これ', false, '이것입니다.'), option('sore', 'それ', false, '그것입니다.')] },
            },
            ['지시어', 'これ/それ/あれ', '기본 명사문'],
            ['물건을 가리키는 표현을 읽는다.', '세 지시어를 구분한다.'],
            '손으로 가리킨다고 생각하며 읽으면 더 쉽게 기억됩니다.',
          ),
          createSimpleLesson(
            {
              slug: 'place-words',
              title: '기초 문장 3: 여기, 거기, 저기',
              subtitle: '장소를 말하는 기본 표현입니다.',
              objective: 'ここ, そこ, あそこ를 구분한다.',
              sampleText: 'ここ ・ そこ ・ あそこ',
              sampleRomaji: 'koko ・ soko ・ asoko',
              sampleTranslation: '여기 ・ 거기 ・ 저기',
              quizTitle: '“여기”에 해당하는 표현을 고르세요',
              quizDescription: '장소 지시어를 익힙니다.',
              quizPromptText: '여기',
              quizOptions: [
                option('koko', 'ここ', true, '맞습니다.'),
                option('soko', 'そこ', false, '거기입니다.'),
                option('asoko', 'あそこ', false, '저기입니다.'),
              ],
              review: { type: 'speaking', prompt: '장소 지시어를 다시 읽어보세요.', text: 'ここ ・ そこ ・ あそこ', romaji: 'koko ・ soko ・ asoko', translation: '여기 ・ 거기 ・ 저기', hint: '거리감을 떠올리며 읽어보세요.' },
            },
            ['장소 지시어', 'ここ/そこ/あそこ', '공간 감각'],
            ['장소를 가리키는 표현을 읽는다.', '여기/거기/저기를 구분한다.'],
            '실제로 손가락으로 가리키며 읽으면 더 잘 익습니다.',
          ),
          createSimpleLesson(
            {
              slug: 'question-basic',
              title: '기초 문장 4: 질문 만들기',
              subtitle: 'か를 붙여 가장 쉬운 질문 형태를 익힙니다.',
              objective: '짧은 의문문을 이해한다.',
              sampleText: 'これは ほん ですか',
              sampleRomaji: 'kore wa hon desu ka',
              sampleTranslation: '이것은 책입니까?',
              quizTitle: '질문 문장으로 맞는 것을 고르세요',
              quizDescription: '문장 끝의 형태를 확인해보세요.',
              quizPromptText: '이것은 책입니까?',
              quizOptions: [
                option('question', 'これは ほん ですか', true, '맞습니다.'),
                option('statement', 'これは ほん です', false, '이것은 평서문입니다.'),
                option('wrong', 'それは ほん ですか', false, '그것은 책입니까?입니다.'),
              ],
              review: { type: 'choice', prompt: '질문을 만드는 끝맺음으로 맞는 것을 고르세요.', text: 'ですか', options: [option('ka', 'ですか', true, '맞습니다.'), option('desu', 'です', false, '이것은 평서문입니다.'), option('kara', 'から', false, '이유 표현입니다.')] },
            },
            ['질문형', 'ですか', '문장 끝'],
            ['짧은 질문을 읽는다.', '문장 끝에서 질문 여부를 본다.'],
            '문장 끝의 か를 들으면 질문이라는 감각을 먼저 익히세요.',
          ),
        ],
      },
      {
        slug: 'daily-basics',
        phase: '일상 표현',
        title: '시간과 일상 루틴',
        summary: '시간, 날짜, 좋아함, 음식 주문 같은 일상 표현을 익힙니다.',
        badgeId: 'daily-basics',
        lessons: [
          createSimpleLesson(
            { slug: 'time-basic', title: '일상 1: 시간 말하기', subtitle: '몇 시인지 말하는 가장 쉬운 형태입니다.', objective: '간단한 시간을 읽는다.', sampleText: 'いま は くじ です', sampleRomaji: 'ima wa kuji desu', sampleTranslation: '지금은 9시입니다', quizTitle: '“지금은 9시입니다”에 맞는 표현을 고르세요', quizDescription: '시간 표현을 문장으로 읽어봅니다.', quizPromptText: '지금은 9시입니다', quizOptions: [option('correct', 'いま は くじ です', true, '맞습니다.'), option('wrong-1', 'いま は ごじ です', false, '지금은 5시입니다.'), option('wrong-2', 'あした は くじ です', false, '내일은 9시입니다.')], review: { type: 'speaking', prompt: '시간 문장을 다시 읽어보세요.', text: 'いま は くじ です', romaji: 'ima wa kuji desu', translation: '지금은 9시입니다', hint: '시간 숫자를 또렷하게 읽어보세요.' } },
            ['시간', 'いま', '숫자 응용'],
            ['시간을 읽는다.', '간단한 시각 문장을 이해한다.'],
            '숫자 부분을 분명하게 읽는 데 집중해보세요.',
          ),
          createSimpleLesson(
            { slug: 'date-week', title: '일상 2: 요일과 날짜 감각', subtitle: '약속과 일정에서 자주 쓰는 표현입니다.', objective: '요일을 읽고 뜻을 안다.', sampleText: 'きょう は げつようび です', sampleRomaji: 'kyou wa getsuyoubi desu', sampleTranslation: '오늘은 월요일입니다', quizTitle: '“오늘은 월요일입니다”에 맞는 표현을 고르세요', quizDescription: '요일 표현을 문장과 연결합니다.', quizPromptText: '오늘은 월요일입니다', quizOptions: [option('correct', 'きょう は げつようび です', true, '맞습니다.'), option('wrong-1', 'きょう は きんようび です', false, '오늘은 금요일입니다.'), option('wrong-2', 'あした は げつようび です', false, '내일은 월요일입니다.')], review: { type: 'choice', prompt: '“금요일”에 해당하는 표현을 고르세요.', text: '금요일', options: [option('friday', 'きんようび', true, '맞습니다.'), option('monday', 'げつようび', false, '월요일입니다.'), option('today', 'きょう', false, '오늘입니다.')] } },
            ['요일', '오늘', '일정 기본'],
            ['요일 문장을 읽는다.', '오늘과 요일을 연결한다.'],
            '길어 보여도 “きん・よう・び”처럼 리듬을 나눠 읽으면 됩니다.',
          ),
          createSimpleLesson(
            { slug: 'likes-dislikes', title: '일상 3: 좋아함과 싫어함', subtitle: '취향을 말하는 가장 쉬운 표현입니다.', objective: '好きです와 きらいです를 구분한다.', sampleText: 'コーヒー が すき です', sampleRomaji: 'koohii ga suki desu', sampleTranslation: '커피를 좋아합니다', quizTitle: '“좋아합니다”에 가까운 표현을 고르세요', quizDescription: '감정 표현을 구분합니다.', quizPromptText: '좋아합니다', quizOptions: [option('like', 'すき です', true, '맞습니다.'), option('dislike', 'きらい です', false, '싫어합니다입니다.'), option('want', 'ほしい です', false, '원합니다입니다.')], review: { type: 'speaking', prompt: '좋아함 문장을 다시 읽어보세요.', text: 'コーヒー が すき です', romaji: 'koohii ga suki desu', translation: '커피를 좋아합니다', hint: '좋아하는 것을 떠올리며 읽어보세요.' } },
            ['취향', 'すき/きらい', '감정 표현'],
            ['좋아함 표현을 읽는다.', '좋아함과 싫어함을 구분한다.'],
            '좋아하는 대상을 실제로 떠올리면 더 쉽게 기억됩니다.',
          ),
          createSimpleLesson(
            { slug: 'food-order', title: '일상 4: 음식 주문 기초', subtitle: '가게에서 바로 쓸 수 있는 가장 기본 표현입니다.', objective: '주문 문장을 읽고 이해한다.', sampleText: 'コーヒー を おねがいします', sampleRomaji: 'koohii o onegaishimasu', sampleTranslation: '커피 부탁드립니다', quizTitle: '주문 표현으로 맞는 것을 고르세요', quizDescription: '가게에서 바로 쓸 수 있는 문장입니다.', quizPromptText: '커피 부탁드립니다', quizOptions: [option('order', 'コーヒー を おねがいします', true, '맞습니다.'), option('thanks', 'コーヒー を ありがとうございます', false, '문장이 어색합니다.'), option('question', 'コーヒー を ですか', false, '질문 형태입니다.')], review: { type: 'choice', prompt: '주문할 때 자연스러운 표현을 고르세요.', text: '부탁드립니다', options: [option('request', 'おねがいします', true, '맞습니다.'), option('thanks', 'ありがとうございます', false, '감사 표현입니다.'), option('okay', 'だいじょうぶです', false, '괜찮습니다.')] } },
            ['주문', 'を', '부탁 표현'],
            ['가벼운 주문 문장을 읽는다.', '부탁 표현을 문장에 붙인다.'],
            '문장 전체를 “한 번에 주문한다”는 느낌으로 읽어보세요.',
          ),
        ],
      },
      {
        slug: 'daily-conversation',
        phase: '기초 대화',
        title: '가족, 취미, 이동',
        summary: '일상 대화에 자주 나오는 주제를 넓힙니다.',
        badgeId: 'daily-conversation',
        lessons: [
          ...[
            {
              slug: 'family-intro',
              title: '일상 5: 가족 소개',
              subtitle: '가장 가까운 사람을 소개하는 기초 표현입니다.',
              objective: '가족 소개 문장을 이해한다.',
              sampleText: 'かぞく は よにん です',
              sampleRomaji: 'kazoku wa yonin desu',
              sampleTranslation: '가족은 네 명입니다',
              quizTitle: '“가족은 네 명입니다”에 맞는 표현을 고르세요',
              quizDescription: '숫자와 가족 단어를 연결합니다.',
              quizPromptText: '가족은 네 명입니다',
              quizOptions: [option('correct', 'かぞく は よにん です', true, '맞습니다.'), option('wrong-1', 'かぞく は さんにん です', false, '세 명입니다.'), option('wrong-2', 'ともだち は よにん です', false, '친구는 네 명입니다.')],
              review: { type: 'speaking' as const, prompt: '가족 소개 문장을 다시 읽어보세요.', text: 'かぞく は よにん です', romaji: 'kazoku wa yonin desu', translation: '가족은 네 명입니다', hint: '숫자 부분을 또렷하게 읽어보세요.' },
            },
            {
              slug: 'hobby-basic',
              title: '일상 6: 취미 말하기',
              subtitle: '좋아하는 활동을 말하는 기본 패턴입니다.',
              objective: '취미를 간단히 말한다.',
              sampleText: 'わたし の しゅみ は どくしょ です',
              sampleRomaji: 'watashi no shumi wa dokusho desu',
              sampleTranslation: '제 취미는 독서입니다',
              quizTitle: '“제 취미는 독서입니다”에 맞는 표현을 고르세요',
              quizDescription: '자기소개 확장 표현입니다.',
              quizPromptText: '제 취미는 독서입니다',
              quizOptions: [option('correct', 'わたし の しゅみ は どくしょ です', true, '맞습니다.'), option('wrong-1', 'わたし の しゅみ は おんがく です', false, '제 취미는 음악입니다.'), option('wrong-2', 'わたし は どくしょ です', false, '문장 구조가 다릅니다.')],
              review: { type: 'choice' as const, prompt: '“취미”에 해당하는 단어를 고르세요.', text: '취미', options: [option('shumi', 'しゅみ', true, '맞습니다.'), option('kazoku', 'かぞく', false, '가족입니다.'), option('yotei', 'よてい', false, '예정입니다.')] },
            },
            {
              slug: 'direction-basic',
              title: '일상 7: 이동과 방향',
              subtitle: '역, 왼쪽, 오른쪽 같은 아주 기본적인 이동 표현입니다.',
              objective: '간단한 방향 표현을 이해한다.',
              sampleText: 'えき は みぎ です',
              sampleRomaji: 'eki wa migi desu',
              sampleTranslation: '역은 오른쪽입니다',
              quizTitle: '“역은 오른쪽입니다”에 맞는 표현을 고르세요',
              quizDescription: '장소와 방향을 연결합니다.',
              quizPromptText: '역은 오른쪽입니다',
              quizOptions: [option('correct', 'えき は みぎ です', true, '맞습니다.'), option('wrong-1', 'えき は ひだり です', false, '역은 왼쪽입니다.'), option('wrong-2', 'みぎ は えき です', false, '순서가 어색합니다.')],
              review: { type: 'choice' as const, prompt: '“왼쪽”에 해당하는 단어를 고르세요.', text: '왼쪽', options: [option('hidari', 'ひだり', true, '맞습니다.'), option('migi', 'みぎ', false, '오른쪽입니다.'), option('ue', 'うえ', false, '위입니다.')] },
            },
            {
              slug: 'can-cannot',
              title: '일상 8: 할 수 있다 / 어렵다',
              subtitle: '가능 여부를 짧게 말하는 표현입니다.',
              objective: 'できます와 むずかしいです를 구분한다.',
              sampleText: 'にほんご は まだ むずかしい です',
              sampleRomaji: 'nihongo wa mada muzukashii desu',
              sampleTranslation: '일본어는 아직 어렵습니다',
              quizTitle: '“아직 어렵습니다”에 가까운 표현을 고르세요',
              quizDescription: '가능 여부와 난이도를 구분합니다.',
              quizPromptText: '아직 어렵습니다',
              quizOptions: [option('hard', 'まだ むずかしい です', true, '맞습니다.'), option('can', 'できます', false, '할 수 있습니다입니다.'), option('easy', 'やさしい です', false, '쉽습니다입니다.')],
              review: { type: 'speaking' as const, prompt: '어렵다고 말하는 문장을 다시 읽어보세요.', text: 'にほんご は まだ むずかしい です', romaji: 'nihongo wa mada muzukashii desu', translation: '일본어는 아직 어렵습니다', hint: '부담 없이 현재 느낌을 말하듯 읽어보세요.' },
            },
          ].map((seed) =>
            createSimpleLesson(
              seed,
              ['일상 대화', '자기 표현', '짧은 문장'],
              ['일상 주제를 짧게 말한다.', '생활 표현을 읽고 이해한다.'],
              '익숙한 주제라고 생각하면 더 자연스럽게 읽을 수 있습니다.',
            ),
          ),
        ],
      },
      {
        slug: 'question-answer',
        phase: '질문과 응답',
        title: '질문, 부탁, 경험',
        summary: '간단한 질문과 대답, 부탁, 경험 표현을 익힙니다.',
        badgeId: 'question-answer',
        lessons: [
          ...[
            {
              slug: 'question-more',
              title: '일상 9: 무엇을 좋아합니까?',
              subtitle: '간단한 질문과 대답의 왕복을 익힙니다.',
              objective: '짧은 질문을 이해하고 답을 떠올린다.',
              sampleText: 'なに が すき ですか',
              sampleRomaji: 'nani ga suki desu ka',
              sampleTranslation: '무엇을 좋아합니까?',
              quizTitle: '질문 문장으로 맞는 것을 고르세요',
              quizDescription: '문장 끝의 질문 형태를 확인합니다.',
              quizPromptText: '무엇을 좋아합니까?',
              quizOptions: [option('correct', 'なに が すき ですか', true, '맞습니다.'), option('wrong-1', 'なに が すき です', false, '평서문입니다.'), option('wrong-2', 'なに は すき ですか', false, '표현이 부자연스럽습니다.')],
              review: { type: 'speaking' as const, prompt: '질문 문장을 다시 읽어보세요.', text: 'なに が すき ですか', romaji: 'nani ga suki desu ka', translation: '무엇을 좋아합니까?', hint: '문장 끝을 살짝 올리며 읽어보세요.' },
            },
            {
              slug: 'short-answer',
              title: '일상 10: 짧은 대답',
              subtitle: '네, 아니요, 조금 같은 짧은 응답을 익힙니다.',
              objective: '짧은 대답을 구분한다.',
              sampleText: 'はい ・ いいえ ・ ちょっと',
              sampleRomaji: 'hai ・ iie ・ chotto',
              sampleTranslation: '네 ・ 아니요 ・ 조금',
              quizTitle: '“아니요”에 해당하는 표현을 고르세요',
              quizDescription: '짧은 반응 표현입니다.',
              quizPromptText: '아니요',
              quizOptions: [option('iie', 'いいえ', true, '맞습니다.'), option('hai', 'はい', false, '네입니다.'), option('chotto', 'ちょっと', false, '조금입니다.')],
              review: { type: 'choice' as const, prompt: '“네”에 해당하는 표현을 고르세요.', text: '네', options: [option('hai', 'はい', true, '맞습니다.'), option('iie', 'いいえ', false, '아니요입니다.'), option('mada', 'まだ', false, '아직입니다.')] },
            },
            {
              slug: 'request-basic',
              title: '일상 11: 가벼운 부탁',
              subtitle: '무언가를 요청할 때 쓰는 짧은 문장입니다.',
              objective: '부탁 문장을 읽고 이해한다.',
              sampleText: 'もう いちど おねがいします',
              sampleRomaji: 'mou ichido onegaishimasu',
              sampleTranslation: '한 번 더 부탁드립니다',
              quizTitle: '“한 번 더 부탁드립니다”에 맞는 표현을 고르세요',
              quizDescription: '실전에서 자주 쓸 수 있는 문장입니다.',
              quizPromptText: '한 번 더 부탁드립니다',
              quizOptions: [option('correct', 'もう いちど おねがいします', true, '맞습니다.'), option('wrong-1', 'いちど ありがとうございます', false, '문장이 다릅니다.'), option('wrong-2', 'もう いちど ですか', false, '질문형입니다.')],
              review: { type: 'speaking' as const, prompt: '부탁 문장을 다시 읽어보세요.', text: 'もう いちど おねがいします', romaji: 'mou ichido onegaishimasu', translation: '한 번 더 부탁드립니다', hint: '정중하게 부탁한다는 느낌으로 읽어보세요.' },
            },
            {
              slug: 'experience-basic',
              title: '일상 12: 해본 적이 있습니다',
              subtitle: '아주 가벼운 경험 표현을 시작합니다.',
              objective: '経験があります 패턴을 읽는다.',
              sampleText: 'にほん へ いった こと が あります',
              sampleRomaji: 'nihon e itta koto ga arimasu',
              sampleTranslation: '일본에 가본 적이 있습니다',
              quizTitle: '“가본 적이 있습니다”에 가까운 표현을 고르세요',
              quizDescription: '경험을 말하는 기본 느낌을 익힙니다.',
              quizPromptText: '가본 적이 있습니다',
              quizOptions: [option('correct', 'いった こと が あります', true, '맞습니다.'), option('wrong-1', 'いきます', false, '갑니다입니다.'), option('wrong-2', 'いきたい です', false, '가고 싶습니다입니다.')],
              review: { type: 'choice' as const, prompt: '“해본 적이 있습니다”에 가까운 부분을 고르세요.', text: '경험 표현', options: [option('exp', 'こと が あります', true, '맞습니다.'), option('desu', 'です', false, '기본 끝맺음입니다.'), option('ka', 'か', false, '질문형입니다.')] },
            },
          ].map((seed) =>
            createSimpleLesson(
              seed,
              ['질문', '응답', '요청'],
              ['질문과 대답을 읽는다.', '짧은 요청과 경험 표현을 안다.'],
              '의미를 떠올리며 읽으면 문장 전체가 더 잘 기억됩니다.',
            ),
          ),
        ],
      },
      {
        slug: 'beginner-finish',
        phase: '초보자 마무리',
        title: '일상 회화 정리',
        summary: '카페, 일정, 자기소개 확장을 정리하며 초보자 코스를 마칩니다.',
        badgeId: 'beginner-finish',
        lessons: [
          ...[
            {
              slug: 'cafe-order',
              title: '일상 13: 카페 주문 정리',
              subtitle: '주문 상황에서 자주 쓰는 표현을 다시 묶습니다.',
              objective: '주문 문장을 자연스럽게 읽는다.',
              sampleText: 'コーヒー を ひとつ おねがいします',
              sampleRomaji: 'koohii o hitotsu onegaishimasu',
              sampleTranslation: '커피 하나 부탁드립니다',
              quizTitle: '“커피 하나 부탁드립니다”에 맞는 표현을 고르세요',
              quizDescription: '수량과 주문 표현을 함께 봅니다.',
              quizPromptText: '커피 하나 부탁드립니다',
              quizOptions: [option('correct', 'コーヒー を ひとつ おねがいします', true, '맞습니다.'), option('wrong-1', 'コーヒー は ひとつ です', false, '커피는 하나입니다.'), option('wrong-2', 'コーヒー を ふたつ おねがいします', false, '커피 두 개 부탁드립니다.')],
              review: { type: 'speaking' as const, prompt: '카페 주문 문장을 다시 읽어보세요.', text: 'コーヒー を ひとつ おねがいします', romaji: 'koohii o hitotsu onegaishimasu', translation: '커피 하나 부탁드립니다', hint: '실제로 주문한다고 생각하고 읽어보세요.' },
            },
            {
              slug: 'schedule-basic',
              title: '일상 14: 일정 말하기',
              subtitle: '오늘, 내일, 다음 주 같은 일정 표현입니다.',
              objective: '간단한 예정 문장을 읽는다.',
              sampleText: 'あした は かいぎ が あります',
              sampleRomaji: 'ashita wa kaigi ga arimasu',
              sampleTranslation: '내일은 회의가 있습니다',
              quizTitle: '“내일은 회의가 있습니다”에 맞는 표현을 고르세요',
              quizDescription: '일정 문장을 뜻과 연결합니다.',
              quizPromptText: '내일은 회의가 있습니다',
              quizOptions: [option('correct', 'あした は かいぎ が あります', true, '맞습니다.'), option('wrong-1', 'きょう は かいぎ が あります', false, '오늘은 회의가 있습니다입니다.'), option('wrong-2', 'あした は かいぎ が ないです', false, '내일은 회의가 없습니다입니다.')],
              review: { type: 'choice' as const, prompt: '“내일”에 해당하는 표현을 고르세요.', text: '내일', options: [option('ashita', 'あした', true, '맞습니다.'), option('kyou', 'きょう', false, '오늘입니다.'), option('raishuu', 'らいしゅう', false, '다음 주입니다.')] },
            },
            {
              slug: 'self-intro-work',
              title: '일상 15: 자기소개 확장',
              subtitle: '이름만이 아니라 하는 일을 짧게 붙입니다.',
              objective: '간단한 업무 자기소개를 읽는다.',
              sampleText: 'わたし は デザイナー です',
              sampleRomaji: 'watashi wa dezainaa desu',
              sampleTranslation: '저는 디자이너입니다',
              quizTitle: '“저는 디자이너입니다”에 맞는 표현을 고르세요',
              quizDescription: '직업을 붙인 자기소개입니다.',
              quizPromptText: '저는 디자이너입니다',
              quizOptions: [option('correct', 'わたし は デザイナー です', true, '맞습니다.'), option('wrong-1', 'わたし は エンジニア です', false, '저는 엔지니어입니다.'), option('wrong-2', 'デザイナー は わたし です', false, '문장 순서가 어색합니다.')],
              review: { type: 'speaking' as const, prompt: '직업 자기소개를 다시 읽어보세요.', text: 'わたし は デザイナー です', romaji: 'watashi wa dezainaa desu', translation: '저는 디자이너입니다', hint: '자기 일이라고 생각하며 자연스럽게 읽어보세요.' },
            },
            {
              slug: 'beginner-checkpoint',
              title: '초보자 코스 체크포인트',
              subtitle: '기초 문장, 질문, 일상 표현을 한 번 더 정리합니다.',
              objective: '초보자 코스 핵심 내용을 점검한다.',
              sampleText: 'あした は かいぎ が あります',
              sampleRomaji: 'ashita wa kaigi ga arimasu',
              sampleTranslation: '내일은 회의가 있습니다',
              quizTitle: '초보자 코스에서 다룬 주제로 맞는 것을 고르세요',
              quizDescription: '질문, 일정, 자기소개, 주문을 모두 지나왔는지 확인합니다.',
              quizPromptText: '내일은 회의가 있습니다',
              quizOptions: [option('correct', 'あした は かいぎ が あります', true, '맞습니다.'), option('wrong-1', 'こんにちは', false, '너무 쉬운 기본 인사입니다.'), option('wrong-2', 'コーヒー', false, '단어만 있고 문장이 아닙니다.')],
              review: { type: 'speaking' as const, prompt: '초보자 코스 마지막 문장을 읽어보세요.', text: 'あした は かいぎ が あります', romaji: 'ashita wa kaigi ga arimasu', translation: '내일은 회의가 있습니다', hint: '문장 길이가 조금 늘어나도 끝까지 안정적으로 읽어보세요.' },
            },
          ].map((seed) =>
            createSimpleLesson(
              seed,
              ['일상 회화', '자기 표현', '코스 정리'],
              ['일상 문장을 읽는다.', '초보자 수준의 표현을 연결한다.'],
              '이제는 문장을 조금 더 큰 덩어리로 보려고 해보세요.',
            ),
          ),
        ],
      },
    ],
  },
  {
    course: courseCatalog[2],
    units: [
      {
        slug: 'logic-opinion',
        phase: '설명과 의견',
        title: '이유, 비교, 의견 말하기',
        summary: '중급자 코스는 설명의 길이와 자연스러운 연결을 늘리는 데 집중합니다.',
        badgeId: 'logic-opinion',
        lessons: [
          ...[
            { slug: 'reason-basic', title: '중급 1: 이유 말하기', subtitle: 'から를 써서 가장 쉬운 이유 설명을 합니다.', objective: '이유를 붙인 문장을 이해한다.', sampleText: 'じかん が ない から むずかしい です', sampleRomaji: 'jikan ga nai kara muzukashii desu', sampleTranslation: '시간이 없어서 어렵습니다', quizTitle: '이유를 말하는 문장으로 맞는 것을 고르세요', quizDescription: '문장 속 から의 역할을 확인합니다.', quizPromptText: '시간이 없어서 어렵습니다', quizOptions: [option('correct', 'じかん が ない から むずかしい です', true, '맞습니다.'), option('wrong-1', 'じかん が ない です', false, '이유 설명이 없습니다.'), option('wrong-2', 'むずかしい から じかん が ない です', false, '순서가 어색합니다.')], review: { type: 'choice' as const, prompt: '이유를 붙일 때 쓰는 표현을 고르세요.', text: '이유 연결', options: [option('kara', 'から', true, '맞습니다.'), option('made', 'まで', false, '까지입니다.'), option('dake', 'だけ', false, '만입니다.')] } },
            { slug: 'compare-basic', title: '중급 2: 비교 표현', subtitle: 'A보다 B가 더 낫다고 말하는 기본 표현입니다.', objective: '비교 문장을 이해한다.', sampleText: 'こちら の ほう が はやい です', sampleRomaji: 'kochira no hou ga hayai desu', sampleTranslation: '이쪽이 더 빠릅니다', quizTitle: '비교 문장으로 맞는 것을 고르세요', quizDescription: 'のほうが의 느낌을 익힙니다.', quizPromptText: '이쪽이 더 빠릅니다', quizOptions: [option('correct', 'こちら の ほう が はやい です', true, '맞습니다.'), option('wrong-1', 'こちら は はやい です', false, '비교 느낌이 사라집니다.'), option('wrong-2', 'こちら の ほう が おそい です', false, '느립니다입니다.')], review: { type: 'speaking' as const, prompt: '비교 문장을 다시 읽어보세요.', text: 'こちら の ほう が はやい です', romaji: 'kochira no hou ga hayai desu', translation: '이쪽이 더 빠릅니다', hint: '비교 포인트를 강조하듯 읽어보세요.' } },
            { slug: 'opinion-basic', title: '중급 3: 의견 말하기', subtitle: '제 생각에는으로 시작하는 기본 의견 표현입니다.', objective: '의견 문장을 읽고 말한다.', sampleText: 'わたし は それ が いい と おもいます', sampleRomaji: 'watashi wa sore ga ii to omoimasu', sampleTranslation: '저는 그것이 좋다고 생각합니다', quizTitle: '의견 표현으로 맞는 것을 고르세요', quizDescription: 'とおもいます 패턴을 익힙니다.', quizPromptText: '저는 그것이 좋다고 생각합니다', quizOptions: [option('correct', 'わたし は それ が いい と おもいます', true, '맞습니다.'), option('wrong-1', 'それ が いい です', false, '생각합니다가 빠졌습니다.'), option('wrong-2', 'わたし は それ を いい です', false, '조사가 어색합니다.')], review: { type: 'choice' as const, prompt: '“생각합니다”에 가까운 부분을 고르세요.', text: '의견 표현', options: [option('think', 'と おもいます', true, '맞습니다.'), option('because', 'から', false, '이유 연결입니다.'), option('question', 'ですか', false, '질문형입니다.')] } },
            { slug: 'agreement-basic', title: '중급 4: 동의와 비동의', subtitle: '동의하지만 다른 의견이 있다는 톤을 익힙니다.', objective: '완곡한 동의 문장을 이해한다.', sampleText: 'それ は そう ですが すこし しんぱい です', sampleRomaji: 'sore wa sou desu ga sukoshi shinpai desu', sampleTranslation: '그렇지만 조금 걱정됩니다', quizTitle: '완곡한 반응으로 맞는 것을 고르세요', quizDescription: '동의 뒤에 우려를 붙이는 표현입니다.', quizPromptText: '그렇지만 조금 걱정됩니다', quizOptions: [option('correct', 'それ は そう ですが すこし しんぱい です', true, '맞습니다.'), option('wrong-1', 'それ は しんぱい です', false, '완곡한 연결이 없습니다.'), option('wrong-2', 'それ は そう です', false, '우려 표현이 빠졌습니다.')], review: { type: 'speaking' as const, prompt: '완곡한 반응 문장을 다시 읽어보세요.', text: 'それ は そう ですが すこし しんぱい です', romaji: 'sore wa sou desu ga sukoshi shinpai desu', translation: '그렇지만 조금 걱정됩니다', hint: '앞부분과 뒷부분의 톤 차이를 느껴보세요.' } },
          ].map((seed) => createSimpleLesson(seed, ['이유', '비교', '의견'], ['설명형 문장을 읽는다.', '의견과 우려를 말한다.'], '문장의 연결어를 의식하며 읽어보세요.')),
        ],
      },
      {
        slug: 'schedule-work',
        phase: '일정과 조율',
        title: '계획, 조정, 제안',
        summary: '일정을 말하고 제안하는 문장을 연습합니다.',
        badgeId: 'schedule-work',
        lessons: [
          ...[
            { slug: 'plan-basic', title: '중급 5: 예정 말하기', subtitle: '앞으로 할 일을 설명하는 기본 표현입니다.', objective: '예정 문장을 읽는다.', sampleText: 'らいしゅう プレゼン を する よてい です', sampleRomaji: 'raishuu purezen o suru yotei desu', sampleTranslation: '다음 주에 발표할 예정입니다', quizTitle: '예정 문장으로 맞는 것을 고르세요', quizDescription: '予定です 패턴을 익힙니다.', quizPromptText: '다음 주에 발표할 예정입니다', quizOptions: [option('correct', 'らいしゅう プレゼン を する よてい です', true, '맞습니다.'), option('wrong-1', 'らいしゅう プレゼン を します', false, '예정이라는 뉘앙스가 빠졌습니다.'), option('wrong-2', 'らいしゅう は プレゼン です', false, '내용이 부족합니다.')], review: { type: 'choice' as const, prompt: '“예정입니다”에 가까운 부분을 고르세요.', text: '예정', options: [option('yotei', 'よてい です', true, '맞습니다.'), option('shimasu', 'します', false, '합니다입니다.'), option('dekimasu', 'できます', false, '할 수 있습니다입니다.')] } },
            { slug: 'adjust-basic', title: '중급 6: 일정 조정', subtitle: '조금 늦추거나 바꾸는 표현입니다.', objective: '조정 요청 문장을 이해한다.', sampleText: 'じかん を すこし ずらせますか', sampleRomaji: 'jikan o sukoshi zurasemasu ka', sampleTranslation: '시간을 조금 조정할 수 있을까요?', quizTitle: '조정 요청으로 맞는 것을 고르세요', quizDescription: '완곡한 질문형입니다.', quizPromptText: '시간을 조금 조정할 수 있을까요?', quizOptions: [option('correct', 'じかん を すこし ずらせますか', true, '맞습니다.'), option('wrong-1', 'じかん を ずらします', false, '일방적 진술입니다.'), option('wrong-2', 'じかん が すこし です', false, '의미가 다릅니다.')], review: { type: 'speaking' as const, prompt: '일정 조정 요청을 다시 읽어보세요.', text: 'じかん を すこし ずらせますか', romaji: 'jikan o sukoshi zurasemasu ka', translation: '시간을 조금 조정할 수 있을까요?', hint: '부드럽게 부탁하는 톤으로 읽어보세요.' } },
            { slug: 'suggest-basic', title: '중급 7: 제안하기', subtitle: '상대를 부드럽게 권하는 제안 표현입니다.', objective: '제안 문장을 읽는다.', sampleText: 'いちど ためして みませんか', sampleRomaji: 'ichido tameshite mimasen ka', sampleTranslation: '한 번 시도해보지 않겠습니까?', quizTitle: '제안 표현으로 맞는 것을 고르세요', quizDescription: '권유 뉘앙스를 익힙니다.', quizPromptText: '한 번 시도해보지 않겠습니까?', quizOptions: [option('correct', 'いちど ためして みませんか', true, '맞습니다.'), option('wrong-1', 'いちど ためします', false, '그냥 진술입니다.'), option('wrong-2', 'いちど ためして ください', false, '직접 요청입니다.')], review: { type: 'choice' as const, prompt: '제안할 때 자연스러운 형태를 고르세요.', text: '제안', options: [option('suggest', 'みませんか', true, '맞습니다.'), option('please', 'ください', false, '요청형입니다.'), option('because', 'から', false, '이유 연결입니다.')] } },
            { slug: 'priority-basic', title: '중급 8: 우선순위 말하기', subtitle: '무엇이 먼저인지 설명하는 문장입니다.', objective: '우선순위 문장을 이해한다.', sampleText: 'まず こちら を すすめたい です', sampleRomaji: 'mazu kochira o susumetai desu', sampleTranslation: '우선 이것을 진행하고 싶습니다', quizTitle: '우선순위를 말하는 표현으로 맞는 것을 고르세요', quizDescription: '먼저라는 느낌을 확인합니다.', quizPromptText: '우선 이것을 진행하고 싶습니다', quizOptions: [option('correct', 'まず こちら を すすめたい です', true, '맞습니다.'), option('wrong-1', 'こちら を すすめます', false, '우선이라는 느낌이 약합니다.'), option('wrong-2', 'まず こちら は です', false, '문장이 완성되지 않습니다.')], review: { type: 'speaking' as const, prompt: '우선순위 문장을 다시 읽어보세요.', text: 'まず こちら を すすめたい です', romaji: 'mazu kochira o susumetai desu', translation: '우선 이것을 진행하고 싶습니다', hint: 'まず를 살짝 강조해 읽어보세요.' } },
          ].map((seed) => createSimpleLesson(seed, ['일정', '조정', '제안'], ['일정을 말한다.', '조정과 제안을 이해한다.'], '실제 회의에서 말한다고 생각하고 읽어보세요.')),
        ],
      },
      {
        slug: 'meeting-work',
        phase: '회의와 진행',
        title: '회의, 진행 상황, 피드백',
        summary: '협업 맥락에서 자주 듣는 표현을 다룹니다.',
        badgeId: 'meeting-work',
        lessons: [
          ...[
            { slug: 'meeting-attend', title: '중급 9: 회의 참석', subtitle: '회의 참석 여부를 말하는 표현입니다.', objective: '회의 참석 문장을 이해한다.', sampleText: 'ごご の かいぎ に さんか します', sampleRomaji: 'gogo no kaigi ni sanka shimasu', sampleTranslation: '오후 회의에 참석합니다', quizTitle: '회의 참석 문장으로 맞는 것을 고르세요', quizDescription: '회의와 시간 표현이 함께 나옵니다.', quizPromptText: '오후 회의에 참석합니다', quizOptions: [option('correct', 'ごご の かいぎ に さんか します', true, '맞습니다.'), option('wrong-1', 'ごご の かいぎ は さんか です', false, '문장 구조가 다릅니다.'), option('wrong-2', 'ごご は かいぎ に します', false, '자연스럽지 않습니다.')], review: { type: 'choice' as const, prompt: '“참석합니다”에 가까운 표현을 고르세요.', text: '참석', options: [option('sanka', 'さんか します', true, '맞습니다.'), option('setsumei', 'せつめい します', false, '설명합니다입니다.'), option('kakunin', 'かくにん します', false, '확인합니다입니다.')] } },
            { slug: 'progress-share', title: '중급 10: 진행 상황 공유', subtitle: '지금 어디까지 왔는지 짧게 공유합니다.', objective: '진행 상황 문장을 읽는다.', sampleText: 'いま は だいたい はんぶん です', sampleRomaji: 'ima wa daitai hanbun desu', sampleTranslation: '지금은 대략 절반입니다', quizTitle: '진행 상황 표현으로 맞는 것을 고르세요', quizDescription: '상태를 짧게 설명하는 문장입니다.', quizPromptText: '지금은 대략 절반입니다', quizOptions: [option('correct', 'いま は だいたい はんぶん です', true, '맞습니다.'), option('wrong-1', 'いま は ぜんぶ です', false, '지금은 전부입니다.'), option('wrong-2', 'はんぶん は いま です', false, '순서가 부자연스럽습니다.')], review: { type: 'speaking' as const, prompt: '진행 상황 문장을 다시 읽어보세요.', text: 'いま は だいたい はんぶん です', romaji: 'ima wa daitai hanbun desu', translation: '지금은 대략 절반입니다', hint: '숫자나 비율을 말하듯 담담하게 읽어보세요.' } },
            { slug: 'feedback-basic', title: '중급 11: 피드백 전달', subtitle: '좋았던 점과 수정 포인트를 말하는 기본 표현입니다.', objective: '피드백 문장을 읽는다.', sampleText: 'ここ は とても わかりやすい です', sampleRomaji: 'koko wa totemo wakariyasui desu', sampleTranslation: '이 부분은 매우 이해하기 쉽습니다', quizTitle: '긍정 피드백으로 맞는 표현을 고르세요', quizDescription: '이해하기 쉽다를 표현하는 문장입니다.', quizPromptText: '이 부분은 매우 이해하기 쉽습니다', quizOptions: [option('correct', 'ここ は とても わかりやすい です', true, '맞습니다.'), option('wrong-1', 'ここ は とても むずかしい です', false, '매우 어렵습니다입니다.'), option('wrong-2', 'ここ は です', false, '내용이 부족합니다.')], review: { type: 'choice' as const, prompt: '“이해하기 쉽습니다”에 가까운 표현을 고르세요.', text: '이해하기 쉬움', options: [option('easy', 'わかりやすい です', true, '맞습니다.'), option('hard', 'むずかしい です', false, '어렵습니다입니다.'), option('fast', 'はやい です', false, '빠릅니다입니다.')] } },
            { slug: 'problem-basic', title: '중급 12: 문제 설명', subtitle: '어디에서 막혔는지 설명하는 표현입니다.', objective: '문제 상황을 간단히 설명한다.', sampleText: 'ここ で エラー が でました', sampleRomaji: 'koko de eraa ga demashita', sampleTranslation: '여기서 에러가 발생했습니다', quizTitle: '문제 설명으로 맞는 표현을 고르세요', quizDescription: '현상을 짧게 공유하는 문장입니다.', quizPromptText: '여기서 에러가 발생했습니다', quizOptions: [option('correct', 'ここ で エラー が でました', true, '맞습니다.'), option('wrong-1', 'ここ は エラー です', false, '자연스럽지 않습니다.'), option('wrong-2', 'エラー は ここ でした', false, '뉘앙스가 다릅니다.')], review: { type: 'speaking' as const, prompt: '문제 설명 문장을 다시 읽어보세요.', text: 'ここ で エラー が でました', romaji: 'koko de eraa ga demashita', translation: '여기서 에러가 발생했습니다', hint: '상황을 차분히 설명한다고 생각하고 읽어보세요.' } },
          ].map((seed) => createSimpleLesson(seed, ['회의', '진행', '피드백'], ['회의 표현을 읽는다.', '문제와 진행 상황을 설명한다.'], '실제 협업 상황을 떠올리며 읽으면 더 잘 붙습니다.')),
        ],
      },
      {
        slug: 'reporting',
        phase: '요약과 보고',
        title: '요약, 보고, 대응',
        summary: '중급자 코스 후반부에서는 전달력과 정리를 높입니다.',
        badgeId: 'reporting',
        lessons: [
          ...[
            { slug: 'summary-basic', title: '중급 13: 요약하기', subtitle: '핵심만 짧게 정리하는 문장입니다.', objective: '요약 문장을 읽는다.', sampleText: 'ポイント は ふたつ あります', sampleRomaji: 'pointo wa futatsu arimasu', sampleTranslation: '포인트는 두 가지 있습니다', quizTitle: '요약 문장으로 맞는 것을 고르세요', quizDescription: '핵심 개수를 말하는 표현입니다.', quizPromptText: '포인트는 두 가지 있습니다', quizOptions: [option('correct', 'ポイント は ふたつ あります', true, '맞습니다.'), option('wrong-1', 'ポイント は ひとつ あります', false, '한 가지 있습니다입니다.'), option('wrong-2', 'ポイント が あります ふたつ', false, '순서가 부자연스럽습니다.')], review: { type: 'choice' as const, prompt: '“두 가지”에 해당하는 표현을 고르세요.', text: '두 가지', options: [option('two', 'ふたつ', true, '맞습니다.'), option('one', 'ひとつ', false, '한 가지입니다.'), option('three', 'みっつ', false, '세 가지입니다.')] } },
            { slug: 'report-basic', title: '중급 14: 보고하기', subtitle: '현재 상태를 짧게 보고하는 표현입니다.', objective: '보고 문장을 읽는다.', sampleText: 'しんちょく を ほうこく します', sampleRomaji: 'shinchoku o houkoku shimasu', sampleTranslation: '진척을 보고하겠습니다', quizTitle: '보고 표현으로 맞는 것을 고르세요', quizDescription: '업무 보고 기본 문장입니다.', quizPromptText: '진척을 보고하겠습니다', quizOptions: [option('correct', 'しんちょく を ほうこく します', true, '맞습니다.'), option('wrong-1', 'しんちょく は あります', false, '보고하겠다는 뜻이 약합니다.'), option('wrong-2', 'ほうこく を しんちょく します', false, '순서가 다릅니다.')], review: { type: 'speaking' as const, prompt: '보고 문장을 다시 읽어보세요.', text: 'しんちょく を ほうこく します', romaji: 'shinchoku o houkoku shimasu', translation: '진척을 보고하겠습니다', hint: '짧고 명확하게 읽는 연습을 해보세요.' } },
            { slug: 'help-request', title: '중급 15: 도움 요청', subtitle: '혼자 해결이 어려울 때 도움을 구하는 표현입니다.', objective: '도움 요청 문장을 읽는다.', sampleText: 'この ぶぶん を みて いただけますか', sampleRomaji: 'kono bubun o mite itadakemasu ka', sampleTranslation: '이 부분을 봐주실 수 있을까요?', quizTitle: '도움 요청으로 맞는 표현을 고르세요', quizDescription: '조금 더 정중한 요청입니다.', quizPromptText: '이 부분을 봐주실 수 있을까요?', quizOptions: [option('correct', 'この ぶぶん を みて いただけますか', true, '맞습니다.'), option('wrong-1', 'この ぶぶん を みます', false, '직접 보는 진술입니다.'), option('wrong-2', 'この ぶぶん は みて ですか', false, '문장이 어색합니다.')], review: { type: 'choice' as const, prompt: '정중하게 부탁할 때 자연스러운 형태를 고르세요.', text: '정중한 부탁', options: [option('itadakemasu', 'いただけますか', true, '맞습니다.'), option('desu', 'です', false, '기본 끝맺음입니다.'), option('kara', 'から', false, '이유 연결입니다.')] } },
            { slug: 'response-basic', title: '중급 16: 상황 대응', subtitle: '바로 확인하고 다시 공유하겠다는 표현입니다.', objective: '대응 문장을 읽는다.', sampleText: 'かくにん して また れんらく します', sampleRomaji: 'kakunin shite mata renraku shimasu', sampleTranslation: '확인하고 다시 연락드리겠습니다', quizTitle: '대응 표현으로 맞는 것을 고르세요', quizDescription: '실전에서 자주 쓰는 정리 문장입니다.', quizPromptText: '확인하고 다시 연락드리겠습니다', quizOptions: [option('correct', 'かくにん して また れんらく します', true, '맞습니다.'), option('wrong-1', 'かくにん します', false, '뒷부분이 빠졌습니다.'), option('wrong-2', 'また れんらく です', false, '문장이 완성되지 않습니다.')], review: { type: 'speaking' as const, prompt: '대응 문장을 다시 읽어보세요.', text: 'かくにん して また れんらく します', romaji: 'kakunin shite mata renraku shimasu', translation: '확인하고 다시 연락드리겠습니다', hint: '문장을 두 덩어리로 나누되 자연스럽게 이어보세요.' } },
          ].map((seed) => createSimpleLesson(seed, ['요약', '보고', '대응'], ['핵심을 정리한다.', '업무 진행을 보고한다.'], '앞부분과 뒷부분의 연결을 의식하며 읽어보세요.')),
        ],
      },
      {
        slug: 'intermediate-finish',
        phase: '중급 마무리',
        title: '실전 대응 마무리',
        summary: '조율, 보고, 의견 전달을 다시 묶으며 중급 코스를 마칩니다.',
        badgeId: 'intermediate-finish',
        lessons: [
          ...[
            { slug: 'messenger-tone', title: '중급 17: 메신저 톤', subtitle: '짧지만 자연스러운 메신저 문장을 익힙니다.', objective: '짧은 메신저 문장을 읽는다.', sampleText: 'いま すぐ みます', sampleRomaji: 'ima sugu mimasu', sampleTranslation: '지금 바로 보겠습니다', quizTitle: '메신저 답장으로 맞는 표현을 고르세요', quizDescription: '짧고 빠른 응답 표현입니다.', quizPromptText: '지금 바로 보겠습니다', quizOptions: [option('correct', 'いま すぐ みます', true, '맞습니다.'), option('wrong-1', 'いま みました', false, '이미 봤습니다입니다.'), option('wrong-2', 'すぐ は みます', false, '부자연스럽습니다.')], review: { type: 'choice' as const, prompt: '“지금 바로”에 가까운 표현을 고르세요.', text: '즉시', options: [option('imasugu', 'いま すぐ', true, '맞습니다.'), option('mata', 'また', false, '다시입니다.'), option('ato', 'あとで', false, '나중에입니다.')] } },
            { slug: 'phone-tone', title: '중급 18: 전화 표현', subtitle: '통화 중 많이 쓰는 짧은 표현입니다.', objective: '전화 중 확인 표현을 읽는다.', sampleText: 'しょうしょう おまちください', sampleRomaji: 'shoushou omachi kudasai', sampleTranslation: '잠시만 기다려 주세요', quizTitle: '전화 중 기다려 달라는 표현으로 맞는 것을 고르세요', quizDescription: '아주 자주 나오는 표현입니다.', quizPromptText: '잠시만 기다려 주세요', quizOptions: [option('correct', 'しょうしょう おまちください', true, '맞습니다.'), option('wrong-1', 'すぐ きて ください', false, '바로 와주세요입니다.'), option('wrong-2', 'おまち です', false, '문장이 부족합니다.')], review: { type: 'speaking' as const, prompt: '전화 표현을 다시 읽어보세요.', text: 'しょうしょう おまちください', romaji: 'shoushou omachi kudasai', translation: '잠시만 기다려 주세요', hint: '차분하고 정중한 톤으로 읽어보세요.' } },
            { slug: 'case-response', title: '중급 19: 상황 설명과 요청', subtitle: '문제 상황과 필요한 도움을 함께 말합니다.', objective: '문제와 요청을 함께 설명한다.', sampleText: 'この ケース は もう すこし じかん が ひつよう です', sampleRomaji: 'kono keesu wa mou sukoshi jikan ga hitsuyou desu', sampleTranslation: '이 건은 조금 더 시간이 필요합니다', quizTitle: '추가 시간이 필요하다고 말하는 표현으로 맞는 것을 고르세요', quizDescription: '상황 설명과 조율의 기본 문장입니다.', quizPromptText: '이 건은 조금 더 시간이 필요합니다', quizOptions: [option('correct', 'この ケース は もう すこし じかん が ひつよう です', true, '맞습니다.'), option('wrong-1', 'この ケース は じかん です', false, '의미가 다릅니다.'), option('wrong-2', 'もう すこし ケース です', false, '문장이 성립하지 않습니다.')], review: { type: 'choice' as const, prompt: '“필요합니다”에 가까운 표현을 고르세요.', text: '필요', options: [option('need', 'ひつよう です', true, '맞습니다.'), option('want', 'ほしい です', false, '원합니다입니다.'), option('can', 'できます', false, '가능합니다입니다.')] } },
            { slug: 'intermediate-checkpoint', title: '중급자 코스 체크포인트', subtitle: '이유, 비교, 일정 조정, 보고를 한 번에 정리합니다.', objective: '중급 코스 핵심 문장을 다시 확인한다.', sampleText: 'かくにん して また れんらく します', sampleRomaji: 'kakunin shite mata renraku shimasu', sampleTranslation: '확인하고 다시 연락드리겠습니다', quizTitle: '중급 코스에서 다룬 문장으로 맞는 것을 고르세요', quizDescription: '길이가 조금 더 긴 문장을 읽을 수 있는지 확인합니다.', quizPromptText: '확인하고 다시 연락드리겠습니다', quizOptions: [option('correct', 'かくにん して また れんらく します', true, '맞습니다.'), option('wrong-1', 'こんにちは', false, '너무 쉬운 기본 인사입니다.'), option('wrong-2', 'コーヒー を おねがいします', false, '입문 단계 표현입니다.')], review: { type: 'speaking' as const, prompt: '중급 코스 마지막 문장을 읽어보세요.', text: 'かくにん して また れんらく します', romaji: 'kakunin shite mata renraku shimasu', translation: '확인하고 다시 연락드리겠습니다', hint: '두 동작이 이어지는 느낌을 살려 읽어보세요.' } },
          ].map((seed) => createSimpleLesson(seed, ['실전 대응', '업무 커뮤니케이션', '마무리'], ['업무 상황을 설명한다.', '중급 코스 표현을 연결한다.'], '이제는 문장을 의미 단위로 끊어 읽어보는 습관이 중요합니다.')),
        ],
      },
    ],
  },
  {
    course: courseCatalog[3],
    units: [
      {
        slug: 'tone-basics',
        phase: '톤 조절',
        title: '완곡 표현과 경어 톤',
        summary: '숙련자 코스는 직접적 표현을 더 부드럽게 조정하는 데 초점을 둡니다.',
        badgeId: 'tone-basics',
        lessons: [
          ...[
            { slug: 'cushion-1', title: '숙련 1: 실례지만', subtitle: '말을 꺼내기 전에 쿠션을 넣는 표현입니다.', objective: '쿠션 표현을 읽고 이해한다.', sampleText: 'しつれい ですが ひとつ かくにん させてください', sampleRomaji: 'shitsurei desu ga hitotsu kakunin sasete kudasai', sampleTranslation: '실례지만 한 가지 확인하게 해주세요', quizTitle: '쿠션 표현이 들어간 문장으로 맞는 것을 고르세요', quizDescription: '정중한 도입부를 확인합니다.', quizPromptText: '실례지만 한 가지 확인하게 해주세요', quizOptions: [option('correct', 'しつれい ですが ひとつ かくにん させてください', true, '맞습니다.'), option('wrong-1', 'ひとつ かくにん してください', false, '직접적 요청입니다.'), option('wrong-2', 'しつれい です ひとつ です', false, '문장이 성립하지 않습니다.')], review: { type: 'speaking' as const, prompt: '쿠션 표현 문장을 다시 읽어보세요.', text: 'しつれい ですが ひとつ かくにん させてください', romaji: 'shitsurei desu ga hitotsu kakunin sasete kudasai', translation: '실례지만 한 가지 확인하게 해주세요', hint: '앞부분을 부드럽게 시작해보세요.' } },
            { slug: 'cushion-2', title: '숙련 2: 가능하시다면', subtitle: '부탁을 더 부드럽게 만드는 표현입니다.', objective: '가능하시다면 패턴을 이해한다.', sampleText: 'もし かのう でしたら きょうじゅう に おねがいします', sampleRomaji: 'moshi kanou deshitara kyoujuu ni onegaishimasu', sampleTranslation: '가능하시다면 오늘 중으로 부탁드립니다', quizTitle: '완곡한 부탁 표현으로 맞는 것을 고르세요', quizDescription: '조건을 붙여 톤을 낮춥니다.', quizPromptText: '가능하시다면 오늘 중으로 부탁드립니다', quizOptions: [option('correct', 'もし かのう でしたら きょうじゅう に おねがいします', true, '맞습니다.'), option('wrong-1', 'きょうじゅう に おねがいします', false, '쿠션이 빠집니다.'), option('wrong-2', 'かのう です から おねがいします', false, '뜻이 다릅니다.')], review: { type: 'choice' as const, prompt: '“가능하시다면”에 가까운 표현을 고르세요.', text: '가능하시다면', options: [option('conditional', 'もし かのう でしたら', true, '맞습니다.'), option('because', 'かのう ですから', false, '이유 표현입니다.'), option('question', 'かのう ですか', false, '질문형입니다.')] } },
            { slug: 'honorific-1', title: '숙련 3: 보시다/읽으시다 톤', subtitle: '상대의 동작을 높여 말하는 느낌을 익힙니다.', objective: '존중 표현의 방향을 이해한다.', sampleText: 'しりょう を ごらん いただけますか', sampleRomaji: 'shiryou o goran itadakemasu ka', sampleTranslation: '자료를 봐주실 수 있을까요?', quizTitle: '상대에게 정중히 자료를 봐달라고 하는 표현으로 맞는 것을 고르세요', quizDescription: '높임과 요청이 함께 들어갑니다.', quizPromptText: '자료를 봐주실 수 있을까요?', quizOptions: [option('correct', 'しりょう を ごらん いただけますか', true, '맞습니다.'), option('wrong-1', 'しりょう を みて ください', false, '더 직접적입니다.'), option('wrong-2', 'しりょう は ごらん です', false, '문장이 성립하지 않습니다.')], review: { type: 'speaking' as const, prompt: '정중한 자료 확인 요청을 다시 읽어보세요.', text: 'しりょう を ごらん いただけますか', romaji: 'shiryou o goran itadakemasu ka', translation: '자료를 봐주실 수 있을까요?', hint: '상대를 높인다는 느낌으로 차분히 읽어보세요.' } },
            { slug: 'soft-opinion', title: '숙련 4: 조심스러운 의견 제시', subtitle: '반대 의견도 부드럽게 말하는 톤입니다.', objective: '완곡한 반대 의견을 읽는다.', sampleText: 'その てん は すこし さいこう の よち が ある と おもいます', sampleRomaji: 'sono ten wa sukoshi saikou no yochi ga aru to omoimasu', sampleTranslation: '그 점은 조금 재고의 여지가 있다고 생각합니다', quizTitle: '완곡한 반대 의견으로 맞는 표현을 고르세요', quizDescription: '직접적으로 틀렸다고 말하지 않는 방식입니다.', quizPromptText: '그 점은 조금 재고의 여지가 있다고 생각합니다', quizOptions: [option('correct', 'その てん は すこし さいこう の よち が ある と おもいます', true, '맞습니다.'), option('wrong-1', 'それ は ちがいます', false, '직접적인 반대입니다.'), option('wrong-2', 'さいこう です', false, '의미가 다릅니다.')], review: { type: 'choice' as const, prompt: '완곡한 의견 제시에 가까운 표현을 고르세요.', text: '완곡한 의견', options: [option('soft', 'よち が ある と おもいます', true, '맞습니다.'), option('direct', 'ちがいます', false, '직접적입니다.'), option('simple', 'です', false, '기본 끝맺음입니다.')] } },
          ].map((seed) => createSimpleLesson(seed, ['완곡 표현', '쿠션', '높임'], ['요청 톤을 부드럽게 만든다.', '상대를 높여 말한다.'], '문장 앞부분의 쿠션을 살려 읽는 것이 중요합니다.')),
        ],
      },
      {
        slug: 'meeting-control',
        phase: '회의 진행',
        title: '회의 시작, 전환, 결정',
        summary: '회의를 여닫고 전환하는 표현을 익힙니다.',
        badgeId: 'meeting-control',
        lessons: [
          ...[
            { slug: 'meeting-open', title: '숙련 5: 회의 시작', subtitle: '회의를 정중하게 열 때 쓰는 문장입니다.', objective: '회의 시작 문장을 읽는다.', sampleText: 'それでは かいぎ を はじめさせて いただきます', sampleRomaji: 'soredewa kaigi o hajimesasete itadakimasu', sampleTranslation: '그러면 회의를 시작하겠습니다', quizTitle: '회의 시작 표현으로 맞는 것을 고르세요', quizDescription: '정중한 시작 문장입니다.', quizPromptText: '그러면 회의를 시작하겠습니다', quizOptions: [option('correct', 'それでは かいぎ を はじめさせて いただきます', true, '맞습니다.'), option('wrong-1', 'かいぎ を はじめます', false, '더 직접적입니다.'), option('wrong-2', 'それでは かいぎ です', false, '문장이 부족합니다.')], review: { type: 'speaking' as const, prompt: '회의 시작 문장을 다시 읽어보세요.', text: 'それでは かいぎ を はじめさせて いただきます', romaji: 'soredewa kaigi o hajimesasete itadakimasu', translation: '그러면 회의를 시작하겠습니다', hint: '첫머리를 안정적으로 열어보세요.' } },
            { slug: 'meeting-transition', title: '숙련 6: 안건 전환', subtitle: '다음 주제로 넘어갈 때 쓰는 표현입니다.', objective: '안건 전환 문장을 이해한다.', sampleText: 'つぎ の ぎだい に うつります', sampleRomaji: 'tsugi no gidai ni utsurimasu', sampleTranslation: '다음 안건으로 넘어가겠습니다', quizTitle: '안건 전환 표현으로 맞는 것을 고르세요', quizDescription: '회의 흐름을 관리하는 문장입니다.', quizPromptText: '다음 안건으로 넘어가겠습니다', quizOptions: [option('correct', 'つぎ の ぎだい に うつります', true, '맞습니다.'), option('wrong-1', 'つぎ の ぎだい です', false, '전환 표현이 아닙니다.'), option('wrong-2', 'ぎだい に つぎ です', false, '순서가 어색합니다.')], review: { type: 'choice' as const, prompt: '“다음 안건”에 해당하는 표현을 고르세요.', text: '다음 안건', options: [option('agenda', 'つぎ の ぎだい', true, '맞습니다.'), option('meeting', 'かいぎ', false, '회의입니다.'), option('summary', 'まとめ', false, '정리입니다.')] } },
            { slug: 'decision-basic', title: '숙련 7: 결정 공유', subtitle: '결정된 내용을 차분히 정리하는 표현입니다.', objective: '결정 공유 문장을 읽는다.', sampleText: 'こちら の ほうしん で すすめる こと に なりました', sampleRomaji: 'kochira no houshin de susumeru koto ni narimashita', sampleTranslation: '이 방향으로 진행하기로 되었습니다', quizTitle: '결정 공유 표현으로 맞는 것을 고르세요', quizDescription: '결정 결과를 전달하는 문장입니다.', quizPromptText: '이 방향으로 진행하기로 되었습니다', quizOptions: [option('correct', 'こちら の ほうしん で すすめる こと に なりました', true, '맞습니다.'), option('wrong-1', 'こちら を すすめます', false, '결정 공유의 뉘앙스가 약합니다.'), option('wrong-2', 'こちら は こと です', false, '문장이 부족합니다.')], review: { type: 'speaking' as const, prompt: '결정 공유 문장을 다시 읽어보세요.', text: 'こちら の ほうしん で すすめる こと に なりました', romaji: 'kochira no houshin de susumeru koto ni narimashita', translation: '이 방향으로 진행하기로 되었습니다', hint: '차분하게 결론을 전달하는 느낌을 살려보세요.' } },
            { slug: 'risk-share', title: '숙련 8: 리스크 공유', subtitle: '우려 사항을 과하지 않게 전달하는 표현입니다.', objective: '리스크 공유 문장을 이해한다.', sampleText: 'この まま ですと えいきょう が でる おそれ が あります', sampleRomaji: 'kono mama desu to eikyou ga deru osore ga arimasu', sampleTranslation: '이대로라면 영향이 생길 우려가 있습니다', quizTitle: '리스크 공유 표현으로 맞는 것을 고르세요', quizDescription: '단정하지 않고 우려를 전하는 표현입니다.', quizPromptText: '이대로라면 영향이 생길 우려가 있습니다', quizOptions: [option('correct', 'この まま ですと えいきょう が でる おそれ が あります', true, '맞습니다.'), option('wrong-1', 'えいきょう が でます', false, '단정적으로 말합니다.'), option('wrong-2', 'この まま は あります', false, '문장이 성립하지 않습니다.')], review: { type: 'choice' as const, prompt: '우려를 말할 때 자연스러운 표현을 고르세요.', text: '우려', options: [option('risk', 'おそれ が あります', true, '맞습니다.'), option('sure', 'かならず です', false, '확정 표현입니다.'), option('done', 'おわりました', false, '끝났습니다입니다.')] } },
          ].map((seed) => createSimpleLesson(seed, ['회의 진행', '전환', '결정'], ['회의를 연다.', '결정과 리스크를 공유한다.'], '회의를 진행하는 사람의 톤으로 읽어보세요.')),
        ],
      },
      {
        slug: 'mail-client',
        phase: '고객과 이메일',
        title: '사과, 정정, 이메일 문구',
        summary: '외부 커뮤니케이션에 가까운 정중한 표현을 다룹니다.',
        badgeId: 'mail-client',
        lessons: [
          ...[
            { slug: 'apology-basic', title: '숙련 9: 사과와 정정', subtitle: '오류를 인정하고 바로잡는 정중한 표현입니다.', objective: '사과 문장을 읽는다.', sampleText: 'まことに もうしわけ ございません', sampleRomaji: 'makoto ni moushiwake gozaimasen', sampleTranslation: '대단히 죄송합니다', quizTitle: '정중한 사과 표현으로 맞는 것을 고르세요', quizDescription: '가장 기본적인 사과 표현입니다.', quizPromptText: '대단히 죄송합니다', quizOptions: [option('correct', 'まことに もうしわけ ございません', true, '맞습니다.'), option('wrong-1', 'ごめんなさい', false, '더 가벼운 표현입니다.'), option('wrong-2', 'しつれい します', false, '실례하겠습니다입니다.')], review: { type: 'speaking' as const, prompt: '사과 표현을 다시 읽어보세요.', text: 'まことに もうしわけ ございません', romaji: 'makoto ni moushiwake gozaimasen', translation: '대단히 죄송합니다', hint: '속도를 낮추고 무게감 있게 읽어보세요.' } },
            { slug: 'correction-basic', title: '숙련 10: 정정 안내', subtitle: '앞서 보낸 내용을 정정하는 표현입니다.', objective: '정정 문장을 읽는다.', sampleText: 'さきほど の ごあんない を ていせい いたします', sampleRomaji: 'sakihodo no goannai o teisei itashimasu', sampleTranslation: '방금 전 안내를 정정하겠습니다', quizTitle: '정정 안내 표현으로 맞는 것을 고르세요', quizDescription: '이메일이나 메신저에서 자주 씁니다.', quizPromptText: '방금 전 안내를 정정하겠습니다', quizOptions: [option('correct', 'さきほど の ごあんない を ていせい いたします', true, '맞습니다.'), option('wrong-1', 'ごあんない を します', false, '정정의 의미가 빠집니다.'), option('wrong-2', 'さきほど は ていせい です', false, '문장이 다릅니다.')], review: { type: 'choice' as const, prompt: '“정정하겠습니다”에 가까운 표현을 고르세요.', text: '정정', options: [option('teisei', 'ていせい いたします', true, '맞습니다.'), option('kakunin', 'かくにん いたします', false, '확인하겠습니다입니다.'), option('houkoku', 'ほうこく いたします', false, '보고하겠습니다입니다.')] } },
            { slug: 'mail-open', title: '숙련 11: 이메일 첫머리', subtitle: '이메일 시작부에서 많이 쓰는 표현입니다.', objective: '이메일 도입 문장을 이해한다.', sampleText: 'いつも おせわ に なっております', sampleRomaji: 'itsumo osewa ni natte orimasu', sampleTranslation: '항상 신세지고 있습니다', quizTitle: '이메일 도입 표현으로 맞는 것을 고르세요', quizDescription: '업무 메일에서 매우 자주 쓰는 표현입니다.', quizPromptText: '항상 신세지고 있습니다', quizOptions: [option('correct', 'いつも おせわ に なっております', true, '맞습니다.'), option('wrong-1', 'こんにちは', false, '너무 가벼운 인사입니다.'), option('wrong-2', 'おせわ です', false, '형태가 다릅니다.')], review: { type: 'speaking' as const, prompt: '이메일 첫머리 표현을 다시 읽어보세요.', text: 'いつも おせわ に なっております', romaji: 'itsumo osewa ni natte orimasu', translation: '항상 신세지고 있습니다', hint: '익숙한 메일 첫 문장처럼 안정적으로 읽어보세요.' } },
            { slug: 'mail-close', title: '숙련 12: 이메일 마무리', subtitle: '감사와 협조 요청을 정리하는 표현입니다.', objective: '이메일 마무리 문장을 읽는다.', sampleText: 'なにとぞ よろしく おねがい もうしあげます', sampleRomaji: 'nanitozo yoroshiku onegai moushiagemasu', sampleTranslation: '부디 잘 부탁드립니다', quizTitle: '이메일 마무리 표현으로 맞는 것을 고르세요', quizDescription: '상당히 정중한 마무리입니다.', quizPromptText: '부디 잘 부탁드립니다', quizOptions: [option('correct', 'なにとぞ よろしく おねがい もうしあげます', true, '맞습니다.'), option('wrong-1', 'よろしく おねがいします', false, '더 기본적인 표현입니다.'), option('wrong-2', 'ありがとう ございます', false, '감사 표현입니다.')], review: { type: 'choice' as const, prompt: '더 정중한 마무리 표현을 고르세요.', text: '정중한 마무리', options: [option('close', 'なにとぞ よろしく おねがい もうしあげます', true, '맞습니다.'), option('basic', 'よろしく おねがいします', false, '더 기본적인 표현입니다.'), option('thanks', 'ありがとうございます', false, '감사 표현입니다.')] } },
          ].map((seed) => createSimpleLesson(seed, ['이메일', '사과', '정중한 톤'], ['외부 커뮤니케이션 문장을 읽는다.', '사과와 정정 표현을 이해한다.'], '길이가 길어도 의미 덩어리로 나눠 읽으면 안정적입니다.')),
        ],
      },
      {
        slug: 'presentation',
        phase: '발표와 대응',
        title: '발표, 질의응답, 협의',
        summary: '발표 중 전환과 질의응답, 협업 조율 표현을 익힙니다.',
        badgeId: 'presentation',
        lessons: [
          ...[
            { slug: 'presentation-shift', title: '숙련 13: 발표 전환', subtitle: '다음 파트로 넘어갈 때 쓰는 표현입니다.', objective: '발표 전환 문장을 읽는다.', sampleText: 'つぎ に しゅよう な ポイント を ごせつめい します', sampleRomaji: 'tsugi ni shuyou na pointo o gosetsumei shimasu', sampleTranslation: '다음으로 주요 포인트를 설명드리겠습니다', quizTitle: '발표 전환 표현으로 맞는 것을 고르세요', quizDescription: '설명 흐름을 자연스럽게 전환합니다.', quizPromptText: '다음으로 주요 포인트를 설명드리겠습니다', quizOptions: [option('correct', 'つぎ に しゅよう な ポイント を ごせつめい します', true, '맞습니다.'), option('wrong-1', 'ポイント です', false, '전환이 없습니다.'), option('wrong-2', 'つぎ は ポイント です', false, '의미가 부족합니다.')], review: { type: 'speaking' as const, prompt: '발표 전환 문장을 다시 읽어보세요.', text: 'つぎ に しゅよう な ポイント を ごせつめい します', romaji: 'tsugi ni shuyou na pointo o gosetsumei shimasu', translation: '다음으로 주요 포인트를 설명드리겠습니다', hint: '발표 흐름을 이끈다는 느낌으로 읽어보세요.' } },
            { slug: 'qa-basic', title: '숙련 14: 질의응답 대응', subtitle: '질문에 바로 답하기 어려울 때 쓰는 표현입니다.', objective: '질의응답 대응 문장을 이해한다.', sampleText: 'その てん は もちかえって かくにん いたします', sampleRomaji: 'sono ten wa mochikaette kakunin itashimasu', sampleTranslation: '그 점은 돌아가서 확인하겠습니다', quizTitle: '즉답이 어려울 때 쓰는 표현으로 맞는 것을 고르세요', quizDescription: '바로 답하지 못할 때 정중하게 정리합니다.', quizPromptText: '그 점은 돌아가서 확인하겠습니다', quizOptions: [option('correct', 'その てん は もちかえって かくにん いたします', true, '맞습니다.'), option('wrong-1', 'わかりません', false, '너무 직접적입니다.'), option('wrong-2', 'その てん は です', false, '문장이 부족합니다.')], review: { type: 'choice' as const, prompt: '질문에 바로 답하지 못할 때 자연스러운 표현을 고르세요.', text: '확인 후 회신', options: [option('reply', 'もちかえって かくにん いたします', true, '맞습니다.'), option('no', 'わかりません', false, '너무 직접적입니다.'), option('done', 'おわりました', false, '끝났습니다입니다.')] } },
            { slug: 'coordination-basic', title: '숙련 15: 협업 조율', subtitle: '상대 팀과 우선순위를 맞추는 표현입니다.', objective: '조율 문장을 읽는다.', sampleText: 'この あたり は そちら と すりあわせ たい です', sampleRomaji: 'kono atari wa sochira to suriawasetai desu', sampleTranslation: '이 부분은 그쪽과 조율하고 싶습니다', quizTitle: '조율 의사를 말하는 표현으로 맞는 것을 고르세요', quizDescription: '협업 상황에서 자주 쓰는 표현입니다.', quizPromptText: '이 부분은 그쪽과 조율하고 싶습니다', quizOptions: [option('correct', 'この あたり は そちら と すりあわせ たい です', true, '맞습니다.'), option('wrong-1', 'この あたり は です', false, '내용이 부족합니다.'), option('wrong-2', 'そちら を すりあわせ です', false, '문장이 부자연스럽습니다.')], review: { type: 'speaking' as const, prompt: '조율 문장을 다시 읽어보세요.', text: 'この あたり は そちら と すりあわせ たい です', romaji: 'kono atari wa sochira to suriawasetai desu', translation: '이 부분은 그쪽과 조율하고 싶습니다', hint: '상대와 맞춰가자는 느낌을 살려보세요.' } },
            { slug: 'advanced-checkpoint', title: '숙련자 코스 체크포인트', subtitle: '정중한 톤, 회의 진행, 이메일 문구를 종합해서 점검합니다.', objective: '숙련자 코스 핵심 표현을 다시 확인한다.', sampleText: 'それでは かいぎ を はじめさせて いただきます', sampleRomaji: 'soredewa kaigi o hajimesasete itadakimasu', sampleTranslation: '그러면 회의를 시작하겠습니다', quizTitle: '숙련자 코스의 톤에 맞는 표현을 고르세요', quizDescription: '길고 정중한 문장을 안정적으로 읽는지 확인합니다.', quizPromptText: '그러면 회의를 시작하겠습니다', quizOptions: [option('correct', 'それでは かいぎ を はじめさせて いただきます', true, '맞습니다.'), option('wrong-1', 'かいぎ はじめます', false, '너무 직접적입니다.'), option('wrong-2', 'こんにちは', false, '상황에 맞지 않습니다.')], review: { type: 'speaking' as const, prompt: '숙련자 코스 마지막 문장을 다시 읽어보세요.', text: 'それでは かいぎ を はじめさせて いただきます', romaji: 'soredewa kaigi o hajimesasete itadakimasu', translation: '그러면 회의를 시작하겠습니다', hint: '전체 문장을 끊기지 않게 안정적으로 읽어보세요.' } },
          ].map((seed) => createSimpleLesson(seed, ['발표', '질의응답', '협업 조율'], ['정중한 업무 문장을 읽는다.', '숙련자 코스 표현을 연결한다.'], '문장 길이가 길수록 의미 단위로 끊어 읽는 습관이 중요합니다.')),
        ],
      },
      {
        slug: 'advanced-finish',
        phase: '숙련 마무리',
        title: '종합 정리',
        summary: '비즈니스 톤과 고급 표현을 마지막으로 묶어 정리합니다.',
        badgeId: 'advanced-finish',
        lessons: [
          ...[
            { slug: 'business-1', title: '숙련 16: 요청 완곡화', subtitle: '직접 명령이 아닌 정중한 요청으로 바꾸는 표현입니다.', objective: '요청 완곡화 문장을 읽는다.', sampleText: 'ごたいおう いただけますと たすかります', sampleRomaji: 'gotaiou itadakemasu to tasukarimasu', sampleTranslation: '대응해주시면 감사하겠습니다', quizTitle: '완곡한 요청 표현으로 맞는 것을 고르세요', quizDescription: '상대의 부담을 낮추는 문장입니다.', quizPromptText: '대응해주시면 감사하겠습니다', quizOptions: [option('correct', 'ごたいおう いただけますと たすかります', true, '맞습니다.'), option('wrong-1', 'ごたいおう してください', false, '직접적 요청입니다.'), option('wrong-2', 'たすかります です', false, '문장이 어색합니다.')], review: { type: 'choice' as const, prompt: '부담을 낮춘 요청 표현을 고르세요.', text: '완곡한 요청', options: [option('soft', 'いただけますと たすかります', true, '맞습니다.'), option('direct', 'してください', false, '직접적 요청입니다.'), option('thanks', 'ありがとうございます', false, '감사 표현입니다.')] } },
            { slug: 'business-2', title: '숙련 17: 우선순위 협의', subtitle: '여러 안건 중 무엇을 먼저 볼지 협의하는 표현입니다.', objective: '우선순위 협의 문장을 읽는다.', sampleText: 'まず どこ から みる べき か そうだん したい です', sampleRomaji: 'mazu doko kara miru beki ka soudan shitai desu', sampleTranslation: '우선 어디부터 볼지 상의하고 싶습니다', quizTitle: '우선순위를 상의하는 표현으로 맞는 것을 고르세요', quizDescription: '순서를 정하는 협의 문장입니다.', quizPromptText: '우선 어디부터 볼지 상의하고 싶습니다', quizOptions: [option('correct', 'まず どこ から みる べき か そうだん したい です', true, '맞습니다.'), option('wrong-1', 'どこ を みます', false, '협의 의도가 없습니다.'), option('wrong-2', 'まず そうだん です', false, '내용이 부족합니다.')], review: { type: 'speaking' as const, prompt: '우선순위 협의 문장을 다시 읽어보세요.', text: 'まず どこ から みる べき か そうだん したい です', romaji: 'mazu doko kara miru beki ka soudan shitai desu', translation: '우선 어디부터 볼지 상의하고 싶습니다', hint: 'まず를 시작 신호처럼 분명히 읽어보세요.' } },
            { slug: 'business-3', title: '숙련 18: 최종 요약 보고', subtitle: '결론을 짧게 정리해 전달하는 문장입니다.', objective: '최종 요약 문장을 읽는다.', sampleText: 'けつろん として は この ほうこう で もんだい ない と かんがえます', sampleRomaji: 'ketsuron to shite wa kono houkou de mondai nai to kangaemasu', sampleTranslation: '결론적으로는 이 방향으로 문제없다고 생각합니다', quizTitle: '최종 요약 표현으로 맞는 것을 고르세요', quizDescription: '결론을 정리해 전달하는 문장입니다.', quizPromptText: '결론적으로는 이 방향으로 문제없다고 생각합니다', quizOptions: [option('correct', 'けつろん として は この ほうこう で もんだい ない と かんがえます', true, '맞습니다.'), option('wrong-1', 'この ほうこう です', false, '결론 정리가 약합니다.'), option('wrong-2', 'もんだい です', false, '뜻이 반대입니다.')], review: { type: 'choice' as const, prompt: '“결론적으로는”에 가까운 표현을 고르세요.', text: '결론적으로', options: [option('ketsuron', 'けつろん として は', true, '맞습니다.'), option('therefore', 'だから', false, '더 직접적인 연결입니다.'), option('finally', 'さいご に', false, '단순 순서 표현입니다.')] } },
            { slug: 'business-4', title: '숙련 19: 최종 조율과 마무리', subtitle: '협업을 정리하며 마무리하는 표현입니다.', objective: '최종 조율 문장을 읽는다.', sampleText: 'ひきつづき ごきょうりょく のほど よろしく おねがいいたします', sampleRomaji: 'hikitsuzuki gokyouryoku no hodo yoroshiku onegai itashimasu', sampleTranslation: '계속해서 협조 부탁드립니다', quizTitle: '마무리 협조 요청으로 맞는 표현을 고르세요', quizDescription: '매우 정중한 마무리 문장입니다.', quizPromptText: '계속해서 협조 부탁드립니다', quizOptions: [option('correct', 'ひきつづき ごきょうりょく のほど よろしく おねがいいたします', true, '맞습니다.'), option('wrong-1', 'よろしく おねがいします', false, '더 기본적인 표현입니다.'), option('wrong-2', 'きょうりょく です', false, '문장이 아닙니다.')], review: { type: 'speaking' as const, prompt: '정중한 마무리 요청을 다시 읽어보세요.', text: 'ひきつづき ごきょうりょく のほど よろしく おねがいいたします', romaji: 'hikitsuzuki gokyouryoku no hodo yoroshiku onegai itashimasu', translation: '계속해서 협조 부탁드립니다', hint: '길이가 길어도 하나의 마무리 문장처럼 읽어보세요.' } },
          ].map((seed) => createSimpleLesson(seed, ['고급 비즈니스 톤', '협의', '마무리'], ['정중한 고급 표현을 읽는다.', '숙련자 수준의 마무리 톤을 익힌다.'], '긴 문장은 숨을 너무 자주 끊지 않고 크게 한 덩어리로 읽어보세요.')),
        ],
      },
    ],
  },
]

const extraUnitsByCourseId: Record<Course['id'], ExtensionUnit[]> = {
  starter: starterExtraUnits,
  beginner: beginnerExtraUnits,
  intermediate: intermediateExtraUnits,
  advanced: advancedExtraUnits,
}

const mergedCourseSeeds = courseSeeds.map((seed) => ({
  ...seed,
  units: [...seed.units, ...extraUnitsByCourseId[seed.course.id].map(extensionToUnitSeed)],
}))

const builtCourses = mergedCourseSeeds.map(buildCourse)

type LessonOverride = {
  oneLinePrinciple?: string
  contextHint?: string
  studyTips?: Lesson['studyTips']
  exampleCards?: Lesson['exampleCards']
  contentDescription?: string
  contentBullets?: string[]
  choiceDescription?: string
  choiceTeachingNote?: string
  speakingDescription?: string
  speakingHint?: string
  reviewPrompt?: string
  reviewHint?: string
  reviewTeachingNote?: string
}

const createStarterOverrides = () => {
  const overrides: Record<string, LessonOverride> = {}
  const set = (slug: string, override: LessonOverride) => {
    overrides[`starter-${slug}`] = override
  }

  set('welcome-flow', {
    oneLinePrinciple: '처음에는 뜻을 외우기보다 모음 5개를 눈으로 보고 입으로 바로 내는 감각을 먼저 만드는 것이 중요합니다.',
    contextHint: 'あ행은 이후 모든 히라가나 줄의 기준이 되므로, 한 글자씩 끊어 읽은 뒤 다시 한 번 이어 읽어보세요.',
    exampleCards: [
      { title: '모음 묶음', text: 'あ い う え お', romaji: 'a i u e o', translation: '모음 5개를 한 줄로 읽기' },
      { title: '두 번 읽기', text: 'あ お ・ い え', romaji: 'a o ・ i e', translation: '앞뒤 모음을 번갈아 읽기' },
      { title: '입 풀기', text: 'あ あ い い', romaji: 'a a i i', translation: '같은 모음을 두 번씩 읽기' },
    ],
    choiceTeachingNote: 'o 소리는 입을 둥글게 모아 읽습니다. う와 헷갈리면 마지막 모음 소리만 따로 비교해 보세요.',
  })
  set('vowel-rhythm', {
    oneLinePrinciple: '일본어는 한 글자씩 같은 박자로 읽는 감각이 중요하므로, 속도보다 리듬을 일정하게 맞추는 것이 먼저입니다.',
    contextHint: '모음 순서는 문자표를 볼 때 계속 반복되므로, a-i-u-e-o 흐름을 몸에 익히는 것이 핵심입니다.',
    exampleCards: [
      { title: '기본 순서', text: 'あ い う え お', romaji: 'a i u e o', translation: '기본 순서로 읽기' },
      { title: '거꾸로 보기', text: 'お え う い あ', romaji: 'o e u i a', translation: '같은 글자를 반대로 읽기' },
      { title: '리듬 확인', text: 'あ・い・う・え・お', romaji: 'a-i-u-e-o', translation: '한 박자씩 끊어 읽기' },
    ],
    choiceTeachingNote: '모음 순서는 a-i-u-e-o입니다. 중간 두 글자 e, u가 바뀌는 실수가 가장 많습니다.',
  })
  set('hiragana-a-row', {
    oneLinePrinciple: 'あ행은 모음과 글자가 완전히 같은 줄이므로, 소리를 먼저 떠올리고 모양을 바로 붙이는 연습이 핵심입니다.',
    contextHint: '같은 소리라도 로마자가 아니라 히라가나 모양으로 바로 읽는 감각을 만드는 단계입니다.',
    exampleCards: [
      { title: 'あ행 확인', text: 'あ い う え お', romaji: 'a i u e o', translation: 'あ행 전체 읽기' },
      { title: '섞어 읽기', text: 'う ・ あ ・ え', romaji: 'u ・ a ・ e', translation: '순서를 바꿔도 바로 읽기' },
      { title: '짧은 연결', text: 'あお', romaji: 'ao', translation: '파랑 / 색 이름의 소리 감각' },
    ],
    choiceTeachingNote: 'u 소리는 う입니다. い, え처럼 비슷한 획 수가 적은 글자는 모양보다 소리를 먼저 떠올리면 덜 헷갈립니다.',
  })
  set('hiragana-ka-sa', {
    oneLinePrinciple: 'か행과 さ행은 단어에서 자주 보이므로, 줄 전체를 읽기보다 헷갈리는 し와 こ를 먼저 잡는 것이 효율적입니다.',
    contextHint: '초반에는 し를 볼 때마다 shi를 바로 떠올리는 감각을 만드는 것이 중요합니다.',
    exampleCards: [
      { title: 'さ행 읽기', text: 'さ し す せ そ', romaji: 'sa shi su se so', translation: '자주 쓰는 さ행' },
      { title: '짧은 단어', text: 'かさ', romaji: 'kasa', translation: '우산' },
      { title: '짧은 단어', text: 'すし', romaji: 'sushi', translation: '초밥' },
    ],
    choiceTeachingNote: 'し는 sa 줄에 있지만 소리가 shi로 바뀝니다. 같은 줄 안에서 한 글자만 다른 소리를 가진다는 점을 기억하세요.',
  })
  set('hiragana-ta-na', {
    oneLinePrinciple: '글자 수가 늘어날수록 한 줄씩 묶어 읽고, 마지막에 단어처럼 이어 읽는 방식이 훨씬 안정적입니다.',
    contextHint: 'た행과 な행은 읽는 소리보다 모양 구분이 중요하므로, 눈으로 먼저 줄을 익히세요.',
    choiceTeachingNote: '글자를 보고 소리로 바꾸는 문제입니다. の를 보면 곧바로 no라고 떠올리는 훈련을 해보세요.',
  })
  set('hiragana-ha-ma', {
    oneLinePrinciple: 'ふ처럼 로마자와 직결되지 않는 소리는 “예외 1개”로 따로 잡아 두는 편이 더 빠릅니다.',
    contextHint: 'は행은 hi, fu가 섞여 나오므로 줄 전체보다 헷갈리는 한 글자부터 따로 읽는 것이 좋습니다.',
    choiceTeachingNote: 'ふ는 hu가 아니라 fu로 읽습니다. 낯선 소리는 그 글자 하나만 떼어 반복해서 읽어보세요.',
  })
  set('hiragana-ya-ra-wa', {
    oneLinePrinciple: '기본 글자 마무리 단계에서는 완벽 암기보다 “봤을 때 덜 낯설다”는 감각을 만드는 것이 더 중요합니다.',
    contextHint: 'ん은 단어 끝에서 자주 보이므로, 마지막 글자를 닫아주는 소리라는 느낌으로 익히면 좋습니다.',
    choiceTeachingNote: 'ん은 단독 모음이 아니라 마무리 소리입니다. ya, yu, yo와 섞이지 않게 마지막 글자라는 점을 기억하세요.',
  })
  set('hiragana-voiced-small', {
    oneLinePrinciple: '탁음과 작은 글자는 글자를 하나씩 따로 읽지 않고, 묶어서 하나의 소리처럼 보는 것이 핵심입니다.',
    contextHint: 'きゃ는 き + や가 아니라 kya 하나로 읽습니다.',
    choiceTeachingNote: '작은 や/ゆ/よ는 앞 글자와 붙여 읽습니다. kya처럼 한 덩어리로 보아야 합니다.',
  })
  set('hiragana-words-1', {
    oneLinePrinciple: '단어 읽기는 글자를 하나씩 다 읽은 뒤, 마지막에 한 번 더 끊지 않고 붙여 읽는 연습이 중요합니다.',
    contextHint: 'さかな를 sa-ka-na로 읽은 뒤, 다시 sakana처럼 한 번에 묶어보세요.',
    choiceTeachingNote: '단어 문제는 글자 하나가 아니라 덩어리 전체를 보는 훈련입니다. 첫 글자만 보고 고르지 마세요.',
  })
  set('hiragana-words-2', {
    oneLinePrinciple: '생활 단어는 뜻보다 먼저 소리 덩어리로 익히면, 이후 문장 읽기에서 훨씬 빠르게 반응할 수 있습니다.',
    contextHint: 'みず, くるま 같은 단어는 짧고 자주 쓰이므로 눈에 익혀 두면 복습 효율이 높습니다.',
    choiceTeachingNote: '짧은 단어라도 모음만 보지 말고 끝 글자까지 확인하세요. みず와 みせ처럼 마지막 글자가 다르면 뜻이 완전히 달라집니다.',
  })
  set('greetings-1', {
    oneLinePrinciple: '인사는 뜻을 번역해서 생각하기보다, 상황과 함께 통째로 기억하는 쪽이 더 자연스럽습니다.',
    contextHint: 'おはよう ございます는 아침에, こんにちは는 낮 시간에 자주 씁니다.',
    choiceTeachingNote: '인사 표현은 단어 하나보다 상황 전체와 연결해야 덜 헷갈립니다. 의미와 시간대를 같이 떠올려 보세요.',
  })
  set('greetings-2', {
    oneLinePrinciple: '자기소개는 “わたしは ___ です”처럼 빈칸 하나만 바꾸는 패턴으로 먼저 익히는 것이 가장 쉽습니다.',
    contextHint: '패턴을 외워 두면 이름, 직업, 역할만 바꿔도 여러 문장을 만들 수 있습니다.',
    choiceTeachingNote: '자기소개는 와타시와-무엇-데스 순서입니다. 주어와 끝맺음을 먼저 확인하면 정답이 빨리 보입니다.',
  })
  set('self-intro-2', {
    oneLinePrinciple: '자기소개 뒤 마무리 표현은 따로 외우기보다, 소개 문장 뒤에 붙는 덧문장으로 익히는 것이 자연스럽습니다.',
    contextHint: 'どうぞ よろしく おねがいします는 소개를 끝내는 정중한 마무리입니다.',
    choiceTeachingNote: '마무리 표현은 내용 설명이 아니라 관계를 부드럽게 만드는 문장입니다. 자기소개 뒤에 가장 자연스럽게 이어질 표현을 고르세요.',
  })
  set('numbers-basic', {
    oneLinePrinciple: '숫자와 시간은 숫자 그 자체보다 “몇 시”처럼 자주 묶여 나오는 형태로 익히는 것이 더 실용적입니다.',
    contextHint: '3시는 さんじ처럼 숫자 뒤에 じ가 붙는 패턴을 함께 보세요.',
    choiceTeachingNote: '시간 표현은 숫자만 보는 문제가 아닙니다. 숫자 뒤에 붙는 じ까지 한 덩어리로 확인하세요.',
  })
  set('days-basic', {
    oneLinePrinciple: '요일은 단어 길이가 길어도 반복이 많으므로, 앞 두 음절과 끝 리듬을 같이 잡는 방식이 효과적입니다.',
    contextHint: 'げつようび, きんようび처럼 뒤쪽 ようび가 반복됩니다.',
    choiceTeachingNote: '요일은 뒤의 ようび가 공통입니다. 앞부분만 바뀐다는 점을 기억하면 정답을 빨리 좁힐 수 있습니다.',
  })

  const starterUnitOverrides: Record<string, LessonOverride[]> = {
    'starter-kana-rhythm-1': [
      { oneLinePrinciple: '두 글자 낱말은 글자를 따로 읽은 뒤, 마지막에 한 번 더 붙여 읽어야 실제 단어처럼 익습니다.', contextHint: 'あさ, いぬ처럼 아주 짧은 단어부터 눈과 입을 연결합니다.', choiceTeachingNote: '단어 전체를 보고 마지막 글자까지 확인하세요. 앞 글자만 보고 고르면 비슷한 단어에 흔들립니다.' },
      { oneLinePrinciple: '같은 두 글자 단어라도 모음 배치가 다르면 소리감이 완전히 달라집니다.', contextHint: 'いぬ, うみ처럼 i/u가 섞이는 단어를 천천히 비교하세요.', choiceTeachingNote: '모음 i와 u를 먼저 구분하면 정답이 빨리 줄어듭니다.' },
      { oneLinePrinciple: '낱말 읽기 초반에는 뜻보다 “소리 덩어리”를 반복하는 편이 훨씬 오래 남습니다.', contextHint: 'うみ, えき는 실제 의미를 떠올리기보다 소리 덩어리로 먼저 익힙니다.', choiceTeachingNote: '의미를 떠올린 뒤 글자를 찾기보다, 글자를 보고 바로 소리를 내는 연습이 중요합니다.' },
      { oneLinePrinciple: '같은 줄 글자가 반복되면 중간을 건너뛰기 쉬우므로 한 글자씩 짚은 뒤 이어 읽어야 합니다.', contextHint: 'えき, おか처럼 끝 글자가 짧은 단어는 마무리 모음을 놓치기 쉽습니다.', choiceTeachingNote: '마지막 글자 a / i 차이를 끝까지 확인하세요.' },
      { oneLinePrinciple: '비슷한 길이의 단어를 연속으로 읽을 때는 첫 글자와 끝 글자를 함께 보는 습관이 중요합니다.', contextHint: 'おか, あめ처럼 첫 글자만 보면 헷갈리는 단어를 구분합니다.', choiceTeachingNote: '첫 글자와 끝 글자를 같이 비교하면 단어 선택이 쉬워집니다.' },
      { oneLinePrinciple: '두 글자 낱말 자동화 단계에서는 같은 단어를 여러 방식으로 보는 반복이 효과적입니다.', contextHint: 'あめ처럼 이미 본 단어를 다시 보며 읽기 속도를 올립니다.', choiceTeachingNote: '처음 봤던 단어라도 다시 나올 수 있습니다. “이미 아는 소리인지”를 먼저 떠올려 보세요.' },
      { oneLinePrinciple: '읽기 자동화는 속도보다 흔들리지 않는 정확도가 먼저입니다.', contextHint: '이미 본 단어를 조금 더 빠르게 읽되, 끝 글자를 놓치지 않습니다.', choiceTeachingNote: '익숙한 단어일수록 빨리 읽다 실수하기 쉽습니다. 끝 모음을 꼭 확인하세요.' },
      { oneLinePrinciple: '체크포인트에서는 처음과 같은 정확도로 다시 읽는지가 중요합니다.', contextHint: '학습 중간에 익숙한 단어가 다시 나와도 처음처럼 또렷하게 읽어봅니다.', choiceTeachingNote: '이 단계는 속도보다 안정성 확인입니다. 가장 헷갈리지 않는 단어를 찾는 느낌으로 보세요.' },
    ],
    'starter-kana-rhythm-2': [
      { oneLinePrinciple: '비슷한 글자를 섞어 읽을 때는 첫 글자 하나보다 전체 모양 흐름을 보는 것이 중요합니다.', contextHint: 'かさ, ねこ처럼 서로 다른 줄의 글자를 섞어 봅니다.', choiceTeachingNote: '같은 길이 단어라도 줄이 다르면 소리가 달라집니다. 가운데 글자까지 꼭 보세요.' },
      { oneLinePrinciple: '짧은 사물 이름은 한 번에 떠올리기 쉬워서 히라가나 자동화에 가장 좋습니다.', contextHint: 'ねこ, いえ처럼 익숙한 단어로 읽기 속도를 만듭니다.', choiceTeachingNote: '의미가 익숙한 단어일수록 히라가나 모양을 바로 붙이는 훈련을 하세요.' },
      { oneLinePrinciple: '단어 길이가 늘어나도 모음을 놓치지 않으면 안정적으로 읽을 수 있습니다.', contextHint: 'いえ, つくえ처럼 2~3글자 단어를 묶어봅니다.', choiceTeachingNote: '글자 수가 늘어나면 중간 모음을 빼먹기 쉽습니다. 끊지 말고 끝까지 따라가세요.' },
      { oneLinePrinciple: '세 글자 단어는 첫 글자, 가운데 글자, 끝 글자를 차례대로 훑는 습관이 효과적입니다.', contextHint: 'つくえ, くるま처럼 생활 단어를 읽으며 단어 리듬을 익힙니다.', choiceTeachingNote: '첫 글자만 보고 정답을 고르지 말고, 가운데 글자가 무엇인지 확인하세요.' },
      { oneLinePrinciple: '자동화 단계에서는 단어 의미가 익숙할수록 글자 인식 속도를 올리기 좋습니다.', contextHint: 'くるま, ほん처럼 쉬운 생활 단어를 반복합니다.', choiceTeachingNote: '의미를 아는 단어는 글자 모양을 더 빠르게 붙일 수 있습니다. 로마자보다 히라가나를 먼저 보세요.' },
      { oneLinePrinciple: '같은 단어를 빠르게 다시 만나면 “읽을 수 있다”는 자신감을 만들 수 있습니다.', contextHint: 'ほん처럼 짧고 익숙한 단어를 다시 확인합니다.', choiceTeachingNote: '익숙한 단어는 빠르게 고르되, 비슷한 보기와 마지막 글자를 비교하세요.' },
      { oneLinePrinciple: '실전 적용 전에는 낱말을 눈으로 보자마자 소리로 바꾸는 자동화가 중요합니다.', contextHint: '사물 이름을 보고 바로 입으로 따라 나오는지 확인해 봅니다.', choiceTeachingNote: '의미보다 소리 반응 속도를 보세요. 눈에 들어온 단어를 바로 읽는 것이 목표입니다.' },
      { oneLinePrinciple: '짧은 낱말 읽기 마지막 점검에서는 헷갈리는 두세 단어를 안정적으로 구분하는 것이 핵심입니다.', contextHint: '이미 본 단어들이 섞여 나와도 차분하게 구분하면 됩니다.', choiceTeachingNote: '보기끼리 아주 비슷하면 가운데 글자와 끝 글자를 먼저 비교하세요.' },
    ],
    'starter-kana-rhythm-3': [
      { oneLinePrinciple: '짧은 문장으로 넘어가기 전, 2~3글자 단어를 끊지 않고 읽는 감각을 먼저 만들어야 합니다.', contextHint: '사물 이름을 단어 단위로 묶어 읽는 단계입니다.', choiceTeachingNote: '단어를 글자 하나씩이 아니라 한 묶음으로 보세요. 뜻이 아니라 소리 덩어리를 먼저 떠올립니다.' },
      { oneLinePrinciple: '같은 글자 수 단어를 비교하면 어디서 자주 헷갈리는지 더 빨리 보입니다.', contextHint: '비슷한 길이의 단어를 나란히 읽으며 차이를 익힙니다.', choiceTeachingNote: '읽기 문제에서는 첫 글자보다 전체 리듬이 중요합니다. 끝 글자까지 확인해 보세요.' },
      { oneLinePrinciple: '짧은 낱말 읽기는 실생활 사물 이름을 여러 번 만나는 것이 가장 빠른 학습입니다.', contextHint: '일상에서 볼 수 있는 낱말을 소리째 익히는 구간입니다.', choiceTeachingNote: '뜻을 먼저 떠올리고, 그 뜻에 맞는 히라가나 덩어리를 고르는 습관을 만들어 보세요.' },
      { oneLinePrinciple: '읽기 속도를 높일 때도 정확도가 흔들리면 안 되므로, 첫 글자와 마지막 글자를 같이 확인해야 합니다.', contextHint: '익숙한 생활 단어도 빠르게 읽으면 실수할 수 있습니다.', choiceTeachingNote: '중간 글자를 놓치지 않으면 비슷한 보기 사이에서 흔들리지 않습니다.' },
      { oneLinePrinciple: '자동화 단계에서는 “이 단어를 이미 읽어본 적 있다”는 감각을 만드는 것이 중요합니다.', contextHint: '반복 노출된 단어를 다시 만나며 읽기 기억을 고정합니다.', choiceTeachingNote: '이미 본 단어일수록 더 빨리 고르되, 마지막 글자는 꼭 확인하세요.' },
      { oneLinePrinciple: '빠른 복습은 암기 시험이 아니라, 눈에 익은 단어가 입으로 곧바로 나오는지 확인하는 단계입니다.', contextHint: '실전 전에 읽기 반응 속도를 조금 끌어올립니다.', choiceTeachingNote: '읽기 속도를 올릴수록 오답 보기와 끝 글자를 비교하는 습관이 더 중요합니다.' },
      { oneLinePrinciple: '짧은 낱말 읽기 마지막 단계는 “처음 보는 것처럼 또박또박” 읽는 안정성이 핵심입니다.', contextHint: '익숙한 단어를 끝까지 흔들리지 않고 읽는지 봅니다.', choiceTeachingNote: '익숙함 때문에 대충 보지 말고, 단어 전체를 한 번에 훑어보세요.' },
      { oneLinePrinciple: '체크포인트에서는 뜻과 글자를 함께 묶는 감각까지 확인해야 다음 표현 단계가 쉬워집니다.', contextHint: '짧은 낱말 읽기를 마무리하며 다음 인사 표현으로 넘어갈 준비를 합니다.', choiceTeachingNote: '뜻을 보고 바로 단어가 떠오르는지 확인해 보세요. 단어 전체를 소리로 묶는 감각이 목표입니다.' },
    ],
  }

  Object.entries(starterUnitOverrides).forEach(([unitSlug, items]) => {
    items.forEach((override, index) => {
      set(`${unitSlug}-${index + 1}`, override)
    })
  })

  const cards = (...items: Array<[string, string, string, string]>) =>
    items.map(([title, text, romaji, translation]) => ({ title, text, romaji, translation }))

  const curatedStarterUnitOverrides: Record<string, LessonOverride[]> = {
    'starter-kana-rhythm-1': [
      {
        oneLinePrinciple: '두 글자 단어는 첫 글자를 읽고 멈추기보다, 두 박자가 이어지는 한 단어로 입에 붙이는 감각이 먼저 필요합니다.',
        contextHint: 'あさ를 a-sa로 잘라 읽은 뒤, 마지막에는 asa 한 번에 이어 읽는 연습을 합니다.',
        studyTips: ['뜻을 먼저 떠올리고 소리를 붙이면 글자만 보는 것보다 오래 기억됩니다.', '첫 글자를 읽은 뒤 바로 다음 글자를 붙여 두 박자로 읽어 보세요.'],
        exampleCards: cards(
          ['집중 단어', 'あさ', 'asa', '아침'],
          ['함께 읽기', 'いぬ', 'inu', '강아지'],
          ['리듬 비교', 'うみ', 'umi', '바다'],
        ),
        contentDescription: '아침, 강아지, 바다처럼 짧은 단어를 한 덩어리로 읽는 첫 자동화 구간입니다.',
        contentBullets: ['a-sa처럼 나눠 본 뒤, 바로 asa 한 번에 다시 읽어 보세요.', '두 글자 단어일수록 첫 글자와 끝 글자를 함께 기억하는 편이 빠릅니다.'],
        choiceDescription: '뜻을 보고 아침에 해당하는 소리를 바로 떠올릴 수 있는지 확인합니다.',
        choiceTeachingNote: 'あさ는 あ행과 さ행이 붙은 두 글자 단어입니다. 첫 글자만 보고 고르지 말고 끝 글자까지 같이 붙여 보세요.',
        speakingDescription: '이번에는 asa를 또박또박 두 박자로 읽은 다음, 마지막에는 한 번에 붙여 읽어 보세요.',
        speakingHint: 'a 와 sa 사이를 너무 길게 끊지 말고, 같은 길이의 두 박자로 읽어 보세요.',
        reviewPrompt: 'あさ를 보고 바로 읽어 보세요.',
        reviewHint: '아침이라는 뜻을 떠올린 뒤 asa를 한 번에 읽으면 더 쉽게 붙습니다.',
      },
      {
        oneLinePrinciple: '모음이 바뀌는 짧은 단어는 글자 모양보다 i/u 같은 모음 차이를 먼저 듣는 편이 헷갈림을 줄여 줍니다.',
        contextHint: 'いぬ는 i-nu입니다. 첫 소리 i 와 끝 소리 nu를 분명히 나눠 떠올린 뒤 붙여 읽습니다.',
        studyTips: ['い와 う 소리를 번갈아 읽으며 입 모양 차이를 느껴 보세요.', '강아지 그림을 떠올리며 いぬ를 말하면 소리 연결이 더 빨라집니다.'],
        exampleCards: cards(
          ['집중 단어', 'いぬ', 'inu', '강아지'],
          ['함께 읽기', 'うみ', 'umi', '바다'],
          ['헷갈림 비교', 'えき', 'eki', '역'],
        ),
        contentDescription: 'i, u, e 모음이 섞여도 흔들리지 않도록 짧은 단어를 모음 중심으로 묶어 읽는 단계입니다.',
        contentBullets: ['i-nu처럼 두 소리의 순서를 먼저 확인하고 읽으세요.', '모음이 바뀌는 단어일수록 눈보다 귀로 먼저 구분하면 정확해집니다.'],
        choiceDescription: '강아지에 맞는 단어를 고르며 i, u 모음 구분이 흔들리지 않는지 봅니다.',
        choiceTeachingNote: 'いぬ는 첫 소리가 i, 끝 소리가 nu입니다. 첫 글자 い만 보고 고르지 말고 마지막 ぬ까지 함께 확인하세요.',
        speakingDescription: 'inu를 읽을 때는 i를 짧게 시작하고 nu를 또렷하게 닫아 주는 느낌이 중요합니다.',
        speakingHint: 'i 와 nu를 같은 박자로 두고, 마지막 nu를 먹지 말고 또렷하게 읽어 보세요.',
        reviewPrompt: 'いぬ를 보고 소리와 뜻을 함께 떠올려 보세요.',
        reviewHint: '강아지를 머릿속에 떠올린 뒤 inu를 두 박자로 읽으면 더 안정적입니다.',
      },
      {
        oneLinePrinciple: '짧은 단어라도 가운데 모음이 바뀌면 전체 리듬이 달라지므로, 음절 하나씩이 아니라 단어 전체 소리 흐름으로 익히는 편이 좋습니다.',
        contextHint: 'うみ는 u-mi입니다. 입을 조금 오므렸다가 바로 mi로 가는 흐름을 느껴 보세요.',
        studyTips: ['바다를 떠올리며 u-mi를 두 박자로 읽으면 기억이 쉬워집니다.', 'u를 길게 끌지 말고 짧게 낸 뒤 바로 mi로 넘어가세요.'],
        exampleCards: cards(
          ['집중 단어', 'うみ', 'umi', '바다'],
          ['함께 읽기', 'えき', 'eki', '역'],
          ['함께 읽기', 'おか', 'oka', '언덕'],
        ),
        contentDescription: '짧은 단어의 모음 흐름을 통째로 붙여 읽는 감각을 만드는 구간입니다.',
        contentBullets: ['u-mi를 또렷하게 나눠 본 뒤, umi 한 번에 다시 읽습니다.', '중간에서 끊지 않고 같은 길이 두 박자로 유지해 보세요.'],
        choiceDescription: '바다를 뜻하는 단어를 고르며 모음 흐름을 바로 연결하는지 확인합니다.',
        choiceTeachingNote: 'うみ는 u로 시작해 mi로 끝납니다. えき나 おか처럼 첫 모음만 비슷해 보여도 끝 소리까지 붙여 봐야 합니다.',
        speakingDescription: 'umi는 첫 박자를 짧게 넣고 바로 mi를 붙일 때 자연스럽게 들립니다.',
        speakingHint: 'u 와 mi를 같은 길이로 읽고, 마지막 i 소리를 흐리지 않게 마무리해 보세요.',
        reviewPrompt: 'うみ를 보고 멈추지 않고 읽어 보세요.',
        reviewHint: '바다를 보는 장면을 떠올리며 umi를 두 박자로 붙여 읽어 보세요.',
      },
      {
        oneLinePrinciple: '세 번째 단어부터는 첫 모음뿐 아니라 끝 글자까지 끝까지 보는 습관이 있어야 읽기 속도와 정확도가 같이 올라갑니다.',
        contextHint: 'えき는 e-ki입니다. え로 시작하는 순간 끝의 き까지 같이 떠올리는 연습을 합니다.',
        studyTips: ['역이라고 뜻을 떠올리며 e-ki 순서를 입으로 확인해 보세요.', '마지막 き를 약하게 넘기지 말고 또렷하게 닫아 주세요.'],
        exampleCards: cards(
          ['집중 단어', 'えき', 'eki', '역'],
          ['비교 단어', 'おか', 'oka', '언덕'],
          ['비교 단어', 'あめ', 'ame', '비'],
        ),
        contentDescription: '첫 글자만 보고 추측하지 않고, 끝 글자까지 확인하며 읽는 연습입니다.',
        contentBullets: ['え를 본 뒤 바로 き를 붙여 e-ki로 읽습니다.', '비슷한 두 글자 단어일수록 마지막 글자까지 확인해야 헷갈리지 않습니다.'],
        choiceDescription: '역에 해당하는 단어를 고르며 끝 글자 확인 습관이 잡혔는지 점검합니다.',
        choiceTeachingNote: 'えき는 마지막이 き입니다. おか, あめ처럼 길이가 비슷한 단어는 끝 글자로 구분하는 습관이 중요합니다.',
        speakingDescription: 'eki를 말할 때는 e와 ki 사이를 비우지 않고 짧게 이어 주면 자연스럽습니다.',
        speakingHint: 'e 와 ki를 같은 두 박자로 읽고, 마지막 ki를 또렷하게 닫아 보세요.',
        reviewPrompt: 'えきを 보고 바로 읽어 보세요.',
        reviewHint: '역 표지판을 떠올리며 eki를 짧고 또렷하게 읽으면 기억이 더 잘 남습니다.',
      },
      {
        oneLinePrinciple: 'o, a 모음이 이어지는 단어는 입 모양을 크게 바꾸며 읽어야 해서 소리 변화를 의식하면 읽기 안정도가 올라갑니다.',
        contextHint: 'おか는 o-ka입니다. 첫 박자 o와 두 번째 박자 ka의 입 모양 변화를 느껴 보세요.',
        studyTips: ['언덕이라는 그림을 떠올리며 o-ka를 리듬으로 붙여 보세요.', 'o를 길게 끌지 않고 바로 ka로 이어 주는 것이 핵심입니다.'],
        exampleCards: cards(
          ['집중 단어', 'おか', 'oka', '언덕'],
          ['함께 읽기', 'あめ', 'ame', '비'],
          ['리듬 비교', 'あさ', 'asa', '아침'],
        ),
        contentDescription: '모음 차이가 큰 두 글자 단어를 읽으며 입 모양 전환에 익숙해지는 단계입니다.',
        contentBullets: ['o-ka를 끊어 읽지 말고 두 박자로 이어 주세요.', '모음이 달라져도 박자 길이는 흔들리지 않게 유지합니다.'],
        choiceDescription: '언덕을 뜻하는 단어를 고르며 o-ka 리듬을 정확히 떠올릴 수 있는지 봅니다.',
        choiceTeachingNote: 'おか는 o로 시작해 ka로 끝납니다. 첫 박자만 듣고 고르면 あさ, あめ와 쉽게 헷갈립니다.',
        speakingDescription: 'oka는 첫 박자에서 입을 둥글게 시작하고 바로 ka로 넘어가면 자연스럽습니다.',
        speakingHint: 'o 와 ka의 입 모양 차이를 크게 느끼되, 박자는 두 개로 일정하게 유지해 보세요.',
        reviewPrompt: 'おか를 뜻과 함께 소리 내어 읽어 보세요.',
        reviewHint: '언덕 그림을 떠올리며 oka를 두 박자로 붙이면 더 쉽게 기억됩니다.',
      },
      {
        oneLinePrinciple: '비슷한 길이의 단어를 많이 볼수록 마지막 모음까지 끝까지 보는 습관이 읽기 실수를 줄여 줍니다.',
        contextHint: 'あめ는 a-me입니다. あさ와 달리 마지막이 め라는 점을 꼭 붙여 기억합니다.',
        studyTips: ['비와 아침을 번갈아 떠올리며 あめ / あさ를 같이 읽어 보세요.', '마지막 め를 분명히 읽으면 あさ와 덜 헷갈립니다.'],
        exampleCards: cards(
          ['집중 단어', 'あめ', 'ame', '비'],
          ['헷갈림 비교', 'あさ', 'asa', '아침'],
          ['함께 읽기', 'いぬ', 'inu', '강아지'],
        ),
        contentDescription: '길이는 같지만 끝 글자가 다른 단어를 비교하며 정확도를 올리는 단계입니다.',
        contentBullets: ['a-me와 a-sa를 번갈아 읽으며 마지막 글자 차이를 확인하세요.', '끝 글자를 확인하고 나서야 단어를 선택하는 습관이 중요합니다.'],
        choiceDescription: '비에 해당하는 단어를 고르며 끝 글자를 분명히 보는지 확인합니다.',
        choiceTeachingNote: 'あめ는 마지막이 め입니다. あさ와 길이가 같아도 끝 소리를 확인하면 금방 구분할 수 있습니다.',
        speakingDescription: 'ame는 첫 박자 a를 짧게 두고, me를 분명히 닫으면 더 자연스럽게 들립니다.',
        speakingHint: 'a 와 me를 같은 박자로 두고, 마지막 me를 흘리지 않게 읽어 보세요.',
        reviewPrompt: 'あめ를 보고 あさ와 구분해서 읽어 보세요.',
        reviewHint: '비를 떠올리며 ame, 아침을 떠올리며 asa를 번갈아 읽으면 차이가 더 잘 잡힙니다.',
      },
      {
        oneLinePrinciple: '반복 노출 구간에서는 새 단어보다 이미 본 단어를 더 빨리 인식하는지 확인하는 것이 자동화에 더 중요합니다.',
        contextHint: '여기서는 あさ, いぬ, うみ처럼 이미 본 단어를 다시 꺼내 바로 읽는 훈련을 합니다.',
        studyTips: ['한 번 외우려 하기보다, 익숙한 단어가 얼마나 빨리 보이는지 확인하세요.', '정답을 맞힌 뒤에도 소리 내어 한 번 더 읽으면 자동화가 더 빨라집니다.'],
        exampleCards: cards(
          ['다시 보기', 'あさ', 'asa', '아침'],
          ['다시 보기', 'いぬ', 'inu', '강아지'],
          ['다시 보기', 'うみ', 'umi', '바다'],
        ),
        contentDescription: '이미 익힌 단어를 다시 만나자마자 읽는 속도를 끌어올리는 강화 구간입니다.',
        contentBullets: ['한 글자씩 읽지 말고, 단어가 보이자마자 소리를 통째로 떠올려 보세요.', '익숙한 단어일수록 더 빠르게, 하지만 끝 글자까지 정확하게 확인합니다.'],
        choiceDescription: '이미 본 단어들을 빠르게 구분하며 자동화가 되었는지 확인합니다.',
        choiceTeachingNote: '익숙한 단어일수록 대충 보고 넘어가기 쉽습니다. 끝 글자까지 확인한 뒤 고르는 습관을 유지하세요.',
        speakingDescription: '다시 보는 단어일수록 더 짧고 자연스럽게 읽는 연습을 해 보세요.',
        speakingHint: '속도를 조금 올리되, 박자는 무너지지 않게 유지하면서 읽어 보세요.',
        reviewPrompt: '익숙한 단어를 보자마자 바로 읽어 보세요.',
        reviewHint: '처음보다 빨라졌는지 스스로 확인하면서 읽으면 자동화 감각을 느끼기 쉽습니다.',
      },
      {
        oneLinePrinciple: '체크포인트에서는 새 정보를 넣기보다, 익숙한 단어를 처음처럼 정확하게 다시 읽는 것이 더 중요합니다.',
        contextHint: '마지막 한 번은 의미를 떠올린 뒤 바로 읽는 흐름이 자연스러운지 확인합니다.',
        studyTips: ['빠르게 읽더라도 끝 글자를 빼먹지 않는지 확인하세요.', '헷갈렸던 단어는 정답을 본 뒤 소리 내어 한 번 더 읽고 넘어가세요.'],
        exampleCards: cards(
          ['체크 단어', 'えき', 'eki', '역'],
          ['체크 단어', 'おか', 'oka', '언덕'],
          ['체크 단어', 'あめ', 'ame', '비'],
        ),
        contentDescription: '이번 묶음의 단어를 처음처럼 다시 확인하며, 소리와 뜻이 함께 붙는지 점검합니다.',
        contentBullets: ['뜻을 보고 바로 소리를 떠올리고, 그다음 글자를 확인하세요.', '헷갈리는 단어는 비교 단어와 짝지어 다시 읽으면 더 오래 남습니다.'],
        choiceDescription: '익숙한 단어 세트를 묶어 보며 지금 바로 읽을 수 있는지 최종 점검합니다.',
        choiceTeachingNote: '체크포인트에서는 정답을 아는지보다, 의미와 소리를 동시에 떠올리는지가 중요합니다.',
        speakingDescription: '한 번 더 또박또박 읽어 보며 다음 묶음으로 넘어갈 준비를 합니다.',
        speakingHint: '처음 배울 때처럼 천천히 정확하게 읽어도 괜찮습니다. 정확도가 먼저입니다.',
        reviewPrompt: '이번 묶음 단어를 처음 보는 것처럼 다시 읽어 보세요.',
        reviewHint: '정확도가 충분하면 다음 묶음에서도 훨씬 빨리 안정됩니다.',
      },
    ],
    'starter-kana-rhythm-2': [
      {
        oneLinePrinciple: '글자 수가 늘어나면 첫 글자만 보는 습관으로는 부족하므로, 가운데 글자까지 한 번에 보는 시야를 만들어야 합니다.',
        contextHint: 'かさ와 ねこ처럼 두 글자 단어도 모양 차이를 끝까지 확인하는 연습이 필요합니다.',
        studyTips: ['우산과 고양이를 번갈아 떠올리며 두 단어를 연속으로 읽어 보세요.', '첫 글자를 본 순간 마지막 글자까지 이어서 떠올리는 연습이 중요합니다.'],
        exampleCards: cards(
          ['집중 단어', 'かさ', 'kasa', '우산'],
          ['비교 단어', 'ねこ', 'neko', '고양이'],
          ['비교 단어', 'いえ', 'ie', '집'],
        ),
        contentDescription: '익숙한 사물 이름으로 두 글자와 세 글자 단어의 시야를 넓히는 구간입니다.',
        contentBullets: ['ka-sa처럼 한 번 나눠 본 뒤, kasa 한 덩어리로 다시 읽습니다.', '뜻을 먼저 떠올리고 글자를 확인하면 전체 읽기 속도가 더 빨라집니다.'],
        choiceDescription: '우산에 맞는 단어를 고르며 첫 글자와 마지막 글자를 함께 확인하는지 봅니다.',
        choiceTeachingNote: 'かさ는 ka-sa입니다. ねこ처럼 길이가 비슷한 단어는 첫 글자만 보면 쉽게 헷갈립니다.',
        speakingDescription: 'kasa는 두 박자가 같은 길이로 이어질 때 가장 안정적으로 들립니다.',
        speakingHint: 'ka 와 sa를 같은 길이로 두고, 중간에 끊지 말고 이어 읽어 보세요.',
        reviewPrompt: 'かさ를 보고 바로 읽어 보세요.',
        reviewHint: '우산 그림을 떠올리며 kasa를 한 번에 읽으면 더 빠르게 붙습니다.',
      },
      {
        oneLinePrinciple: '세 글자 단어는 첫 두 글자만 보고 추측하기보다, 마지막 모음까지 확인하는 습관이 중요합니다.',
        contextHint: 'ねこ는 ne-ko입니다. 두 글자지만 모양이 강해서 의미와 소리를 함께 묶기 좋습니다.',
        studyTips: ['고양이를 떠올리며 ne-ko를 두 박자로 분명히 읽어 보세요.', 'ko를 약하게 넘기면 다른 단어와 헷갈리기 쉬우니 마지막까지 또렷하게 읽으세요.'],
        exampleCards: cards(
          ['집중 단어', 'ねこ', 'neko', '고양이'],
          ['비교 단어', 'いえ', 'ie', '집'],
          ['비교 단어', 'つくえ', 'tsukue', '책상'],
        ),
        contentDescription: '의미가 선명한 단어를 이용해 끝까지 읽는 습관을 만드는 단계입니다.',
        contentBullets: ['ne-ko처럼 두 박자 구조를 분명히 잡아 보세요.', '뜻을 떠올리고 읽으면 마지막 ko까지 더 안정적으로 붙습니다.'],
        choiceDescription: '고양이를 뜻하는 단어를 고르며 마지막 글자까지 보는 습관이 유지되는지 확인합니다.',
        choiceTeachingNote: 'ねこ는 마지막이 こ입니다. いえ처럼 짧은 단어와 길이만 보고 고르지 말고 끝 글자까지 확인하세요.',
        speakingDescription: 'neko는 첫 박자 ne와 두 번째 박자 ko를 고르게 유지하면 듣기 편합니다.',
        speakingHint: 'ne와 ko를 같은 길이로 읽고, 마지막 ko를 작게 줄이지 마세요.',
        reviewPrompt: 'ねこ를 보고 뜻과 함께 읽어 보세요.',
        reviewHint: '고양이 이미지를 떠올리며 neko를 두 박자로 읽으면 더 잘 남습니다.',
      },
      {
        oneLinePrinciple: '짧은 단어와 긴 단어가 섞일수록, 길이에 끌려가기보다 첫 글자부터 끝 글자까지 차례대로 보는 습관이 필요합니다.',
        contextHint: 'いえ는 짧고, つくえ는 길지만 둘 다 끝 글자까지 확인해야 정확히 구분됩니다.',
        studyTips: ['집과 책상을 번갈아 떠올리며 짧은 단어와 긴 단어를 같이 읽어 보세요.', '짧은 단어라고 빨리 넘기지 말고 마지막 え까지 확인하는 습관을 유지하세요.'],
        exampleCards: cards(
          ['집중 단어', 'いえ', 'ie', '집'],
          ['비교 단어', 'つくえ', 'tsukue', '책상'],
          ['비교 단어', 'くるま', 'kuruma', '자동차'],
        ),
        contentDescription: '짧은 단어와 긴 단어를 함께 읽으면서 길이에 흔들리지 않는 읽기 시야를 만드는 단계입니다.',
        contentBullets: ['いえ는 짧아도 마지막 え까지 또렷하게 읽습니다.', '길이가 다른 단어를 함께 보면 첫 글자만 보고 추측하는 습관을 줄일 수 있습니다.'],
        choiceDescription: '집에 해당하는 단어를 고르며 길이가 다른 단어를 섞어도 정확도를 유지하는지 확인합니다.',
        choiceTeachingNote: 'いえ는 두 글자지만 끝이 え입니다. 길이가 긴 つくえ와 모양이 닮아 보여도 마지막 글자로 충분히 구분할 수 있습니다.',
        speakingDescription: 'ie는 짧지만 두 글자를 또렷하게 내는 것이 중요합니다.',
        speakingHint: 'i 와 e를 붙이되, e를 삼키지 말고 마지막까지 분명히 읽어 보세요.',
        reviewPrompt: 'いえ를 짧고 정확하게 읽어 보세요.',
        reviewHint: '집을 떠올리며 ie를 두 글자로 분명히 읽는 감각을 확인해 보세요.',
      },
      {
        oneLinePrinciple: '세 글자 이상 단어는 음절을 다 읽는 것보다, 중간에서 끊지 않고 처음부터 끝까지 흐름을 유지하는 편이 더 중요합니다.',
        contextHint: 'つくえ는 tsu-ku-e입니다. 길어 보여도 세 박자를 고르게 유지하면 읽기 어렵지 않습니다.',
        studyTips: ['tsu-ku-e를 세 박자로 손가락에 맞춰 읽어 보세요.', '길다고 느껴질수록 박자를 더 고르게 유지하는 편이 읽기 안정에 도움이 됩니다.'],
        exampleCards: cards(
          ['집중 단어', 'つくえ', 'tsukue', '책상'],
          ['비교 단어', 'くるま', 'kuruma', '자동차'],
          ['비교 단어', 'ほん', 'hon', '책'],
        ),
        contentDescription: '세 박자 단어를 끊지 않고 읽는 연습으로 짧은 낱말 읽기를 확장하는 단계입니다.',
        contentBullets: ['tsu-ku-e를 세 박자로 맞춰 읽되, 중간에서 멈추지 마세요.', '긴 단어일수록 박자가 고르면 오히려 읽기 쉽습니다.'],
        choiceDescription: '책상에 해당하는 단어를 고르며 긴 단어도 끝까지 안정적으로 읽는지 확인합니다.',
        choiceTeachingNote: 'つくえ는 세 박자 단어입니다. 첫 두 글자만 보고 고르기보다 마지막 え까지 확인해 주세요.',
        speakingDescription: 'tsukue는 세 박자를 같은 길이로 두는 것이 가장 중요합니다.',
        speakingHint: 'tsu-ku-e를 손가락 세 번 두드리듯 같은 길이로 읽어 보세요.',
        reviewPrompt: 'つくえ를 멈추지 않고 읽어 보세요.',
        reviewHint: '길다고 느껴져도 세 박자를 유지하면 안정적으로 읽을 수 있습니다.',
      },
      {
        oneLinePrinciple: '긴 단어를 읽을 때는 첫 박자만 강하게 읽기보다, 모든 박자를 비슷하게 유지해야 일본어다운 리듬이 살아납니다.',
        contextHint: 'くるま는 ku-ru-ma입니다. 가운데 ru를 빼먹지 않는 것이 핵심입니다.',
        studyTips: ['자동차를 떠올리며 ku-ru-ma 세 박자를 고르게 읽어 보세요.', '가운데 ru를 약하게 넘기지 않도록 일부러 또렷하게 읽는 편이 좋습니다.'],
        exampleCards: cards(
          ['집중 단어', 'くるま', 'kuruma', '자동차'],
          ['비교 단어', 'ほん', 'hon', '책'],
          ['비교 단어', 'かさ', 'kasa', '우산'],
        ),
        contentDescription: '세 박자 단어에서 가운데 음절을 놓치지 않고 읽는 감각을 만드는 단계입니다.',
        contentBullets: ['ku-ru-ma 세 박자를 모두 같은 길이로 읽어 보세요.', '첫 박자만 세게 읽지 말고 가운데 ru까지 유지하세요.'],
        choiceDescription: '자동차를 뜻하는 단어를 고르며 긴 단어에서도 가운데 음절을 놓치지 않는지 확인합니다.',
        choiceTeachingNote: 'くるま는 ku-ru-ma입니다. 가운데 ru를 빼먹으면 다른 단어처럼 들릴 수 있으니 세 박자를 모두 확인하세요.',
        speakingDescription: 'kuruma는 가운데 ru를 분명히 내면서도 전체 리듬을 끊지 않는 것이 중요합니다.',
        speakingHint: 'ku-ru-ma 세 박자를 같은 길이로 읽고, ru를 작게 넘기지 마세요.',
        reviewPrompt: 'くるま를 세 박자로 또렷하게 읽어 보세요.',
        reviewHint: '가운데 ru를 의식하면 kuruma가 훨씬 안정적으로 붙습니다.',
      },
      {
        oneLinePrinciple: '짧은 단어와 긴 단어를 섞어 읽을 때는 길이에 따라 읽는 방식이 달라지지 않도록 리듬을 일정하게 유지하는 것이 중요합니다.',
        contextHint: 'ほん은 짧지만, 앞에서 읽은 긴 단어와 같은 집중도로 끝까지 확인해야 합니다.',
        studyTips: ['ほん을 짧게 읽더라도 마지막 ん을 분명히 닫아 보세요.', '짧은 단어일수록 대충 넘기기 쉬우니 뜻과 소리를 같이 확인하세요.'],
        exampleCards: cards(
          ['집중 단어', 'ほん', 'hon', '책'],
          ['비교 단어', 'かさ', 'kasa', '우산'],
          ['비교 단어', 'ねこ', 'neko', '고양이'],
        ),
        contentDescription: '짧은 단어도 끝 소리를 놓치지 않고 읽는 습관을 만드는 단계입니다.',
        contentBullets: ['ほん은 한 번에 읽되, 마지막 ん을 흐리지 않게 닫아 주세요.', '짧은 단어라고 해서 읽기 기준을 낮추지 않는 것이 중요합니다.'],
        choiceDescription: '책에 해당하는 단어를 고르며 짧은 단어도 끝까지 정확히 보는지 확인합니다.',
        choiceTeachingNote: 'ほん은 짧지만 마지막 ん이 중요합니다. 길이가 짧다고 대충 보고 고르면 다른 단어와 쉽게 섞입니다.',
        speakingDescription: 'hon은 짧게 읽되, 끝 소리 ん을 가볍게 닫아 주면 자연스럽습니다.',
        speakingHint: 'ho를 낸 뒤 마지막 ん을 너무 세게 끊지 말고 부드럽게 닫아 보세요.',
        reviewPrompt: 'ほん을 짧고 또렷하게 읽어 보세요.',
        reviewHint: '짧은 단어일수록 끝 소리가 더 중요하다는 점을 기억해 보세요.',
      },
      {
        oneLinePrinciple: '자동화 구간에서는 이미 본 사물 이름을 빠르게 다시 꺼내는 연습이 실제 읽기 자신감을 가장 빨리 올려 줍니다.',
        contextHint: 'かさ, ねこ, いえ, つくえ처럼 본 단어를 다시 보고 바로 반응하는지 확인합니다.',
        studyTips: ['이미 본 단어라도 뜻을 먼저 떠올리고 읽으면 기억이 더 오래 갑니다.', '빠르게 읽더라도 끝 글자를 놓치지 않는지 꼭 확인하세요.'],
        exampleCards: cards(
          ['다시 보기', 'かさ', 'kasa', '우산'],
          ['다시 보기', 'ねこ', 'neko', '고양이'],
          ['다시 보기', 'つくえ', 'tsukue', '책상'],
        ),
        contentDescription: '익숙한 사물 이름을 다시 만나 빠르게 읽는 자동화 강화 구간입니다.',
        contentBullets: ['익숙한 단어일수록 바로 읽되, 끝 글자까지 확인하는 습관을 유지합니다.', '정답을 맞힌 뒤에는 소리 내어 한 번 더 읽어 보세요.'],
        choiceDescription: '이미 본 단어를 다시 고르며 인식 속도가 올라왔는지 점검합니다.',
        choiceTeachingNote: '빠르게 고를수록 첫 글자만 보고 선택하기 쉽습니다. 익숙한 단어일수록 끝 글자 확인이 더 중요합니다.',
        speakingDescription: '익숙한 단어를 처음보다 조금 더 자연스럽고 짧게 읽어 보세요.',
        speakingHint: '속도를 조금 올려도 괜찮지만, 박자와 끝 소리는 여전히 또렷해야 합니다.',
        reviewPrompt: '익숙한 사물 이름을 보자마자 읽어 보세요.',
        reviewHint: '처음보다 빨리 보이고 있는지 스스로 느껴 보면서 읽어 보세요.',
      },
      {
        oneLinePrinciple: '체크포인트는 많이 맞히는 것보다, 익숙한 단어를 다시 처음처럼 정확하게 읽을 수 있는지 확인하는 구간입니다.',
        contextHint: '짧은 단어와 긴 단어를 섞어도 읽기 리듬이 흔들리지 않는지 마지막으로 점검합니다.',
        studyTips: ['헷갈린 단어는 정답을 본 뒤 바로 다시 읽고 넘어가세요.', '뜻과 소리를 함께 떠올릴수록 다음 단원에서 더 빨리 안정됩니다.'],
        exampleCards: cards(
          ['체크 단어', 'いえ', 'ie', '집'],
          ['체크 단어', 'くるま', 'kuruma', '자동차'],
          ['체크 단어', 'ほん', 'hon', '책'],
        ),
        contentDescription: '짧은 단어와 긴 단어를 묶어 보며 읽기 시야와 리듬이 안정됐는지 최종 점검합니다.',
        contentBullets: ['길이가 달라도 같은 기준으로 끝까지 읽는지 확인하세요.', '뜻을 보고 소리를 떠올리는 반응 속도도 함께 살펴봅니다.'],
        choiceDescription: '이번 묶음에서 익힌 단어를 한 번에 점검하며 다음 단계로 넘어갈 준비를 합니다.',
        choiceTeachingNote: '정답 자체보다, 뜻을 보고 바로 소리가 붙는지가 중요합니다. 익숙한 단어라도 끝 글자 확인은 놓치지 마세요.',
        speakingDescription: '마지막으로 한 번 더 또박또박 읽으며 읽기 리듬을 고정합니다.',
        speakingHint: '급하게 읽지 말고, 지금까지 만든 리듬을 그대로 유지해 보세요.',
        reviewPrompt: '이번 묶음의 단어를 처음 보는 것처럼 다시 읽어 보세요.',
        reviewHint: '정확도를 다시 확인하면 다음 단어 묶음도 훨씬 안정적으로 들어옵니다.',
      },
    ],
    'starter-kana-rhythm-3': [
      {
        oneLinePrinciple: '짧은 낱말 읽기 단계에서는 단어를 음절 하나씩 처리하기보다, 두세 글자를 한 단어 덩어리로 보는 시야를 만드는 것이 핵심입니다.',
        contextHint: 'かさ는 이제 글자 읽기보다 “우산”이라는 하나의 단어로 바로 떠올리는 훈련을 합니다.',
        studyTips: ['뜻을 먼저 떠올리고 kasa를 읽으면 단어 단위 인식이 훨씬 빨라집니다.', '단어가 보이자마자 소리가 나오도록 한 번 더 반복해 보세요.'],
        exampleCards: cards(
          ['단어 읽기', 'かさ', 'kasa', '우산'],
          ['짧은 말로 확장', 'かさです', 'kasa desu', '우산입니다'],
          ['함께 비교', 'ねこ', 'neko', '고양이'],
        ),
        contentDescription: '낱말을 통째로 읽고, 아주 짧은 말로 확장하는 첫 단계입니다.',
        contentBullets: ['단어를 읽은 뒤 바로 뜻을 떠올려 보세요.', '가능하면 kasa desu처럼 아주 짧은 말로 한 번 더 연결해 보세요.'],
        choiceDescription: '우산이라는 뜻을 보고 단어 전체를 바로 떠올릴 수 있는지 확인합니다.',
        choiceTeachingNote: '이 단계에서는 글자 하나보다 단어 전체를 보는 것이 중요합니다. 뜻을 보고 kasa가 바로 나오는지 확인해 보세요.',
        speakingDescription: 'kasa를 읽은 뒤, 가능하면 kasa desu처럼 짧게 연결해 보는 감각도 같이 가져가 보세요.',
        speakingHint: '우산이라는 뜻을 떠올린 뒤 kasa를 한 번에 읽고, 여유가 되면 뒤에 desu를 붙여 보세요.',
        reviewPrompt: 'かさ를 단어 전체로 보고 읽어 보세요.',
        reviewHint: '이제는 글자보다 단어가 먼저 보이는지 확인하는 구간입니다.',
      },
      {
        oneLinePrinciple: '단어 자동화가 진행될수록 글자를 해독하는 속도보다, 단어가 보이는 순간 뜻과 소리가 함께 붙는 반응이 중요해집니다.',
        contextHint: 'ねこ를 보고 “고양이”가 먼저 떠오르면 읽기 자동화가 제대로 되고 있다는 뜻입니다.',
        studyTips: ['고양이 이미지를 떠올린 뒤 neko를 읽으면 더 오래 기억됩니다.', '단어를 읽고 바로 neko desu처럼 짧게 확장해 보는 것도 좋습니다.'],
        exampleCards: cards(
          ['단어 읽기', 'ねこ', 'neko', '고양이'],
          ['짧은 말로 확장', 'ねこです', 'neko desu', '고양이입니다'],
          ['함께 비교', 'いえ', 'ie', '집'],
        ),
        contentDescription: '낱말을 뜻과 함께 바로 읽고, 짧은 말로 이어 보는 단계입니다.',
        contentBullets: ['단어를 보자마자 뜻과 소리를 같이 떠올려 보세요.', '짧은 말로 확장할 때도 단어 리듬을 먼저 유지합니다.'],
        choiceDescription: '고양이라는 뜻을 보고 neko가 바로 나오는지 확인합니다.',
        choiceTeachingNote: 'ねこ는 두 글자 단어지만, 이제는 글자보다 단어 전체를 먼저 떠올리는 것이 목표입니다.',
        speakingDescription: 'neko를 또렷하게 읽고, 익숙하다면 neko desu처럼 가볍게 확장해 보세요.',
        speakingHint: '단어 리듬을 깨지 말고 neko를 읽은 뒤, 여유가 있으면 desu까지 붙여 보세요.',
        reviewPrompt: 'ねこ를 뜻과 함께 바로 읽어 보세요.',
        reviewHint: '단어가 먼저 보이는지, 아직 글자를 해독하고 있는지 스스로 체크해 보세요.',
      },
      {
        oneLinePrinciple: '짧은 단어라도 문장 안으로 들어가기 시작하면, 단어 경계를 의식하면서 읽는 감각이 함께 필요해집니다.',
        contextHint: 'いえ는 짧지만 “집입니다”처럼 이어 보면 단어 경계가 더 분명해집니다.',
        studyTips: ['ie를 읽은 뒤 짧게 ie desu까지 붙여 읽어 보세요.', '짧은 단어일수록 너무 빨라져 끝 소리가 사라지지 않도록 주의하세요.'],
        exampleCards: cards(
          ['단어 읽기', 'いえ', 'ie', '집'],
          ['짧은 말로 확장', 'いえです', 'ie desu', '집입니다'],
          ['함께 비교', 'つくえ', 'tsukue', '책상'],
        ),
        contentDescription: '짧은 단어를 아주 간단한 문장 형태로 확장하며 단어 경계를 익히는 단계입니다.',
        contentBullets: ['ie를 짧고 정확하게 읽은 뒤, ie desu로 한 번 더 연결해 보세요.', '짧은 단어일수록 마지막 소리를 분명히 닫는 것이 중요합니다.'],
        choiceDescription: '집이라는 뜻을 보고 ie를 바로 떠올리는지 확인합니다.',
        choiceTeachingNote: 'いえ는 짧아서 대충 읽기 쉽지만, 끝 소리 e를 분명히 해야 다음 문장 읽기로 자연스럽게 넘어갑니다.',
        speakingDescription: 'ie를 먼저 읽고, 익숙하면 ie desu처럼 짧게 이어 읽어 보세요.',
        speakingHint: 'i-e 두 박자를 살린 뒤, 뒤에 desu를 붙여도 앞 단어 리듬이 흐트러지지 않게 해 보세요.',
        reviewPrompt: 'いえ를 단어 전체로 보고 읽어 보세요.',
        reviewHint: '짧은 단어라도 끝 소리를 또렷하게 유지하는지 확인해 보세요.',
      },
      {
        oneLinePrinciple: '긴 단어를 짧은 말 속에서 읽으려면, 단어 자체 리듬을 먼저 안정시키고 그 다음에 뒤 표현을 붙이는 순서가 안전합니다.',
        contextHint: 'つくえ는 길기 때문에 tsukue를 먼저 안정적으로 읽은 뒤, 필요하면 tsukue desu처럼 확장합니다.',
        studyTips: ['tsukue 세 박자를 먼저 안정시킨 뒤 짧은 말로 확장하세요.', '긴 단어일수록 뒤 표현을 붙일 때도 원래 단어 리듬을 유지해야 합니다.'],
        exampleCards: cards(
          ['단어 읽기', 'つくえ', 'tsukue', '책상'],
          ['짧은 말로 확장', 'つくえです', 'tsukue desu', '책상입니다'],
          ['함께 비교', 'くるま', 'kuruma', '자동차'],
        ),
        contentDescription: '긴 낱말을 먼저 정확히 읽고, 아주 짧은 문장으로 자연스럽게 확장하는 단계입니다.',
        contentBullets: ['tsu-ku-e 세 박자를 먼저 맞춘 뒤 tsukue desu로 연결하세요.', '단어 리듬이 무너지지 않는 범위에서만 짧게 확장합니다.'],
        choiceDescription: '책상이라는 뜻을 보고 긴 단어를 바로 떠올릴 수 있는지 확인합니다.',
        choiceTeachingNote: 'つくえ는 세 박자 단어입니다. 긴 단어일수록 먼저 단어 자체를 안정시키고 나서 뒤 표현을 붙이세요.',
        speakingDescription: 'tsukue를 먼저 또렷하게 읽고, 가능하면 뒤에 desu를 붙여 짧게 이어 보세요.',
        speakingHint: '긴 단어 리듬이 흐트러지지 않는 범위에서만 tsukue desu로 확장해 보세요.',
        reviewPrompt: 'つくえ를 끝까지 또렷하게 읽어 보세요.',
        reviewHint: '긴 단어는 먼저 단어 자체 리듬을 안정시키는 것이 가장 중요합니다.',
      },
      {
        oneLinePrinciple: '문장으로 확장될수록 단어 하나를 정확히 읽는 힘이 더 중요해지므로, 긴 낱말은 여전히 개별 리듬을 먼저 지켜야 합니다.',
        contextHint: 'くるま는 길지만 이미 익숙한 단어이므로, 지금은 뜻과 소리를 거의 동시에 떠올리는 것이 목표입니다.',
        studyTips: ['자동차를 떠올리며 kuruma를 먼저 읽고, 필요하면 kuruma desu로 짧게 확장해 보세요.', '가운데 ru를 빼먹지 않는지만 계속 체크하면 됩니다.'],
        exampleCards: cards(
          ['단어 읽기', 'くるま', 'kuruma', '자동차'],
          ['짧은 말로 확장', 'くるまです', 'kuruma desu', '자동차입니다'],
          ['함께 비교', 'ほん', 'hon', '책'],
        ),
        contentDescription: '긴 단어를 뜻과 함께 바로 읽고, 짧은 말로 이어 보는 자동화 단계입니다.',
        contentBullets: ['kuruma를 먼저 안정적으로 읽은 뒤, 뒤에 desu를 붙여 보세요.', '가운데 ru가 사라지지 않는지 끝까지 들어 보세요.'],
        choiceDescription: '자동차라는 뜻을 보고 kuruma가 바로 나오는지 확인합니다.',
        choiceTeachingNote: 'くるま는 세 박자 단어입니다. 뜻을 떠올린 뒤 ku-ru-ma가 자연스럽게 붙는지 확인해 보세요.',
        speakingDescription: 'kuruma를 분명히 읽고, 가능하면 짧은 말로 한번 더 연결해 보세요.',
        speakingHint: 'ku-ru-ma 세 박자를 지킨 뒤 kuruma desu로 이어도 단어 리듬이 무너지지 않게 해 보세요.',
        reviewPrompt: 'くるま를 단어 전체로 읽어 보세요.',
        reviewHint: '뜻과 소리가 동시에 떠오르면 자동화가 잘 되고 있는 상태입니다.',
      },
      {
        oneLinePrinciple: '짧은 단어를 아주 자연스럽게 읽을 수 있으면, 뒤에 붙는 짧은 말도 훨씬 덜 부담스럽게 느껴집니다.',
        contextHint: 'ほん은 짧지만, 책입니다처럼 이어 읽을 때도 끝 소리 ん이 살아 있어야 합니다.',
        studyTips: ['hon을 읽은 뒤 마지막 ん을 살린 채 hon desu로 이어 보세요.', '짧은 단어라도 끝 소리를 빼먹지 않는 것이 중요합니다.'],
        exampleCards: cards(
          ['단어 읽기', 'ほん', 'hon', '책'],
          ['짧은 말로 확장', 'ほんです', 'hon desu', '책입니다'],
          ['함께 비교', 'かさ', 'kasa', '우산'],
        ),
        contentDescription: '짧은 낱말을 자연스럽게 읽고, 한 단계 더 짧은 말로 연결해 보는 단계입니다.',
        contentBullets: ['hon을 먼저 읽고 마지막 ん을 살린 채 hon desu로 이어 보세요.', '짧은 단어일수록 대충 넘기지 말고 끝 소리를 남겨 주세요.'],
        choiceDescription: '책이라는 뜻을 보고 hon이 바로 보이는지 확인합니다.',
        choiceTeachingNote: 'ほん은 짧아 보여도 끝 ん이 중요합니다. 뒤 표현을 붙여도 끝 소리가 흐리지 않게 해 보세요.',
        speakingDescription: 'hon을 먼저 짧고 정확하게 읽은 뒤, 익숙하다면 hon desu로 한 번 더 이어 보세요.',
        speakingHint: 'hon의 끝 ん을 살린 채 뒤 표현을 붙이면 더 자연스럽게 들립니다.',
        reviewPrompt: 'ほん을 끝 소리까지 살려 읽어 보세요.',
        reviewHint: '짧은 단어일수록 끝 소리를 더 의식하면 문장으로도 안정적으로 이어집니다.',
      },
      {
        oneLinePrinciple: '반복 구간에서는 이미 아는 단어를 더 자연스럽게 꺼낼 수 있는지가 중요하므로, 속도보다 즉시성에 초점을 맞추는 편이 좋습니다.',
        contextHint: '여기서는 かさ, ねこ, いえ처럼 익숙한 단어를 보고 바로 읽는 반응을 확인합니다.',
        studyTips: ['뜻을 보자마자 단어가 떠오르는지 먼저 확인해 보세요.', '이미 아는 단어라도 한번 소리 내어 읽고 넘어가야 자동화가 굳습니다.'],
        exampleCards: cards(
          ['다시 보기', 'かさです', 'kasa desu', '우산입니다'],
          ['다시 보기', 'ねこです', 'neko desu', '고양이입니다'],
          ['다시 보기', 'いえです', 'ie desu', '집입니다'],
        ),
        contentDescription: '이미 익힌 낱말과 아주 짧은 말 연결을 다시 보며 반응 속도를 올리는 단계입니다.',
        contentBullets: ['글자를 해독하기보다, 단어와 뜻이 동시에 떠오르는지 확인해 보세요.', '바로 읽었다면 한 번 더 자연스럽게 이어 읽는 것으로 마무리합니다.'],
        choiceDescription: '익숙한 단어와 짧은 말 연결을 다시 보며 즉시성이 생겼는지 확인합니다.',
        choiceTeachingNote: '이미 본 표현일수록 대충 넘어가기 쉽습니다. 뜻과 소리가 동시에 떠오르는지 끝까지 확인해 보세요.',
        speakingDescription: '익숙한 표현은 조금 더 자연스럽고 짧게 읽어 보며 자동화 정도를 확인합니다.',
        speakingHint: '처음보다 바로 입에서 나오는지, 망설임이 줄었는지 스스로 체크하면서 읽어 보세요.',
        reviewPrompt: '익숙한 단어를 보자마자 읽어 보세요.',
        reviewHint: '지금은 정확도와 함께 즉시성이 생겼는지 확인하는 단계입니다.',
      },
      {
        oneLinePrinciple: '초반 낱말 읽기의 마지막 점검은 “글자를 읽는가”보다 “단어가 보이자마자 뜻과 소리가 함께 붙는가”를 보는 것이 핵심입니다.',
        contextHint: '짧은 말로 확장한 표현까지 포함해, 이제는 단어와 뜻이 거의 동시에 떠오르는지 확인합니다.',
        studyTips: ['모르는 것처럼 천천히 읽어도 괜찮으니, 뜻과 소리를 꼭 함께 떠올리세요.', '헷갈린 표현은 정답을 본 뒤 바로 한 번 더 읽어 고정하세요.'],
        exampleCards: cards(
          ['체크 표현', 'つくえです', 'tsukue desu', '책상입니다'],
          ['체크 표현', 'くるまです', 'kuruma desu', '자동차입니다'],
          ['체크 표현', 'ほんです', 'hon desu', '책입니다'],
        ),
        contentDescription: '초반 낱말 읽기와 아주 짧은 말 연결을 함께 묶어 최종 점검하는 단계입니다.',
        contentBullets: ['단어와 뜻이 동시에 떠오르는지 확인하세요.', '읽기 속도보다, 망설임 없이 자연스럽게 연결되는지가 더 중요합니다.'],
        choiceDescription: '지금까지 익힌 낱말과 짧은 말 연결이 실제로 입에 붙었는지 마지막으로 확인합니다.',
        choiceTeachingNote: '이 단계에서는 정답을 맞히는 것보다, 표현을 보자마자 소리와 뜻이 같이 나오는지 확인하는 편이 더 중요합니다.',
        speakingDescription: '마지막으로 한 번 더 읽으며 다음 표현 단원으로 넘어갈 준비를 합니다.',
        speakingHint: '천천히 읽어도 괜찮습니다. 뜻과 소리가 함께 붙는지에만 집중해 보세요.',
        reviewPrompt: '짧은 말로 확장한 표현을 자연스럽게 읽어 보세요.',
        reviewHint: '표현 전체가 한 번에 떠오르면 다음 단계 학습이 훨씬 쉬워집니다.',
      },
    ],
  }

  Object.entries(curatedStarterUnitOverrides).forEach(([unitSlug, items]) => {
    items.forEach((override, index) => {
      set(`${unitSlug}-${index + 1}`, override)
    })
  })

  return overrides
}

const lessonOverrides = createStarterOverrides()

const applyLessonOverrides = (courses: ReturnType<typeof buildCourse>[]) =>
  courses.map((course) => ({
    ...course,
    lessons: course.lessons.map((lesson) => {
      const override = lessonOverrides[lesson.id]
      if (!override) return lesson

      return {
        ...lesson,
        oneLinePrinciple: override.oneLinePrinciple ?? lesson.oneLinePrinciple,
        contextHint: override.contextHint ?? lesson.contextHint,
        studyTips: override.studyTips ?? lesson.studyTips,
        exampleCards: override.exampleCards ?? lesson.exampleCards,
        steps: lesson.steps.map((step) =>
          step.type === 'content'
            ? {
                ...step,
                description: override.contentDescription ?? step.description,
                bullets: override.contentBullets ?? step.bullets,
              }
            : step.type === 'choice'
              ? {
                  ...step,
                  description: override.choiceDescription ?? step.description,
                  teachingNote: override.choiceTeachingNote ?? step.teachingNote,
                }
              : step.type === 'speaking'
                ? {
                    ...step,
                    description: override.speakingDescription ?? step.description,
                    hint: override.speakingHint ?? step.hint,
                  }
                : step,
        ),
        reviewItems: lesson.reviewItems.map((item) =>
          item.type === 'choice'
            ? {
                ...item,
                prompt: override.reviewPrompt ?? item.prompt,
                teachingNote: override.reviewTeachingNote ?? override.choiceTeachingNote ?? item.teachingNote,
              }
            : {
                ...item,
                prompt: override.reviewPrompt ?? item.prompt,
                hint: override.reviewHint ?? override.speakingHint ?? item.hint,
              },
        ),
      }
    }),
  }))

const curatedCourses = applyLessonOverrides(builtCourses)

export const curriculum: Unit[] = curatedCourses.flatMap((course) => course.units)
export const lessonOrder: Lesson[] = curatedCourses.flatMap((course) => course.lessons)
export const lessonRecord = Object.fromEntries(lessonOrder.map((lesson) => [lesson.id, lesson])) as Record<string, Lesson>
export const unitRecord = Object.fromEntries(curriculum.map((unit) => [unit.id, unit])) as Record<string, Unit>
export const reviewPool: ReviewItem[] = lessonOrder.flatMap((lesson) => lesson.reviewItems)
