export type AudioSample = {
  url: string
  source: 'recorded'
}

const starterCoreLessonIds = [
  'starter-welcome-flow',
  'starter-vowel-rhythm',
  'starter-hiragana-a-row',
  'starter-hiragana-ka-sa',
  'starter-hiragana-ta-na',
  'starter-hiragana-ha-ma',
  'starter-hiragana-ya-ra-wa',
  'starter-hiragana-voiced-small',
  'starter-hiragana-words-1',
  'starter-hiragana-words-2',
  'starter-greetings-1',
  'starter-greetings-2',
  'starter-self-intro-2',
  'starter-numbers-basic',
  'starter-days-basic',
] as const

const makeSampleEntries = (lessonId: (typeof starterCoreLessonIds)[number]) => {
  const url = `/audio/starter/${lessonId}.mp3`
  return [
    [`${lessonId}-speaking`, { url, source: 'recorded' as const }],
    [`review-${lessonId}`, { url, source: 'recorded' as const }],
  ] as const
}

export const starterRecordedAudioCount = starterCoreLessonIds.length
export const starterRecordedAudioDirectory = '/audio/starter'

const audioCatalog = Object.fromEntries(starterCoreLessonIds.flatMap(makeSampleEntries)) as Record<string, AudioSample>

export function getAudioSample(sampleKey: string) {
  return audioCatalog[sampleKey] ?? null
}
